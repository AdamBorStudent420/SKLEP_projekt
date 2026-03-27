import jwt
import json
from datetime import datetime, timedelta
from typing import List, Optional, Dict

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .orders import router as orders_router

from ninja import NinjaAPI, Schema, Form, File
from ninja.files import UploadedFile
from ninja.security import HttpBearer

from .models import (
    Towar, Klient, Dostawa, Rabat, Kategoria, Podkategoria, 
    Magazyn, Atrybut, WartoscAtrybutu, HistoriaStatusowZamowienia, 
    Zamowienie, ZdjecieTowaru, Opinia, PozycjaZamowienia, MetodaPlatnosci,
    Reklamacja, WiadomoscReklamacji, StatusReklamacji
)

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
api.add_router("/zamowienia/", orders_router)


# ==========================================
# SCHEMATY DANYCH (Katalog i Podstawy)
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

class ZdjecieTowaruSchema(Schema):
    id: int
    url: str

    @staticmethod
    def resolve_url(obj):
        return obj.zdjecie.url if obj.zdjecie else ""

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
    dodatkowe_zdjecia: List[ZdjecieTowaruSchema] = []
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
    def resolve_dodatkowe_zdjecia(obj):
        return list(obj.dodatkowe_zdjecia.all())

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

class MetodaPlatnosciSchema(Schema):
    id: int
    nazwa: str


# ==========================================
# OPINIE PRODUKTÓW I WERYFIKACJA ZAKUPU
# ==========================================

class OpiniaSklepSchema(Schema):
    id: int
    imie_klienta: str
    ocena: int
    tresc: str
    data_wystawienia: str
    odpowiedz_pracownika: Optional[str] = None
    data_odpowiedzi: str

    @staticmethod
    def resolve_imie_klienta(obj):
        try:
            return obj.klient.imie if obj.klient.imie else "Użytkownik"
        except Exception:
            return "Użytkownik"

    @staticmethod
    def resolve_data_wystawienia(obj):
        try:
            return obj.data_wystawienia.strftime("%Y-%m-%d") if obj.data_wystawienia else ""
        except Exception:
            return ""

    @staticmethod
    def resolve_data_odpowiedzi(obj):
        try:
            return obj.data_odpowiedzi.strftime("%Y-%m-%d") if obj.data_odpowiedzi else ""
        except Exception:
            return ""

class NowaOpiniaSchema(Schema):
    ocena: int
    tresc: str

@api.get("/produkty/{towar_id}/opinie", response=List[OpiniaSklepSchema])
def get_opinie_produktu(request, towar_id: int):
    """Pobiera wszystkie opinie dla danego produktu na stronie sklepu"""
    return Opinia.objects.filter(towar_id=towar_id).order_by('-data_wystawienia')

@api.get("/produkty/{towar_id}/czy-moze-ocenic", auth=auth)
def czy_moze_ocenic(request, towar_id: int):
    """Weryfikuje, czy aktualny klient kupił ten towar i czy już go ocenił"""
    try:
        user = User.objects.get(username=request.auth['username'])
        klient = Klient.objects.filter(user=user).first()
        
        if not klient:
            return {"can_review": False, "kupil": False, "juz_ocenil": False}

        kupil = PozycjaZamowienia.objects.filter(
            zamowienie__klient=klient,
            towar_id=towar_id,
            zamowienie__status__in=['W_REALIZACJI', 'WYSLANE', 'DOSTARCZONE', 'OPLACONE']
        ).exists()

        juz_ocenil = Opinia.objects.filter(klient=klient, towar_id=towar_id).exists()

        return {
            "can_review": kupil and not juz_ocenil,
            "kupil": kupil,
            "juz_ocenil": juz_ocenil
        }
    except Exception:
        return {"can_review": False, "kupil": False, "juz_ocenil": False}

