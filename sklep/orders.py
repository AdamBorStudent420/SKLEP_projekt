from ninja import Router, Schema
from typing import List, Optional
from django.utils import timezone
from django.db import transaction
from django.contrib.auth.models import User
from datetime import datetime
from ninja.responses import Response


# Dodane importy dla autoryzacji JWT:
import jwt
from django.conf import settings
from ninja.security import HttpBearer

from .models import (
    Klient, Adres, Towar, Magazyn,
    Zamowienie, PozycjaZamowienia,
    Dostawa, Rabat, StatusPlatnosci, Platnosc
)

router = Router()

# ==========================================
# LOKALNA AUTORYZACJA JWT (Naprawia NameError)
# ==========================================
class JWTAuth(HttpBearer):
    def authenticate(self, request, token):
        try:
            return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        except Exception:
            return None

auth = JWTAuth()

# ============================
# SCHEMATY DANYCH
# ============================

class PozycjaKoszykaSchema(Schema):
    towar_id: int
    ilosc: int
    cena_sprzedazy: float

class KlientInfoSchema(Schema):
    imie: str
    nazwisko: str
    email: str
    nr_tel: str

class AdresSchema(Schema):
    ulica: str = ""
    nr_domu: str = ""
    miasto: str = ""
    kod_pocztowy: str = ""

# Rozszerzony schemat zgodny z danymi wysyłanymi przez React (App.jsx)
class ZamowienieSchema(Schema):
    is_guest: bool
    create_account: bool = False
    haslo: Optional[str] = None
    klient: KlientInfoSchema
    adres: Optional[AdresSchema] = None
    dostawa_id: int
    rabat_id: Optional[int] = None
    metoda_platnosci: str
    koszyk: List[PozycjaKoszykaSchema]


# Schemat dla Panelu Pracownika (Admin)
class AdminOrderSchema(Schema):
    id: int
    klient_dane: str
    data_zamowienia: datetime
    status: str
    kwota: float

    @staticmethod
    def resolve_klient_dane(obj):
        return f"{obj.klient.imie} {obj.klient.nazwisko} ({obj.klient.email})"

    @staticmethod
    def resolve_kwota(obj):
        # Próbuje pobrać kwotę z płatności (jeśli istnieje)
        try:
            return float(obj.platnosc.kwota)
        except Exception:
            # Fallback: Obliczenie sumy na podstawie pozycji
            suma = sum(float(p.cena_sprzedazy) * p.ilosc for p in obj.pozycje.all())
            if hasattr(obj, 'dostawa'):
                suma += float(obj.dostawa.cena_dostawy)
            if hasattr(obj, 'rabat') and obj.rabat:
                suma = suma * (1 - (float(obj.rabat.procent) / 100))
            return round(suma, 2)


# ============================
# ENDPOINT TWORZENIA ZAMÓWIENIA
# ============================

