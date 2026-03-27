import jwt
import json
from datetime import datetime, timedelta
from typing import List, Optional, Dict

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.conf import settings
from django.db import transaction
from django.db.models import Prefetch

from ninja import NinjaAPI, Schema, Form, File
from ninja.files import UploadedFile
from ninja.security import HttpBearer

from .models import Towar, Klient, Dostawa, Rabat, Kategoria, Magazyn, Atrybut, WartoscAtrybutu, HistoriaStatusowZamowienia, Zamowienie


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

# Podłączamy Twój router zamówień klienta (bez auth=auth, żeby goście mogli kupować!)
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
        try:
            return obj.magazyn.ilosc_dostepna
        except Exception:
            return 0

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

class PozycjaZamowieniaSchema(Schema):
    nazwa: str
    ilosc: int
    cena_sprzedazy: float
    suma: float

    @staticmethod
    def resolve_nazwa(obj):
        return obj.towar.nazwa
    @staticmethod
    def resolve_suma(obj):
        return float(obj.ilosc) * float(obj.cena_sprzedazy)

class HistoriaStatusowSchema(Schema):
    nowy_status: str
    data_zmiany: datetime
    zmienione_przez: str

    @staticmethod
    def resolve_zmienione_przez(obj):
        return obj.zmienione_przez.username if obj.zmienione_przez else "System"

# Rozbuduj stary AdminOrderSchema
class AdminOrderSchema(Schema):
    id: int
    klient_dane: str
    adres_dostawy: str = None
    dostawa_nazwa: str = None
    rabat_info: str = None
    status_platnosci: str = None
    data_zamowienia: datetime
    status: str
    kwota: float
    
    # --- NOWE POLA ---
    telefon: str = None
    metoda_platnosci: str = None
    uwagi_wewnetrzne: str = None
    pozycje: List[PozycjaZamowieniaSchema] = None
    historia: List[HistoriaStatusowSchema] = None

    @staticmethod
    def resolve_klient_dane(obj):
        return f"{obj.klient.imie} {obj.klient.nazwisko} ({obj.klient.email})"

    @staticmethod
    def resolve_adres_dostawy(obj):
        if hasattr(obj, 'adres') and obj.adres:
            mieszkanie = f"/{obj.adres.nr_mieszkania}" if obj.adres.nr_mieszkania else ""
            return f"{obj.adres.ulica} {obj.adres.nr_domu}{mieszkanie}, {obj.adres.kod_pocztowy} {obj.adres.miasto}"
        return "Brak adresu"

    @staticmethod
    def resolve_dostawa_nazwa(obj):
        if hasattr(obj, 'dostawa') and obj.dostawa:
            return f"{obj.dostawa.rodzaj.nazwa} ({obj.dostawa.cena_dostawy} zł)"
        return "Brak danych"

    @staticmethod
    def resolve_rabat_info(obj):
        if hasattr(obj, 'rabat') and obj.rabat:
            return f"{obj.rabat.nazwa} (-{obj.rabat.procent}%)"
        return "Brak"

    @staticmethod
    def resolve_status_platnosci(obj):
        try:
            return obj.platnosc.status.nazwa
        except Exception:
            return "Brak płatności"

    @staticmethod
    def resolve_kwota(obj):
        try:
            return float(obj.platnosc.kwota)
        except Exception:
            suma = sum(float(p.cena_sprzedazy) * p.ilosc for p in obj.pozycje.all())
            if hasattr(obj, 'dostawa') and obj.dostawa:
                suma += float(obj.dostawa.cena_dostawy)
            if hasattr(obj, 'rabat') and obj.rabat:
                suma = suma * (1 - (float(obj.rabat.procent) / 100))
            return round(suma, 2)

    # --- BEZPIECZNE RESOLVERY DLA NOWYCH PÓL ---
    @staticmethod
    def resolve_telefon(obj):
        try:
            return obj.klient.nr_tel
        except Exception:
            return "Brak telefonu"

    @staticmethod
    def resolve_metoda_platnosci(obj):
        try:
            return obj.platnosc.metoda
        except Exception:
            return "Brak (nieopłacone)"

    @staticmethod
    def resolve_pozycje(obj):
        try:
            return list(obj.pozycje.all())
        except Exception:
            return []

    @staticmethod
    def resolve_historia(obj):
        try:
            return list(obj.historia_statusow.all())
        except Exception:
            return []


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

# ==========================================
# NOWY ENDPOINT: EDYCJA ISTNIEJĄCEGO TOWARU
# ==========================================
@api.post("/admin/produkty/{towar_id}/", auth=auth)
def update_admin_produkt(
    request, 
    towar_id: int,
    payload: str = Form(...), 
    zdjecie: UploadedFile = File(None)
):
    if not request.auth.get('is_staff'):
        return api.create_response(request, {"detail": "Brak uprawnień. Zaloguj się jako pracownik."}, status=403)
    
    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        return api.create_response(request, {"detail": "Nieprawidłowy format danych JSON."}, status=400)

    try:
        towar = Towar.objects.get(id=towar_id)
    except Towar.DoesNotExist:
        return api.create_response(request, {"detail": "Nie znaleziono produktu."}, status=404)

    with transaction.atomic():
        # 1. Aktualizacja podstawowych danych produktu
        towar.nazwa = data.get('nazwa', towar.nazwa)
        towar.producent = data.get('producent', towar.producent)
        towar.opis = data.get('opis', towar.opis)
        towar.cena_jednostkowa = data.get('cena_jednostkowa', towar.cena_jednostkowa)
        towar.cena_promocyjna = data.get('cena_promocyjna') or None
        towar.kategoria_id = data.get('kategoria_id') or None
        towar.podkategoria_id = data.get('podkategoria_id') or None
        
        # Jeśli przesłano nowe zdjęcie, nadpisujemy stare
        if zdjecie:
            towar.zdjecie.save(zdjecie.name, zdjecie)
            
        towar.save()
        
        # 2. Aktualizacja magazynu
        magazyn, _ = Magazyn.objects.get_or_create(towar=towar, defaults={'ilosc_dostepna': 0})
        magazyn.ilosc_dostepna = data.get('ilosc_dostepna', magazyn.ilosc_dostepna)
        magazyn.save()

        # 3. Aktualizacja atrybutów (najprostsza metoda: usuwamy stare i wstawiamy nowe)
        towar.wartosci_atrybutow.all().delete()
        for attr in data.get('atrybuty', []):
            nazwa = attr.get('nazwa', '').strip()
            wartosc = attr.get('wartosc', '').strip()
            
            if nazwa and wartosc:
                atrybut_obj, _ = Atrybut.objects.get_or_create(nazwa=nazwa)
                WartoscAtrybutu.objects.create(
                    towar=towar, 
                    atrybut=atrybut_obj, 
                    wartosc=wartosc
                )
        
    return {"success": True, "towar_id": towar.id, "message": "Produkt zaktualizowany pomyślnie"}