@api.post("/produkty/{towar_id}/opinie", auth=auth)
def dodaj_opinie(request, towar_id: int, payload: NowaOpiniaSchema):
    """Dodaje opinię po sprawdzeniu czy klient kupił towar"""
    user = User.objects.get(username=request.auth['username'])
    klient = Klient.objects.filter(user=user).first()
    
    if not klient:
        return api.create_response(request, {"detail": "Musisz mieć uzupełniony profil klienta."}, status=400)

    kupil = PozycjaZamowienia.objects.filter(
        zamowienie__klient=klient,
        towar_id=towar_id,
        zamowienie__status__in=['W_REALIZACJI', 'WYSLANE', 'DOSTARCZONE', 'OPLACONE']
    ).exists()

    if not kupil:
        return api.create_response(request, {"detail": "Możesz ocenić tylko produkty, które fizycznie zamówiłeś w naszym sklepie."}, status=403)

    if Opinia.objects.filter(klient=klient, towar_id=towar_id).exists():
        return api.create_response(request, {"detail": "Dodałeś już opinię do tego produktu wcześniej."}, status=400)

    Opinia.objects.create(
        klient=klient,
        towar_id=towar_id,
        ocena=payload.ocena,
        tresc=payload.tresc,
        data_wystawienia=timezone.now()
    )
    return {"success": True}

class AdminOpiniaSchema(Schema):
    id: int
    tresc_skrocona: str
    pelna_tresc: str
    towar_nazwa: str
    towar_zdjecie: str
    klient_dane: str
    ocena: int
    data_wystawienia: str
    odpowiedz_pracownika: Optional[str] = None

    @staticmethod
    def resolve_tresc_skrocona(obj):
        try:
            words = obj.tresc.split()
            if len(words) > 10:
                return " ".join(words[:10]) + "..."
            return obj.tresc
        except Exception:
            return ""

    @staticmethod
    def resolve_pelna_tresc(obj):
        return obj.tresc or ""

    @staticmethod
    def resolve_towar_nazwa(obj):
        try:
            return obj.towar.nazwa
        except Exception:
            return "Usunięty produkt"

    @staticmethod
    def resolve_towar_zdjecie(obj):
        try:
            return obj.towar.zdjecie.url if obj.towar.zdjecie else ""
        except Exception:
            return ""

    @staticmethod
    def resolve_klient_dane(obj):
        try:
            return f"{obj.klient.imie} {obj.klient.nazwisko} ({obj.klient.email})"
        except Exception:
            return "Nieznany Klient"

    @staticmethod
    def resolve_data_wystawienia(obj):
        try:
            return obj.data_wystawienia.strftime("%Y-%m-%d %H:%M") if obj.data_wystawienia else ""
        except Exception:
            return ""

@api.get("/admin/opinie", response=List[AdminOpiniaSchema], auth=auth)
def get_admin_opinie(request):
    """Zwraca wszystkie opinie do panelu pracownika"""
    if not request.auth.get('is_staff'):
        return api.create_response(request, {"detail": "Brak uprawnień."}, status=403)
    
    return Opinia.objects.select_related('towar', 'klient').all().order_by('-data_wystawienia')

class OdpowiedzOpiniaSchema(Schema):
    odpowiedz: str

@api.post("/admin/opinie/{opinia_id}/odpowiedz", auth=auth)
def odpowiedz_na_opinie(request, opinia_id: int, payload: OdpowiedzOpiniaSchema):
    """Zapisuje odpowiedź pracownika do opinii klienta"""
    if not request.auth.get('is_staff'):
        return api.create_response(request, {"detail": "Brak uprawnień."}, status=403)
    
    try:
        opinia = Opinia.objects.get(id=opinia_id)
        opinia.odpowiedz_pracownika = payload.odpowiedz
        opinia.data_odpowiedzi = timezone.now()
        opinia.save()
        return {"success": True}
    except Opinia.DoesNotExist:
        return api.create_response(request, {"detail": "Opinia nie istnieje."}, status=404)


# ==========================================
# REKLAMACJE (WIDOKI ADMINA - CZAT I STATUSY)
# ==========================================

