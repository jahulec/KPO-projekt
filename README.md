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

## Jak używać
1. Wybierz profil strony z listy.
2. Zaznacz sekcje, które mają zostać wygenerowane.
3. Wybierz styl.
4. Uruchom podgląd.
5. Wyeksportuj wygenerowane pliki.

## Wymagania
- JavaScript włączony w przeglądarce.
- Możliwość hostowania strony na GitHub Pages lub innym serwerze.

## YouTube (osadzanie)
Osadzenia YouTube działają tylko wtedy, gdy w ustawieniach filmu jest włączone **Zezwalaj na osadzanie**. W przeciwnym razie pojawi się błąd odtwarzacza (np. 153).

## Offline (bez CDN)
Ta wersja nie wymaga internetu do generowania ZIP. Biblioteka JSZip jest dołączona lokalnie w `vendor/jszip.min.js`.

## Instrukcja PDF (aktualizacja)
Aby wygenerować aktualną instrukcję i zapisać identyczny plik w:
- `docs/instrukcja.pdf`
- `instrukcja.pdf`

uruchom:

```powershell
python scripts\generate_instrukcja_pdf.py
```