class NotatkiSchema(Schema):
    uwagi: str

class ZmianaStatusuSchema(Schema):
    status: str

@api.post("/zamowienia/admin/{order_id}/uwagi", auth=auth)
def update_uwagi(request, order_id: int, payload: NotatkiSchema):
    if not request.auth.get('is_staff'): return 403, "Brak dostępu"
    zamowienie = Zamowienie.objects.get(id=order_id)
    zamowienie.uwagi_wewnetrzne = payload.uwagi
    zamowienie.save()
    return {"success": True}

@api.post("/zamowienia/admin/{order_id}/status", auth=auth)
def update_status(request, order_id: int, payload: ZmianaStatusuSchema):
    if not request.auth.get('is_staff'): return 403, "Brak dostępu"
    zamowienie = Zamowienie.objects.get(id=order_id)
    
    stary_status = zamowienie.status
    zamowienie.status = payload.status
    zamowienie.save()
    
    # Tworzymy Log do historii zmian
    user = User.objects.filter(username=request.auth.get('username')).first()
    HistoriaStatusowZamowienia.objects.create(
        zamowienie=zamowienie,
        stary_status=stary_status,
        nowy_status=payload.status,
        zmienione_przez=user
    )
    return {"success": True}

# ==========================================
# MODUŁ ZARZĄDZANIA KLIENTAMI (PANEL PRACOWNIKA)
# ==========================================

# Schemat pomocniczy do wylistowania zamówień w profilu klienta
class ZamowienieKlientaSchema(Schema):
    id: int
    data_zamowienia: str
    status: str
    kwota: float
    
    @staticmethod
    def resolve_data_zamowienia(obj):
        return obj.data_zamowienia.strftime("%Y-%m-%d %H:%M")

    @staticmethod
    def resolve_kwota(obj):
        try:
            return float(obj.platnosc.kwota)
        except Exception:
            suma = sum(float(p.cena_sprzedazy) * p.ilosc for p in obj.pozycje.all())
            if hasattr(obj, 'dostawa') and obj.dostawa:
                suma += float(obj.dostawa.cena_dostawy)
            if hasattr(obj, 'rabat') and obj.rabat:
                suma = suma * (1 - (float(obj.rabat.procent) / 100))
            return round(suma, 2)


# Główny schemat Klienta dla panelu
class AdminKlientSchema(Schema):
    id: int
    imie: str
    nazwisko: str
    email: str
    telefon: str
    typ: str
    liczba_zamowien: int
    laczna_kwota: float
    zamowienia: List[ZamowienieKlientaSchema]

    @staticmethod
    def resolve_telefon(obj):
        return obj.nr_tel

    @staticmethod
    def resolve_typ(obj):
        return "Zarejestrowany" if obj.user else "Gość"

    @staticmethod
    def resolve_liczba_zamowien(obj):
        return obj.zamowienie_set.count()

    @staticmethod
    def resolve_zamowienia(obj):
        # Pobiera wszystkie zamówienia tego klienta od najnowszych
        return list(obj.zamowienie_set.all().order_by('-data_zamowienia'))

    @staticmethod
    def resolve_laczna_kwota(obj):
        total = 0
        for z in obj.zamowienie_set.all():
            # Próbujemy odczytać gotową wpłatę
            try:
                total += float(z.platnosc.kwota)
            except Exception:
                # W razie braku płatności (np. pobranie), wyliczamy w locie z koszyka
                suma = sum(float(p.cena_sprzedazy) * p.ilosc for p in z.pozycje.all())
                if hasattr(z, 'dostawa') and z.dostawa:
                    suma += float(z.dostawa.cena_dostawy)
                if hasattr(z, 'rabat') and z.rabat:
                    suma = suma * (1 - (float(z.rabat.procent) / 100))
                total += suma
        return round(total, 2)


@api.get("/admin/klienci", response=List[AdminKlientSchema], auth=auth)
def get_admin_klienci(request):
    if not request.auth.get('is_staff'):
        return 403, {"detail": "Brak uprawnień."}
    
    # Optymalizacja zapytania - "dociągamy" powiązane dane z wyprzedzeniem
    return Klient.objects.prefetch_related(
        'zamowienie_set', 
        'zamowienie_set__platnosc', 
        'zamowienie_set__pozycje', 
        'zamowienie_set__dostawa', 
        'zamowienie_set__rabat',
        'user'
    ).all().order_by('-id')