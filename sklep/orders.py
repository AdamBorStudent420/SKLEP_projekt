import jwt
from datetime import datetime
from typing import List, Optional

from django.contrib.auth.models import User
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from ninja import Router, Schema
from ninja.security import HttpBearer

from .models import (
    Klient, Adres, Towar, Magazyn,
    Zamowienie, PozycjaZamowienia,
    Dostawa, Rabat, StatusPlatnosci, Platnosc,
    HistoriaStatusowZamowienia, MetodaPlatnosci, Reklamacja,
    StatusReklamacji, WiadomoscReklamacji
)

# ==========================================
# JWT Auth
# ==========================================
class JWTAuth(HttpBearer):
    def authenticate(self, request, token):
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            return payload
        except Exception:
            return None

auth = JWTAuth()
router = Router()

# ==========================================
# SCHEMATY TWORZENIA ZAMÓWIENIA
# ==========================================
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
    ulica: str
    nr_domu: str
    miasto: str
    kod_pocztowy: str

class ZamowienieSchema(Schema):
    is_guest: bool
    create_account: bool = False
    haslo: Optional[str] = None
    klient: KlientInfoSchema
    adres: Optional[AdresSchema] = None
    dostawa_id: int
    rabat_id: Optional[int] = None
    metoda_platnosci_id: int
    koszyk: List[PozycjaKoszykaSchema]


@router.post("/")
def create_order(request, data: ZamowienieSchema):
    # 1. Obsługa klienta (Gość lub Zalogowany)
    user = None
    if not data.is_guest and getattr(request, 'auth', None):
        try:
            user = User.objects.get(username=request.auth['username'])
            klient = Klient.objects.get(user=user)
        except (User.DoesNotExist, Klient.DoesNotExist):
            return 401, {"detail": "Nieznany użytkownik."}
    else:
        if data.create_account and data.haslo:
            if User.objects.filter(username=data.klient.email).exists():
                return 400, {"detail": "Użytkownik o takim e-mailu już istnieje."}
            user = User.objects.create_user(
                username=data.klient.email,
                email=data.klient.email,
                password=data.haslo,
                first_name=data.klient.imie,
                last_name=data.klient.nazwisko
            )
            klient = Klient.objects.create(
                user=user,
                imie=data.klient.imie,
                nazwisko=data.klient.nazwisko,
                email=data.klient.email,
                nr_tel=data.klient.nr_tel
            )
        else:
            klient = Klient.objects.create(
                imie=data.klient.imie,
                nazwisko=data.klient.nazwisko,
                email=data.klient.email,
                nr_tel=data.klient.nr_tel
            )

    # 2. Adres dostawy
    adres = None
    if data.adres:
        adres = Adres.objects.create(
            klient=klient,
            ulica=data.adres.ulica,
            nr_domu=data.adres.nr_domu,
            kod_pocztowy=data.adres.kod_pocztowy,
            miasto=data.adres.miasto
        )

    # 3. Weryfikacja Dostawy, Metody Płatności i Rabatu z Bazy
    try:
        dostawa = Dostawa.objects.get(id=data.dostawa_id)
    except Dostawa.DoesNotExist:
        return 400, {"detail": "Wybrana dostawa nie istnieje."}

    try:
        metoda_platnosci_obj = MetodaPlatnosci.objects.get(id=data.metoda_platnosci_id)
    except MetodaPlatnosci.DoesNotExist:
        return 400, {"detail": "Wybrana metoda płatności nie istnieje."}

    rabat = None
    if data.rabat_id:
        try:
            rabat = Rabat.objects.get(id=data.rabat_id)
        except Rabat.DoesNotExist:
            pass

    # 4. Utworzenie zamówienia i pozycji
    with transaction.atomic():
        zamowienie = Zamowienie.objects.create(
            klient=klient,
            adres=adres,
            dostawa=dostawa,
            rabat=rabat,
            status='NOWE',
            data_zamowienia=timezone.now()
        )

        suma_produktow = 0.0

        for item in data.koszyk:
            try:
                towar = Towar.objects.select_for_update().get(id=item.towar_id)
                magazyn = Magazyn.objects.get(towar=towar)
                
                if magazyn.ilosc_dostepna < item.ilosc:
                    raise ValueError(f"Brak wystarczającej ilości towaru: {towar.nazwa}")
                    
                magazyn.ilosc_dostepna -= item.ilosc
                magazyn.save()

                PozycjaZamowienia.objects.create(
                    zamowienie=zamowienie,
                    towar=towar,
                    ilosc=item.ilosc,
                    cena_sprzedazy=item.cena_sprzedazy
                )
                suma_produktow += float(item.cena_sprzedazy) * item.ilosc

            except Exception as e:
                transaction.set_rollback(True)
                return 400, {"detail": str(e)}

        # 5. Tworzenie transakcji płatniczej w bazie
        if rabat:
            suma_produktow = float(suma_produktow) * (1 - (float(rabat.procent) / 100))
            
        kwota_ostateczna = float(suma_produktow) + float(dostawa.cena_dostawy)

        status_oczekujaca, _ = StatusPlatnosci.objects.get_or_create(nazwa="Oczekująca")

        Platnosc.objects.create(
            zamowienie=zamowienie,
            data_platnosci=timezone.now(),
            kwota=round(kwota_ostateczna, 2),
            metoda=metoda_platnosci_obj,
            status=status_oczekujaca
        )

    return 200, {"success": True, "order_id": zamowienie.id}


