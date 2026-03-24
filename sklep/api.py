import jwt
import json
from datetime import datetime, timedelta
from typing import List, Optional

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.conf import settings
from django.db import transaction

from ninja import NinjaAPI, Schema, Form, File
from ninja.files import UploadedFile
from ninja.security import HttpBearer

from .models import Towar, Klient, Dostawa, Rabat, Kategoria, Magazyn, Atrybut, WartoscAtrybutu


# ==========================================
# JWT – używany do weryfikacji tożsamości
# ==========================================

class JWTAuth(HttpBearer):
    def authenticate(self, request, token):
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            return payload
        except Exception:
            return None

auth = JWTAuth()


# ==========================================
# INICJALIZACJA API
# ==========================================

api = NinjaAPI(title="Sklep Komputerowy API", version="1.0.0")

from .orders import router as orders_router
api.add_router("/zamowienia", orders_router)


# ==========================================
# SCHEMATY DANYCH
# ==========================================

class AtrybutSchema(Schema):
    nazwa: str
    wartosc: str

class PodkategoriaSchema(Schema):
    id: int
    nazwa: str

class KategoriaSchema(Schema):
    id: int
    nazwa_kategorii: str
    podkategorie: List[PodkategoriaSchema]
    image: Optional[str]

    @staticmethod
    def resolve_image(obj):
        return obj.image.url if obj.image else None

class AtrybutSlownikSchema(Schema):
    id: int
    nazwa: str

class ProduktSchema(Schema):
    id: int
    nazwa: str
    opis: Optional[str]
    producent: Optional[str]
    kategoria: Optional[str]
    kategoria_id: Optional[int]
    podkategoria_id: Optional[int]
    cena_jednostkowa: float
    cena_promocyjna: Optional[float]
    zdjecie: Optional[str]
    ilosc_dostepna: int
    atrybuty: List[AtrybutSchema]

    @staticmethod
    def resolve_kategoria(obj):
        return obj.kategoria.nazwa_kategorii if obj.kategoria else "Inne"

    @staticmethod
    def resolve_kategoria_id(obj):
        return obj.kategoria.id if obj.kategoria else None

    @staticmethod
    def resolve_podkategoria_id(obj):
        return obj.podkategoria.id if obj.podkategoria else None

    @staticmethod
    def resolve_zdjecie(obj):
        return obj.zdjecie.url if obj.zdjecie else None

    @staticmethod
    def resolve_ilosc_dostepna(obj):
        return obj.magazyn.ilosc_dostepna if hasattr(obj, 'magazyn') else 0

    @staticmethod
    def resolve_atrybuty(obj):
        return [
            {"nazwa": wa.atrybut.nazwa, "wartosc": wa.wartosc}
            for wa in obj.wartosci_atrybutow.all()
        ]

class LoginSchema(Schema):
    username: str
    password: str

class RegisterSchema(Schema):
    username: str
    password: str
    email: str
    imie: str
    nazwisko: str
    nr_tel: str

class DostawaSchema(Schema):
    id: int
    nazwa: str
    cena: float

    @staticmethod
    def resolve_nazwa(obj):
        return obj.rodzaj.nazwa

    @staticmethod
    def resolve_cena(obj):
        return float(obj.cena_dostawy)

class RabatSchema(Schema):
    id: int
    nazwa: str
    procent: float
    aktywny: bool


# ==========================================
# PUBLICZNE ENDPOINTY SKLEPU
# ==========================================

@api.get("/produkty/", response=List[ProduktSchema])
def get_produkty(request):
    return Towar.objects.select_related(
        'kategoria', 'podkategoria', 'magazyn'
    ).prefetch_related(
        'wartosci_atrybutow__atrybut'
    ).all()

@api.get("/kategorie/", response=List[KategoriaSchema])
def get_kategorie(request):
    return Kategoria.objects.prefetch_related('podkategorie').all()

@api.get("/dostawy/", response=List[DostawaSchema])
def get_dostawy(request):
    return Dostawa.objects.select_related('rodzaj').all()

@api.get("/rabaty/", response=List[RabatSchema])
def get_rabaty(request):
    return Rabat.objects.filter(aktywny=True)

