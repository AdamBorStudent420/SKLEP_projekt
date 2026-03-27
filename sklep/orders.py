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
    Dostawa, Rabat, StatusPlatnosci, Platnosc,
    HistoriaStatusowZamowienia  # <--- DODANY BRAKUJĄCY IMPORT
)

router = Router()

# ==========================================
# LOKALNA AUTORYZACJA JWT
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


# --- NOWE SCHEMATY POMOCNICZE (Muszą być zdefiniowane PRZED AdminOrderSchema) ---
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
        try:
            return obj.zmienione_przez.username if obj.zmienione_przez else "System"
        except Exception:
            return "System"


# --- SCHEMAT DLA PANELU PRACOWNIKA (Admin) ---
class AdminOrderSchema(Schema):
    id: int
    klient_dane: str
    adres_dostawy: Optional[str] = None
    dostawa_nazwa: Optional[str] = None
    rabat_info: Optional[str] = None
    status_platnosci: Optional[str] = None
    data_zamowienia: datetime
    status: str
    kwota: float
    
    # Nowe pola dla widoku szczegółów
    telefon: Optional[str] = None
    metoda_platnosci: Optional[str] = None
    uwagi_wewnetrzne: Optional[str] = None
    pozycje: Optional[List['PozycjaZamowieniaSchema']] = None
    historia: Optional[List['HistoriaStatusowSchema']] = None

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

    # --- BEZPIECZNE RESOLVERY ---
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
# ENDPOINTY DLA PANELU PRACOWNIKA (ADMIN)
# ==========================================

@router.get("/admin/lista", response=List[AdminOrderSchema], auth=auth)
def get_admin_orders(request):
    if not request.auth or not request.auth.get('is_staff'):
        return 403, {"detail": "Brak uprawnień. Zaloguj się jako pracownik."}
    
    # Optymalizacja zapytania - pobieramy od razu pozycje i historię
    return Zamowienie.objects.select_related(
        'klient', 'adres', 'platnosc', 'platnosc__status', 'dostawa', 'dostawa__rodzaj', 'rabat'
    ).prefetch_related(
        'pozycje', 'pozycje__towar', 'historia_statusow', 'historia_statusow__zmienione_przez'
    ).order_by('-data_zamowienia')


class NotatkiSchema(Schema):
    uwagi: str

class ZmianaStatusuSchema(Schema):
    status: str

@router.post("/admin/{order_id}/uwagi", auth=auth)
def update_uwagi(request, order_id: int, payload: NotatkiSchema):
    if not request.auth.get('is_staff'): return 403, "Brak dostępu"
    zamowienie = Zamowienie.objects.get(id=order_id)
    zamowienie.uwagi_wewnetrzne = payload.uwagi
    zamowienie.save()
    return {"success": True}

@router.post("/admin/{order_id}/status", auth=auth)
def update_status(request, order_id: int, payload: ZmianaStatusuSchema):
    if not request.auth.get('is_staff'): return 403, "Brak dostępu"
    zamowienie = Zamowienie.objects.get(id=order_id)
    
    stary_status = zamowienie.status
    zamowienie.status = payload.status
    zamowienie.save()
    
    # Automatyczny wpis do Dziennika Zdarzeń (Historii Statusów)
    user = User.objects.filter(username=request.auth.get('username')).first()
    HistoriaStatusowZamowienia.objects.create(
        zamowienie=zamowienie,
        stary_status=stary_status,
        nowy_status=payload.status,
        zmienione_przez=user
    )
    return {"success": True}
