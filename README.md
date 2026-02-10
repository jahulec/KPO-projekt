# Generator stron dla artystów

## Finansowanie (KPO / NextGenerationEU)

![Zestawienie znaków: KPO + barwy RP + NextGenerationEU](assets/kpo/kpo_rp_ngeu_poziom_rgb.png)

Przedsięwzięcie jest realizowane dzięki wsparciu z Krajowego Planu Odbudowy i Zwiększania Odporności oraz finansowane przez Unię Europejską w ramach NextGenerationEU.

- **Tytuł:** Szablon strony internetowej i pomoc medialna dla artystów z ograniczonymi zasobami – bezpłatne wsparcie w budowaniu obecności w sieci, dostępne dla każdego
- **Cel:** zwiększenie obecności online wykluczonych cyfrowo artystów
- **Grupa docelowa:** artyści (muzycy, graficy i inni twórcy)
- **Wartość przedsięwzięcia:** 36 000 zł brutto
- **Dofinansowanie z UE (KPO/NGEU):** 36 000 zł brutto
- **Termin realizacji:** do 28.02.2026

Szczegóły: `kpo.html`


## Opis
Projekt pozwala na stworzenie statycznej strony internetowej w oparciu o wybrany profil, zestaw sekcji oraz styl. Generator buduje podgląd HTML i umożliwia eksport gotowych plików.

## Pobieranie
- **Najprościej:** wejdź w zakładkę **Releases** w repozytorium i pobierz plik ZIP (asset).
- Alternatywnie możesz pobrać kod jako „Source code (zip)”, ale rekomendowany jest asset ZIP z release.

## Dokumentacja
- Strona dokumentacyjna: `docs/index.html` ).
- Instrukcja PDF: `docs/instrukcja.pdf`

## Wymagania
- JavaScript włączony w przeglądarce.

## Offline (bez CDN)
Ta wersja nie wymaga internetu do generowania ZIP. Biblioteka JSZip jest dołączona lokalnie w `vendor/jszip.min.js`.

## Licencja
Projekt jest udostępniony jako open source na licencji MIT — patrz plik `LICENSE`.

## Struktura plików
- `index.html` — aplikacja generatora
- `js/` — logika (podzielona na moduły)
- `style.css` — style UI generatora
- `vendor/jszip.min.js` — JSZip (offline)
- `docs/` — landing + instrukcja PDF
- `kpo.html` — informacje o finansowaniu (KPO / NextGenerationEU)
