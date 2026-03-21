import jwt
from datetime import datetime, timedelta
from typing import List, Optional

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.conf import settings
from ninja import NinjaAPI, Schema

from .models import Towar, Klient, Dostawa, Rabat, Kategoria

# Inicjalizacja instancji API
api = NinjaAPI(title="Sklep Komputerowy API", version="1.0.0")

# ==========================================
# SCHEMATY DANYCH (Sposób formatowania JSON)
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
        # Wyciągamy nazwę z powiązanego modelu RodzajDostawy
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
# ENDPOINTY (Trasy API)
# ==========================================

@api.get("/produkty/", response=List[ProduktSchema])
def get_produkty(request):
    """Pobieranie asortymentu wraz ze szczegółami i optymalizacją zapytań SQL."""
    produkty = Towar.objects.select_related(
        'kategoria', 
        'podkategoria',
        'magazyn'
    ).prefetch_related(
        'wartosci_atrybutow__atrybut'
    ).all()
    return produkty

@api.get("/kategorie/", response=List[KategoriaSchema])
def get_kategorie(request):
    """Pobieranie drzewa kategorii i podkategorii."""
    return Kategoria.objects.prefetch_related('podkategorie').all()

@api.get("/dostawy/", response=List[DostawaSchema])
def get_dostawy(request):
    """Pobieranie dostępnych metod dostawy."""
    return Dostawa.objects.select_related('rodzaj').all()

@api.get("/rabaty/", response=List[RabatSchema])
def get_rabaty(request):
    """Pobieranie aktywnych kodów rabatowych."""
    return Rabat.objects.filter(aktywny=True)

@api.post("/login/")
def login(request, data: LoginSchema):
    """Logowanie użytkownika i wydawanie tokena JWT."""
    print(f"\n[DEBUG API] Otrzymano żądanie logowania dla: '{data.username}'")
    
    # Ekspercka diagnostyka środowiska
    try:
        print(f"[DEBUG API] Fizyczna ścieżka biblioteki jwt: {jwt.__file__}")
    except Exception as e:
        print(f"[DEBUG API] Nie można ustalić ścieżki jwt: {e}")

    user = authenticate(request, username=data.username, password=data.password)
    
    if user is not None:
        print(f"[DEBUG API] Sukces! Hasło poprawne. Generowanie JWT dla: {user.username}\n")
        payload = {
            'user_id': user.id,
            'username': user.username,
            'exp': datetime.utcnow() + timedelta(days=1)
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        return {"token": token, "username": user.username}
    
    print(f"[DEBUG API] BŁĄD: Nie znaleziono użytkownika '{data.username}' lub hasło jest błędne!\n")
    return api.create_response(request, {"detail": "Błędne dane logowania"}, status=401)

@api.post("/register/")
def register(request, data: RegisterSchema):
    """Rejestracja nowego klienta i powiązanego konta w Django."""
    print(f"\n[DEBUG API] Otrzymano żądanie rejestracji dla: '{data.username}'")

    if User.objects.filter(username=data.username).exists():
        return api.create_response(request, {"detail": "Użytkownik o takim loginie już istnieje."}, status=400)
    
    if User.objects.filter(email=data.email).exists():
        return api.create_response(request, {"detail": "Ten adres e-mail jest już zajęty."}, status=400)

    # 1. Tworzenie użytkownika systemowego (Django User) z szyfrowaniem hasła
    user = User.objects.create_user(
        username=data.username,
        password=data.password,
        email=data.email,
        first_name=data.imie,
        last_name=data.nazwisko
    )

    # 2. Tworzenie profilu Klienta w Twoim modelu
    Klient.objects.create(
        user=user,
        imie=data.imie,
        nazwisko=data.nazwisko,
        email=data.email,
        nr_tel=data.nr_tel
    )

    # 3. Od razu logujemy nowo zarejestrowanego użytkownika (wydajemy token)
    payload = {
        'user_id': user.id,
        'username': user.username,
        'exp': datetime.utcnow() + timedelta(days=1)
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
    
    print(f"[DEBUG API] Sukces! Utworzono konto i zalogowano: {user.username}\n")
    return {"token": token, "username": user.username}