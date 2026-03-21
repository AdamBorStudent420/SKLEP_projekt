document.addEventListener('DOMContentLoaded', function() {
    // Sprawdzamy, czy jesteśmy na stronie edycji towaru (istnieje select podkategorii)
    const podkategoriaSelect = document.getElementById('id_podkategoria');
    if (!podkategoriaSelect) return;

    // Pobierz Django ($) z globalnego kontekstu admina
    const $ = django.jQuery;

    function fetchAttributes(podkategoriaId) {
        if (!podkategoriaId) {
            updateAttributeSelects([]);
            return;
        }

        // Endpoint z TowarAdmin.get_urls()
        const url = `/admin/sklep/towar/api/atrybuty/${podkategoriaId}/`;
        
        $.ajax({
            url: url,
            type: 'GET',
            success: function(response) {
                updateAttributeSelects(response);
            },
            error: function(xhr, errmsg, err) {
                console.error("Błąd podczas pobierania atrybutów:", errmsg);
            }
        });
    }

    function updateAttributeSelects(attributes) {
        // Wszystkie dropdowny atrybutów w inline
        const attributeSelects = $('select[id^="id_wartosci_atrybutow-"][id$="-atrybut"]');
        
        attributeSelects.each(function() {
            const select = $(this);
            const currentValue = select.val();
            
            // Opcja --- do wyboru niczego
            let html = '<option value="">---------</option>';
            
            // Zachowujemy tylko te, które są wciąż dopuszczalne (plus ten obecnie zaznaczony jeśli to konieczne)
            // Jeśli atrybutu nie ma na liście dozwolonych, usunie się (o ile zmienimy podkategorię na inną).
            let valueStillValid = false;
            
            attributes.forEach(function(attr) {
                const isSelected = (currentValue == attr.id) ? 'selected' : '';
                if (isSelected) valueStillValid = true;
                html += `<option value="${attr.id}" ${isSelected}>${attr.nazwa}</option>`;
            });
            
            select.html(html);
        });
    }

    // Nasłuchujemy zmiany i aktualizujemy dostępne atrybuty
    $(podkategoriaSelect).on('change', function() {
        const podkategoriaId = $(this).val();
        fetchAttributes(podkategoriaId);
    });

    // Inicjujemy przy starcie, by dla nowego towaru atrybuty były puste, dopóki nie wybierzemy kategoria
    // lub by usztywnić opcje jeśli jakaś podkategoria jest domyślnie ustawiona.
    fetchAttributes($(podkategoriaSelect).val());

    // --- LOGIKA DLA KATEGORIA -> PODKATEGORIA ---
    const kategoriaSelect = document.getElementById('id_kategoria');

    function fetchPodkategorie(kategoriaId) {
        if (!kategoriaId) {
            updatePodkategoriaSelect([]);
            return;
        }

        const url = `/admin/sklep/towar/api/podkategorie/${kategoriaId}/`;
        
        $.ajax({
            url: url,
            type: 'GET',
            success: function(response) {
                updatePodkategoriaSelect(response);
            },
            error: function(xhr, errmsg, err) {
                console.error("Błąd podczas pobierania podkategorii:", errmsg);
            }
        });
    }

    function updatePodkategoriaSelect(podkategorie) {
        const select = $(podkategoriaSelect);
        const currentValue = select.val();
        
        let html = '<option value="">---------</option>';
        let valueStillValid = false;
        
        podkategorie.forEach(function(podkat) {
            const isSelected = (currentValue == podkat.id) ? 'selected' : '';
            if (isSelected) valueStillValid = true;
            html += `<option value="${podkat.id}" ${isSelected}>${podkat.nazwa}</option>`;
        });
        
        select.html(html);

        if (!valueStillValid && currentValue) {
            // Skoro poprzednia podkategoria już nie pasuje, czyścimy ją
            select.val('');
            // I ręcznie triggerujemy fetchAttributes dla pustej podkategorii
            fetchAttributes('');
        }
    }

    if (kategoriaSelect) {
        $(kategoriaSelect).on('change', function() {
            const kategoriaId = $(this).val();
            fetchPodkategorie(kategoriaId);
        });

        // Inicjalizacja przy starcie, obcina listę podkategorii tylko do wybranej kategorii
        fetchPodkategorie($(kategoriaSelect).val());
    }
    // --- KONIEC LOGIKI KATEGORIA -> PODKATEGORIA ---

    // W przypadku dynamicznie po stronie klienta dodanego wiersza 'Add another',
    // musimy zadbać, aby świeżo dodany select też miał tylko poprawne opcje.
    // Inaczej Django domyślnie skopiuje ukryty pusty szablon ze wszystkimi opcjami (jeśli takowe były).
    // Można to nasłuchiwać za pomocą mutacji, ale `formset:added` to zdarzenie z Django inlines:
    $(document).on('formset:added', function(event, $row, formsetName) {
        if (formsetName === 'wartosci_atrybutow') {
            const podkategoriaId = $(podkategoriaSelect).val();
            // Pusty element dopiero jest załączany, spróbujemy szybko zaktualizować go na bazę
            // tego co już mamy w pierwszym rzędzie, albo odpalamy fetchAttributes po nowemu.
            fetchAttributes(podkategoriaId);
        }
    });

});
