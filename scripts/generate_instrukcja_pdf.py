from __future__ import annotations

import argparse
import shutil
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


PROJECT_NAME = "Generator stron dla artystow"
VERSION = "v1.5"
TODAY = date.today().strftime("%d.%m.%Y")
RELEASE_URL = "https://github.com/jahulec/KPO-projekt/releases/tag/KPO"
KPO_LOGO = Path("assets/kpo/kpo_rp_ngeu_poziom_rgb_whitebg.png")
KPO_FORMULA_SHORT = "Sfinansowane przez Unię Europejską NextGenerationEU."
KPO_FORMULA_LONG = (
    "Przedsięwzięcie jest realizowane dzięki wsparciu z Krajowego Planu Odbudowy "
    "i Zwiększania Odporności oraz finansowane przez Unię Europejską w ramach NextGenerationEU."
)


def register_fonts() -> tuple[str, str]:
    candidates = [
        (
            "DejaVuSans",
            "DejaVuSans-Bold",
            [
                Path(r"C:\Windows\Fonts\DejaVuSans.ttf"),
                Path(r"C:\Windows\Fonts\DejaVuSans-Bold.ttf"),
            ],
        ),
        (
            "Arial",
            "Arial-Bold",
            [
                Path(r"C:\Windows\Fonts\arial.ttf"),
                Path(r"C:\Windows\Fonts\arialbd.ttf"),
            ],
        ),
    ]

    for normal_name, bold_name, files in candidates:
        normal_file, bold_file = files
        if normal_file.exists() and bold_file.exists():
            pdfmetrics.registerFont(TTFont(normal_name, str(normal_file)))
            pdfmetrics.registerFont(TTFont(bold_name, str(bold_file)))
            return normal_name, bold_name

    return "Helvetica", "Helvetica-Bold"


def esc(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(esc(text), style)


def add_list(items: list[str], style: ParagraphStyle, bullet: str = "•") -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(esc(it), style), leftIndent=0, value=bullet) for it in items],
        bulletType="bullet",
        start=bullet,
        leftIndent=14,
        bulletFontName=style.fontName,
    )


def add_numbered(items: list[str], style: ParagraphStyle) -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(esc(it), style), leftIndent=0, value=i + 1) for i, it in enumerate(items)],
        bulletType="1",
        leftIndent=14,
    )


def add_kpo_logo(story: list) -> None:
    if not KPO_LOGO.exists():
        return
    logo = Image(str(KPO_LOGO))
    logo.hAlign = "LEFT"
    logo._restrictSize(175 * mm, 35 * mm)
    story.append(logo)
    story.append(Spacer(1, 4 * mm))