# Inteligente API zwracające atrybuty powiązane z podkategorią
@api.get("/atrybuty/", response=List[AtrybutSlownikSchema])
def get_atrybuty(request, kategoria_id: Optional[int] = None, podkategoria_id: Optional[int] = None):
    qs = Atrybut.objects.all()
    
    if podkategoria_id:
        # Pobierz ID atrybutów, które były używane w towarach należących do tej podkategorii
        uzyte_id = WartoscAtrybutu.objects.filter(
            towar__podkategoria_id=podkategoria_id
        ).values_list('atrybut_id', flat=True).distinct()
        qs = qs.filter(id__in=uzyte_id)
    elif kategoria_id:
        # Alternatywnie szersze filtrowanie po samej głównej kategorii
        uzyte_id = WartoscAtrybutu.objects.filter(
            towar__kategoria_id=kategoria_id
        ).values_list('atrybut_id', flat=True).distinct()
        qs = qs.filter(id__in=uzyte_id)
        
    return qs


# ==========================================
# LOGOWANIE I REJESTRACJA
# ==========================================

@api.post("/login/")
def login(request, data: LoginSchema):
    user = authenticate(request, username=data.username, password=data.password)

    if user is None:
        return api.create_response(request, {"detail": "Błędne dane logowania"}, status=401)

    payload = {
        'user_id': user.id,
        'username': user.username,
        'is_staff': user.is_staff,
        'exp': datetime.utcnow() + timedelta(days=1)
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

    return {"token": token, "username": user.username, "is_staff": user.is_staff}

@api.post("/register/")
def register(request, data: RegisterSchema):
    if User.objects.filter(username=data.username).exists():
        return api.create_response(request, {"detail": "Użytkownik o takim loginie już istnieje."}, status=400)

    if User.objects.filter(email=data.email).exists():
        return api.create_response(request, {"detail": "Ten adres e-mail jest już zajęty."}, status=400)

    user = User.objects.create_user(
        username=data.username,
        password=data.password,
        email=data.email,
        first_name=data.imie,
        last_name=data.nazwisko
    )

    Klient.objects.create(
        user=user,
        imie=data.imie,
        nazwisko=data.nazwisko,
        email=data.email,
        nr_tel=data.nr_tel
    )

    payload = {
        'user_id': user.id,
        'username': user.username,
        'exp': datetime.utcnow() + timedelta(days=1)
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

    return {"token": token, "username": user.username}


# ==========================================
# ENDPOINTY DLA PANELU PRACOWNIKA (ADMIN)
# ==========================================

@api.post("/admin/produkty/", auth=auth)
def create_admin_produkt(
    request, 
    payload: str = Form(...), 
    zdjecie: UploadedFile = File(None)
):
    if not request.auth.get('is_staff'):
        return api.create_response(request, {"detail": "Brak uprawnień. Zaloguj się jako pracownik."}, status=403)
    
    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        return api.create_response(request, {"detail": "Nieprawidłowy format danych JSON."}, status=400)

    with transaction.atomic():
        towar = Towar.objects.create(
            nazwa=data.get('nazwa'),
            producent=data.get('producent'),
            opis=data.get('opis'),
            cena_jednostkowa=data.get('cena_jednostkowa'),
            cena_promocyjna=data.get('cena_promocyjna') or None,
            kategoria_id=data.get('kategoria_id') or None,
            podkategoria_id=data.get('podkategoria_id') or None,
        )
        
        if zdjecie:
            towar.zdjecie.save(zdjecie.name, zdjecie)
        
        Magazyn.objects.create(
            towar=towar,
            ilosc_dostepna=data.get('ilosc_dostepna', 0)
        )

        for attr in data.get('atrybuty', []):
            nazwa = attr.get('nazwa', '').strip()
            wartosc = attr.get('wartosc', '').strip()
            
            if nazwa and wartosc:
                # Automatycznie dopina nową nazwę do słownika Atrybutów, jeśli jej nie było
                atrybut_obj, _ = Atrybut.objects.get_or_create(nazwa=nazwa)
                WartoscAtrybutu.objects.create(
                    towar=towar, 
                    atrybut=atrybut_obj, 
                    wartosc=wartosc
                )
        
    return {"success": True, "towar_id": towar.id, "message": "Produkt dodany pomyślnie"}