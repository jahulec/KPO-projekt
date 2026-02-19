# Generator stron dla artystow

## Finansowanie (KPO / NextGenerationEU)

<p>
  <img src="assets/kpo/kpo_rp_ngeu_poziom_rgb_whitebg.png" alt="Zestawienie znakow: KPO + barwy RP + NextGenerationEU" width="980">
</p>

**Sfinansowane przez Unie Europejska NextGenerationEU.**

Przedsiewziecie jest realizowane dzieki wsparciu z Krajowego Planu Odbudowy i Zwiekszania Odpornosci oraz finansowane przez Unie Europejska w ramach NextGenerationEU.

- **Tytul:** Szablon strony internetowej i pomoc medialna dla artystow z ograniczonymi zasobami - bezplatne wsparcie w budowaniu obecnosci w sieci, dostepne dla kazdego
- **Cel:** zwiekszenie obecnosci online wykluczonych cyfrowo artystow
- **Grupa docelowa:** artysci (muzycy, graficy i inni tworcy)
- **Wartosc przedsiewziecia:** 36 000 zl brutto
- **Dofinansowanie z UE (KPO/NGEU):** 36 000 zl brutto
- **Termin realizacji:** do 28.02.2026

Szczegoly: `kpo.html`

## Dla kogo jest to narzedzie
Generator jest dla artystow i tworcow, ktorzy chca szybko zrobic estetyczna strone WWW bez pisania kodu.

Najczestsze zastosowania:
- strona muzyka / zespolu,
- portfolio grafika,
- strona performera,
- prosty landing z bio, mediami i kontaktem.

## Jak pobrac i uruchomic (3 min)
1. Wejdz na release: `https://github.com/jahulec/KPO-projekt/releases/tag/KPO`.
2. W sekcji **Assets** pobierz paczke projektu (lub `Source code (zip)`).
3. Rozpakuj ZIP na komputerze.
4. Otworz plik `index.html` w przegladarce (Chrome, Edge albo Firefox).

## Szybki start (10-15 min)
1. Wybierz profil strony i tryb eksportu (`Single` lub `ZIP`).
2. Ustaw styl i podstawowe kolory/typografie.
3. Uzupelnij BIO, kontakt, social media i multimedia.
4. Dodaj SEO (tytul i opis strony).
5. Kliknij `Problemy` i popraw bledy blokujace eksport.
6. Kliknij `Pobierz` i wygeneruj gotowe pliki.

## YouTube (wazne)
W podgladzie lokalnym (plik otwierany z dysku) embed YouTube moze pokazac blad odtwarzacza, np. `153`.

To nie musi oznaczac, ze link jest zly. Jesli:
- film ma wlaczone **Zezwalaj na osadzanie**,
- link/iframe jest poprawny,

to osadzenie zwykle dziala poprawnie po publikacji strony na hostingu HTTPS (np. GitHub Pages).

Dobra praktyka: obok embedu podaj tez zwykly link do filmu.

## Eksport i publikacja
- `Single`: jedna strona (wizytowka).
- `ZIP`: pelna paczka (strona + podstrony + assets) - najczesciej najlepszy wybor.

Publikacja na GitHub Pages:
1. Wrzuc wyeksportowane pliki do repozytorium.
2. W `Settings -> Pages` ustaw: `Deploy from a branch`, branch `main`, folder `/(root)`.
3. Po otrzymaniu URL sprawdz linki, embedy i widok mobile.

## Dokumentacja
- Instrukcja dla uzytkownikow: `docs/instrukcja.pdf` (tozsama kopia: `instrukcja.pdf`)
- Informacje KPO/NGEU: `kpo.html`
- Strona dokumentacyjna: `docs/index.html`

## Wersja offline (bez CDN)
Generator nie wymaga internetu do wygenerowania ZIP.
Biblioteka JSZip jest dolaczona lokalnie: `vendor/jszip.min.js`.

## Aktualizacja instrukcji PDF (dla maintainera)
Aby wygenerowac aktualna instrukcje i zapisac identyczny plik w:
- `docs/instrukcja.pdf`
- `instrukcja.pdf`

uruchom:

```powershell
python scripts\generate_instrukcja_pdf.py
```
