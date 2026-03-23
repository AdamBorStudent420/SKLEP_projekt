from ninja import Router, Schema
from typing import List, Optional
from django.utils import timezone

from .models import (
    Klient, Adres, Towar, Magazyn,
    Zamowienie, PozycjaZamowienia,
    Dostawa, Rabat
)

router = Router()

# ============================
# SCHEMATY DANYCH
# ============================

class PozycjaKoszykaSchema(Schema):
    towar_id: int
    ilosc: int
    cena_sprzedazy: float

class AdresSchema(Schema):
    ulica: str
    nr_domu: str
    miasto: str
    kod_pocztowy: str

class ZamowienieSchema(Schema):
    adres: AdresSchema
    dostawa_id: int
    rabat_id: Optional[int]
    metoda_platnosci: str
    koszyk: List[PozycjaKoszykaSchema]


# ============================
# ENDPOINT TWORZENIA ZAMÓWIENIA
# ============================

@router.post("/")
def create_order(request, data: ZamowienieSchema):

    # 1. Autoryzacja przez JWT
    user = request.auth
    if not user:
        return {"detail": "Brak autoryzacji"}, 401

    klient = Klient.objects.get(user_id=user["user_id"])

    # 2. Tworzymy adres
    adres = Adres.objects.create(
        klient=klient,
        miasto=data.adres.miasto,
        ulica=data.adres.ulica,
        kod_pocztowy=data.adres.kod_pocztowy,
        nr_domu=data.adres.nr_domu
    )

    # 3. Dostawa
    dostawa = Dostawa.objects.get(id=data.dostawa_id)

    # 4. Rabat (opcjonalnie)
    rabat = Rabat.objects.get(id=data.rabat_id) if data.rabat_id else None

    # 5. Tworzymy zamówienie
    zamowienie = Zamowienie.objects.create(
        klient=klient,
        adres=adres,
        dostawa=dostawa,
        rabat=rabat,
        data_zamowienia=timezone.now(),
        status=Zamowienie.StatusZamowienia.NOWE
    )

    # 6. Pozycje zamówienia + odejmowanie magazynu
    for item in data.koszyk:
        towar = Towar.objects.get(id=item.towar_id)
        magazyn = Magazyn.objects.get(towar=towar)

        if magazyn.ilosc_dostepna < item.ilosc:
            return {"detail": f"Brak towaru: {towar.nazwa}"}, 400

        magazyn.ilosc_dostepna -= item.ilosc
        magazyn.save()

        PozycjaZamowienia.objects.create(
            zamowienie=zamowienie,
            towar=towar,
            ilosc=item.ilosc,
            cena_sprzedazy=item.cena_sprzedazy
        )

    return {"success": True, "order_id": zamowienie.id}