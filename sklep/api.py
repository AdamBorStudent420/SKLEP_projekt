import jwt
from datetime import datetime, timedelta
from typing import List, Optional

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.conf import settings
from ninja import NinjaAPI, Schema

from .models import Towar, Klient, Dostawa, Rabat, Kategoria
from ninja.security import HttpBearer


# ==========================================
# JWT – używany tylko dla zamówień
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
# API BEZ GLOBALNEGO AUTH
# ==========================================

api = NinjaAPI(title="Sklep Komputerowy API", version="1.0.0")


# Router zamówień — JEDYNY chroniony JWT
from .orders import router as orders_router
api.add_router("/zamowienia", orders_router, auth=auth)


# ==========================================
# SCHEMATY (bez zmian)
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
# PUBLICZNE ENDPOINTY (bez zmian)
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


# ==========================================
# LOGOWANIE – PUBLICZNE
# ==========================================

@api.post("/login/")
def login(request, data: LoginSchema):
    user = authenticate(request, username=data.username, password=data.password)

    if user is None:
        return api.create_response(request, {"detail": "Błędne dane logowania"}, status=401)

    payload = {
        'user_id': user.id,
        'username': user.username,
        'exp': datetime.utcnow() + timedelta(days=1)
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

    return {"token": token, "username": user.username}


# ==========================================
# REJESTRACJA – PUBLICZNA
# ==========================================

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