# ==========================================
# WIDOKI DLA KLIENTA (SKLEP FRONTEND)
# ==========================================

class UserOrderSchema(Schema):
    id: int
    status: str
    data_utworzenia: str
    suma: float
    ma_reklamacje: bool = False

    @staticmethod
    def resolve_data_utworzenia(obj):
        return obj.data_zamowienia.strftime("%Y-%m-%d %H:%M")

    @staticmethod
    def resolve_status(obj):
        return obj.get_status_display()

    @staticmethod
    def resolve_suma(obj):
        try:
            return float(obj.platnosc.kwota)
        except Exception:
            # W razie braku obiektu płatności (fallback)
            suma = sum(float(p.cena_sprzedazy) * p.ilosc for p in obj.pozycje.all())
            if hasattr(obj, 'dostawa') and obj.dostawa:
                suma += float(obj.dostawa.cena_dostawy)
            if hasattr(obj, 'rabat') and obj.rabat:
                suma = suma * (1 - (float(obj.rabat.procent) / 100))
            return round(suma, 2)

    @staticmethod
    def resolve_ma_reklamacje(obj):
        return Reklamacja.objects.filter(pozycja__zamowienie=obj).exists()

@router.get("/", response=List[UserOrderSchema], auth=auth)
def get_user_orders(request):
    """Pobiera listę zamówień zalogowanego klienta wraz z historią jego reklamacji."""
    try:
        klient = Klient.objects.get(user__username=request.auth['username'])
        return Zamowienie.objects.filter(klient=klient).order_by('-data_zamowienia')
    except Klient.DoesNotExist:
        return []

class ZgloszenieReklamacjiSchema(Schema):
    tresc: str

@router.post("/{order_id}/reklamacja", auth=auth)
def zglos_reklamacje(request, order_id: int, payload: ZgloszenieReklamacjiSchema):
    """Zgłasza nową reklamację dla zrealizowanego zamówienia klienta"""
    try:
        klient = Klient.objects.get(user__username=request.auth['username'])
        zamowienie = Zamowienie.objects.get(id=order_id, klient=klient)
        
        if Reklamacja.objects.filter(pozycja__zamowienie=zamowienie).exists():
            return 400, {"detail": "Reklamacja do tego zamówienia została już zgłoszona."}
            
        pierwsza_pozycja = zamowienie.pozycje.first()
        if not pierwsza_pozycja:
            return 400, {"detail": "Zamówienie jest puste, brak produktów do reklamacji."}
        
        status_domyslny, _ = StatusReklamacji.objects.get_or_create(nazwa="Nowa")

        Reklamacja.objects.create(
            pozycja=pierwsza_pozycja,
            opis=payload.tresc,
            status=status_domyslny,
            data_zgloszenia=timezone.now()
        )
        return {"success": True}
    except Zamowienie.DoesNotExist:
        return 404, {"detail": "Zamówienie nie istnieje lub nie należy do Ciebie."}