def build_story(styles: dict[str, ParagraphStyle]) -> list:
    st: list = []
    add_kpo_logo(st)

    st.append(Paragraph(PROJECT_NAME, styles["title"]))
    st.append(Spacer(1, 3 * mm))
    st.append(Paragraph("Instrukcja dla artystow i tworcow", styles["subtitle"]))
    st.append(Spacer(1, 2 * mm))
    st.append(p(f"Wersja: {VERSION}   |   Data: {TODAY}", styles["meta"]))
    st.append(Spacer(1, 2 * mm))
    st.append(p(KPO_FORMULA_SHORT, styles["formula"]))
    st.append(Spacer(1, 1.5 * mm))
    st.append(p(KPO_FORMULA_LONG, styles["lead"]))
    st.append(Spacer(1, 5 * mm))
    st.append(
        p(
            "Ta instrukcja jest dla odbiorcow projektu: artystow, ktorzy tworza wlasna strone WWW. "
            "Jej celem jest szybkie przejscie od pustego projektu do opublikowanej strony.",
            styles["lead"],
        )
    )
    st.append(Spacer(1, 4 * mm))

    st.append(p("1. Co przygotowac przed startem", styles["h2"]))
    st.append(
        add_list(
            [
                "Nazwa artystyczna, krotkie BIO (3-6 zdan) i dane kontaktowe.",
                "Zdjecia: najlepiej JPG/PNG/WebP, lekkie pliki (nie wrzucaj surowych RAW).",
                "Linki: Instagram, Spotify, YouTube, Bandcamp, sklep, biletownia.",
                "Lista nadchodzacych wydarzen (data, miejsce, link).",
                "Opcjonalnie: logo, favicon, materialy EPK (PDF/ZIP/press photo).",
            ],
            styles["body"],
        )
    )

    st.append(p("2. Jak pobrac generator i uruchomic", styles["h2"]))
    st.append(
        add_numbered(
            [
                f"Wejdz na strone release: {RELEASE_URL}",
                "W sekcji Assets pobierz paczke projektu. Jesli nie ma osobnej paczki, pobierz Source code (zip).",
                "Rozpakuj ZIP do wybranego folderu na komputerze.",
                "Otworz folder i uruchom plik index.html w przegladarce.",
                "Jesli system pyta o zaufanie plikom z internetu, wybierz odblokowanie i otworz ponownie.",
            ],
            styles["body"],
        )
    )
    st.append(
        p(
            "Wazne: generator dziala lokalnie, ale embedy YouTube testuj finalnie po publikacji na hostingu HTTPS.",
            styles["note"],
        )
    )

    st.append(p("3. Szybki start (okolo 10-15 minut)", styles["h2"]))
    st.append(
        add_numbered(
            [
                "Otworz plik index.html w aktualnej przegladarce (Chrome, Edge lub Firefox).",
                "W sekcji Projekt wybierz profil strony i tryb eksportu.",
                "W sekcji Styl wybierz gotowy styl, a potem dopracuj kolory/typografie.",
                "W Blokach strony zostaw tylko sekcje, ktore sa Ci potrzebne.",
                "W Edycji bloku wpisz tresci, podmien zdjecia i dodaj linki.",
                "W SEO uzupelnij tytul i opis, aby link dobrze wygladal w social media.",
                "Kliknij Problemy i napraw bledy blokujace eksport.",
                "Kliknij Pobierz i wygeneruj finalne pliki strony.",
            ],
            styles["body"],
        )
    )

    st.append(p("4. Jak czytac panel generatora", styles["h2"]))
    st.append(p("Projekt", styles["h3"]))
    st.append(
        add_list(
            [
                "Single: jedna strona (wizytowka, landing).",
                "ZIP: strona + podstrony + assets (najczesciej najlepszy wybor).",
                "Profil strony daje gotowy punkt startowy pod Twoj typ tworczosci.",
            ],
            styles["body"],
        )
    )
    st.append(p("Styl", styles["h3"]))
    st.append(
        add_list(
            [
                "Najpierw wybierz gotowy styl, potem poprawiaj detale.",
                "Najwiekszy efekt daja: typografia, kontrast i porzadek sekcji.",
                "Po zmianach zawsze zrob szybki test na mobile.",
            ],
            styles["body"],
        )
    )
    st.append(p("Bloki strony i Edycja bloku", styles["h3"]))
    st.append(
        add_list(
            [
                "Kazdy blok to osobna czesc strony (np. BIO, wydarzenia, multimedia, kontakt).",
                "Mozesz zmieniac kolejnosc blokow i wylaczac niepotrzebne.",
                "Dlugie opisy dziel na krotkie akapity, aby strona byla czytelna.",
            ],
            styles["body"],
        )
    )
    st.append(p("Akcje", styles["h3"]))
    st.append(
        add_list(
            [
                "Snapshoty i cofanie pomagaja bezpiecznie testowac zmiany.",
                "Problemy pokazuje, co trzeba poprawic przed eksportem.",
                "Pobierz generuje gotowe pliki do publikacji.",
            ],
            styles["body"],
        )
    )

    st.append(PageBreak())
    st.append(p("5. Eksport: Single czy ZIP", styles["h2"]))
    table_data = [
        ["Tryb", "Najlepszy kiedy", "Co dostajesz"],
        ["Single", "Potrzebujesz prostej wizytowki", "index.html + podstawowe metadane"],
        ["ZIP", "Budujesz pelna strone artysty", "index + podstrony + style + site.js + assets"],
    ]
    tbl = Table(table_data, colWidths=[28 * mm, 68 * mm, 74 * mm])
    tbl.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), styles["table_head"].fontName),
                ("FONTNAME", (0, 1), (-1, -1), styles["table_body"].fontName),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#B9C2CF")),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEF3FA")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    st.append(tbl)
    st.append(Spacer(1, 3 * mm))
    st.append(
        p(
            "Rekomendacja: jezeli tworzysz kompletna strone artysty, wybierz ZIP. "
            "To najbezpieczniejszy wariant do publikacji i archiwizacji.",
            styles["note"],
        )
    )

    st.append(p("6. YouTube: blad embedu w podgladzie lokalnym", styles["h2"]))
    st.append(
        add_list(
            [
                "W trybie lokalnym (otwieranie pliku z dysku, podglad iframe) YouTube moze pokazac blad odtwarzacza, np. 153.",
                "To zwykle nie oznacza, ze link jest zly. Czesci embedow nie dzialaja poprawnie bez docelowego hostingu i poprawnego naglowka Referer.",
                "Jesli film ma wlaczone Zezwalaj na osadzanie i link jest poprawny, po publikacji na hostingu HTTPS osadzenie zwykle dziala prawidlowo.",
                "Dla bezpieczenstwa UX zawsze podawaj tez zwykly link do filmu jako fallback.",
            ],
            styles["body"],
        )
    )
    st.append(
        p(
            "Wniosek praktyczny: oceniaj finalne dzialanie embedow dopiero na opublikowanej stronie, "
            "nie tylko w podgladzie lokalnym generatora.",
            styles["note"],
        )
    )

    st.append(p("7. Publikacja na hostingu (GitHub Pages)", styles["h2"]))
    st.append(
        add_numbered(
            [
                "Utworz repozytorium na GitHub i wrzuc wyeksportowane pliki.",
                "W Settings -> Pages ustaw: Deploy from a branch -> main -> /(root).",
                "Poczekaj na URL strony (zwykle 1-3 minuty).",
                "Sprawdz na tym URL: linki, embedy YouTube/Spotify, formularze i widok mobile.",
                "Po testach udostepnij artystyczny link publicznie.",
            ],
            styles["body"],
        )
    )

    st.append(p("8. Oznaczenia KPO / UE", styles["h2"]))
    st.append(
        add_list(
            [
                "W materialach projektu uzywaj zestawu logotypow KPO + RP + UE (NextGenerationEU).",
                "Nie zmieniaj proporcji znakow, nie przycinaj i nie rozdzielaj zestawu na przypadkowe czesci.",
                "W tej instrukcji logotyp znajduje sie na pierwszej stronie i mozna go traktowac jako wzor.",
            ],
            styles["body"],
        )
    )
    st.append(p(f'Formula 1 (zalecana): "{KPO_FORMULA_SHORT}"', styles["note"]))
    st.append(p(f'Formula 2 (pelna): "{KPO_FORMULA_LONG}"', styles["note"]))

    st.append(p("9. Checklista artysty przed publikacja", styles["h2"]))
    st.append(
        add_list(
            [
                "[ ] BIO i kontakt sa uzupelnione oraz aktualne.",
                "[ ] Linki do social i streamingu prowadza we wlasciwe miejsca.",
                "[ ] Miniatury i zdjecia laduja sie szybko (bez ogromnych plikow).",
                "[ ] W SEO ustawiony jest sensowny tytul i opis strony.",
                "[ ] Brak bledow blokujacych eksport.",
                "[ ] Embedy i linki YouTube sprawdzone po publikacji na hostingu.",
                "[ ] Strona sprawdzona na telefonie i desktopie.",
            ],
            styles["body"],
            bullet="□",
        )
    )

    st.append(p("10. Najczestsze problemy i szybkie rozwiazania", styles["h2"]))
    st.append(p("Nie dziala eksport ZIP", styles["h3"]))
    st.append(
        add_list(
            [
                "Odswiez generator i sprobuj ponownie.",
                "Upewnij sie, ze przegladarka jest aktualna i ma wlaczony JavaScript.",
                "Zmniejsz liczbe bardzo ciezkich plikow.",
            ],
            styles["body"],
        )
    )
    st.append(p("YouTube pokazuje blad", styles["h3"]))
    st.append(
        add_list(
            [
                "Sprawdz, czy film pozwala na osadzanie.",
                "Wklej pelny URL filmu lub poprawny iframe.",
                "Zweryfikuj dzialanie po publikacji (hosting HTTPS).",
            ],
            styles["body"],
        )
    )
    st.append(p("Podglad i eksport wygladaja inaczej", styles["h3"]))
    st.append(
        add_list(
            [
                "Sprawdz czy eksportujesz ten sam tryb (Single lub ZIP), ktory testowales.",
                "Zapisz ostatnie zmiany i wygeneruj paczke ponownie.",
                "Testuj gotowe pliki po rozpakowaniu, nie tylko podglad roboczy.",
            ],
            styles["body"],
        )
    )

    st.append(Spacer(1, 3 * mm))
    st.append(
        p(
            "Dodatkowe informacje o finansowaniu: kpo.html. "
            "Wersja online generatora i dokumentacji: docs/index.html.",
            styles["body"],
        )
    )

    return st