@router.post("/")
@transaction.atomic  # Gwarantuje bezpieczeństwo bazy (anuluje w razie błędu braku na magazynie)
def create_order(request, data: ZamowienieSchema):

    # 1. Zarządzanie Gościem / Nowym kontem
    user_konta = None
    
    if data.is_guest and data.create_account and data.haslo:
        # Zakładanie konta w locie dla gościa
        if not User.objects.filter(username=data.klient.email).exists():
            user_konta = User.objects.create_user(
                username=data.klient.email,
                email=data.klient.email,
                password=data.haslo,
                first_name=data.klient.imie,
                last_name=data.klient.nazwisko
            )

    # Szukamy klienta po e-mailu lub tworzymy nowego (obsługa gości)
    klient = Klient.objects.filter(email=data.klient.email).first()
    if not klient:
        klient = Klient.objects.create(
            user=user_konta,
            imie=data.klient.imie,
            nazwisko=data.klient.nazwisko,
            email=data.klient.email,
            nr_tel=data.klient.nr_tel
        )
    elif user_konta and not klient.user:
        klient.user = user_konta
        klient.save()

    # 2. Tworzymy adres (lub atrapę dla odbioru osobistego)
    if not data.adres or not data.adres.ulica:
        adres = Adres.objects.create(
            klient=klient, miasto="Odbiór Osobisty", ulica="-", kod_pocztowy="-", nr_domu="-"
        )
    else:
        adres = Adres.objects.create(
            klient=klient,
            miasto=data.adres.miasto,
            ulica=data.adres.ulica,
            kod_pocztowy=data.adres.kod_pocztowy,
            nr_domu=data.adres.nr_domu
        )

    # 3. Dostawa i Rabat
    try:
        dostawa = Dostawa.objects.get(id=data.dostawa_id)
    except Dostawa.DoesNotExist:
        return 400, {"detail": "Wybrana dostawa nie istnieje."}

    rabat = None
    if data.rabat_id:
        try:
            rabat = Rabat.objects.get(id=data.rabat_id)
        except Rabat.DoesNotExist:
            pass

    # 4. Tworzymy zamówienie

    zamowienie = Zamowienie.objects.create(
        klient=klient,
        adres=adres,
        dostawa=dostawa,
        rabat=rabat,
        data_zamowienia=timezone.now(),
        status=Zamowienie.StatusZamowienia.NOWE
    )

    # 5. Pozycje zamówienia + bezpieczne odejmowanie z magazynu
    suma_produktow = 0

    for item in data.koszyk:
        # Zabezpieczenie przed jednoczesnym zakupem (select_for_update)
        towar = Towar.objects.select_for_update().get(id=item.towar_id)
        magazyn = towar.magazyn

        if magazyn.ilosc_dostepna < item.ilosc:
            return 400, {"detail": f"Brak wystarczającej ilości towaru: {towar.nazwa}"}

        magazyn.ilosc_dostepna -= item.ilosc
        magazyn.save()

        PozycjaZamowienia.objects.create(
            zamowienie=zamowienie,
            towar=towar,
            ilosc=item.ilosc,
            cena_sprzedazy=item.cena_sprzedazy
        )
        suma_produktow += (item.ilosc * item.cena_sprzedazy)

    # 6. Kalkulacja i Płatność
    if rabat:
        suma_produktow = float(suma_produktow) * (1 - (float(rabat.procent) / 100))
        
    kwota_ostateczna = float(suma_produktow) + float(dostawa.cena_dostawy)

    status_oczekujaca, _ = StatusPlatnosci.objects.get_or_create(nazwa="Oczekująca")

    Platnosc.objects.create(
        zamowienie=zamowienie,
        data_platnosci=timezone.now(),
        kwota=round(kwota_ostateczna, 2),
        metoda=data.metoda_platnosci,
        status=status_oczekujaca
    )

    return 200, {"success": True, "order_id": zamowienie.id}

# ==========================================
# ENDPOINT DLA PANELU PRACOWNIKA (ADMIN)
# ==========================================

@router.get("/admin/lista", response=List[AdminOrderSchema], auth=auth)
def get_admin_orders(request):
    """Pobiera wszystkie zamówienia dla widoku panelu pracownika."""
    # Bezpieczeństwo: sprawdzamy w request.auth (z JWT) czy użytkownik jest personelem
    if not request.auth or not request.auth.get('is_staff'):
        return 403, {"detail": "Brak uprawnień. Zaloguj się jako pracownik."}
    
    # Optymalizacja zapytań SQL przy użyciu select_related i prefetch_related
    return Zamowienie.objects.select_related(
        'klient', 'platnosc', 'dostawa', 'rabat'
    ).prefetch_related('pozycje').order_by('-data_zamowienia')



# ==========================================
# ENDPOINT DLA ZALOGOWANEGO UŻYTKOWNIKA
# ==========================================

class UserOrderSchema(Schema):
    id: int
    data_utworzenia: datetime
    status: str
    suma: float
    

@router.get("/", auth=auth, response=List[UserOrderSchema])
def get_user_orders(request):
    """Pobiera zamówienia zalogowanego użytkownika"""
    
    if not request.auth:
        return 401, {"detail": "Musisz być zalogowany"}
    
    user_id = request.auth.get('user_id')
    
    try:
        klient = Klient.objects.get(user_id=user_id)
    except Klient.DoesNotExist:
        return 404, {"detail": "Profil klienta nie istnieje"}
    
    zamowienia = Zamowienie.objects.filter(klient=klient).order_by('-data_zamowienia')
    
    result = []
    for z in zamowienia:
        try:
            kwota = float(z.platnosc.kwota) if hasattr(z, 'platnosc') and z.platnosc else 0
        except:
            kwota = 0
        
        result.append({
            "id": z.id,
            "data_utworzenia": z.data_zamowienia,
            "status": z.status,
            "suma": kwota,
        })
    
    return result