# --- CZAT REKLAMACJI DLA KLIENTA ---
class WiadomoscSchema(Schema):
    autor: str
    tresc: str
    data_wyslania: str

    @staticmethod
    def resolve_data_wyslania(obj):
        return obj.data_wyslania.strftime("%Y-%m-%d %H:%M")

class UserComplaintReplySchema(Schema):
    id: int
    zamowienie_id: int
    data_zgloszenia: str
    opis: str
    wiadomosci: List[WiadomoscSchema]
    status: str = None

    @staticmethod
    def resolve_zamowienie_id(obj):
        return obj.pozycja.zamowienie.id

    @staticmethod
    def resolve_data_zgloszenia(obj):
        try:
            return obj.data_zgloszenia.strftime("%Y-%m-%d %H:%M")
        except Exception:
            return ""

    @staticmethod
    def resolve_wiadomosci(obj):
        return list(obj.wiadomosci.all().order_by('data_wyslania'))

@router.get("/reklamacje", response=List[UserComplaintReplySchema], auth=auth)
def get_user_complaints(request):
    """Pobiera listę reklamacji klienta wraz z historią konwersacji (czatu)."""
    try:
        klient = Klient.objects.get(user__username=request.auth['username'])
        return Reklamacja.objects.filter(
            pozycja__zamowienie__klient=klient
        ).select_related('pozycja__zamowienie').prefetch_related('wiadomosci').order_by('-data_zgloszenia')
    except Klient.DoesNotExist:
        return []

class NowaWiadomoscKlientaSchema(Schema):
    tresc: str

@router.post("/reklamacje/{reklamacja_id}/wiadomosc", auth=auth)
def odpowiedz_klienta_reklamacja(request, reklamacja_id: int, payload: NowaWiadomoscKlientaSchema):
    """Zapisuje wiadomość od klienta do istniejącej konwersacji w reklamacji"""
    try:
        klient = Klient.objects.get(user__username=request.auth['username'])
        reklamacja = Reklamacja.objects.get(id=reklamacja_id, pozycja__zamowienie__klient=klient)
        WiadomoscReklamacji.objects.create(
            reklamacja=reklamacja,
            tresc=payload.tresc,
            autor='KLIENT'
        )
        return {"success": True}
    except Reklamacja.DoesNotExist:
        return 404, {"detail": "Reklamacja nie istnieje."}


# ==========================================
# WIDOKI DLA PANELU PRACOWNIKA (ADMIN BACKOFFICE)
# ==========================================

class AdminOrderPozycjaSchema(Schema):
    nazwa: str
    ilosc: int
    cena_sprzedazy: float
    suma: float

    @staticmethod
    def resolve_nazwa(obj):
        return obj.towar.nazwa

    @staticmethod
    def resolve_suma(obj):
        return round(float(obj.cena_sprzedazy) * obj.ilosc, 2)

class AdminOrderHistoriaSchema(Schema):
    stary_status: str
    nowy_status: str
    data_zmiany: str
    zmienione_przez: str

    @staticmethod
    def resolve_data_zmiany(obj):
        return obj.data_zmiany.isoformat()

    @staticmethod
    def resolve_zmienione_przez(obj):
        return obj.zmienione_przez.username if obj.zmienione_przez else "System"

