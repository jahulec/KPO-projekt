# Generator Portfolio Artysty

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
Projekt pozwala artystom na stworzenie własnej strony internetowej. Użytkownik wybiera rolę artysty (muzyk, grafik itp.), sekcje do dodania na stronie (portfolio, kalendarz koncertów, sklep, biografia) i styl strony. Następnie generuje się podgląd strony HTML, który można pobrać i załadować na serwer.

## Jak używać
1. Wybierz rolę artysty z listy.
2. Zaznacz sekcje, które chcesz mieć na swojej stronie.
3. Wybierz styl strony.
4. Kliknij "Generuj podgląd", aby zobaczyć, jak będzie wyglądała Twoja strona.
5. Pobierz wygenerowany kod HTML/CSS.

## Wymagania
- JavaScript włączony w przeglądarce.
- Możliwość hostowania strony na GitHub Pages lub innym serwerze.

## Offline (bez CDN)
Ta wersja nie wymaga internetu do generowania ZIP. Biblioteka JSZip jest dołączona lokalnie w `vendor/jszip.min.js`.


---

**Uwaga (refactor):** `scripts.js` został podzielony na pliki w katalogu `js/`.
Oryginał zostawiony jako `scripts.legacy.js`.
