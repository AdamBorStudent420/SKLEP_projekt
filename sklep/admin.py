from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Klient, Adres, RodzajDostawy, Dostawa, Rabat, Pracownik, 
    Kategoria, Podkategoria, Towar, Magazyn, Zamowienie, 
    PozycjaZamowienia, StatusPlatnosci, Platnosc, Atrybut, 
    WartoscAtrybutu, Opinia, StatusReklamacji, Reklamacja,
    HistoriaStatusowZamowienia
)

# ==========================================
# INLINES (Zagnieżdżone formularze)
# ==========================================

class AdresInline(admin.StackedInline):
    model = Adres
    extra = 1

class WartoscAtrybutuInline(admin.TabularInline):
    model = WartoscAtrybutu
    extra = 1

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "atrybut":
            # Dynamiczne zawężanie listy atrybutów po ID edytowanego Towaru
            object_id = request.resolver_match.kwargs.get('object_id')
            if object_id:
                try:
                    # Szukamy podkategorii tego towaru
                    towar = Towar.objects.get(pk=object_id)
                    if towar.podkategoria_id:
                        # Zwróć tylko te atrybuty, które są przypisane do tej samej podkategorii
                        kwargs["queryset"] = Atrybut.objects.filter(podkategorie=towar.podkategoria_id)
                    else:
                        # Jeśli towar nie ma podkategorii, zaleca się nie wyświetlać nic, by najpierw wybrał podkategorię
                        kwargs["queryset"] = Atrybut.objects.none()
                except Towar.DoesNotExist:
                    pass
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

class MagazynInline(admin.StackedInline):
    model = Magazyn
    # Zmieniliśmy wcześniej na OneToOneField, więc stan magazynowy 
    # edytujemy bezpośrednio na karcie produktu!
    can_delete = False
    verbose_name_plural = 'Stan magazynowy'

class PozycjaZamowieniaInline(admin.TabularInline):
    model = PozycjaZamowienia
    extra = 0

class PlatnoscInline(admin.StackedInline):
    model = Platnosc
    can_delete = False

# NOWE: Wbudowana historia logów statusu
class HistoriaStatusowInline(admin.TabularInline):
    model = HistoriaStatusowZamowienia
    extra = 0
    readonly_fields = ('data_zmiany', 'nowy_status', 'zmienione_przez', 'stary_status')
    can_delete = False

# ==========================================
# ADMIN CLASSES (Konfiguracja widoków)
# ==========================================

@admin.register(Klient)
class KlientAdmin(admin.ModelAdmin):
    list_display = ('imie', 'nazwisko', 'email', 'nr_tel', 'powiazany_user')
    search_fields = ('imie', 'nazwisko', 'email', 'nr_tel')
    inlines = [AdresInline]

    def powiazany_user(self, obj):
        return obj.user.username if obj.user else "Brak konta"
    powiazany_user.short_description = "Konto Użytkownika"

@admin.register(Towar)
class TowarAdmin(admin.ModelAdmin):
    list_display = ('nazwa', 'kategoria', 'producent', 'cena_jednostkowa', 'wyswietl_promocje', 'miniatura_zdjecia')
    list_filter = ('kategoria', 'producent')
    search_fields = ('nazwa', 'producent', 'opis')
    inlines = [MagazynInline, WartoscAtrybutuInline]
    readonly_fields = ('miniatura_zdjecia_podglad',)

    class Media:
        js = ('admin/js/dynamic_attributes.js',)

    fieldsets = (
        ('Informacje podstawowe', {
            'fields': ('nazwa', 'producent', 'opis')
        }),
        ('Kategoryzacja', {
            'fields': ('kategoria', 'podkategoria')
        }),
        ('Cennik', {
            'fields': ('cena_jednostkowa', 'cena_promocyjna')
        }),
        ('Media', {
            'fields': ('zdjecie', 'miniatura_zdjecia_podglad')
        }),
    )

    def wyswietl_promocje(self, obj):
        if obj.cena_promocyjna:
            return format_html('<span style="color: green; font-weight: bold;">{} zł</span>', obj.cena_promocyjna)
        return "-"
    wyswietl_promocje.short_description = "Cena Promocyjna"

    def miniatura_zdjecia(self, obj):
        if obj.zdjecie:
            return format_html('<img src="{}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 4px;" />', obj.zdjecie.url)
        return "Brak zdjęcia"
    miniatura_zdjecia.short_description = "Zdjęcie"

    def miniatura_zdjecia_podglad(self, obj):
        if obj.zdjecie:
            return format_html('<img src="{}" style="max-height: 200px; border-radius: 8px;" />', obj.zdjecie.url)
        return "Brak zdjęcia"
    miniatura_zdjecia_podglad.short_description = "Podgląd"

    def get_urls(self):
        from django.urls import path
        urls = super().get_urls()
        my_urls = [
            path('api/atrybuty/<int:podkategoria_id>/', self.admin_site.admin_view(self.pobierz_atrybuty), name='pobierz-atrybuty'),
            path('api/podkategorie/<int:kategoria_id>/', self.admin_site.admin_view(self.pobierz_podkategorie), name='pobierz-podkategorie'),
        ]
        return my_urls + urls

    def pobierz_atrybuty(self, request, podkategoria_id):
        from django.http import JsonResponse
        from .models import Atrybut
        atrybuty = list(Atrybut.objects.filter(podkategorie__id=podkategoria_id).values('id', 'nazwa'))
        return JsonResponse(atrybuty, safe=False)

    def pobierz_podkategorie(self, request, kategoria_id):
        from django.http import JsonResponse
        from .models import Podkategoria
        podkategorie = list(Podkategoria.objects.filter(kategoria_id=kategoria_id).values('id', 'nazwa'))
        return JsonResponse(podkategorie, safe=False)

