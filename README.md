# Generator stron dla artystów

## Finansowanie (KPO / NextGenerationEU)

![Zestawienie znaków: KPO + barwy RP + NextGenerationEU](assets/kpo/kpo_rp_ngeu_poziom_rgb_whitebg.png)

Przedsięwzięcie jest realizowane dzięki wsparciu z Krajowego Planu Odbudowy i Zwiększania Odporności oraz finansowane przez Unię Europejską w ramach NextGenerationEU.

- **Tytuł:** Szablon strony internetowej i pomoc medialna dla artystów z ograniczonymi zasobami – bezpłatne wsparcie w budowaniu obecności w sieci, dostępne dla każdego
- **Cel:** zwiększenie obecności online wykluczonych cyfrowo artystów
- **Grupa docelowa:** artyści (muzycy, graficy i inni twórcy)
- **Wartość przedsięwzięcia:** 36 000 zł brutto
- **Dofinansowanie z UE (KPO/NGEU):** 36 000 zł brutto
- **Termin realizacji:** do 28.02.2026

Szczegóły: `kpo.html`

---

## Opis
<<<<<<< HEAD
Generator pozwala stworzyć statyczną stronę internetową artysty w oparciu o wybrany profil, zestaw sekcji oraz styl. Aplikacja buduje podgląd HTML i umożliwia eksport gotowych plików strony.
=======
Projekt pozwala na stworzenie statycznej strony internetowej w oparciu o wybrany profil, zestaw sekcji oraz styl. Generator buduje podgląd HTML i umożliwia eksport gotowych plików.
>>>>>>> c5a77e2be4ea59b3aac2da50d9bd30ba25ab560b

## Pobieranie
- **Rekomendowane:** wejdź w zakładkę **Releases** i pobierz plik ZIP (asset wydania).
- Alternatywnie możesz pobrać kod jako **Source code (zip)**, ale dla użytkowników końcowych lepszy jest ZIP z release.

## Uruchomienie
1. Rozpakuj ZIP.
2. Otwórz `index.html` w przeglądarce (Chrome/Edge/Firefox).

Generator działa lokalnie i nie wymaga serwera.

## Dokumentacja
<<<<<<< HEAD
- Strona dokumentacyjna: `docs/index.html`
- Instrukcja PDF: `docs/instrukcja.pdf`

## Wymagania
- Włączony JavaScript w przeglądarce.

## Offline (bez CDN)
Wersja nie wymaga internetu do generowania ZIP. Biblioteka JSZip jest dołączona lokalnie w `vendor/jszip.min.js`.
=======
- Strona dokumentacyjna: `docs/index.html` ).
- Instrukcja PDF: `docs/instrukcja.pdf`

## Wymagania
- JavaScript włączony w przeglądarce.

## Offline (bez CDN)
Ta wersja nie wymaga internetu do generowania ZIP. Biblioteka JSZip jest dołączona lokalnie w `vendor/jszip.min.js`.
>>>>>>> c5a77e2be4ea59b3aac2da50d9bd30ba25ab560b

## Licencja
Projekt jest udostępniony jako open source na licencji MIT — patrz plik `LICENSE`.

## Struktura plików
- `index.html` — aplikacja generatora
- `js/` — logika (podzielona na moduły)
- `style.css` — style UI generatora
- `vendor/jszip.min.js` — JSZip (offline)
- `docs/` — landing + instrukcja PDF
- `assets/` — zasoby (w tym logotypy KPO)
- `kpo.html` — informacje o finansowaniu (KPO / NextGenerationEU)