# --- ZARZĄDZANIE STATUSEM REKLAMACJI ---
class StatusReklamacjiSchema(Schema):
    id: int
    nazwa: str

@api.get("/admin/reklamacje/statusy", response=List[StatusReklamacjiSchema], auth=auth)
def get_statusy_reklamacji(request):
    if not request.auth.get('is_staff'):
        return api.create_response(request, {"detail": "Brak uprawnień."}, status=403)
    return StatusReklamacji.objects.all()

class UpdateReklamacjaStatusSchema(Schema):
    status_id: int

@api.put("/admin/reklamacje/{reklamacja_id}/status", auth=auth)
def update_reklamacja_status(request, reklamacja_id: int, payload: UpdateReklamacjaStatusSchema):
    if not request.auth.get('is_staff'):
        return api.create_response(request, {"detail": "Brak uprawnień."}, status=403)
    
    reklamacja = Reklamacja.objects.get(id=reklamacja_id)
    status_obj = StatusReklamacji.objects.get(id=payload.status_id)
    reklamacja.status = status_obj
    reklamacja.save()
    return {"success": True, "nowy_status": status_obj.nazwa}


# --- POBIERANIE CZATU REKLAMACJI ---
class WiadomoscSchema(Schema):
    autor: str
    tresc: str
    data_wyslania: str

    @staticmethod
    def resolve_data_wyslania(obj):
        return obj.data_wyslania.strftime("%Y-%m-%d %H:%M")

class AdminReklamacjaSchema(Schema):
    id: int
    zamowienie_id: int
    klient_dane: str
    tresc_skrocona: str
    pelna_tresc: str
    data_zgloszenia: str
    wiadomosci: List[WiadomoscSchema]
    status: str = None
    status_id: int = None
    
    @staticmethod
    def resolve_zamowienie_id(obj):
        return obj.pozycja.zamowienie.id
        
    @staticmethod
    def resolve_klient_dane(obj):
        try:
            k = obj.pozycja.zamowienie.klient
            return f"{k.imie} {k.nazwisko} ({k.email})"
        except Exception:
            return "Nieznany klient"

    @staticmethod
    def resolve_tresc_skrocona(obj):
        try:
            words = obj.opis.split()
            return " ".join(words[:10]) + "..." if len(words) > 10 else obj.opis
        except Exception:
            return ""

    @staticmethod
    def resolve_pelna_tresc(obj):
        return obj.opis or ""

    @staticmethod
    def resolve_data_zgloszenia(obj):
        try:
            return obj.data_zgloszenia.strftime("%Y-%m-%d %H:%M") if obj.data_zgloszenia else ""
        except Exception:
            return ""

    @staticmethod
    def resolve_wiadomosci(obj):
        return list(obj.wiadomosci.all().order_by('data_wyslania'))
        
    @staticmethod
    def resolve_status(obj):
        return obj.status.nazwa if hasattr(obj, 'status') and obj.status else "Brak"

    @staticmethod
    def resolve_status_id(obj):
        return obj.status.id if hasattr(obj, 'status') and obj.status else None

@api.get("/admin/reklamacje", response=List[AdminReklamacjaSchema], auth=auth)
def get_admin_reklamacje(request):
    if not request.auth.get('is_staff'):
        return api.create_response(request, {"detail": "Brak uprawnień."}, status=403)
    
    return Reklamacja.objects.select_related(
        'pozycja__zamowienie__klient', 'status'
    ).prefetch_related('wiadomosci').all().order_by('-data_zgloszenia')

class OdpowiedzReklamacjaSchema(Schema):
    odpowiedz: str