@admin.register(Zamowienie)
class ZamowienieAdmin(admin.ModelAdmin):
    list_display = ('id', 'klient', 'data_zamowienia', 'status_kolorowy', 'pracownik')
    list_filter = ('status', 'data_zamowienia', 'dostawa')
    search_fields = ('klient__imie', 'klient__nazwisko', 'klient__email', 'id')
    inlines = [PlatnoscInline, PozycjaZamowieniaInline, HistoriaStatusowInline]
    date_hierarchy = 'data_zamowienia'

    def status_kolorowy(self, obj):
        colors = {
            'NOWE': 'blue',
            'OPLACONE': 'purple',
            'W_REALIZACJI': 'orange',
            'WYSLANE': 'brown',
            'DOSTARCZONE': 'green',
            'ANULOWANE': 'red',
        }
        color = colors.get(obj.status, 'black')
        return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, obj.get_status_display())
    status_kolorowy.short_description = "Status"

@admin.register(Opinia)
class OpiniaAdmin(admin.ModelAdmin):
    list_display = ('towar', 'klient', 'ocena', 'data_wystawienia')
    list_filter = ('ocena', 'data_wystawienia')
    search_fields = ('towar__nazwa', 'klient__imie', 'klient__nazwisko')
    readonly_fields = ('data_wystawienia',)

class AtrybutKategoriaFilter(admin.SimpleListFilter):
    title = 'Kategoria'
    parameter_name = 'kategoria'

    def lookups(self, request, model_admin):
        from .models import Kategoria
        return [(k.id, k.nazwa_kategorii) for k in Kategoria.objects.all()]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(podkategorie__kategoria_id=self.value()).distinct()
        return queryset

class AtrybutPodkategoriaFilter(admin.SimpleListFilter):
    title = 'Podkategoria'
    parameter_name = 'podkategoria'

    def lookups(self, request, model_admin):
        from .models import Podkategoria
        kategoria_id = request.GET.get('kategoria')
        if kategoria_id:
            podkategorie = Podkategoria.objects.filter(kategoria_id=kategoria_id)
        else:
            podkategorie = Podkategoria.objects.all()
        return [(p.id, p.nazwa) for p in podkategorie]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(podkategorie__id=self.value()).distinct()
        return queryset

@admin.register(Atrybut)
class AtrybutAdmin(admin.ModelAdmin):
    list_display = ('nazwa',)
    filter_horizontal = ('podkategorie',)
    search_fields = ('nazwa',)
    list_filter = (AtrybutKategoriaFilter, AtrybutPodkategoriaFilter)

admin.site.register(Kategoria)

@admin.register(Podkategoria)
class PodkategoriaAdmin(admin.ModelAdmin):
    list_display = ('nazwa', 'kategoria')
    list_filter = ('kategoria',)
    search_fields = ('nazwa', 'kategoria__nazwa_kategorii')

admin.site.register(RodzajDostawy)
admin.site.register(Dostawa)
admin.site.register(Rabat)
admin.site.register(Pracownik)
admin.site.register(StatusPlatnosci)
admin.site.register(StatusReklamacji)
admin.site.register(Reklamacja)