class AdminOrderSchema(Schema):
    id: int
    klient_dane: str
    telefon: str
    data_zamowienia: str
    status: str
    kwota: float
    adres_dostawy: str
    dostawa_nazwa: str
    metoda_platnosci: str
    status_platnosci: str
    rabat_info: str
    uwagi_wewnetrzne: Optional[str] = None
    pozycje: List[AdminOrderPozycjaSchema]
    historia: List[AdminOrderHistoriaSchema]

    @staticmethod
    def resolve_klient_dane(obj):
        try:
            return f"{obj.klient.imie} {obj.klient.nazwisko} ({obj.klient.email})"
        except Exception:
            return "Brak danych klienta"

    @staticmethod
    def resolve_telefon(obj):
        try:
            return obj.klient.nr_tel
        except Exception:
            return "Brak telefonu"

    @staticmethod
    def resolve_data_zamowienia(obj):
        return obj.data_zamowienia.isoformat()

    @staticmethod
    def resolve_kwota(obj):
        try:
            return float(obj.platnosc.kwota)
        except Exception:
            return 0.0

    @staticmethod
    def resolve_adres_dostawy(obj):
        if hasattr(obj, 'adres') and obj.adres:
            a = obj.adres
            return f"{a.ulica} {a.nr_domu}, {a.kod_pocztowy} {a.miasto}"
        return "Brak"

    @staticmethod
    def resolve_dostawa_nazwa(obj):
        return obj.dostawa.rodzaj.nazwa if obj.dostawa else "Brak"

    @staticmethod
    def resolve_metoda_platnosci(obj):
        try:
            return obj.platnosc.metoda.nazwa
        except Exception:
            return "Brak (nieopłacone)"

    @staticmethod
    def resolve_status_platnosci(obj):
        try:
            return obj.platnosc.status.nazwa
        except Exception:
            return "Brak płatności"

    @staticmethod
    def resolve_rabat_info(obj):
        if obj.rabat:
            return f"{obj.rabat.nazwa} (-{obj.rabat.procent}%)"
        return "Brak"

    @staticmethod
    def resolve_pozycje(obj):
        return list(obj.pozycje.all())

    @staticmethod
    def resolve_historia(obj):
        return list(obj.historia_statusow.all().order_by('-data_zmiany'))


@router.get("/admin/lista", response=List[AdminOrderSchema], auth=auth)
def get_admin_orders(request):
    """Pobiera wszystkie zamówienia do widoku 'Zamówienia' w Panelu Pracownika."""
    if not request.auth.get('is_staff'):
        return 403, {"detail": "Brak uprawnień."}
    
    return Zamowienie.objects.select_related(
        'klient', 'adres', 'dostawa__rodzaj', 'rabat', 'platnosc__metoda', 'platnosc__status'
    ).prefetch_related(
        'pozycje__towar', 'historia_statusow__zmienione_przez'
    ).all().order_by('-data_zamowienia')


@router.post("/admin/{order_id}/oznacz-oplacone", auth=auth)
def mark_order_paid(request, order_id: int):
    """Ręcznie zaksięgowuje płatność dla zamówienia (zmienia status płatności oraz zamówienia)."""
    if not request.auth.get('is_staff'):
        return 403, {"detail": "Brak uprawnień."}
    
    try:
        zamowienie = Zamowienie.objects.get(id=order_id)
        platnosc = zamowienie.platnosc
        status_zakonczona, _ = StatusPlatnosci.objects.get_or_create(nazwa="Zakończona")
        platnosc.status = status_zakonczona
        platnosc.save()

        stary_status = zamowienie.status
        zamowienie.status = 'OPLACONE'
        zamowienie.save()

        user = User.objects.filter(username=request.auth.get('username')).first()
        HistoriaStatusowZamowienia.objects.create(
            zamowienie=zamowienie,
            stary_status=stary_status,
            nowy_status='OPLACONE',
            zmienione_przez=user
        )

        return {"success": True}
    except Zamowienie.DoesNotExist:
        return 404, {"detail": "Zamówienie nie istnieje."}
    except Platnosc.DoesNotExist:
        return 404, {"detail": "Zamówienie nie posiada przypisanej płatności."}