@api.post("/admin/reklamacje/{reklamacja_id}/odpowiedz", auth=auth)
def odpowiedz_na_reklamacje(request, reklamacja_id: int, payload: OdpowiedzReklamacjaSchema):
    """Zapisuje odpowiedź pracownika jako kolejną wiadomość w czacie reklamacyjnym"""
    if not request.auth.get('is_staff'):
        return api.create_response(request, {"detail": "Brak uprawnień."}, status=403)
    
    reklamacja = Reklamacja.objects.get(id=reklamacja_id)
    
    WiadomoscReklamacji.objects.create(
        reklamacja=reklamacja,
        tresc=payload.odpowiedz,
        autor='SKLEP' # Oznaczamy, że wysłał pracownik
    )
    return {"success": True}


# ==========================================
# PUBLICZNE ENDPOINTY SKLEPU
# ==========================================

@api.get("/produkty/", response=List[ProduktSchema])
def get_produkty(request):
    return Towar.objects.select_related(
        'kategoria', 'podkategoria', 'magazyn'
    ).prefetch_related(
        'wartosci_atrybutow__atrybut', 'dodatkowe_zdjecia'
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

@api.get("/metody-platnosci/", response=List[MetodaPlatnosciSchema])
def get_metody_platnosci(request):
    return MetodaPlatnosci.objects.filter(aktywna=True)

@api.get("/atrybuty/", response=List[AtrybutSlownikSchema])
def get_atrybuty(request, kategoria_id: Optional[int] = None, podkategoria_id: Optional[int] = None):
    qs = Atrybut.objects.all()
    
    if podkategoria_id:
        uzyte_id = WartoscAtrybutu.objects.filter(
            towar__podkategoria_id=podkategoria_id
        ).values_list('atrybut_id', flat=True).distinct()
        qs = qs.filter(id__in=uzyte_id)
    elif kategoria_id:
        uzyte_id = WartoscAtrybutu.objects.filter(
            towar__kategoria_id=kategoria_id
        ).values_list('atrybut_id', flat=True).distinct()
        qs = qs.filter(id__in=uzyte_id)
        
    return qs

class AdminCustomerOrderSchema(Schema):
    id: int
    data_zamowienia: str
    status: str
    kwota: float
    @staticmethod
    def resolve_data_zamowienia(obj): return obj.data_zamowienia.strftime("%Y-%m-%d %H:%M")
    @staticmethod
    def resolve_status(obj): return obj.get_status_display()
    @staticmethod
    def resolve_kwota(obj):
        try: return float(obj.platnosc.kwota)
        except: return 0.0

class AdminCustomerSchema(Schema):
    id: int
    imie: str
    nazwisko: str
    email: str
    telefon: str
    typ: str
    liczba_zamowien: int
    laczna_kwota: float
    zamowienia: List[AdminCustomerOrderSchema]

    @staticmethod
    def resolve_telefon(obj): return obj.nr_tel
    @staticmethod
    def resolve_typ(obj): return "Zarejestrowany" if obj.user else "Gość"
    @staticmethod
    def resolve_liczba_zamowien(obj): return obj.zamowienie_set.count()
    @staticmethod
    def resolve_laczna_kwota(obj):
        total = 0
        for z in obj.zamowienie_set.all():
            try: total += float(z.platnosc.kwota)
            except: pass
        return round(total, 2)
    @staticmethod
    def resolve_zamowienia(obj): return list(obj.zamowienie_set.all().order_by('-data_zamowienia'))

@api.get("/admin/klienci", response=List[AdminCustomerSchema], auth=auth)
def get_admin_customers(request):
    """Pobiera bazę klientów dla panelu pracownika"""
    if not request.auth.get('is_staff'):
        return api.create_response(request, {"detail": "Brak uprawnień."}, status=403)
    return Klient.objects.prefetch_related('zamowienie_set__platnosc').all()


# ==========================================
# LOGOWANIE I REJESTRACJA
# ==========================================

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
            
        dodatkowe_pliki = request.FILES.getlist('dodatkowe_zdjecia')
        for plik in dodatkowe_pliki:
            ZdjecieTowaru.objects.create(towar=towar, zdjecie=plik)
            
        Magazyn.objects.create(
            towar=towar,
            ilosc_dostepna=data.get('ilosc_dostepna', 0)
        )

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
        
    return {"success": True, "towar_id": towar.id, "message": "Produkt dodany pomyślnie"}


class NowyAtrybutSchema(Schema):
    nazwa: str
    podkategoria_id: int

@api.post("/admin/atrybuty", auth=auth)
def dodaj_atrybut(request, payload: NowyAtrybutSchema):
    if not request.auth.get('is_staff'):
        return api.create_response(request, {"detail": "Brak uprawnień."}, status=403)
    
    podkategoria = Podkategoria.objects.get(id=payload.podkategoria_id)
    
    try:
        atrybut, created = Atrybut.objects.get_or_create(nazwa=payload.nazwa, podkategoria=podkategoria)
    except Exception:
        atrybut, created = Atrybut.objects.get_or_create(nazwa=payload.nazwa)
        if hasattr(atrybut, 'podkategorie'):
            atrybut.podkategorie.add(podkategoria)
    
    return {"id": atrybut.id, "nazwa": atrybut.nazwa, "wartosci": []}


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
        towar.nazwa = data.get('nazwa', towar.nazwa)
        towar.producent = data.get('producent', towar.producent)
        towar.opis = data.get('opis', towar.opis)
        towar.cena_jednostkowa = data.get('cena_jednostkowa', towar.cena_jednostkowa)
        towar.cena_promocyjna = data.get('cena_promocyjna') or None
        towar.kategoria_id = data.get('kategoria_id') or None
        towar.podkategoria_id = data.get('podkategoria_id') or None
        
        if zdjecie:
            towar.zdjecie.save(zdjecie.name, zdjecie)
            
        towar.save()

        usuniete_ids_json = request.POST.get('usuniete_zdjecia')
        if usuniete_ids_json:
            usuniete_ids = json.loads(usuniete_ids_json)
            ZdjecieTowaru.objects.filter(id__in=usuniete_ids, towar=towar).delete()

        dodatkowe_pliki = request.FILES.getlist('dodatkowe_zdjecia')
        for plik in dodatkowe_pliki:
            ZdjecieTowaru.objects.create(towar=towar, zdjecie=plik)

        magazyn, _ = Magazyn.objects.get_or_create(towar=towar, defaults={'ilosc_dostepna': 0})
        magazyn.ilosc_dostepna = data.get('ilosc_dostepna', magazyn.ilosc_dostepna)
        magazyn.save()

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


# ==========================================
# PROFIL UŻYTKOWNIKA (/me)
# ==========================================

class UserProfileSchema(Schema):
    username: str
    email: str
    imie: str = ""
    nazwisko: str = ""
    nr_tel: str = ""

@api.get("/me", response=UserProfileSchema, auth=auth)
def get_me(request):
    user = User.objects.get(username=request.auth['username'])
    klient = Klient.objects.filter(user=user).first()
    
    return {
        "username": user.username,
        "email": user.email,
        "imie": klient.imie if klient else user.first_name,
        "nazwisko": klient.nazwisko if klient else user.last_name,
        "nr_tel": klient.nr_tel if klient else ""
    }

class ProfileUpdateSchema(Schema):
    imie: str
    nazwisko: str
    email: str
    nr_tel: str

@api.put("/me", auth=auth)
def update_me(request, payload: ProfileUpdateSchema):
    user = User.objects.get(username=request.auth['username'])
    
    user.email = payload.email
    user.first_name = payload.imie
    user.last_name = payload.nazwisko
    user.save()

    klient, created = Klient.objects.get_or_create(user=user)
    klient.imie = payload.imie
    klient.nazwisko = payload.nazwisko
    klient.email = payload.email
    klient.nr_tel = payload.nr_tel
    klient.save()

    return {
        "success": True, 
        "user": {
            "username": user.username,
            "email": user.email,
            "imie": klient.imie,
            "nazwisko": klient.nazwisko,
            "nr_tel": klient.nr_tel
        }
    }