def page_footer(canvas, doc, font_name: str) -> None:
    canvas.saveState()
    canvas.setFont(font_name, 8)
    canvas.setFillColor(colors.HexColor("#5D6778"))
    canvas.drawString(20 * mm, 10 * mm, f"{PROJECT_NAME} - instrukcja {VERSION}")
    canvas.drawRightString(190 * mm, 10 * mm, f"Strona {doc.page}")
    canvas.restoreState()


def build_pdf(out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    body_font, bold_font = register_fonts()

    sheet = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "Title",
            parent=sheet["Title"],
            fontName=bold_font,
            fontSize=24,
            leading=28,
            textColor=colors.HexColor("#0A2A66"),
            spaceAfter=0,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=sheet["Heading2"],
            fontName=bold_font,
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#0D1B2A"),
            spaceAfter=0,
        ),
        "meta": ParagraphStyle(
            "Meta",
            parent=sheet["BodyText"],
            fontName=body_font,
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#56617A"),
        ),
        "formula": ParagraphStyle(
            "Formula",
            parent=sheet["BodyText"],
            fontName=bold_font,
            fontSize=10.5,
            leading=14,
            textColor=colors.HexColor("#0A2A66"),
        ),
        "lead": ParagraphStyle(
            "Lead",
            parent=sheet["BodyText"],
            fontName=body_font,
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#1E2A3B"),
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=sheet["Heading2"],
            fontName=bold_font,
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#0A2A66"),
            spaceBefore=7,
            spaceAfter=3,
        ),
        "h3": ParagraphStyle(
            "H3",
            parent=sheet["Heading3"],
            fontName=bold_font,
            fontSize=10.5,
            leading=13,
            textColor=colors.HexColor("#12345A"),
            spaceBefore=5,
            spaceAfter=1,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=sheet["BodyText"],
            fontName=body_font,
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#101820"),
        ),
        "note": ParagraphStyle(
            "Note",
            parent=sheet["BodyText"],
            fontName=body_font,
            fontSize=9.5,
            leading=13,
            textColor=colors.HexColor("#12345A"),
            backColor=colors.HexColor("#EEF4FF"),
            borderColor=colors.HexColor("#BFD3FF"),
            borderWidth=0.6,
            borderPadding=5,
            borderRadius=2,
        ),
        "table_head": ParagraphStyle("TableHead", parent=sheet["BodyText"], fontName=bold_font),
        "table_body": ParagraphStyle("TableBody", parent=sheet["BodyText"], fontName=body_font),
    }

    doc = SimpleDocTemplate(
        str(out_path),
        pagesize=A4,
        leftMargin=17 * mm,
        rightMargin=17 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=f"Instrukcja uzytkownika - {PROJECT_NAME}",
        author="KPO-projekt",
    )

    story = build_story(styles)
    doc.build(
        story,
        onFirstPage=lambda c, d: page_footer(c, d, body_font),
        onLaterPages=lambda c, d: page_footer(c, d, body_font),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate instrukcja PDF for project and docs.")
    parser.add_argument(
        "--primary",
        type=Path,
        default=Path("docs/instrukcja.pdf"),
        help="Primary PDF output path.",
    )
    parser.add_argument(
        "--mirror",
        type=Path,
        default=Path("instrukcja.pdf"),
        help="Mirror output path (exact copy of primary).",
    )
    args = parser.parse_args()

    build_pdf(args.primary)
    args.mirror.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(args.primary, args.mirror)

    print(f"Generated: {args.primary}")
    print(f"Mirrored:  {args.mirror}")


if __name__ == "__main__":
    main()
