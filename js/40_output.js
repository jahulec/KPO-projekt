/* Auto-split from scripts.js | 40_output.js */

/* ==========================
   Site HTML/CSS/JS generation
========================== */

function blockToFile(id) { return `${id}.html`; }


function isEpkRenderable() {
  try {
    const cfg = ensureBlock("epk");
    const d = cfg?.data || {};
    const bio = String(d.shortBio || "").trim();
    const pressItems = Array.isArray(d.pressLinks) ? d.pressLinks : [];
    const dlItems = Array.isArray(d.downloadLinks) ? d.downloadLinks : [];
    const hasPress = pressItems.some(it => String(it?.url || "").trim());
    const hasDl = dlItems.some(it => String(it?.url || "").trim());
    const hasPhotos = (assets.epkPressPhotos || []).length > 0;
    const hasFiles = (assets.epkFiles || []).length > 0;
    return !!(bio || hasPress || hasDl || hasPhotos || hasFiles);
  } catch (e) {
    return true;
  }
}

function getNavItemsZip() {
  const items = [{ label: "Home", href: "index.html", id: "home" }];

  const added = new Set();
  for (const id of enabledBlocksInOrder()) {
    if (id === "epk" && !isEpkRenderable()) continue;
    if (id === "hero") continue;
    const cfg = ensureBlock(id);
    if (cfg.showInHeader === false) continue;

    const base = baseBlockId(id);
    if (base === "epk" && !isEpkRenderable()) continue;
    if (added.has(base)) continue; // one page per base in ZIP nav
    added.add(base);

    items.push({ label: getBlockDisplayName(id), href: blockToFile(base), id: base });
  }
  // Polityka prywatności celowo NIE jest pokazywana w nawigacji w nagłówku.
  // Ma być dostępna wyłącznie z linku w stopce.
  return items;
}

function getNavItemsSingle() {
  const items = [];
  for (const id of enabledBlocksInOrder()) {
    if (id === "epk" && !isEpkRenderable()) continue;
    const cfg = ensureBlock(id);
    if (cfg.showInHeader === false) continue;
    // on single we allow duplicates if user explicitly wants them
    items.push({ label: getBlockDisplayName(id), href: `#${id}`, id });
  }
  // Polityka prywatności celowo NIE jest pokazywana w nawigacji w nagłówku.
  // Ma być dostępna wyłącznie z linku w stopce.
  return items;
}


function buildFontLinks(){
  const p = String(state.fontPreset || "inter");
  // Keep it lean: only load fonts when needed.
  if (p === "system") return "";
  const links = {
    inter: "family=Inter:wght@300;400;500;600;700;800&display=swap",
    // Replacing Space Grotesk: cleaner, more universal geometric sans.
    space: "family=Manrope:wght@300;400;500;600;700;800&display=swap",
    plex: "family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap",
    editorial: "family=Inter:wght@300;400;500;600;700;800&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap",
  };
  const q = links[p] || links.inter;
  return `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${q}">`.trim();
}


function buildSiteCss() {
  const accent = state.accent || "#6d28d9";
  const wash = state.bgColor || "#fef3c7";

  return `
:root{
  --accent:${accent};
  --wash:${wash};
  --max-main: 1160px;
  --max-header: 1160px;
  --max-hero: 1160px;
  --radius: 18px;
  --border-w: 1px;
  --pad-y: 26px;
  /* padding dla treści i osobno dla headera (header ma wyglądać estetycznie nawet gdy treść = full/0) */
  --pad-x-main: 18px;
  --pad-x-header: 18px;
  --section-gap: 26px;
  --shadow: none;
  --motion-dur: 160ms;
  --motion-ease: cubic-bezier(.2,.8,.2,1);
  --font-body: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
  --font-display: var(--font-body);
}

*,*::before,*::after{ box-sizing:border-box; }

@media (prefers-reduced-motion: reduce){
  :root{ --motion-dur: 0ms; }
}

html.kpo-preload *, html.kpo-preload *::before, html.kpo-preload *::after{
  transition: none !important;
  animation: none !important;
}

/* theme tokens */
/* Nie wymuszaj stałego scrollbara w wygenerowanej stronie – ma się pojawiać tylko gdy jest potrzebny. */
html{ overflow-x:hidden; }
body{ margin:0; overflow-x:hidden; font-family: var(--font-body); color: var(--fg, #0b1020); background: var(--bg, #f7f7fb); }
h1,h2,h3,.sectionTitle,.brand{ font-family: var(--font-display) !important; }
body.theme-minimalist{
  --fg:#0b1020;
  --bg:#f7f7fb;
  --card-bg: rgba(255,255,255,.70);
  --line: rgba(20,20,20,.18);
  --line-soft: rgba(20,20,20,.12);
  --header-bg: rgba(255,255,255,.85);
  --header-border: rgba(20,20,20,.12);
  --nav-bg-open: #ffffff;
}
body.theme-modern{
  --fg:#eaf0ff;
  --bg:#06070b;
  --card-bg: rgba(255,255,255,.06);
  --line: rgba(255,255,255,.16);
  --line-soft: rgba(255,255,255,.12);
  --header-bg: rgba(6,7,11,.80);
  --header-border: rgba(255,255,255,.12);
  --nav-bg-open: #06070b;
}

/* font presets */
body.font-system{ --font-body: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; --font-display: var(--font-body); }
body.font-inter{ --font-body: "Inter", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; --font-display: var(--font-body); }
/* "space" preset now maps to Manrope (replaces Space Grotesk) */
body.font-space{ --font-body: "Manrope", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; --font-display: var(--font-body); }
body.font-plex{ --font-body: "IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; --font-display: var(--font-body); }
body.font-editorial{ --font-body: "Inter", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; --font-display: "Fraunces", ui-serif, Georgia, "Times New Roman", serif; }

/* global style switches */
body.width-normal{ --max-main: 1160px !important; }
body.width-wide{ --max-main: 1320px !important; }
/* full = zero bocznych marginesów/paddingów treści */
body.width-full{ --max-main: 100% !important; --pad-x-main: 0px !important; }

/* safety: apply widths directly (CSS variables can be overridden by template blocks) */
body.width-normal .container{ max-width: 1160px !important; }
body.width-wide .container{ max-width: 1320px !important; }
body.width-full .container{ max-width: 100% !important; }

body.headerw-normal .headerInner{ max-width: 1160px !important; }
body.headerw-wide .headerInner{ max-width: 1320px !important; }
body.headerw-full .headerInner{ max-width: 100% !important; }

body.headerw-normal{ --max-header: 1160px !important; }
body.headerw-wide{ --max-header: 1320px !important; }
/* header może być full, ale wciąż ma mieć estetyczny oddech */
body.headerw-full{ --max-header: 100% !important; --pad-x-header: 18px !important; }

body.herow-normal{ --max-hero: 1160px !important; }
body.herow-wide{ --max-hero: 1320px !important; }
body.herow-full{ --max-hero: 100% !important; }

body.density-comfortable{ --pad-y: 32px !important; --section-gap: 44px !important; --section-pad: 26px !important; --title-gap: 18px !important; --grid-gap: 22px !important; --hero-pad: 36px !important; --header-py: 18px !important; --btn-py: 12px !important; --btn-px: 18px !important; --nav-font: 15px !important; --nav-py: 10px !important; --nav-px: 12px !important; --lh-base: 1.72 !important; }
body.density-normal{ --pad-y: 26px !important; --section-gap: 26px !important; --section-pad: 18px !important; --title-gap: 14px !important; --grid-gap: 16px !important; --hero-pad: 28px !important; --header-py: 14px !important; --btn-py: 10px !important; --btn-px: 14px !important; --nav-font: 14px !important; --nav-py: 8px !important; --nav-px: 10px !important; --lh-base: 1.65 !important; }
body.density-compact{ --pad-y: 18px !important; --section-gap: 18px !important; --section-pad: 14px !important; --title-gap: 10px !important; --grid-gap: 12px !important; --hero-pad: 22px !important; --header-py: 10px !important; --btn-py: 8px !important; --btn-px: 12px !important; --nav-font: 13px !important; --nav-py: 6px !important; --nav-px: 8px !important; --lh-base: 1.55 !important; }

body.borders-none{ --border-w: 0px !important; }
body.borders-thin{ --border-w: 1px !important; }
body.borders-thick{ --border-w: 2px !important; }

body.radius-0{ --radius: 0px !important; }
body.radius-md{ --radius: 18px !important; }
body.radius-lg{ --radius: 28px !important; }

body.motion-off{ --motion-dur: 0ms !important; }
body.motion-subtle{ --motion-dur: 160ms !important; }
body.motion-strong{ --motion-dur: 260ms !important; --motion-ease: cubic-bezier(.16,.84,.33,1) !important; }

/* Content alignment (NOT layout shift):
   - layout-left: default, text/blocks aligned to the left inside the same centered container.
   - layout-center: centers section titles + section copy/actions, but keeps the container centered.
   IMPORTANT: This must not shift the page (no margin hacks), and must not affect HEADER or HERO. */
body.layout-center main.container .section{ text-align:center; }
body.layout-center main.container .sectionTitle{ text-align:center; }
/*
  Center alignment should affect only the main content SECTIONS.
  It must NOT touch HERO (even in templates where HERO sits inside <main>)
  and must NOT affect HEADER.
*/
body.layout-center main.container .section .muted,
body.layout-center main.container .section p,
body.layout-center main.container .section li,
body.layout-center main.container .section .storeDesc,
body.layout-center main.container .section .privacyPolicy{ text-align:center; }

.container{ max-width: var(--max-main); margin: 0 auto; padding: var(--pad-y) var(--pad-x-main) 70px; }
/* Domyślnie (strony bez HERO): odsuwamy treść spod fixed header. */
main.container{ padding-top: calc(var(--pad-y) + var(--header-h, 72px)); }
/* Na stronie z HERO (który zajmuje cały viewport) nie dokładamy "pustej" przestrzeni po HERO. */
body.has-hero main.container{ padding-top: 0; }
.section{ margin-top: var(--section-gap); scroll-margin-top: calc(var(--header-h, 72px) + 16px); }

/* reveal on scroll */
.section.reveal-on-scroll{
  opacity:0;
  transform: translateY(28px) scale(.985);
  filter: blur(1.6px);
  transition:
    opacity 380ms var(--motion-ease),
    transform 460ms cubic-bezier(.16,1,.3,1),
    filter 460ms cubic-bezier(.16,1,.3,1);
  will-change: opacity, transform, filter;
}
.section.reveal-on-scroll.reveal-in{ opacity:1; transform:none; filter:none; }
.sectionTitle{ text-align:left; margin:0 0 var(--title-gap) 0; font-size: clamp(22px, 2.2vw, 30px); letter-spacing:.2px; }
.muted{ opacity:.78; line-height:var(--lh-base); }

/* Rich text (About) */
.richText p{ margin: 0 0 .9em 0; }
.richText p:last-child{ margin-bottom: 0; }
.richText h2{ margin: 1.0em 0 .4em; font-size: 1.25em; }
.richText h3{ margin: 0.9em 0 .35em; font-size: 1.12em; }
.richText ul, .richText ol{ margin: .6em 0 .9em 1.2em; }
.richText li{ margin: .2em 0; }
.richText a{ color: var(--accent); text-decoration: underline; }

/* Embed sections (YouTube/Spotify): tytuł sekcji zawsze na środku, bo pod spodem są embedy. */
.embedSection > .sectionTitle{ text-align:center; }
.embedSection > .muted{ text-align:center; }

/* header */
.siteHeader{
  position: fixed;
  top:0; left:0; right:0;
  z-index:80;
  background: var(--header-bg);
  border-bottom: var(--border-w) solid var(--header-border);
  backdrop-filter: blur(10px);
  /* Nie tnij dropdownu (iOS potrafi traktować overflow-x jako overflow w całości). */
  overflow: visible;
}


/* header background mode: pill (floating) */
body.headerbg-pill .siteHeader{
  background: transparent;
  border-bottom: 0;
  backdrop-filter: none;
  padding: 10px 0;
}
body.headerbg-pill .headerInner{
  background: var(--header-bg);
  border: var(--border-w) solid var(--header-border);
  border-radius: 999px;
  backdrop-filter: blur(10px);
  box-shadow: 0 12px 30px rgba(0,0,0,.10);
}
/* nawet przy headerw-full pill ma mieć oddech od krawędzi */
body.headerbg-pill.headerw-full .headerInner{ max-width: calc(100% - 24px); }

/* pill: na HERO ma nachodzić jak transparent (bez odsunięcia treści). */
body.headerbg-pill.has-hero main.container{ padding-top: 0; }
/* pill: nie zamieniaj całego paska w pełnoszerokie tło przy otwartym menu */
body.headerbg-pill .siteHeader.menuOpen{ background: transparent; border-bottom: 0; }


/* header background mode:
   - solid: jak jest
   - transparent: header jako nakładka, HERO dojeżdża do samej góry, a header najeżdża na sekcje */
body.headerbg-transparent .siteHeader{
  background: transparent;
  border-bottom: 0;
  /* overlay: czytelność bez blura */
  color: #fff;
  /* bez "glass"/blura w trybie nakładki */
  backdrop-filter: none;
}
body.headerbg-transparent .navToggle{
  background: rgba(0,0,0,.55);
  border-color: rgba(255,255,255,.22);
  color: #fff;
}
body.headerbg-transparent .siteHeader.menuOpen .navToggle{
  background: var(--nav-bg-open);
  border-color: var(--header-border);
  color: var(--fg);
}

body.headerbg-transparent .siteHeader::before{
  content:"";
  position:absolute;
  inset:0;
  pointer-events:none;
  background: linear-gradient(to bottom, rgba(0,0,0,.55), rgba(0,0,0,0));
  opacity: 1;
  transition: opacity var(--motion-dur) var(--motion-ease);
}
body.headerbg-transparent .siteHeader.menuOpen{
  background: var(--nav-bg-open);
  border-bottom: var(--border-w) solid var(--header-border);
  /* menu otwarte ma być czytelne na jasnym tle */
  color: var(--fg);
  backdrop-filter: none;
}
body.headerbg-transparent .siteHeader.menuOpen::before{ opacity: 0; }
/* Transparent header: overlay ma sens tylko nad HERO.
   Bez HERO header ma być jak standardowy (czytelność + odsunięcie treści spod fixed). */
body.headerbg-transparent:not(.has-hero) .siteHeader{
  background: var(--header-bg);
  border-bottom: var(--border-w) solid var(--header-border);
  color: var(--fg);
  backdrop-filter: blur(10px);
}
body.headerbg-transparent:not(.has-hero) .siteHeader::before{ opacity: 0; display:none; }
body.headerbg-transparent:not(.has-hero) main.container{ padding-top: calc(var(--pad-y) + var(--header-h, 72px)); }

/* Z HERO: treść startuje od razu po HERO (HERO jest poza <main>). */
body.headerbg-transparent.has-hero main.container{ padding-top: 0; }

/* Z HERO: po scrollu header ma się „zmaterializować”, żeby tekst nie ginął na jasnym tle. */
body.headerbg-transparent.has-hero .siteHeader.headerSolid:not(.menuOpen){
  background: var(--header-bg);
  border-bottom: var(--border-w) solid var(--header-border);
  color: var(--fg);
  backdrop-filter: blur(10px);
}
body.headerbg-transparent.has-hero .siteHeader.headerSolid:not(.menuOpen)::before{ opacity: 0; }
/* HERO jest poza <main>, więc nie kompensujemy paddingu kontenera. */
.headerInner{
  max-width: var(--max-header);
  margin:0 auto;
  padding: var(--header-py) var(--pad-x-header);
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:18px;
  position:relative;
  z-index: 1;
  min-width: 0;
  /* Pozwól menu (dropdown) wyjść w dół, ale nie pozwalaj rozpychać szerokości. */
  overflow: visible;
}
.brand{
  display:flex; align-items:center; gap:10px;
  font-weight: 900;
  letter-spacing:.2px;
  font-size: clamp(16px, 1.3vw, 19px);
  min-width:0;
}
.brandText{
  display:block;
  min-width:0;
  overflow:hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.brandDotRemoved{
  width:12px; height:12px;
  background: var(--accent);
}
.nav{ display:flex; gap:14px; flex-wrap:nowrap; white-space:nowrap; align-items:center; justify-content:flex-end; flex: 1 1 auto; max-width: 100%; min-width:0; overflow:hidden; }
/* used only by header-center desktop row */
.navGroup{ display:flex; gap:14px; flex-wrap:nowrap; white-space:nowrap; align-items:center; min-width:0; }
.navGroup--left{ justify-content:flex-end; }
.navGroup--right{ justify-content:flex-start; }

.nav a,
.navGroup a{
  text-decoration:none;
  color: inherit;
  opacity:.75;
  font-weight: 800;
  font-size: var(--nav-font);
  padding: var(--nav-py) var(--nav-px);
  border-radius: 12px;
  transition: background var(--motion-dur) var(--motion-ease), opacity var(--motion-dur) var(--motion-ease), transform var(--motion-dur) var(--motion-ease), border-color var(--motion-dur) var(--motion-ease);
}
.nav a:hover,
.navGroup a:hover{ opacity:1; }
.nav a.active,
.navGroup a.active{ opacity:1; }

/* accent types */
body.accent-underline .nav a.active,
body.accent-underline .navGroup a.active{ text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 6px; }
body.accent-pill .nav a.active,
body.accent-pill .navGroup a.active{ background: color-mix(in oklab, var(--accent), transparent 86%); }
body.accent-outline .nav a.active,
body.accent-outline .navGroup a.active{ border: var(--border-w) solid var(--accent); }
body.accent-gradient .nav a.active,
body.accent-gradient .navGroup a.active{
  background: linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent), white 22%));
  color:#fff;
  /* keep it clean (no weird glow) */
  box-shadow: none;
}

/* header layout: center */
body.header-center .headerInner{
  display:grid;
  grid-template-columns: 1fr auto 1fr;
  align-items:center;
  justify-content:stretch;
  column-gap: 44px;
}
body.header-center .navSlot{ display:flex; align-items:center; min-width:0; overflow:hidden; }
body.header-center .navSlot--left{ justify-content:flex-end; }
body.header-center .navSlot--right{ justify-content:flex-start; }
body.header-center .brand{ justify-content:center; }
body.header-center .brandText{ font-size: 20px; letter-spacing:.3px; }
body.header-center .brandLogo{ height: 32px; }
body.header-center .navGroup{ overflow:hidden; }
body.header-center .navGroup a{ font-size: var(--nav-font); padding: var(--nav-py) var(--nav-px); }
body.header-center .navToggle{ margin-left:auto; }
/* header-center uses a dedicated mobile dropdown nav (.nav), keep it hidden on desktop */
body.header-center .nav{ display:none; }
body.header-center .siteHeader.forceHamburger .navGroup{ display:none !important; }

@media (max-width: 760px){
  body.header-center .navGroup{ display:none; }
  body.header-center .nav{ display:block; }
  /* keep brand visually centered when left slot is empty */
  body.header-center .headerInner{ column-gap: 14px; }
}

.btn{
  display:inline-flex; align-items:center; justify-content:center;
  border: var(--border-w) solid var(--line);
  padding: var(--btn-py) var(--btn-px);
  font-weight: 900;
  text-decoration:none;
  color: inherit;
  background: transparent;
  border-radius: 12px;
  transition: transform var(--motion-dur) var(--motion-ease), filter var(--motion-dur) var(--motion-ease), background var(--motion-dur) var(--motion-ease), border-color var(--motion-dur) var(--motion-ease), box-shadow var(--motion-dur) var(--motion-ease);
}
.btn.primary{
  border-color: transparent;
  background: var(--accent);
  color: #fff;
}
body.accent-outline .btn.primary{
  background: transparent;
  border-color: var(--accent);
  color: var(--accent);
}
body.accent-gradient .btn.primary{
  background: linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent), white 22%));
  /* no heavy glow by default */
  box-shadow: none;
}
.btn:hover{ filter: brightness(1.03); transform: translateY(-1px); }

/* dividers */
body.sep-line .section{
  padding-top: calc(var(--section-gap) - 6px);
  border-top: var(--border-w) solid var(--line-soft);
}
body.sep-line .section:first-of-type{ border-top:none; padding-top:0; }

/* Jeśli sekcje (np. Spotify + YouTube) są renderowane obok siebie w jednym wierszu,
   nie dokładaj separatorów w kolumnach (psują wyrównanie i proporcje). */
body.sep-line .mediaSplitRow .section{ border-top:none; padding-top:0; }

body.sep-block .section{
  background: var(--card-bg);
  padding: 18px;
  border-radius: var(--radius);
  border: var(--border-w) solid var(--line-soft);
}

.grid{ display:grid; gap:var(--grid-gap); }
.grid2{ display:grid; gap:var(--grid-gap); grid-template-columns: 1fr 1fr; }
@media (max-width: 900px){ .grid2{ grid-template-columns: 1fr; } }

/* hero with background */
.hero{
  position:relative;
  min-height: 520px;
  display:flex;
  align-items:flex-end;
  /* hero ma być w pełni widoczny (CTA na dole) i optycznie zgrany z szerokością treści */
  padding: var(--hero-pad) 0;
  background: #111;
  color:#fff;
  overflow:hidden;
}

/*
  HERO geometry (kończymy temat raz na zawsze):
  - header transparent (overlay): HERO startuje od górnej krawędzi viewportu.
  - header standard: HERO zaczyna się POD headerem i ma wysokość (viewport - header).
  Dzięki temu:
    * góra w transparent = do krawędzi,
    * góra w standard = pod belką,
    * dół ZAWSZE = dół viewportu (CTA widoczne).
*/
/* viewport unit helper: stabilne fullscreen na desktop+mobile */
@supports (height: 100svh){ :root{ --vh: 100svh; } }
@supports not (height: 100svh){ :root{ --vh: 100vh; } }

/* HERO height:
   - transparent header (overlay): 100vh
   - standard header: (100vh - header) i HERO zaczyna się POD headerem (S1) */
.hero{ --hero-vh: var(--vh); min-height: var(--hero-vh) !important; height: var(--hero-vh) !important; }
body:not(.headerbg-transparent):not(.headerbg-pill) .hero{
  --hero-vh: calc(var(--vh) - var(--header-h, 72px));
  margin-top: var(--header-h, 72px);
}

/* rama hero dopasowana do szerokości treści (zgodnie z Width treści + layout-left) */
.heroFrame{ width:100%; max-width: var(--max-main); margin: 0 auto; padding: 0 var(--pad-x-main); }
.hero::before{
  content:"";
  position:absolute; inset:0;
  background-image: var(--hero-bg);
  background-size: cover;
  background-position: center;
  filter: saturate(1.05);
  transform: scale(1.02);
  pointer-events:none;
}

@media (max-width: 820px){
  .hero::before{ background-image: var(--hero-bg-mobile, var(--hero-bg)); }
}


/* HERO width (ma dawać realne marginesy sekcji, niezależnie od szerokości treści):
   - normal: HERO w kontenerze (marginesy po bokach)
   - wide: szerszy kontener HERO
   - full: full-bleed na cały viewport */
body.herow-normal #hero.hero,
body.herow-wide #hero.hero{
  width: 100%;
  max-width: var(--max-hero);
  margin-left: auto;
  margin-right: auto;
  border-radius: var(--radius);
}

body.herow-full #hero.hero{
  width: 100vw;
  max-width: none;
  position: relative;
  left: 50%;
  transform: translateX(-50%);
  margin-left: 0;
  margin-right: 0;
  border-radius: 0;
}

/* HERO: zawsze bez rounded corners */
#hero.hero{ border-radius: 0 !important; }

.hero::after{
  content:"";
  position:absolute; inset:0;
  background: linear-gradient(180deg, rgba(0,0,0,.25), rgba(0,0,0,.72));
  pointer-events:none;
}
.heroInner{ position:relative; max-width: 70ch; z-index:1; }
.hero .kicker{ display:inline-flex; align-items:center; gap:10px; font-weight:900; opacity:.95; }
.kdot{ width:10px; height:10px; background: var(--accent); }
.hero h1{ margin: 10px 0 10px 0; font-size: 52px; letter-spacing:-.6px; overflow-wrap:anywhere; word-break:break-word; }
.hero p{ margin: 0 0 18px 0; font-size: 16px; opacity:.88; overflow-wrap:anywhere; }
.heroActions{ display:flex; gap:10px; flex-wrap:wrap; }
/* HERO slider (2+ images) */
.heroSliderBar{
  position:absolute;
  right: 18px;
  bottom: 18px;
  display:flex;
  align-items:center;
  gap: 10px;
  z-index: 2;
}
.heroArrow{
  border: var(--border-w) solid rgba(255,255,255,.28);
  background: rgba(0,0,0,.40);
  color: #fff;
  border-radius: 12px;
  padding: var(--nav-py) var(--nav-px);
  line-height: 1;
  cursor: pointer;
  user-select: none;
}
.heroArrow:hover{ background: rgba(0,0,0,.58); }
.heroCounter{
  font-weight: 900;
  font-size: var(--nav-font);
  letter-spacing: .3px;
  padding: 7px 10px;
  border-radius: 12px;
  background: rgba(0,0,0,.28);
  border: var(--border-w) solid rgba(255,255,255,.22);
}
.heroSlides{ display:none; }
@media (max-width: 900px){ .hero{ min-height: 520px; } .heroSliderBar{ right: 14px; bottom: 14px; } }

/* gallery */
.galleryGrid{ display:grid; grid-template-columns: repeat(var(--gcols, 4), 1fr); gap: 14px; }
@media (max-width: 900px){ .galleryGrid{ grid-template-columns: repeat(var(--gcols-m, 2),1fr); } }
.galleryGrid a{ display:block; overflow:hidden; border-radius: var(--radius); }
.galleryGrid img{ width:100%; height:auto; display:block; }

.masonry{ column-count: var(--mcols, 3); column-gap: 14px; }
@media (max-width: 900px){ .masonry{ column-count: var(--mcols-m, 2); } }
.masonryItem{ break-inside: avoid; margin:0 0 14px 0; }
.masonryItem img{ width:100%; height:auto; display:block; border-radius: var(--radius); }

	.embed{ width:100%; height:auto; display:block; aspect-ratio: 16/9; border:0; }
	/*
	  Stacked (no split): embedSize should scale the whole player, not only width.
	  Use wrapper aspect-ratio so the whole player scales (width + height).
	*/
	.embed.tall{ width:100%; border:0; }
	.embedWrap--youtube{ aspect-ratio: 16 / 9; }
	.embedWrap--youtube .embed{ height: 100%; aspect-ratio: auto; }
	.embedWrap--spotify{ aspect-ratio: 560 / 352; }
	.embedWrap--spotify .embed.tall{ height: 100%; aspect-ratio: auto; }
.embedGrid{ --embed-max: 100%; justify-items:center; }
/* Mobile: make stacked embeds a fixed 75% width regardless of slider */
@media (max-width: 900px){
  .embedGrid{ --embed-max: 75% !important; }
}

	.embedWrap{ width: min(var(--embed-max), 920px); max-width: 100%; margin-inline:auto; }
	/* Spotify looks better a bit narrower in stacked mode; still obey embedSize + viewport */
	.embedWrap--spotify{ width: min(var(--embed-max), 720px); }
.mediaSplitRow{ display:grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items:start; }
.mediaSplitRow .embedWrap{ width: 100%; max-width: 100%; }
/* wyrównanie wysokości embedów w układzie obok siebie */
	.mediaSplitRow .embed{ height: 352px; aspect-ratio: auto; }
.mediaSplitRow .embed.tall{ height: 352px; }
	.mediaSplitRow .embedWrap--youtube{ aspect-ratio: auto; }
	.mediaSplitRow .embedWrap--spotify{ aspect-ratio: auto; }
@media (max-width: 900px){ .mediaSplitRow .embed{ height:auto; aspect-ratio: 16/9; } .mediaSplitRow .embed.tall{ height: 352px; } }
@media (max-width: 900px){ .mediaSplitRow{ grid-template-columns: 1fr; } }
.embedCard{ border: var(--border-w) solid var(--line-soft); padding:12px; border-radius: var(--radius); background: color-mix(in oklab, var(--bg), transparent 0%); }
.fakeEmbed{
  width:100%; aspect-ratio: 16/9;
  border-radius: var(--radius);
  border: var(--border-w) dashed var(--line-soft);
  display:flex; align-items:center; justify-content:center;
  font-weight: 900;
  opacity: .75;
}

/* map */
.mapWrap{ margin-top: 16px; display:grid; justify-items:center; }
.mapEmbed{ width: min(88%, 920px); max-width: 100%; height: 320px; border:0; border-radius: var(--radius); }
@media (max-width: 900px){ .mapEmbed{ width: 100%; } }

/* store/merch */
.storeGrid{ display:grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
@media (max-width: 900px){ .storeGrid{ grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 620px){ .storeGrid{ grid-template-columns: 1fr; } }
.storeCard{ border: var(--border-w) solid var(--line-soft); border-radius: var(--radius); overflow:hidden; display:flex; flex-direction:column; background: color-mix(in oklab, var(--bg), transparent 0%); }
.storeImg{ width:100%; aspect-ratio: 4/3; object-fit: cover; display:block; background: rgba(127,127,127,.12); }
.storeBody{ padding: 12px; display:grid; gap: 8px; }
.storeTop{ display:flex; align-items:flex-start; justify-content:space-between; gap: 10px; }
.storeName{ font-weight: 900; }
.storePrice{ font-weight: 900; opacity:.9; }
.storeDesc{ opacity:.78; line-height:1.55; font-size: var(--nav-font); }
.storeActions{ margin-top: 4px; }

.footer{ margin-top: 36px; opacity:.7; font-size: 12px; text-align:center; }
.footer a{ color: inherit; text-decoration: underline; text-underline-offset:2px; }
.footer a:hover{ opacity:1; }
.footerSep{ margin: 0 6px; }
.privacyPolicy{ line-height:1.55; font-size: 14px; overflow-wrap:anywhere; word-break:break-word; }
.privacyPolicy h3{ margin: 16px 0 8px; font-size: 14px; }
.privacyPolicy a{ overflow-wrap:anywhere; word-break:break-word; }
.privacyPolicy ul{ margin: 8px 0 0 18px; }


/* privacy modal (single-page) */
.privacyModal{ position:fixed; inset:0; z-index: 9999; display:none; padding: 18px; box-sizing:border-box; }
/* flex centering avoids subtle mobile left-shift when 100vw includes UI/scrollbar */
.privacyModal:target, .privacyModal.isOpen{ display:flex; align-items:flex-start; justify-content:center; }
.privacyModal__backdrop{ position:absolute; inset:0; background: rgba(0,0,0,.62); }
.privacyModal__dialog{ position:relative; width: min(980px, 100%); max-height: calc(100svh - 36px); margin: 4vh 0 0 0; overflow:auto;
  border: var(--border-w) solid var(--line-soft); border-radius: var(--radius); background: var(--bg);
  box-shadow: 0 20px 80px rgba(0,0,0,.55);
  padding: 14px;
}
.privacyModal__title{ margin: 6px 44px 12px 0; font-size: 18px; }
.privacyModal__close{ position:absolute; top: 10px; right: 10px; border: var(--border-w) solid var(--line-soft);
  background: transparent; color: var(--text); width: 36px; height: 36px; border-radius: 12px;
  font-size: 16px; cursor:pointer; font-weight: 900; display:flex; align-items:center; justify-content:center;
}
.privacyModal__close:hover{ background: rgba(127,127,127,.10); }
body.privacyModalOpen{ overflow:hidden; }


/* focus scroll */
body.scroll-focus main .section{ opacity: .22; transform: scale(.992); transition: opacity var(--motion-dur) var(--motion-ease), transform var(--motion-dur) var(--motion-ease), filter var(--motion-dur) var(--motion-ease); }
body.scroll-focus main .section.isActive{ opacity: 1; transform: scale(1); }
body.scroll-focus main .section.isPrev{ opacity: .12; }
body.scroll-focus main .section.isNext{ opacity: .36; }


/* lightbox */
.lbOverlay{ position:fixed; inset:0; background: rgba(0,0,0,.86); display:none; align-items:center; justify-content:center; padding: 18px; z-index: 9999; }
.lbOverlay.isOpen{ display:flex; }
.lbBox{ width: min(1120px, 94vw); max-height: 92vh; display:grid; gap: 10px; }
.lbImg{ width:100%; max-height: 78vh; object-fit: contain; background:#000; border-radius: var(--radius); box-shadow: 0 20px 70px rgba(0,0,0,.55); }
.lbBar{ display:flex; align-items:center; justify-content:space-between; gap: 10px; color:#fff; font-size: 12px; opacity:.92; }
.lbCaption{ overflow:hidden; text-overflow: ellipsis; white-space: nowrap; }
.lbControls{ display:flex; gap: 8px; align-items:center; }
.lbBtn{ border:1px solid rgba(255,255,255,.22); background: rgba(0,0,0,.35); color:#fff; padding: var(--nav-py) var(--nav-px); border-radius: 12px; font-weight: 900; cursor:pointer; }
.lbBtn:hover{ background: rgba(255,255,255,.08); }

/* templates (existing) */
body.tpl-square{ --radius: 0px; }
body.tpl-square main.container{ padding-top: calc(18px + var(--header-h, 72px)); }
body.tpl-square .btn{ border-radius: 0; }
body.tpl-square .hero{ border-radius: 0; }

/* Colorwash: use the selected accent as the *actual* page/canvas color.
   Also sync component backgrounds to it, so cards/segments don't turn white. */
body.tpl-colorwash{
  --bg: var(--wash);
  --card-bg: var(--bg);
  background: var(--bg);
}
/* jeśli ktoś przełączy motyw na ciemny, zachowaj odcień, ale przygaś dla czytelności */
body.theme-modern.tpl-colorwash{
  --bg: color-mix(in oklab, var(--wash), black 72%);
  --card-bg: var(--bg);
  background: var(--bg);
}
/* Colorwash: nie nadpisuj transparent/pill trybu na białe tło */
body.tpl-colorwash.headerbg-solid .siteHeader{ background: color-mix(in oklab, var(--header-bg), transparent 12%); }
body.tpl-colorwash .hero{ min-height: 560px; }
body.tpl-colorwash .brandDotRemoved{ background:#111; }
body.theme-modern.tpl-colorwash .brandDotRemoved{ background:#fff; }

body.tpl-rounded{ --radius: 18px; }
body.tpl-rounded .btn{ border-radius: 999px; }
body.tpl-rounded .hero{ border-radius: 26px; }

body.tpl-editorial{ font-family: ui-serif, Georgia, "Times New Roman", serif; }
body.tpl-editorial .nav a{ font-family: ui-sans-serif, system-ui; }
body.tpl-editorial .hero h1{ font-size: 58px; }

body.tpl-neon .hero::after{ background: radial-gradient(800px 420px at 20% 15%, rgba(109,40,217,.35), transparent 60%), linear-gradient(180deg, rgba(0,0,0,.18), rgba(0,0,0,.75)); }
body.tpl-soft .hero::after{ background: linear-gradient(180deg, rgba(255,255,255,.00), rgba(0,0,0,.78)); }

/* typography tweaks per template (system font stacks only) */
body.tpl-cinematic .hero h1{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; }

/* Soft & Colorwash: softer editorial headings */
body.tpl-soft .hero h1,
body.tpl-soft .sectionTitle,
body.tpl-colorwash .hero h1,
body.tpl-colorwash .sectionTitle,
body.tpl-basic-colorwash .sectionTitle{
  font-family: ui-serif, Georgia, "Times New Roman", serif;
  letter-spacing: -0.2px;
}

/* Spotlight: dramatic titles */
body.tpl-spotlight .hero h1,
body.tpl-spotlight .sectionTitle{
  font-family: ui-serif, Georgia, "Times New Roman", serif;
  letter-spacing: -0.35px;
}

/* Swiss: grid-like titles */
body.tpl-swiss .sectionTitle,
body.tpl-swiss .nav a{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

/* Neon: techy nav */
body.tpl-neon .nav a{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }

/* Rounded: friendly but readable – slightly wider tracking on nav */
body.tpl-rounded .nav a{ letter-spacing: .15px; }

body.tpl-rounded .hero h1,
body.tpl-rounded .sectionTitle{
  font-family: ui-serif, Georgia, "Times New Roman", serif;
  letter-spacing: -0.25px;
}



/* templates (expanded)
   Each template gets some distinct layout/typography so the catalog feels real. */

body.tpl-cinematic .hero{ min-height: 72vh; }
body.tpl-cinematic .hero::before{ filter: saturate(1.0) contrast(1.08); }
/* Cinematic: no neon/glow blob in HERO — only clean contrast overlay */
body.tpl-cinematic .hero::after{ background: linear-gradient(180deg, rgba(0,0,0,.22), rgba(0,0,0,.84)); }
body.tpl-cinematic .nav a{ letter-spacing:.35px; }
body.tpl-cinematic .hero h1{ font-size: 56px; letter-spacing:-.8px; }

body.tpl-brutalist{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
body.tpl-brutalist .nav a{ text-transform: uppercase; letter-spacing:.8px; }
body.tpl-brutalist .sectionTitle{ text-transform: uppercase; letter-spacing: 1.2px; font-size: 18px; }
body.tpl-brutalist .btn{ border-radius: 0; }
body.tpl-brutalist .hero{ border-radius: 0; }
body.tpl-brutalist .hero h1{ text-transform: uppercase; font-size: 54px; letter-spacing:-.4px; }

body.tpl-swiss .nav a{ font-weight: 900; letter-spacing:.45px; }
body.tpl-swiss .sectionTitle{ text-transform: uppercase; letter-spacing: .9px; font-size: 18px; }
body.tpl-swiss .hero h1{ font-size: 50px; letter-spacing:-.5px; }
body.tpl-swiss .btn{ border-radius: 10px; }

body.tpl-collage .section{ background: var(--card-bg); padding: var(--section-pad); border-radius: var(--radius); border: var(--border-w) solid var(--line-soft); box-shadow: 0 18px 60px rgba(0,0,0,.08); }
body.theme-modern.tpl-collage .section{ box-shadow: 0 22px 70px rgba(0,0,0,.50); }
body.tpl-collage .galleryGrid a:nth-child(odd){ transform: rotate(-.6deg); }
body.tpl-collage .galleryGrid a:nth-child(even){ transform: rotate(.6deg); }
body.tpl-collage .storeCard{ box-shadow: 0 14px 50px rgba(0,0,0,.08); }
body.theme-modern.tpl-collage .storeCard{ box-shadow: 0 18px 60px rgba(0,0,0,.45); }

body.tpl-photofirst .hero{ min-height: 78vh; padding: 34px; }
body.tpl-photofirst .heroInner{ max-width: 86ch; }
body.tpl-photofirst .heroGallery{ grid-template-columns: repeat(8, 1fr); }
@media (max-width: 900px){ body.tpl-photofirst .heroGallery{ grid-template-columns: repeat(4,1fr);} }

/* mobile: slightly smaller hero title so it fits nicely */
@media (max-width: 520px){
  .hero h1{ font-size: 42px; }
  body.tpl-editorial .hero h1{ font-size: 44px; }
  body.tpl-spotlight .hero h1{ font-size: 46px; }
  body.tpl-cinematic .hero h1{ font-size: 44px; }
  body.tpl-brutalist .hero h1{ font-size: 42px; }
  body.tpl-swiss .hero h1{ font-size: 42px; }
}

/* split layout: hero as a sticky left panel on desktop */
@media (min-width: 980px){
  body.tpl-split main.container{ display:grid; grid-template-columns: 380px 1fr; gap: 22px; align-items:start; }
  body.tpl-split main.container > .hero{ grid-column: 1; grid-row: 1 / span 999; position: sticky; top: calc(var(--header-h, 72px) + 20px); min-height: calc(100svh - (var(--header-h, 72px) + 20px)) !important; height: calc(100svh - (var(--header-h, 72px) + 20px)) !important; border-radius: var(--radius); }
  body.tpl-split main.container > .section{ grid-column: 2; }
  body.tpl-split main.container > .footer{ grid-column: 2; }
  body.tpl-split .heroGallery{ grid-template-columns: repeat(4,1fr); }
}

body.tpl-spotlight .hero{ min-height: 640px; }
body.tpl-spotlight .hero h1{ font-size: 58px; }

/* BASIC templates: light wrappers so they are not just presets */
body.tpl-basic-clean .hero{ border-radius: var(--radius); }
body.tpl-basic-dark .hero::after{ background: linear-gradient(180deg, rgba(0,0,0,.20), rgba(0,0,0,.86)); }
body.tpl-basic-cards .embedCard, body.tpl-basic-cards .storeCard{ background: var(--card-bg); }
body.tpl-basic-colorwash{ background: linear-gradient(0deg, color-mix(in oklab, var(--accent), white 90%), color-mix(in oklab, var(--accent), white 90%)); }
body.theme-modern.tpl-basic-colorwash{ background: linear-gradient(0deg, color-mix(in oklab, var(--accent), black 78%), color-mix(in oklab, var(--accent), black 78%)); }
body.tpl-basic-classic{ font-family: ui-serif, Georgia, "Times New Roman", serif; }
body.tpl-basic-classic .nav a{ font-family: ui-sans-serif, system-ui; }

.navToggle{
  display:none;
  border: var(--border-w) solid var(--line-soft);
  background: var(--nav-bg-open);
  color: inherit;
  border-radius: 12px;
  padding: var(--nav-py) var(--nav-px);
  line-height: 1;
  cursor:pointer;
}
body.theme-modern .navToggle{
  background: rgba(12,13,18,.92);
  border-color: rgba(255,255,255,.12);
}
.brandLogo{ height: 28px; width: auto; display:block; }

@media (max-width: 760px){
  .navToggle{ display:block; }
  .nav{
    display:block;
    position:absolute;
    left:0; right:0;
    top: 100%;
    background: var(--nav-bg-open);
    border-bottom: var(--border-w) solid var(--line-soft);
    padding: 10px 14px 14px;
    overflow:hidden;
    max-height: 0;
    opacity: 0;
    transform: translateY(-6px);
    pointer-events:none;
    transition:
      max-height var(--motion-dur) var(--motion-ease),
      opacity var(--motion-dur) var(--motion-ease),
      transform var(--motion-dur) var(--motion-ease);
  }
  body.theme-modern .nav{
    background: var(--nav-bg-open);
    border-bottom-color: rgba(255,255,255,.10);
  }
  .nav a{ display:block; padding: 10px 10px; border-radius: 12px; }
  .siteHeader.menuOpen .nav{
    max-height: 70vh;
    opacity: 1;
    transform: translateY(0);
    pointer-events:auto;
  }
}

/* Auto-hamburger (desktop): gdy header nie mieści się na desktop,
   pokazujemy hamburger + rozwijamy NAWIGACJĘ POZIOMĄ (ładny pasek), a nie pionowy panel.
   Na telefonie zostaje klasyczny dropdown z @media (max-width:760px). */
.siteHeader.forceHamburger .navToggle{ display:block; }
.siteHeader.forceHamburger .headerInner{ position:relative; }

@media (min-width: 761px){
  .siteHeader.forceHamburger .nav{
    display:flex;
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 10px;
    align-items: center;
    justify-content: center;

    position:absolute;
    top: calc(100% + 10px);
    left: 50%;
    transform: translateX(-50%);
    width: min(calc(100% - 24px), var(--max-header));
    max-width: var(--max-header);

    background: var(--header-bg);
    border: var(--border-w) solid var(--header-border);
    border-radius: calc(var(--radius) + 10px);
    backdrop-filter: blur(10px);
    padding: 10px 12px;
    box-shadow: 0 12px 30px rgba(0,0,0,.10);

    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;

    opacity: 0;
    transform: translateX(-50%) translateY(-6px);
    pointer-events:none;
    visibility: hidden;
    will-change: opacity, transform;
    transition:
      opacity var(--motion-dur) var(--motion-ease),
      transform var(--motion-dur) var(--motion-ease),
      visibility 0s linear var(--motion-dur);
  }
  .siteHeader.forceHamburger .nav::-webkit-scrollbar{ display:none; }
  .siteHeader.forceHamburger .nav a{
    display:inline-flex;
    white-space: nowrap;
    padding: 10px 12px;
    border-radius: 12px;
  }

  /* Header-center: na desktop normalnie .nav jest ukryty, ale przy forceHamburger ma się pokazać. */
  body.header-center .siteHeader.forceHamburger .nav{ display:flex !important; }

  /* W pill menu ma wyglądać jak część headera (spójnie z pigułą). */
  body.headerbg-pill .siteHeader.forceHamburger .nav{
    background: var(--header-bg);
    border-color: var(--header-border);
    border-radius: 999px;
    box-shadow: 0 12px 30px rgba(0,0,0,.10);
  }

  body.headerbg-pill .siteHeader.forceHamburger .nav a{ border-radius: 999px; }

  body.theme-modern .siteHeader.forceHamburger .nav{
    background: var(--header-bg);
    border-color: var(--header-border);
  }

  /* Transparent: ciemny glass tylko w trybie overlay (bez scrolla i bez otwartego menu). */
  body.headerbg-transparent .siteHeader.forceHamburger:not(.menuOpen):not(.headerSolid) .nav{
    background: rgba(0,0,0,.55);
    border-color: rgba(255,255,255,.22);
    color: #fff;
    backdrop-filter: blur(10px);
  }
  /* Transparent: po otwarciu menu (lub po scrollu) wracamy do jasnego tła jak w headerze. */
  body.headerbg-transparent .siteHeader.forceHamburger.menuOpen .nav{
    background: var(--nav-bg-open);
    border-color: var(--header-border);
    color: var(--fg);
    backdrop-filter: none;
  }

  .siteHeader.forceHamburger.menuOpen .nav{
    opacity: 1;
    transform: translateX(-50%) translateY(0);
    pointer-events:auto;
    visibility: visible;
    transition:
      opacity var(--motion-dur) var(--motion-ease),
      transform var(--motion-dur) var(--motion-ease),
      visibility 0s;
  }
}

/* po otwarciu menu header ma byc czytelny */
.siteHeader.menuOpen{ background: var(--header-bg); }

/* cookie consent banner */
.cookieBanner{ position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 9999; }
.cookieBanner__inner{ max-width: var(--max); margin: 0 auto; }
.cookieBanner__box{ background: var(--header-bg); border: var(--border-w) solid var(--line); border-radius: calc(var(--radius) + 2px); padding: 12px 14px; backdrop-filter: blur(10px); box-shadow: 0 18px 60px rgba(0,0,0,.22); }
body.theme-minimalist .cookieBanner__box{ box-shadow: 0 18px 60px rgba(0,0,0,.12); }
.cookieBanner__row{ display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.cookieBanner__text{ font-size: var(--nav-font); line-height: 1.35; opacity: .92; max-width: 720px; }
.cookieBanner__text a{ color: inherit; text-decoration: underline; text-underline-offset: 2px; opacity: .95; }
.cookieBanner__actions{ display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

`;
}


function buildSiteScript() {
  // Works for both single + ZIP pages. In preview, intercept internal navigation.
  const analyticsCfg = {
    gtmId: String(state.gtmId || "").trim(),
    cookieBanner: !!state.cookieBanner,
    privacyAuto: !!state.privacyAuto,
    privacyUrl: sanitizePrivacyHrefLoose(state.privacyAuto ? "" : (state.privacyUrl || ""))
  };
  return `
(function(){
  const IN_PREVIEW = document.documentElement.hasAttribute('data-kpo-preview');
  const ANALYTICS = ${JSON.stringify(analyticsCfg)};
  const CONSENT_KEY = 'kpo_cookie_consent_v1';

  function prefersReduced(){
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e){ return false; }
  }

  function getConsent(){
    try { return localStorage.getItem(CONSENT_KEY) || ''; } catch(e){ return ''; }
  }

  function setConsent(v){
    try { localStorage.setItem(CONSENT_KEY, String(v || '')); } catch(e){}
  }

  function isValidGtmId(id){
    return /^GTM-[A-Z0-9]+$/i.test(String(id || '').trim());
  }

  function loadGtm(id){
    const gtmId = String(id || '').trim();
    if(!gtmId) return;
    if(!isValidGtmId(gtmId)) return;
    if(IN_PREVIEW) return;
    if(window.__kpoGtmLoaded) return;
    window.__kpoGtmLoaded = true;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({'gtm.start': new Date().getTime(), event:'gtm.js'});

    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(gtmId);

    const first = document.getElementsByTagName('script')[0];
    if(first && first.parentNode) first.parentNode.insertBefore(s, first);
    else (document.head || document.documentElement).appendChild(s);
  }

  function showCookieBanner(){
    if(IN_PREVIEW) return;
    if(document.querySelector('.cookieBanner')) return;

    const wrap = document.createElement('div');
    wrap.className = 'cookieBanner';

    const inner = document.createElement('div');
    inner.className = 'cookieBanner__inner';

    const box = document.createElement('div');
    box.className = 'cookieBanner__box';

    const row = document.createElement('div');
    row.className = 'cookieBanner__row';

    const text = document.createElement('div');
    text.className = 'cookieBanner__text';
    text.appendChild(document.createTextNode('Ta strona używa plików cookie do statystyk i marketingu. '));

    function isExternalHref(h){
      return /^https?:\/\//i.test(String(h || ''));
    }

    function getPrivacyHref(){
      const direct = String(ANALYTICS.privacyUrl || '').trim();
      if (direct) return direct;
      if (document.getElementById('privacy')) return '#privacy';
      const p = String(location.pathname || '').toLowerCase();
      if (p.endsWith('privacy.html')) return '#top';
      return 'privacy.html';
    }

    const privHref = getPrivacyHref();
    if(privHref){
      const a = document.createElement('a');
      a.href = privHref;
      if (isExternalHref(privHref)) {
        a.target = '_blank';
        a.rel = 'noopener';
      }
      a.textContent = 'Polityka prywatności';
      text.appendChild(a);
      text.appendChild(document.createTextNode('.'));
    }

    const actions = document.createElement('div');
    actions.className = 'cookieBanner__actions';

    const btnOk = document.createElement('button');
    btnOk.type = 'button';
    btnOk.className = 'btn primary';
    btnOk.textContent = 'Akceptuj';

    const btnNo = document.createElement('button');
    btnNo.type = 'button';
    btnNo.className = 'btn';
    btnNo.textContent = 'Odrzuć';

    actions.append(btnOk, btnNo);
    row.append(text, actions);
    box.appendChild(row);
    inner.appendChild(box);
    wrap.appendChild(inner);
    document.body.appendChild(wrap);

    btnOk.addEventListener('click', () => {
      setConsent('accept');
      try{ wrap.remove(); }catch(e){}
      loadGtm(ANALYTICS.gtmId);
    });

    btnNo.addEventListener('click', () => {
      setConsent('reject');
      try{ wrap.remove(); }catch(e){}
    });
  }

  function setupAnalytics(){
    const id = String(ANALYTICS.gtmId || '').trim();

    const consent = getConsent();
    if(consent === 'accept'){
      if(id) loadGtm(id);
      return;
    }
    if(consent === 'reject'){
      return;
    }

    // Brak decyzji: pokaż banner (nawet jeśli nie ma GTM)
    if(ANALYTICS.cookieBanner) {
      showCookieBanner();
      return;
    }

    // Bez bannera: jeśli jest GTM, uruchom od razu
    if(id) loadGtm(id);
  }

  function setupHeaderOffset(){
  const header = document.querySelector('.siteHeader');
  if(!header) return;
  const set = ()=>{
    const h = Math.ceil((header.getBoundingClientRect?.().height) || header.offsetHeight || 0);
    document.documentElement.style.setProperty('--header-h', (h||72) + 'px');
  };
  set();
  window.addEventListener('resize', set, {passive:true});
  if('ResizeObserver' in window){
    try{ new ResizeObserver(set).observe(header); }catch(e){}
  }
}

function setupTransparentHeaderOnScroll(){
  const header = document.querySelector('.siteHeader');
  if(!header) return;
  const b = document.body;
  if(!b.classList.contains('headerbg-transparent')) return;
  // Jeśli użytkownik wybrał przezroczysty nagłówek, ma taki zostać — bez automatycznego przełączania po scrollu.
  header.classList.remove('headerSolid');
}

function setupHamburger(){
    const header = document.querySelector('.siteHeader');
    if(!header) return;
    const btn = header.querySelector('.navToggle');
    const nav = header.querySelector('.nav');
    const inner = header.querySelector('.headerInner');
    const brand = header.querySelector('.brand');
    if(!btn || !nav) return;

	    // Stabilizacja: przy układzie "header-center" łatwo o oscylacje (nav znika/pokazuje się i zmienia pomiary).
	    // Trzymamy hysteresis + debouncing w RAF.
		    const HYST = 120; // px "bufor" żeby hamburger nie migał na granicy
	    let isCollapsed = header.classList.contains('forceHamburger');
	    let raf = 0;

    function lockScroll(lock){
      document.body.style.overflow = lock ? 'hidden' : '';
    }

    function setBtn(open){
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? '✕' : '☰';
    }

    function close(){
      header.classList.remove('menuOpen');
      setBtn(false);
      lockScroll(false);
    }

    function open(){
      header.classList.add('menuOpen');
      setBtn(true);
      lockScroll(true);
    }

    function toggle(){
      const openNow = header.classList.contains('menuOpen');
      if(openNow) close(); else open();
    }


    function measureNaturalWidth(node){
      if(!node) return 0;
      try{
        const clone = node.cloneNode(true);
        clone.style.position = 'absolute';
        clone.style.visibility = 'hidden';
        clone.style.left = '-9999px';
        clone.style.top = '0';
        clone.style.width = 'max-content';
        clone.style.maxWidth = 'none';
        clone.style.overflow = 'visible';
        clone.style.whiteSpace = 'nowrap';
        // nie pozwól linkom się kurczyć w pomiarze
        try{
          clone.querySelectorAll('a').forEach(a=>{
            a.style.flex = '0 0 auto';
            a.style.whiteSpace = 'nowrap';
          });
        }catch(e){}
        document.body.appendChild(clone);
        const w = Math.ceil(clone.getBoundingClientRect().width || clone.scrollWidth || 0);
        clone.remove();
        return w;
      }catch(e){
        return 0;
      }
    }

	    function needsHamburger(){
      // Mobile: hamburger zawsze.
      if(window.matchMedia('(max-width: 760px)').matches) return true;

	      const isCenter = document.body.classList.contains('header-center');
	      if(isCenter){
	        // Mierzymy ZAWSZE w stanie "normalnym" (bez forceHamburger), żeby nie było pętli ON/OFF.
	        const leftG = header.querySelector('.navGroup--left');
	        const rightG = header.querySelector('.navGroup--right');
	        const prevForce = header.classList.contains('forceHamburger');
	        const prevMenu = header.classList.contains('menuOpen');

	        header.classList.remove('menuOpen');
	        header.classList.remove('forceHamburger');

	        const stInner = getComputedStyle(inner);
	        const gapC = (parseFloat(stInner.columnGap) || 44);
	        const innerRect = inner.getBoundingClientRect();
	        const brandRect = brand.getBoundingClientRect();
	        const leftW = measureNaturalWidth(leftG);
        const rightW = measureNaturalWidth(rightG);
	        const groupOverflows = ((leftG && (leftW - leftG.clientWidth) > 2) || (rightG && (rightW - rightG.clientWidth) > 2));
	        const needed = leftW + rightW + brandRect.width + (gapC * 2) + 20;
	        const innerOverflows = (inner.scrollWidth - inner.clientWidth) > 2;

	        // Restore
	        if(prevForce) header.classList.add('forceHamburger');
	        if(prevMenu) header.classList.add('menuOpen');

	        if(groupOverflows) return true;
	        if(innerOverflows) return true;
	        // Hysteresis: jeśli już jesteśmy w hamburgerze, wyłącz go dopiero gdy jest wyraźnie więcej miejsca.
	        if(isCollapsed) return needed > (innerRect.width - HYST);
	        return needed > (innerRect.width + 1);
	      }

      
      if(!inner || !brand) return false;

      // Desktop/Tablet: hamburger dopiero gdy linki realnie nie mieszczą się obok brandu.
      // To jest stabilniejsze niż heurystyki oparte o całe <header> (różne systemy/zoom/fonty).
      const prevForce = header.classList.contains('forceHamburger');
      const prevMenu = header.classList.contains('menuOpen');
      const prevDisplay = nav.style.display;

      // Upewnij się, że mierzymy stan "normalnego" headera.
      header.classList.remove('menuOpen');
      header.classList.remove('forceHamburger');
      nav.style.display = 'flex';

      const innerRect = inner.getBoundingClientRect();
      const brandRect = brand.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();

      const links = Array.from(nav.querySelectorAll('a'));
      const st = getComputedStyle(nav);
      const gap = (parseFloat(st.gap) || parseFloat(st.columnGap) || 14);
      let natural = measureNaturalWidth(nav);

      // Ile miejsca zostaje na nav po prawej stronie brandu.
      const available = Math.max(0, innerRect.right - brandRect.right - 22); // oddech
      const wrapsLine = (navRect.top > brandRect.top + 6) || (navRect.height > (brandRect.height + 18));
      const clipped = (natural > available + 1);

      // Safety net: jeśli cokolwiek faktycznie wypycha szerokość, hamburger ma przejąć.
      const innerOverflows = (inner.scrollWidth - inner.clientWidth) > 2;

      // Restore
      nav.style.display = prevDisplay;
      if(prevForce) header.classList.add('forceHamburger');
      if(prevMenu) header.classList.add('menuOpen');

	      if(innerOverflows || wrapsLine) return true;
	      if(isCollapsed) return natural > (available - HYST);
	      return clipped;
    }

	    function applyCollapse(){
      const should = needsHamburger();
      if(should === isCollapsed) return;
      isCollapsed = should;
      header.classList.toggle('forceHamburger', should);
      if(!should) close();
    }

	    function scheduleCollapse(){
	      if(raf) return;
	      raf = requestAnimationFrame(()=>{ raf = 0; applyCollapse(); });
	    }

    // Start
    applyCollapse();
    setBtn(false);

	    window.addEventListener('resize', ()=>{ scheduleCollapse(); }, { passive:true });
	    window.addEventListener('orientationchange', ()=>{ scheduleCollapse(); });
    // Po załadowaniu fontów układ może się zmienić
	    window.addEventListener('load', ()=>{ scheduleCollapse(); });
    try{
      if(document.fonts && document.fonts.ready){
	        document.fonts.ready.then(()=>{ scheduleCollapse(); });
      }
    }catch(e){}

    // Reaguj tez na zmiany w nawigacji (np. dodanie wielu sekcji bez zmiany szerokosci okna).
    try{
      if('ResizeObserver' in window){
		        const ro = new ResizeObserver(()=>{ scheduleCollapse(); });
		        // Nie obserwuj samego <header> — zmiana klas (forceHamburger) potrafi wywoływać pętlę i "wibracje".
		        if(inner) ro.observe(inner);
        ro.observe(nav);
        ro.observe(brand);
      }
    }catch(e){}
    try{
	      const mo = new MutationObserver(()=>{ scheduleCollapse(); });
      mo.observe(nav, { childList:true, subtree:true, characterData:true });
    }catch(e){}


    btn.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); toggle(); });

    nav.addEventListener('click', (e)=>{
      const a = e.target.closest('a');
      if(a) close();
    });

    document.addEventListener('click', (e)=>{
      if(!header.contains(e.target)) close();
    });

    document.addEventListener('keydown', (e)=>{
      if(e.key === 'Escape') close();
    });
  }

  function setupHeroSlider(){
    const hero = document.querySelector('.hero');
    if(!hero) return;
    const slidesEl = hero.querySelector('.heroSlides');
    if(!slidesEl) return;

    const raw = slidesEl.getAttribute('data-hero-slides');
    if(!raw) return;

    let urls = [];
    try { urls = JSON.parse(decodeURIComponent(raw)); } catch(e){ urls = []; }
    if(!Array.isArray(urls) || urls.length < 2) return;

    let idx = 0;
    const counter = hero.querySelector('.heroCounter');
    const prev = hero.querySelector('[data-hero="prev"]');
    const next = hero.querySelector('[data-hero="next"]');

    function safeUrl(u){
      return String(u || '').replace(/"/g, '%22');
    }

    function render(){
      const u = urls[idx];
      hero.style.setProperty('--hero-bg', 'url("' + safeUrl(u) + '")');
      if(counter){
        const demo = counter.getAttribute('data-demo') === '1';
        counter.textContent = (demo ? 'DEMO ' : '') + (idx+1) + ' / ' + urls.length;
      }
    }

    function step(d){
      idx = (idx + d + urls.length) % urls.length;
      render();
    }

    if(prev) prev.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); step(-1); });
    if(next) next.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); step(1); });

    render();
  }

  function setupYouTubeEmbeds(){
    const list = Array.from(document.querySelectorAll('iframe.embed[src*="youtube.com/embed/"], iframe.embed[src*="youtube-nocookie.com/embed/"]'));
    if(!list.length) return;

    // If possible, add the origin player param dynamically.
    // This avoids hardcoding any domain into exported HTML.
    const origin = (location.origin && location.origin !== 'null' && /^https?:/i.test(location.origin)) ? location.origin : '';

    for(const ifr of list){
      if(!ifr.getAttribute('referrerpolicy')){
        ifr.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
      }
      if(origin){
        try {
          const u = new URL(ifr.getAttribute('src') || '', location.href);
          if(!u.searchParams.has('origin')){
            u.searchParams.set('origin', origin);
            ifr.setAttribute('src', u.toString());
          }
        } catch(e){}
      }
    }
  }

  function send(msg){
    try { parent.postMessage(msg, '*'); } catch (e) {}
  }

  function setNavActive(href){
    const nav = document.querySelector('.siteHeader .nav');
    if(!nav) return;
    nav.querySelectorAll('a').forEach((a)=>{
      const is = (a.getAttribute('href') || '') === href;
      a.classList.toggle('active', is);
    });
  }

  function setupFocusScroll(){
  const body = document.body;
  if(!body.classList.contains('scroll-focus')) return;

  const sections = Array.from(document.querySelectorAll('main .section'));
  if(!sections.length) return;

  function setActiveRange(startIdx, endIdx){
    const start = Math.max(0, Math.min(startIdx, sections.length - 1));
    const end = Math.max(start, Math.min(endIdx, sections.length - 1));

    sections.forEach((s, k)=>{
      const isActive = (k >= start && k <= end);
      s.classList.toggle('isActive', isActive);
      s.classList.toggle('isPrev', k === start - 1);
      s.classList.toggle('isNext', k === end + 1);
    });

    const lead = sections[start];
    if(lead && lead.id) setNavActive('#' + lead.id);
  }

  function setActiveByIndex(idx){
    const i = Math.max(0, Math.min(idx, sections.length - 1));
    const wrap = sections[i].closest('.mediaSplitRow');

    if(wrap){
      // Traktujemy 2 embedy w jednym rzędzie jako JEDNĄ sekcję do podświetlenia.
      const idxs = [];
      for(let k=0; k<sections.length; k++){
        if(sections[k].closest('.mediaSplitRow') === wrap) idxs.push(k);
      }
      if(idxs.length){
        setActiveRange(idxs[0], idxs[idxs.length - 1]);
        return;
      }
    }

    setActiveRange(i, i);
  }

  // Sekcja najbliższa środka viewportu.
  let raf = 0;
  function recompute(){
    raf = 0;
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    const center = vh / 2;
    let bestIdx = 0;
    let bestDist = Infinity;
    for(let i=0; i<sections.length; i++){
      const r = sections[i].getBoundingClientRect();
      const c = r.top + (r.height / 2);
      const d = Math.abs(c - center);
      if(d < bestDist){ bestDist = d; bestIdx = i; }
    }
    setActiveByIndex(bestIdx);
  }
  function onScroll(){
    if(raf) return;
    raf = requestAnimationFrame(recompute);
  }

  window.addEventListener('scroll', onScroll, { passive:true });
  window.addEventListener('resize', onScroll, { passive:true });
  requestAnimationFrame(recompute);
}

  // Preview: navigate between ZIP pages inside the generator iframe.
  document.addEventListener('click', function(e){
    const a = e.target.closest('a');
    if(!a) return;
    const href = a.getAttribute('href') || '';

    // Let lightbox handle itself.
    if (a.hasAttribute('data-lightbox')) return;

    // Hash links always ok.
    if(href.startsWith('#')) return;

    // External
    if(href.startsWith('http:') || href.startsWith('https:') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('data:')) return;

    if(IN_PREVIEW && href.endsWith('.html')){
      e.preventDefault();
      send({ type: 'NAVIGATE', page: href });
    }
  });

  // smooth scroll (single page)
  document.addEventListener('click', function(e){
    const a = e.target.closest('a');
    if(!a) return;
    const href = a.getAttribute('href') || '';
    if(href.startsWith('#')){
      const el = document.querySelector(href);
      if(el){
        e.preventDefault();
        const isFocus = document.body.classList.contains('scroll-focus');
        el.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: isFocus ? 'center' : 'start' });
        setNavActive(href);
      }
    }
  });

  function parseIso(iso){
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    if(!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
    return new Date(y, mo, d, 0, 0, 0, 0);
  }

  function todayMidnight(){
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 0, 0, 0, 0);
  }

  function initEventsArchive(){
    const t0 = todayMidnight().getTime();

    document.querySelectorAll('[data-events-upcoming]').forEach((up) => {
      const section = up.closest('section') || up.parentElement;
      if(!section) return;

      const archiveWrap = section.querySelector('[data-events-archive-wrap]');
      const archive = section.querySelector('[data-events-archive]');
      if(!archiveWrap || !archive) return;

      const rows = Array.from(up.querySelectorAll('.eventRow'));
      if(!rows.length) return;

      rows.sort((a,b) => {
        const da = parseIso(a.getAttribute('data-date') || '');
        const db = parseIso(b.getAttribute('data-date') || '');
        const ta = da ? da.getTime() : Infinity;
        const tb = db ? db.getTime() : Infinity;
        if(ta !== tb) return ta - tb;
        return 0;
      });

      up.innerHTML = '';
      archive.innerHTML = '';

      for(const row of rows){
        const d = parseIso(row.getAttribute('data-date') || '');
        const ts = d ? d.getTime() : Infinity;
        if(d && ts < t0) archive.appendChild(row);
        else up.appendChild(row);
      }

      const hasArchive = archive.children.length > 0;
      archiveWrap.style.display = hasArchive ? '' : 'none';

      if(!up.children.length && hasArchive){
        const note = document.createElement('div');
        note.className = 'muted';
        note.style.padding = '10px 0';
        note.textContent = 'Brak nadchodzących wydarzeń.';
        up.appendChild(note);
      }
    });
  }

  function setupLightbox(){
    const links = Array.from(document.querySelectorAll('a[data-lightbox]'));
    if(!links.length) return;

    const groups = new Map();

    for(const a of links){
      const groupName = a.getAttribute('data-lightbox') || 'default';
      const href = a.getAttribute('href') || '';
      if(!href) continue;

      const img = a.querySelector('img');
      const caption = (img && img.getAttribute('alt')) || a.getAttribute('title') || '';

      if(!groups.has(groupName)) groups.set(groupName, { items: [], index: new WeakMap() });
      const g = groups.get(groupName);
      const idx = g.items.length;
      g.items.push({ href, caption });
      g.index.set(a, idx);
    }

    const overlay = document.createElement('div');
    overlay.className = 'lbOverlay';

    const box = document.createElement('div');
    box.className = 'lbBox';
    box.setAttribute('role','dialog');
    box.setAttribute('aria-modal','true');

    const imgNode = document.createElement('img');
    imgNode.className = 'lbImg';
    imgNode.alt = '';

    const bar = document.createElement('div');
    bar.className = 'lbBar';

    const capNode = document.createElement('div');
    capNode.className = 'lbCaption';

    const controls = document.createElement('div');
    controls.className = 'lbControls';

    const btnPrev = document.createElement('button');
    btnPrev.type = 'button';
    btnPrev.className = 'lbBtn';
    btnPrev.setAttribute('data-lb','prev');
    btnPrev.setAttribute('aria-label','Poprzednie');
    btnPrev.textContent = '←';

    const btnNext = document.createElement('button');
    btnNext.type = 'button';
    btnNext.className = 'lbBtn';
    btnNext.setAttribute('data-lb','next');
    btnNext.setAttribute('aria-label','Następne');
    btnNext.textContent = '→';

    const btnClose = document.createElement('button');
    btnClose.type = 'button';
    btnClose.className = 'lbBtn';
    btnClose.setAttribute('data-lb','close');
    btnClose.setAttribute('aria-label','Zamknij');
    btnClose.textContent = '✕';

    controls.append(btnPrev, btnNext, btnClose);
    bar.append(capNode, controls);
    box.append(imgNode, bar);
    overlay.appendChild(box);

    document.body.appendChild(overlay);

    const imgEl = overlay.querySelector('.lbImg');
    const capEl = overlay.querySelector('.lbCaption');

    let curGroup = null;
    let curIndex = 0;

    function open(groupName, index){
      const g = groups.get(groupName);
      if(!g || !g.items.length) return;
      curGroup = groupName;
      curIndex = Math.max(0, Math.min(index || 0, g.items.length - 1));
      render();
    }

    function render(){
      const g = groups.get(curGroup);
      if(!g) return;
      const item = g.items[curIndex];
      if(!item) return;
      imgEl.src = item.href;
      imgEl.alt = item.caption || 'Zdjęcie';
      capEl.textContent = item.caption || '';
      overlay.classList.add('isOpen');
      document.body.style.overflow = 'hidden';
    }

    function close(){
      overlay.classList.remove('isOpen');
      imgEl.src = '';
      document.body.style.overflow = '';
      curGroup = null;
    }

    function prev(){
      const g = groups.get(curGroup);
      if(!g) return;
      curIndex = (curIndex - 1 + g.items.length) % g.items.length;
      render();
    }

    function next(){
      const g = groups.get(curGroup);
      if(!g) return;
      curIndex = (curIndex + 1) % g.items.length;
      render();
    }

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-lightbox]');
      if(a){
        e.preventDefault();
        const groupName = a.getAttribute('data-lightbox') || 'default';
        const g = groups.get(groupName);
        if(!g) return;
        const idx = g.index.get(a);
        if(typeof idx !== 'number') return;
        open(groupName, idx);
        return;
      }

      if(e.target === overlay){
        close();
        return;
      }

      const btn = e.target.closest('[data-lb]');
      if(btn && overlay.classList.contains('isOpen')){
        const act = btn.getAttribute('data-lb');
        if(act === 'close') close();
        if(act === 'prev') prev();
        if(act === 'next') next();
      }
    });

    document.addEventListener('keydown', (e) => {
      if(!overlay.classList.contains('isOpen')) return;
      if(e.key === 'Escape'){ e.preventDefault(); close(); }
      if(e.key === 'ArrowLeft'){ e.preventDefault(); prev(); }
      if(e.key === 'ArrowRight'){ e.preventDefault(); next(); }
    }, true);
  }

  function setupScrollReveal(){
    const body = document.body;
    if(!body) return;
    if(body.classList.contains('scroll-focus')) return;
    if(body.classList.contains('motion-off')) return;
    if(prefersReduced()) return;

    const sections = Array.from(document.querySelectorAll('main .section'));
    if(!sections.length) return;

    let obs = null;
    try{
      obs = new IntersectionObserver((entries) => {
        for(const e of entries){
          if(e.isIntersecting){
            e.target.classList.add('reveal-in');
            try{ obs.unobserve(e.target); }catch(ex){}
          }
        }
      }, { threshold: 0.18, rootMargin: '0px 0px -12% 0px' });
    }catch(e){
      // No IntersectionObserver: just show everything.
      sections.forEach((sec)=>sec.classList.add('reveal-in'));
      return;
    }

    sections.forEach((sec) => {
      sec.classList.add('reveal-on-scroll');
      obs.observe(sec);
    });
  }



  function setupPrivacyModal(){
    const modal = document.getElementById('privacy');
    if(!modal) return;

    function clearHashHard(){
      // Make closing reliable on mobile and in embedded contexts.
      // 1) break :target immediately
      try{
        if(location.hash === '#privacy') location.hash = '_';
      }catch(e){}

      // 2) remove hash from URL if possible (no page jump)
      try{
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
      }catch(e){
        try{ location.hash = ''; }catch(ex){}
      }

      // 3) if still stuck, keep it away from #privacy
      try{
        if(location.hash === '#privacy') location.hash = '_';
      }catch(e){}
    }

    function open(){
      const y = window.scrollY || window.pageYOffset || 0;
      modal.classList.add('isOpen');
      document.body.classList.add('privacyModalOpen');
      try{
        if(location.hash !== '#privacy') location.hash = 'privacy';
        window.scrollTo(0, y);
      }catch(e){}
      const dlg = modal.querySelector('.privacyModal__dialog');
      if(dlg) setTimeout(()=>{ try{ dlg.focus(); }catch(e){} }, 0);
    }

    function close(){
      modal.classList.remove('isOpen');
      document.body.classList.remove('privacyModalOpen');
      if(location.hash === '#privacy') clearHashHard();
    }

    document.addEventListener('click', (e)=>{
      const op = e.target.closest('[data-open-privacy], a[href="#privacy"]');
      if(op){ e.preventDefault(); open(); return; }
      const cl = e.target.closest('[data-close-privacy="1"]');
      if(cl && modal.contains(cl)){ e.preventDefault(); close(); return; }
    }, true);

    window.addEventListener('hashchange', ()=>{
      if(location.hash === '#privacy'){
        modal.classList.add('isOpen');
        document.body.classList.add('privacyModalOpen');
      }else{
        modal.classList.remove('isOpen');
        document.body.classList.remove('privacyModalOpen');
      }
    });

    window.addEventListener('keydown', (e)=>{
      if(location.hash !== '#privacy' && !modal.classList.contains('isOpen')) return;
      if(e.key === 'Escape'){ e.preventDefault(); close(); }
    }, true);

    if(location.hash === '#privacy'){
      modal.classList.add('isOpen');
      document.body.classList.add('privacyModalOpen');
    }
  }
document.addEventListener('DOMContentLoaded', () => {
    setupAnalytics();
    setupPrivacyModal();
    initEventsArchive();
    setupHeroSlider();
    setupYouTubeEmbeds();
    setupLightbox();
    setupScrollReveal();
    setupHeaderOffset();
    setupTransparentHeaderOnScroll();
      setupHamburger();
    setupFocusScroll();
  });
})();
`;
}


function buildHeader(navItems, activeHref, inlineAssets) {
  const name = String(state.siteName || "Portfolio").trim() || "Portfolio";
  const brandText = escapeHtml(name);

  // logo (optional)
  let brandHtml = `<span class="brandText">${brandText}</span>`;
  if (state.useLogoInHeader && assets.logo && (assets.logo.dataUrl || assets.logo.id)) {
    const href = assetHrefForHead(assets.logo, !!inlineAssets, "assets/logo");
    if (href) {
      brandHtml = `<img class="brandLogo" src="${escapeHtml(href)}" alt="${brandText}"/>`;
    }
  }

  const mkLinks = (items) => items.map(it => {
    const isActive = it.href === activeHref;
    return `<a href="${it.href}" class="${isActive ? "active" : ""}">${escapeHtml(it.label)}</a>`;
  }).join("");

  const allLinks = mkLinks(navItems);

  // Header layout: LEFT (default)
  if (state.headerLayout !== 'center') {
    return `
<header class="siteHeader">
  <div class="headerInner">
    <div class="brand">${brandHtml}</div>
    <button class="navToggle" type="button" aria-label="Menu" aria-expanded="false">☰</button>
    <nav class="nav" aria-label="Nawigacja">${allLinks}</nav>
  </div>
</header>`;
  }

  // Header layout: CENTER — single row with symmetric nav groups
  const n = navItems.length;
  const leftCount = Math.floor(n / 2);
  const leftItems = navItems.slice(0, leftCount);
  const rightItems = navItems.slice(leftCount);
  const leftLinks = mkLinks(leftItems);
  const rightLinks = mkLinks(rightItems);

  return `
<header class="siteHeader">
  <div class="headerInner">
    <div class="navSlot navSlot--left"><nav class="navGroup navGroup--left" aria-label="Nawigacja">${leftLinks}</nav></div>
    <div class="brand">${brandHtml}</div>
    <div class="navSlot navSlot--right">
      <nav class="navGroup navGroup--right" aria-label="Nawigacja">${rightLinks}</nav>
      <button class="navToggle" type="button" aria-label="Menu" aria-expanded="false">☰</button>
    </div>
    <nav class="nav" aria-label="Nawigacja">${allLinks}</nav>
  </div>
</header>`;
}


function renderHeroSection(mode) {
  const hero = ensureBlock("hero");
  const h = hero.data || {};
  const headline = escapeHtml(h.headline || "");
  const subRich = String(h.subheadlineRich || "").trim();
  const subHtml = subRich ? subRich : escapeHtml(h.subheadline || "").replaceAll("\n","<br/>");
  const subCls = subRich ? "muted richText" : "muted";
  const btnText = escapeHtml(h.primaryCtaText || "Zobacz");
  const target = h.primaryCtaTarget || "auto";
  const customUrl = String(h.primaryCtaUrl || "").trim();

  normalizeAssets();
  const heroImgs = assets.heroImages;
  const heroImgsMobile = assets.heroImagesMobile || [];

  const enabledAll = enabledBlocksInOrder().filter(id => id !== "hero");
  const enabled = enabledAll.filter(id => ensureBlock(id).showOnHomeZip !== false);

  const contactEnabled = enabledBlocksInOrder().includes("contact");

  let ctaHref = "#";
  if (mode === "single") {
    if (target === "custom" && customUrl) ctaHref = customUrl;
    else if (target === "contact") ctaHref = contactEnabled ? "#contact" : (enabled[0] ? `#${enabled[0]}` : "#hero");
    else ctaHref = enabled[0] ? `#${enabled[0]}` : "#hero";
  } else {
    if (target === "custom" && customUrl) ctaHref = customUrl;
    else if (target === "contact") ctaHref = contactEnabled ? "contact.html" : (enabled[0] ? `${enabled[0]}.html` : "index.html");
    else ctaHref = enabled[0] ? `${enabled[0]}.html` : "index.html";
  }
  const bgUrl0 = heroImgs.length ? imageHrefForRender(heroImgs[0], "hero", 0) : "";
  const bgMUrl0 = heroImgsMobile.length ? imageHrefForRender(heroImgsMobile[0], "heroMobile", 0) : "";

  const bg = bgUrl0
    ? `url('${cssUrl(bgUrl0)}')`
    : `linear-gradient(135deg, var(--accent), #111)`;

  const bgMobile = bgMUrl0
    ? `url('${cssUrl(bgMUrl0)}')`
    : bg;


  const heroSlider = heroImgs.length > 1
    ? (() => {
        const urls = heroImgs.map((img, i) => imageHrefForRender(img, "hero", i)).filter(Boolean);
        const encoded = encodeURIComponent(JSON.stringify(urls));
        return `
      <div class="heroSlides" data-hero-slides="${encoded}"></div>
      <div class="heroSliderBar" aria-label="HERO slider">
        <button type="button" class="heroArrow" data-hero="prev" aria-label="Poprzednie zdjęcie">←</button>
        <div class="heroCounter">1 / ${urls.length}</div>
        <button type="button" class="heroArrow" data-hero="next" aria-label="Następne zdjęcie">→</button>
      </div>
    `;
      })()
    : "";

  return `
<section id="hero" class="hero" style="--hero-bg:${bg}; --hero-bg-mobile:${bgMobile};">
  <div class="heroFrame">
    <div class="heroInner">
      <h1>${headline}</h1>
      <div class="${subCls}">${subHtml}</div>
      <div class="heroActions">
        <a class="btn primary" href="${ctaHref}">${btnText}</a>
        <a class="btn" href="${mode==="single" ? "#contact" : "contact.html"}">Kontakt</a>
      </div>
    </div>
  </div>
  ${heroSlider}
</section>
`;
}


function assetPathForIndexedImage(kind, idx, img) {
  const n = String(idx + 1).padStart(2, "0");
  const mime = String(img?.mime || (parseDataUrl(String(img?.dataUrl || img?.url || ""))?.mime || ""));
  const ext = guessExtFromMime(mime) || "webp";
  let base = "";
  if (kind === "hero") base = `assets/hero/hero-${n}`;
  else if (kind === "heroMobile") base = `assets/hero-mobile/hero-m-${n}`;
  else if (kind === "gallery") base = `assets/gallery/img-${n}`;
  else if (kind === "press") base = `assets/press/photo-${n}`;
  else base = `assets/${kind}-${n}`;
  return `${base}.${ext}`;
}

function imageHrefForRender(img, kind, idx) {
  // ZIP export: use real asset paths instead of base64.
  if (__renderCtx && __renderCtx.target === "zip" && __renderCtx.inlineAssets === false) {
    return assetPathForIndexedImage(kind, idx, img);
  }
  return String(img?.dataUrl || img?.url || "");
}

function renderBlockSection(id, mode) {
  normalizeAssets();
  const cfg = ensureBlock(id);
  const def = getBlockDef(id);
  const title = escapeHtml(cfg.title || def.label);
  const editor = def.editor;
  const headingHtml = (cfg.showHeading === false) ? "" : `<h2 class=\"sectionTitle\">${title}</h2>`;

  if (id === "hero") return renderHeroSection(mode);

  if (editor === "text") {
    const rich = String(cfg.data.richHtml || "").trim();
    const hasRich = !!rich;
    const html = hasRich ? rich : escapeHtml(cfg.data.text || "").replaceAll("\n", "<br/>");
    const cls = hasRich ? "muted richText" : "muted";
    return `
<section id="${id}" class="section">
  ${headingHtml}
  <div class="${cls}">${html || "—"}</div>
</section>`;
  }

  if (editor === "gallery") {
    const layout = cfg.data.layout || "grid";
    const items = assets.galleryImages.length ? assets.galleryImages : [];

    if (!items.length) {
      return `
<section id="${id}" class="section">
  ${headingHtml}
  <div class="muted">Brak zdjęć — wgraj w generatorze.</div>
</section>`;
    }

    const cols = clampNum(cfg.data.cols ?? 4, 2, 6);
    const mcols = clampNum(cfg.data.masonryCols ?? 3, 2, 6);
    const fallbackAltBase = String(cfg.title || def.label || "Zdjęcie").trim() || "Zdjęcie";

    const body = layout === "masonry"
      ? `<div class="masonry js-lightbox-group" style="--mcols:${mcols};">
          ${items.map((img, i) => {
            const o = imgObj(img);
            const u = imageHrefForRender(o, "gallery", i);
            const alt = escapeHtml(o.alt || `${fallbackAltBase} ${i+1}`);
            return `<div class="masonryItem"><a href="${u}" data-lightbox="gallery"><img src="${u}" alt="${alt}"/></a></div>`;
          }).join("")}
        </div>`
      : `<div class="galleryGrid js-lightbox-group" style="--gcols:${cols};">
          ${items.map((img, i) => {
            const o = imgObj(img);
            const u = imageHrefForRender(o, "gallery", i);
            const alt = escapeHtml(o.alt || `${fallbackAltBase} ${i+1}`);
            return `<a href="${u}" data-lightbox="gallery"><img src="${u}" alt="${alt}"/></a>`;
          }).join("")}
        </div>`;

    return `
<section id="${id}" class="section">
  ${headingHtml}
  ${body}
</section>`;
  }

  if (editor === "embed_spotify") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    // Embed size: affects stacked layout window width. Default 60% looks natural.
    const sz = clampNum(cfg.data.embedSize ?? 60, 45, 85);
    const embedCls = (String(state.mediaLayout || "stack") === "split")
      ? "embedSection embedSection--split"
      : "embedSection embedSection--stack";
    const parts = items.map(it => {
      const p = parseSpotify(it.url || "");
      if (p.embedUrl) {
        const open = escapeHtml(p.openUrl || it.url || "");
        return `
	<div class="embedWrap embedWrap--spotify">
  <iframe class="embed tall" src="${escapeHtml(p.embedUrl)}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
  
</div>`;
      }
      if (p.openUrl) {
        const open = escapeHtml(p.openUrl);
        return `
	<div class="embedWrap embedWrap--spotify">
  <div class="embedCard">
    <div style="font-weight:900;">Spotify</div>
    <div class="muted" style="margin-top:6px;">Tego linku nie da się osadzić. Wklej pełny link <strong>open.spotify.com</strong>.</div>
  </div>
</div>`;
      }
      return "";
    }).filter(Boolean).join("");

    return `
<section id="${id}" class="section ${embedCls}">
  ${headingHtml}
  <div class="grid embedGrid" style="--embed-max:${sz}%;">${parts || `<div class="muted">Wklej linki Spotify w generatorze.</div>`}</div>
</section>`;
  }

  if (editor === "embed_youtube") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    // Embed size: affects stacked layout window width. Default 60% looks natural.
    const sz = clampNum(cfg.data.embedSize ?? 60, 45, 85);
    const embedCls = (String(state.mediaLayout || "stack") === "split")
      ? "embedSection embedSection--split"
      : "embedSection embedSection--stack";
    const parts = items.map(it => {
      const p = parseYouTube(it.url || "");
      if (p.embedUrl) {
        const open = escapeHtml(p.openUrl || it.url || "");
        return `
	<div class="embedWrap embedWrap--youtube">
  <iframe class="embed" width="560" height="315" src="${escapeHtml(p.embedUrl)}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe>
  
</div>`;
      }
      if (p.openUrl) {
        const open = escapeHtml(p.openUrl);
        return `
	<div class="embedWrap embedWrap--youtube">
  <div class="embedCard">
    <div style="font-weight:900;">YouTube</div>
    <div class="muted" style="margin-top:6px;">Tego linku nie da się osadzić jako player. Użyj pełnego linku lub wklej iframe.</div>
  </div>
</div>`;
      }
      return "";
    }).filter(Boolean).join("");

    return `
<section id="${id}" class="section ${embedCls}">
  ${headingHtml}
  <div class="grid embedGrid" style="--embed-max:${sz}%;">${parts || `<div class="muted">Wklej linki YouTube w generatorze.</div>`}</div>
</section>`;
  }

  if (editor === "events") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const rows = items.map(it => {
      const iso = toIsoDateLoose(it.date || "");
      const dateLabel = escapeHtml(formatDatePL(it.date || ""));
      const city = escapeHtml(it.city || "");
      const place = escapeHtml(it.place || "");
      const link = normalizeHttpUrlLoose(it.link || "");
      return `
<div class="eventRow" data-date="${escapeHtml(iso)}" style="display:flex; justify-content:space-between; gap:12px; padding:10px 0; border-bottom:1px solid rgba(127,127,127,.18);">
  <div><strong>${dateLabel || "—"}</strong> • ${city || "—"}<div class="muted">${place || ""}</div></div>
  ${link ? `<a class="btn" href="${escapeHtml(link)}" target="_blank" rel="noopener">Szczegóły</a>` : ``}
</div>`;
    }).join("");

    return `
<section id="${id}" class="section">
  ${headingHtml}
  ${rows ? `
    <div class="eventsUpcoming" data-events-upcoming>${rows}</div>
    <details class="eventsArchiveWrap" data-events-archive-wrap style="display:none; margin-top:12px;">
      <summary>Archiwum</summary>
      <div class="eventsArchive" data-events-archive style="margin-top:10px;"></div>
    </details>
  ` : `<div class="muted">Dodaj wydarzenia w generatorze.</div>`}
</section>`;
  }

  if (editor === "projects") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const cards = items.map(it => {
      const t = escapeHtml(it.title || "");
      const descRich = String(it.descRich || "").trim();
      const desc = descRich ? descRich : escapeHtml(it.desc || "").replaceAll("\n","<br/>");
      const descCls = descRich ? "muted richText" : "muted";
      const tags = escapeHtml(it.tags || "");
      const link = normalizeHttpUrlLoose(it.link || "");
      return `
<div style="padding:12px 0; border-bottom:1px solid rgba(127,127,127,.18);">
  <div style="display:flex; justify-content:space-between; gap:12px; align-items:baseline;">
    <div style="font-weight:900;">${t || "—"}</div>
    ${tags ? `<div class="muted" style="font-size:12px;">${tags}</div>` : ``}
  </div>
  <div class="muted" style="margin-top:8px;">${desc || ""}</div>
  ${link ? `<div style="margin-top:10px;"><a class="btn primary" href="${escapeHtml(link)}" target="_blank" rel="noopener">Zobacz</a></div>` : ``}
</div>`;
    }).join("");

    return `
<section id="${id}" class="section">
  ${headingHtml}
  <div>${cards || `<div class="muted">Dodaj projekty w generatorze.</div>`}</div>
</section>`;
  }

  if (editor === "services") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const rows = items.map(it => `
<div style="padding:12px 0; border-bottom:1px solid rgba(127,127,127,.18);">
  <div style="display:flex; justify-content:space-between; gap:12px;">
    <div style="font-weight:900;">${escapeHtml(it.name || "—")}</div>
    <div class="muted">${escapeHtml(it.price || "")}</div>
  </div>
  <div class="${String(it.descRich||"").trim()? "muted richText":"muted"}" style="margin-top:8px;">${String(it.descRich||"").trim()? String(it.descRich).trim(): escapeHtml(it.desc || "").replaceAll("\n","<br/>")}</div>
</div>`).join("");

    return `
<section id="${id}" class="section">
  ${headingHtml}
  <div>${rows || `<div class="muted">Dodaj usługi w generatorze.</div>`}</div>
</section>`;
  }



  if (editor === "newsletter") {
    const title = escapeHtml(cfg.data.title || "Zapisz się");
    const descRich = String(cfg.data.descRich || "").trim();
    const desc = descRich ? descRich : escapeHtml(cfg.data.desc || "").replaceAll("\n","<br/>");
    const descCls = descRich ? "muted richText" : "muted";
    const btn = escapeHtml(cfg.data.btn || "Dołącz");
    const url = normalizeHttpUrlLoose(cfg.data.url || "");

    return `
<section id="${id}" class="section">
  ${headingHtml}
  <div class="embedWrap">
    <div class="embedCard">
      <div style="font-weight:900;">${title}</div>
      ${desc ? `<div class="${descCls}" style="margin-top:8px;">${desc}</div>` : ``}
      ${url ? `<div style="margin-top:10px;"><a class="btn primary" href="${escapeHtml(url)}" target="_blank" rel="noopener">${btn}</a></div>` : `<div class="muted" style="margin-top:10px;">Brak linku do zapisu.</div>`}
    </div>
  </div>
</section>`;
  }

  if (editor === "store") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const cards = items.map((it, i) => {
      const name = escapeHtml(it.name || "");
      const price = escapeHtml(it.price || "");
      const url = normalizeHttpUrlLoose(it.url || "");
      const img = (it.img || "").trim();
      const alt = escapeHtml(it.alt || name || `Produkt ${i+1}`);
      const descRich = String(it.descRich || "").trim();
      const desc = descRich ? descRich : escapeHtml(it.desc || "").replaceAll("\n","<br/>");
      const descCls = descRich ? "muted richText" : "muted";
      return `
<div class="storeCard">
  ${img ? `<img class="storeImg" src="${escapeHtml(img)}" alt="${alt}" />` : `<div class="storeImg" aria-hidden="true"></div>`}
  <div class="storeBody">
    <div class="storeTop">
      <div class="storeName">${name || "—"}</div>
      <div class="storePrice">${price}</div>
    </div>
    ${desc ? `<div class="storeDesc">${desc}</div>` : ``}
    ${url ? `<div class="storeActions"><a class="btn primary" href="${escapeHtml(url)}" target="_blank" rel="noopener">Kup</a></div>` : ``}
  </div>
</div>`;
    }).join("");

    return `
<section id="${id}" class="section">
  ${headingHtml}
  ${cards ? `<div class="storeGrid">${cards}</div>` : `<div class="muted">Dodaj produkty w generatorze.</div>`}
</section>`;
  }

  if (editor === "simpleList") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const rows = items.map(it => {
      const text = escapeHtml(it.text || "");
      const link = normalizeHttpUrlLoose(it.link || "");
      return `<div style="padding:10px 0; border-bottom:1px solid rgba(127,127,127,.18);">
        <strong>${text || "—"}</strong>
        ${link ? ` <a class="btn" style="margin-left:10px;" href="${escapeHtml(link)}" target="_blank" rel="noopener">Link</a>` : ``}
      </div>`;
    }).join("");

    return `
<section id="${id}" class="section">
  ${headingHtml}
  <div>${rows || `<div class="muted">Dodaj wpisy w generatorze.</div>`}</div>
</section>`;
  }

  if (editor === "publications") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const rows = items.map(it => {
      const url = normalizeHttpUrlLoose(it.url || "");
      return `
<div style="padding:12px 0; border-bottom:1px solid rgba(127,127,127,.18);">
  <div style="font-weight:900;">${escapeHtml(it.title || "—")}</div>
  <div class="muted" style="margin-top:6px;">${escapeHtml(it.where || "")} ${it.year ? "• " + escapeHtml(it.year) : ""}</div>
  ${url ? `<div style="margin-top:10px;"><a class="btn" href="${escapeHtml(url)}" target="_blank" rel="noopener">Czytaj</a></div>` : ``}
</div>`;
    }).join("");

    return `
<section id="${id}" class="section">
  ${headingHtml}
  <div>${rows || `<div class="muted">Dodaj publikacje w generatorze.</div>`}</div>
</section>`;
  }

  if (editor === "testimonials") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const rows = items.map(it => {
      const link = normalizeHttpUrlLoose(it.link || "");
      const qRich = String(it.quoteRich || "").trim();
      const qHtml = qRich ? qRich : escapeHtml(it.quote || "—").replaceAll("\n"," ");
      const qCls = qRich ? "richText" : "";
      return `
<div style="padding:12px 0; border-bottom:1px solid rgba(127,127,127,.18);">
  <div class="${qCls}" style="font-weight:900;">${qHtml}</div>
  <div class="muted" style="margin-top:8px;">— ${escapeHtml(it.who || "")}</div>
  ${link ? `<div style="margin-top:10px;"><a class="btn" href="${escapeHtml(link)}" target="_blank" rel="noopener">Źródło</a></div>` : ``}
</div>`;
    }).join("");

    return `
<section id="${id}" class="section">
  ${headingHtml}
  <div>${rows || `<div class="muted">Dodaj opinie w generatorze.</div>`}</div>
</section>`;
  }

  
if (editor === "epk") {
    const d = cfg.data || {};
	    // Raw bio used only to decide whether we should render the "Bio" section.
	    // `bio` below is already HTML (either rich HTML or escaped plain text).
	    const bioRaw = String(d.shortBioRich || d.shortBio || "").trim();
    const bioRich = String(d.shortBioRich || "").trim();
    const bio = bioRich ? bioRich : escapeHtml(String(d.shortBio || "").trim()).replaceAll("\n","<br/>");
    const bioCls = bioRich ? "muted richText" : "muted";

    const pressItems = Array.isArray(d.pressLinks) ? d.pressLinks : [];
    const dlItems = Array.isArray(d.downloadLinks) ? d.downloadLinks : [];

    const pressLinks = pressItems.map(it => {
      const name = String(it?.name || "Link");
      const u = normalizeHttpUrlLoose(it?.url || "");
      if (!u) return "";
      return `
      <div style="padding:10px 0; border-bottom:1px solid rgba(127,127,127,.18);">
        <strong>${escapeHtml(name)}</strong>
        <a class="btn" style="margin-left:10px;" href="${escapeHtml(u)}" target="_blank" rel="noopener">Otwórz</a>
      </div>`;
    }).join("");

    const dlLinks = dlItems.map(it => {
      const name = String(it?.name || "Plik");
      const u = normalizeHttpUrlLoose(it?.url || "");
      if (!u) return "";
      return `
      <div style="padding:10px 0; border-bottom:1px solid rgba(127,127,127,.18);">
        <strong>${escapeHtml(name)}</strong>
        <a class="btn primary" style="margin-left:10px;" href="${escapeHtml(u)}" target="_blank" rel="noopener">Pobierz</a>
      </div>`;
    }).join("");

    const hasPhotos = (assets.epkPressPhotos || []).length > 0;
    const hasFiles = (assets.epkFiles || []).length > 0;

    const photos = hasPhotos
      ? `<div class="galleryGrid js-lightbox-group">${assets.epkPressPhotos.map((img, i) => {
          const o = imgObj(img);
          const u = imageHrefForRender(o, "press", i);
          const alt = escapeHtml(o.alt || `Press photo ${i+1}`);
          return `<a href="${u}" data-lightbox="press"><img src="${u}" alt="${alt}"/></a>`;
        }).join("")}</div>`
      : "";

    const files = hasFiles
      ? (() => {
          if (__renderCtx.target === 'single') {
            return `<div class="muted">Pliki do pobrania są dostępne w eksporcie ZIP.</div>`;
          }
          const isZipExport = (__renderCtx.target === 'zip' && __renderCtx.inlineAssets === false);
          return (assets.epkFiles || []).map(f => {
            const name = escapeHtml(String(f.name || 'Plik'));
            const zipName = escapeHtml(String(f.zipName || f.name || 'file'));
            const href = isZipExport ? `assets/press/${zipName}` : (String(f.url || f.dataUrl || '#'));
            if (!href || href === '#') return '';
            return `
        <div style="padding:10px 0; border-bottom:1px solid rgba(127,127,127,.18);">
          <strong>${name}</strong>
          <a class="btn primary" style="margin-left:10px;" href="${href}" download="${name}">Pobierz</a>
        </div>`;
          }).join("");
        })()
      : "";

    const hasPressLinks = !!pressLinks.trim();
    const hasDlLinks = !!dlLinks.trim();
    const hasBio = !!bioRaw;

    if (!hasBio && !hasPressLinks && !hasDlLinks && !hasPhotos && !hasFiles) return "";

    return `
<section id="${id}" class="section">
  ${headingHtml}

  <div class="grid2">
    ${hasBio ? `
    <div>
      <h3 style="margin:0 0 10px 0;">Bio</h3>
      <div class="${bioCls}">${bio}</div>
    </div>` : ``}
    <div>
      ${hasPressLinks ? `<h3 style="margin:0 0 10px 0;">Linki prasowe</h3><div>${pressLinks}</div>` : ``}
      ${hasDlLinks ? `<h3 style="margin:${hasPressLinks ? "18px" : "0"} 0 10px 0;">Do pobrania</h3><div>${dlLinks}</div>` : ``}
    </div>
  </div>

  ${hasPhotos ? `<h3 style="margin:22px 0 10px 0;">Zdjęcia prasowe</h3>${photos}` : ``}
  ${hasFiles ? `<h3 style="margin:22px 0 10px 0;">Pliki</h3><div>${files}</div>` : ``}
</section>`;
  }

if (editor === "contact") {
    const emailRaw = String(cfg.data.email || "").trim();
    const phoneRaw = String(cfg.data.phone || "").trim();
    const city = escapeHtml(cfg.data.city || "");
    const cta = escapeHtml(cfg.data.cta || "Napisz do mnie");

    const email = escapeHtml(emailRaw);
    const phone = escapeHtml(phoneRaw);
    const mailHref = emailRaw ? `mailto:${encodeURIComponent(emailRaw)}` : "";
    const telClean = phoneRaw.replace(/[^\d+]/g, "");
    const telHref = telClean ? `tel:${telClean}` : "";

    const showMap = !!cfg.data.showMap;
    const addrRaw = String(cfg.data.mapAddress || "").trim();
    const embedRaw = String(cfg.data.mapEmbed || "").trim();
    let mapSrc = "";
    if (showMap) {
      if (embedRaw) {
        const src = decodeHtmlEntitiesLoose(embedRaw.includes("<iframe") ? extractIframeSrc(embedRaw) : embedRaw);
        mapSrc = normalizeHttpUrlLoose(src) || "";
      } else if (addrRaw) {
        mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(addrRaw)}&output=embed`;
      }
    }
    const mapOpen = addrRaw
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addrRaw)}`
      : "";

    return `
<section id="${id}" class="section">
  ${headingHtml}
  <div class="muted">
    ${email ? (mailHref ? `Email: <a href="${escapeHtml(mailHref)}"><strong>${email}</strong></a><br/>` : `Email: <strong>${email}</strong><br/>`) : ``}
    ${phone ? (telHref ? `Telefon: <a href="${escapeHtml(telHref)}"><strong>${phone}</strong></a><br/>` : `Telefon: <strong>${phone}</strong><br/>`) : ``}
    ${city ? `Miasto: <strong>${city}</strong><br/>` : ``}
  </div>
  ${mailHref ? `<div style="margin-top:12px;"><a class="btn primary" href="${escapeHtml(mailHref)}">${cta}</a></div>` : ``}
  ${mapSrc ? `
    <div class="mapWrap">
      <iframe class="mapEmbed" src="${escapeHtml(mapSrc)}" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe>
      
    </div>
  ` : ``}
</section>`;
  }

  if (editor === "social") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const rows = items.map(it => {
      const name = escapeHtml(it.name || "Profil");
      const href = normalizeHttpUrlLoose(it.url || "");
      return `
<div style="padding:10px 0; border-bottom:1px solid rgba(127,127,127,.18);">
  <strong>${name}</strong>
  ${href ? ` <a class="btn" style="margin-left:10px;" href="${escapeHtml(href)}" target="_blank" rel="noopener">Otwórz</a>` : ``}
</div>`;
    }).join("");

    return `
<section id="${id}" class="section">
  ${headingHtml}
  <div>${rows || `<div class="muted">Dodaj profile w generatorze.</div>`}</div>
</section>`;
  }

  return `
<section id="${id}" class="section">
  ${headingHtml}
  <div class="muted">Sekcja.</div>
</section>`;
}

function assetHrefForHead(assetObj, inlineAssets, outPathNoExt) {
  if (!assetObj) return "";
  if (inlineAssets) return String(assetObj.dataUrl || assetObj.url || "");

  // ZIP export: allow refs without dataUrl (use mime saved in assetsRef)
  const parsed = parseDataUrl(String(assetObj.dataUrl || assetObj.url || ""));
  const mime = String(assetObj.mime || (parsed ? parsed.mime : ""));
  if (!mime) return "";
  const ext = guessExtFromMime(mime);
  return `${outPathNoExt}.${ext}`;
}

function buildHeadMetaTags(pageTitle, inlineAssets) {
  const baseTitle = String(state.metaTitle || "").trim() || String(state.siteName || "").trim() || "Portfolio";
  const desc = String(state.metaDescription || "").trim();

  const ogTitle = pageTitle || baseTitle;
  const tags = [];

  // YouTube embeds (error 153) require that we do not suppress the Referer header.
  // This meta is a safe default and matches YouTube's recommendation.
  tags.push(`<meta name="referrer" content="strict-origin-when-cross-origin"/>`);

  if (desc) tags.push(`<meta name="description" content="${escapeHtml(desc)}"/>`);
  const kw = String(state.metaKeywords || "").trim();
  if (kw) tags.push(`<meta name="keywords" content="${escapeHtml(kw)}"/>`);

  tags.push(`<meta property="og:type" content="website"/>`);
  tags.push(`<meta property="og:title" content="${escapeHtml(ogTitle)}"/>`);
  if (desc) tags.push(`<meta property="og:description" content="${escapeHtml(desc)}"/>`);

  const fav = assetHrefForHead(assets.favicon, inlineAssets, "assets/favicon");
  if (fav) tags.push(`<link rel="icon" href="${escapeHtml(fav)}"/>`);

  const og = assetHrefForHead(assets.ogImage, inlineAssets, "assets/og");
  if (og) {
    tags.push(`<meta property="og:image" content="${escapeHtml(og)}"/>`);
    tags.push(`<meta name="twitter:card" content="summary_large_image"/>`);
  } else {
    tags.push(`<meta name="twitter:card" content="summary"/>`);
  }

  return tags.join("\n");
}


function buildBodyClass() {
  const cls = [];
  cls.push(`theme-${state.theme}`);
  cls.push(`tpl-${state.template}`);

  // Reused setting: controls overall page layout alignment (blocks left vs centered).
  // Text stays left for readability.
  const la = (state.sectionHeadersAlign === "center") ? "center" : "left";
  cls.push(`layout-${la}`);

  if (state.accentType) cls.push(`accent-${state.accentType}`);
  if (state.headerLayout) cls.push(`header-${state.headerLayout}`);
  if (state.headerBg) cls.push(`headerbg-${state.headerBg}`);
  if (state.contentWidth) cls.push(`width-${state.contentWidth}`);
  if (state.density) cls.push(`density-${state.density}`);
  if (state.borders) cls.push(`borders-${state.borders}`);
  if (state.radius) cls.push(`radius-${state.radius}`);
  if (state.sectionDividers) cls.push(`sep-${state.sectionDividers}`);
  if (state.motion) cls.push(`motion-${state.motion}`);
  if (state.scrollMode) cls.push(`scroll-${state.scrollMode}`);
  if (state.headerWidth) cls.push(`headerw-${state.headerWidth}`);
  if (state.heroWidth) cls.push(`herow-${state.heroWidth}`);
  if (state.fontPreset) cls.push(`font-${state.fontPreset}`);

  return cls.join(' ');
}

function buildStylePreviewHtml(opts = {}) {
  const inlineAssets = opts.inlineAssets !== false;
  const preview = !!opts.preview;

  const css = buildSiteCss();
  const js = buildSiteScript();

  const previewAttr = preview ? ` data-kpo-preview="1"` : ``;
  const headCss = inlineAssets ? `<style>${css}</style>` : `<link rel="stylesheet" href="style.css"/>`;
  const footJs = inlineAssets ? `<script>${js}</script>` : `<script src="site.js"></script>`;

  const pageTitle = `Styl • ${String(state.siteName || 'Artysta').trim() || 'Artysta'}`;

  const heroBg = `url('${_svgPlaceholderDataUrl('HERO', 1600, 1000)}')`;
  const thumbs = Array.from({length: 3}).map((_,i) => ({
    url: _svgPlaceholderDataUrl(`HERO ${i+1}`, 900, 900),
    alt: `HERO ${i+1}`,
  }));

  const nav = [
    { label: 'Start', href: '#hero' },
    { label: 'O mnie', href: '#about' },
    { label: 'Karty', href: '#cards' },
    { label: 'Galeria', href: '#gallery' },
    { label: 'Media', href: '#media' },
    { label: 'Sklep', href: '#store' },
    { label: 'Kontakt', href: '#contact' },
  ];

  const heroHtml = `
<section id="hero" class="hero" style="--hero-bg:${heroBg};">
  <div class="heroInner">
    <h1>Przykładowy nagłówek</h1>
    <p>To jest strona testowa komponentów. Zmieniaj szablon, motyw, akcent, gęstość, obramowania i od razu widzisz efekt.</p>
    <div class="heroActions">
      <a class="btn primary" href="#about">CTA primary</a>
      <a class="btn" href="#contact">Kontakt</a>
    </div>
  </div>
  <div class="heroSlides" data-hero-slides="${encodeURIComponent(JSON.stringify(thumbs.map(t=>t.url)))}"></div>
  <div class="heroSliderBar" aria-label="HERO slider">
      <button type="button" class="heroArrow" data-hero="prev" aria-label="Poprzednie zdjęcie">←</button>
      <div class="heroCounter" data-demo="1">DEMO 1 / ${thumbs.length}</div>
      <button type="button" class="heroArrow" data-hero="next" aria-label="Następne zdjęcie">→</button>
    </div>
</section>`;

  const cardsHtml = `
<section id="cards" class="section">
  <h2 class="sectionTitle">Karty / grid</h2>
  <div class="grid2">
    <div class="embedCard">
      <strong>Card #1</strong>
      <div class="muted" style="margin-top:8px;">Tekst, linki, przyciski. To ma dobrze wyglądać w każdym template.</div>
      <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
        <a class="btn primary" href="#">Action</a>
        <a class="btn" href="#">Secondary</a>
      </div>
    </div>
    <div class="embedCard">
      <strong>Card #2</strong>
      <div class="muted" style="margin-top:8px;">To jest druga karta — sprawdzamy border/radius/density.</div>
      <div style="margin-top:12px;">
        <div class="fakeEmbed">16:9 embed</div>
      </div>
    </div>
  </div>
</section>`;

  const aboutHtml = `
<section id="about" class="section">
  <h2 class="sectionTitle">Sekcja tekstowa</h2>
  <div class="muted">Przykładowy akapit. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</div>
</section>`;

  const galleryImgs = Array.from({length: 8}).map((_,i)=>_svgPlaceholderDataUrl(`Galeria ${i+1}`, 900, 900));
  const galleryHtml = `
<section id="gallery" class="section">
  <h2 class="sectionTitle">Galeria</h2>
  <div class="galleryGrid js-lightbox-group" style="--gcols:4;">
    ${galleryImgs.map(u => `<a href="${u}" data-lightbox="gallery"><img src="${u}" alt="Galeria"/></a>`).join('')}
  </div>
</section>`;

  const _mediaWrapOpen = String(state.mediaLayout || "stack") === "split"
    ? `<div class="mediaSplitRow">`
    : `<div style="display:grid; gap:16px;">`;

  const mediaHtml = `
<section id="media" class="section">
  <h2 class="sectionTitle">Media</h2>
  ${_mediaWrapOpen}
    <div class="embedCard">
      <strong>Spotify</strong>
      <div style="margin-top:10px;" class="fakeEmbed">Embed (responsive)</div>
    </div>
    <div class="embedCard">
      <strong>YouTube</strong>
      <div style="margin-top:10px;" class="fakeEmbed">Embed (16:9)</div>
    </div>
  </div>
</section>`;

  const storeItems = Array.from({length: 3}).map((_,i)=>({
    img: _svgPlaceholderDataUrl(`Merch ${i+1}`, 1200, 900),
    name: `Produkt ${i+1}`,
    price: `${(i+1)*49} PLN`,
  }));
  const storeHtml = `
<section id="store" class="section">
  <h2 class="sectionTitle">Sklep / merch</h2>
  <div class="storeGrid">
    ${storeItems.map(it => `
      <div class="storeCard">
        <img class="storeImg" src="${it.img}" alt="${escapeHtml(it.name)}"/>
        <div class="storeBody">
          <div class="storeTop">
            <div class="storeName">${escapeHtml(it.name)}</div>
            <div class="storePrice">${escapeHtml(it.price)}</div>
          </div>
          <div class="storeDesc">Krótki opis produktu. Link, warianty, dostępność.</div>
          <div class="storeActions"><a class="btn primary" href="#">Kup</a></div>
        </div>
      </div>
    `).join('')}
  </div>
</section>`;

  const mapSrcdoc = `<html><body style="margin:0;display:flex;align-items:center;justify-content:center;font-family:system-ui;background:#111;color:#fff;"><div style="opacity:.8;font-weight:900;">MAPA (placeholder)</div></body></html>`;
  const contactHtml = `
<section id="contact" class="section">
  <h2 class="sectionTitle">Kontakt</h2>
  <div class="muted">Email: <strong>kontakt@artysta.pl</strong><br/>Telefon: <strong>+48 600 000 000</strong><br/>Miasto: <strong>Warszawa</strong></div>
  <div style="margin-top:12px;"><a class="btn primary" href="mailto:kontakt@artysta.pl">Napisz</a></div>
  <div class="mapWrap">
    <iframe class="mapEmbed" srcdoc="${mapSrcdoc}"></iframe>
  </div>
</section>`;

  return `
<!doctype html>
<html lang="pl"${previewAttr}>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<script>document.documentElement.classList.add('kpo-preload');</script>
<meta name="referrer" content="strict-origin-when-cross-origin"/>
<title>${escapeHtml(pageTitle)}</title>
${buildFontLinks()}
${headCss}
</head>
<body class="${escapeHtml(buildBodyClass() + ' has-hero')}">
  ${buildHeader(nav, '#hero', inlineAssets)}
  ${heroHtml}
  <main class="container">
    ${aboutHtml}
    ${cardsHtml}
    ${galleryHtml}
    ${mediaHtml}
    ${storeHtml}
    ${contactHtml}
    <div class="footer">© ${escapeHtml(state.siteName || 'Artysta')}</div>
  </main>
${footJs}
<script>(function(){
  const root = document.documentElement;
  function raf2(fn){ requestAnimationFrame(()=>requestAnimationFrame(fn)); }
  function done(){
    if(done._) return; done._ = true;
    // zostaw jeszcze odrobinę bufora na stabilizację układu
    raf2(()=>setTimeout(()=>root.classList.remove('kpo-preload'), 120));
  }
  let pending = 0;
  function wait(p){
    pending++;
    Promise.resolve(p).catch(()=>{}).then(()=>{
      pending--;
      if(pending<=0) done();
    });
  }
  // zawsze czekamy na load (obrazy/fonty mogą zmienić szerokość nagłówka)
  wait(new Promise(res=>{
    if(document.readyState === 'complete') res();
    else window.addEventListener('load', res, { once:true });
  }));
  // czekamy na fonty, jeśli przeglądarka wspiera
  if(document.fonts && document.fonts.ready){
    wait(document.fonts.ready);
  }
  // awaryjny timeout: nie trzymaj preload w nieskończoność
  setTimeout(()=>{ if(!done._) done(); }, 1800);
})();</script>
</body>
</html>`.trim();
}

let __renderCtx = { target: "single", inlineAssets: true };

function isEmbedBlockId(blockId) {
  const ed = String(getBlockDef(blockId)?.editor || "");
  return ed === "embed_youtube" || ed === "embed_spotify";
}

function buildSectionsHtml(ids, target) {
  const out = [];
  const split = String(state.mediaLayout || "stack") === "split";

  for (let i = 0; i < ids.length; i++) {
    const a = ids[i];
    const b = ids[i + 1];

    if (split && a && b && isEmbedBlockId(a) && isEmbedBlockId(b)) {
      out.push(`<div class="mediaSplitRow">${renderBlockSection(a, target)}${renderBlockSection(b, target)}</div>`);
      i++;
      continue;
    }

    out.push(renderBlockSection(a, target));
  }
  return out.join("");
}


function getPolicyContactData(){
  const on = enabledBlocksInOrder().includes("contact");
  const c = state.blocks?.contact?.data || {};
  const email = on ? String(c.email || "").trim() : "";
  const phone = on ? String(c.phone || "").trim() : "";
  const city = on ? String(c.city || "").trim() : "";
  return { on, email, phone, city };
}

function buildPrivacyPolicyCardHtml(){
  const siteName = String(state.siteName || "").trim() || "Ta strona";
  const { email, phone, city } = getPolicyContactData();
  const updated = new Date().toISOString().slice(0,10);
  const gtmId = String(state.gtmId || "").trim();
  const hasGtm = !!gtmId && !!state.cookieBanner;

  const contactBits = [];
  if (email) contactBits.push(`Email: <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>`);
  if (phone) contactBits.push(`Tel.: <a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a>`);
  if (city) contactBits.push(`Miasto: ${escapeHtml(city)}`);
  const contactLine = contactBits.length ? contactBits.join(" • ") : "";

  const contactPara = contactLine
    ? `<p>${contactLine}</p>`
    : `<p class="muted">Uzupełnij email w bloku Kontakt, żeby polityka miała dane administratora.</p>`;

  const analyticsLine = hasGtm
    ? 'dane statystyczne/marketingowe z narzędzi uruchamianych przez Google Tag Manager – tylko po akceptacji cookies.'
    : 'brak narzędzi analitycznych/marketingowych bez Twojej zgody cookies.';

  const purposeLine = hasGtm
    ? 'statystyka/marketing – na podstawie Twojej zgody (banner cookies).'
    : 'statystyka/marketing – nie dotyczy (brak włączonej analityki).';

  const marketingCookieLine = hasGtm
    ? 'włączane dopiero po akceptacji; mogą pochodzić od dostawców zewnętrznych (np. Google).'
    : 'nie są uruchamiane bez Twojej zgody.';

  const recipientsExtra = hasGtm
    ? 'Jeśli zaakceptujesz cookies, dane mogą być przetwarzane także przez dostawców narzędzi uruchamianych przez GTM (np. Google).'
    : '';

  return `
    <div class="muted">Aktualizacja: ${escapeHtml(updated)}</div>
    <h3>1. Administrator danych</h3>
    <p>Administratorem danych jest właściciel strony <b>${escapeHtml(siteName)}</b>.</p>
    ${contactPara}

    <h3>2. Jakie dane przetwarzamy</h3>
    <ul>
      <li>dane, które podajesz w kontakcie (np. email/telefon) oraz treść wiadomości, jeśli się z nami kontaktujesz,</li>
      <li>techniczne dane w logach serwera (np. adres IP, user-agent, data i godzina) – standardowo przy hostingu,</li>
      <li>${analyticsLine}</li>
    </ul>

    <h3>3. Cele i podstawy</h3>
    <ul>
      <li>kontakt i obsługa zapytań – uzasadniony interes oraz działania na Twoje żądanie,</li>
      <li>bezpieczeństwo i obsługa strony (logi) – uzasadniony interes,</li>
      <li>${purposeLine}</li>
    </ul>

    <h3>4. Pliki cookie</h3>
    <p>Strona może zapisywać pliki cookie oraz podobne mechanizmy w przeglądarce. Używamy ich do działania strony oraz do zapamiętania Twojej decyzji z bannera.</p>
    <ul>
      <li><b>Niezbędne</b> – działanie strony i zapis zgody/odrzucenia.</li>
      <li><b>Analityczne/marketingowe</b> – ${marketingCookieLine}</li>
    </ul>
    <p>Cookies możesz usunąć lub zablokować w ustawieniach przeglądarki. Decyzję możesz też zmienić – usuń dane strony (cookies/localStorage) i odśwież.</p>

    <h3>5. Odbiorcy danych</h3>
    <p>Odbiorcami danych mogą być dostawcy hostingu i usług technicznych. ${recipientsExtra}</p>

    <h3>6. Twoje prawa</h3>
    <ul>
      <li>dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania,</li>
      <li>sprzeciwu wobec przetwarzania (gdy podstawą jest uzasadniony interes),</li>
      <li>cofnięcia zgody (gdy podstawą jest zgoda) – bez wpływu na zgodność wcześniejszego przetwarzania,</li>
      <li>wniesienia skargi do Prezesa UODO.</li>
    </ul>

    <h3>7. Zmiany</h3>
    <p>Polityka może być aktualizowana, gdy zmieni się sposób działania strony lub używane narzędzia.</p>

    <p class="muted">Ten tekst został wygenerowany automatycznie przez generator strony.</p>
  `.trim();
}

function buildPrivacyPolicySectionHtml(){
  if (!state.privacyAuto) return "";
  // Single-page: render as hidden modal opened from footer link.
  return `
<div id="privacy" class="privacyModal" aria-hidden="true">
  <div class="privacyModal__backdrop" data-close-privacy="1"></div>
  <div class="privacyModal__dialog" role="dialog" aria-modal="true" aria-labelledby="privacyTitle" tabindex="-1">
    <button type="button" class="privacyModal__close" data-close-privacy="1" aria-label="Zamknij">✕</button>
    <h2 id="privacyTitle" class="privacyModal__title">Polityka prywatności i cookies</h2>
    <div class="embedCard privacyPolicy">
      ${buildPrivacyPolicyCardHtml()}
    </div>
  </div>
</div>`.trim();
}

function buildFooterHtml(mode){
  const name = escapeHtml(state.siteName || "Artysta");
  if (!state.privacyAuto) {
    return `<div class="footer">© ${name}</div>`;
  }
  const href = (mode === "single") ? "#privacy" : "privacy.html";
  const attrs = (mode === "single") ? ' data-open-privacy="1"' : '';
  return `<div class="footer">© ${name}<span class="footerSep">•</span><a href="${href}"${attrs}>Polityka prywatności</a></div>`;
}

function buildSingleHtml(opts = {}) {
  const inlineAssets = opts.inlineAssets !== false; // default true
  const preview = !!opts.preview;
  __renderCtx = { target: "single", inlineAssets: !!inlineAssets };

  const nav = getNavItemsSingle();
  const css = buildSiteCss();
  const js = buildSiteScript();
  const bodySections = buildSectionsHtml(enabledBlocksInOrder(), "single");
  const privacySection = state.privacyAuto ? buildPrivacyPolicySectionHtml() : "";
  const hasHero = enabledBlocksInOrder().includes("hero");

  const previewAttr = preview ? ` data-kpo-preview="1"` : ``;

  const headCss = inlineAssets ? `<style>${css}</style>` : `<link rel="stylesheet" href="style.css"/>`;
  const footJs = inlineAssets ? `<script>${js}</script>` : `<script src="site.js"></script>`;

  const pageTitle = String(state.metaTitle || "").trim() || String(state.siteName || "").trim() || "Portfolio";

  return `
<!doctype html>
<html lang="pl"${previewAttr}>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<script>document.documentElement.classList.add('kpo-preload');</script>
<title>${escapeHtml(pageTitle)}</title>
${buildHeadMetaTags(pageTitle, inlineAssets)}
${buildFontLinks()}
${headCss}
</head>
<body class="${escapeHtml(buildBodyClass() + (hasHero ? ' has-hero' : ''))}">
  ${buildHeader(nav, nav[0]?.href || "#hero", inlineAssets)}
  <main class="container">
    ${bodySections}
    ${privacySection}
    ${buildFooterHtml("single")}
  </main>
${footJs}
<script>(function(){
  const root = document.documentElement;
  function raf2(fn){ requestAnimationFrame(()=>requestAnimationFrame(fn)); }
  function done(){
    if(done._) return; done._ = true;
    // zostaw jeszcze odrobinę bufora na stabilizację układu
    raf2(()=>setTimeout(()=>root.classList.remove('kpo-preload'), 120));
  }
  let pending = 0;
  function wait(p){
    pending++;
    Promise.resolve(p).catch(()=>{}).then(()=>{
      pending--;
      if(pending<=0) done();
    });
  }
  // zawsze czekamy na load (obrazy/fonty mogą zmienić szerokość nagłówka)
  wait(new Promise(res=>{
    if(document.readyState === 'complete') res();
    else window.addEventListener('load', res, { once:true });
  }));
  // czekamy na fonty, jeśli przeglądarka wspiera
  if(document.fonts && document.fonts.ready){
    wait(document.fonts.ready);
  }
  // awaryjny timeout: nie trzymaj preload w nieskończoność
  setTimeout(()=>{ if(!done._) done(); }, 1800);
})();</script>
</body>
</html>`.trim();
}

function buildZipFiles(opts = {}) {
  const inlineAssets = !!opts.inlineAssets;
  const preview = !!opts.preview;
  __renderCtx = { target: "zip", inlineAssets: !!inlineAssets };

  const css = buildSiteCss();
  const js = buildSiteScript();
  const nav = getNavItemsZip();
  const files = {};

  const previewAttr = preview ? ` data-kpo-preview="1"` : ``;

  // export version: separate files + html links
  if (!inlineAssets) {
    files["style.css"] = css;
    files["site.js"] = js;
  }

  const headCss = inlineAssets ? `<style>${css}</style>` : `<link rel="stylesheet" href="style.css"/>`;
  const footJs = inlineAssets ? `<script>${js}</script>` : `<script src="site.js"></script>`;

  const baseTitle = String(state.metaTitle || "").trim() || String(state.siteName || "").trim() || "Portfolio";

  // index.html
  const enabledAll = enabledBlocksInOrder().filter(id => id !== "hero");
  const enabled = enabledAll.filter(id => ensureBlock(id).showOnHomeZip !== false);


  // Home in ZIP: HERO jest pełnoekranowy i niezależny od układu treści.
  const indexHero = buildSectionsHtml(["hero"], "single");
  const indexBody = buildSectionsHtml(enabled, "single");

  files["index.html"] = `
<!doctype html>
<html lang="pl"${previewAttr}>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<script>document.documentElement.classList.add('kpo-preload');</script>
<title>${escapeHtml(baseTitle)}</title>
${buildHeadMetaTags(baseTitle, inlineAssets)}
${buildFontLinks()}
${headCss}
</head>
<body class="${escapeHtml(buildBodyClass() + ' has-hero')}">
  ${buildHeader(nav, "index.html", inlineAssets)}
  ${indexHero}
  <main class="container">
    ${indexBody}
    ${buildFooterHtml("zip")}
  </main>
${footJs}
<script>(function(){
  const root = document.documentElement;
  function raf2(fn){ requestAnimationFrame(()=>requestAnimationFrame(fn)); }
  function done(){
    if(done._) return; done._ = true;
    // zostaw jeszcze odrobinę bufora na stabilizację układu
    raf2(()=>setTimeout(()=>root.classList.remove('kpo-preload'), 120));
  }
  let pending = 0;
  function wait(p){
    pending++;
    Promise.resolve(p).catch(()=>{}).then(()=>{
      pending--;
      if(pending<=0) done();
    });
  }
  // zawsze czekamy na load (obrazy/fonty mogą zmienić szerokość nagłówka)
  wait(new Promise(res=>{
    if(document.readyState === 'complete') res();
    else window.addEventListener('load', res, { once:true });
  }));
  // czekamy na fonty, jeśli przeglądarka wspiera
  if(document.fonts && document.fonts.ready){
    wait(document.fonts.ready);
  }
  // awaryjny timeout: nie trzymaj preload w nieskończoność
  setTimeout(()=>{ if(!done._) done(); }, 1800);
})();</script>
</body>
</html>`.trim();

  // pages per block (one page per base id)
  const baseFirst = new Map();
  const basePage = new Map();

  enabledAll.forEach((id) => {
    const base = baseBlockId(id);
    if (base === "epk" && !isEpkRenderable()) return;
    if (!baseFirst.has(base)) baseFirst.set(base, id);

    const cfg = ensureBlock(id);
    if (cfg.showInHeader === false) return;
    if (!basePage.has(base)) basePage.set(base, id);
  });

  for (const [base, firstId] of baseFirst.entries()) {
    const id = basePage.get(base) || firstId;
    const file = blockToFile(base);
    const pageTitle = `${baseTitle} • ${getBlockDisplayName(id)}`;
    files[file] = `
<!doctype html>
<html lang="pl"${previewAttr}>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<script>document.documentElement.classList.add('kpo-preload');</script>
<title>${escapeHtml(pageTitle)}</title>
${buildHeadMetaTags(pageTitle, inlineAssets)}
${buildFontLinks()}
${headCss}
</head>
<body class="${escapeHtml(buildBodyClass())}">
  ${buildHeader(nav, file, inlineAssets)}
  <main class="container">
    ${renderBlockSection(id, "zip")}
    ${buildFooterHtml("zip")}
  </main>
${footJs}
<script>(function(){
  const root = document.documentElement;
  function raf2(fn){ requestAnimationFrame(()=>requestAnimationFrame(fn)); }
  function done(){
    if(done._) return; done._ = true;
    // zostaw jeszcze odrobinę bufora na stabilizację układu
    raf2(()=>setTimeout(()=>root.classList.remove('kpo-preload'), 120));
  }
  let pending = 0;
  function wait(p){
    pending++;
    Promise.resolve(p).catch(()=>{}).then(()=>{
      pending--;
      if(pending<=0) done();
    });
  }
  // zawsze czekamy na load (obrazy/fonty mogą zmienić szerokość nagłówka)
  wait(new Promise(res=>{
    if(document.readyState === 'complete') res();
    else window.addEventListener('load', res, { once:true });
  }));
  // czekamy na fonty, jeśli przeglądarka wspiera
  if(document.fonts && document.fonts.ready){
    wait(document.fonts.ready);
  }
  // awaryjny timeout: nie trzymaj preload w nieskończoność
  setTimeout(()=>{ if(!done._) done(); }, 1800);
})();</script>
</body>
</html>`.trim();
  }


  // privacy policy page (auto)
  if (state.privacyAuto) {
    const file = "privacy.html";
    const pageTitle = `${baseTitle} • Polityka prywatności`;
    const main = `
<section id="top" class="section">
  <h2 class="sectionTitle">Polityka prywatności i cookies</h2>
  <div class="embedCard privacyPolicy">
    ${buildPrivacyPolicyCardHtml()}
  </div>
</section>`.trim();

    files[file] = `
<!doctype html>
<html lang="pl"${previewAttr}>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<script>document.documentElement.classList.add('kpo-preload');</script>
<title>${escapeHtml(pageTitle)}</title>
${buildHeadMetaTags(pageTitle, inlineAssets)}
${buildFontLinks()}
${headCss}
</head>
<body class="${escapeHtml(buildBodyClass())}">
  ${buildHeader(nav, file, inlineAssets)}
  <main class="container">
    ${main}
    ${buildFooterHtml("zip")}
  </main>
${footJs}
<script>(function(){
  const root = document.documentElement;
  function raf2(fn){ requestAnimationFrame(()=>requestAnimationFrame(fn)); }
  function done(){
    if(done._) return; done._ = true;
    // zostaw jeszcze odrobinę bufora na stabilizację układu
    raf2(()=>setTimeout(()=>root.classList.remove('kpo-preload'), 120));
  }
  let pending = 0;
  function wait(p){
    pending++;
    Promise.resolve(p).catch(()=>{}).then(()=>{
      pending--;
      if(pending<=0) done();
    });
  }
  // zawsze czekamy na load (obrazy/fonty mogą zmienić szerokość nagłówka)
  wait(new Promise(res=>{
    if(document.readyState === 'complete') res();
    else window.addEventListener('load', res, { once:true });
  }));
  // czekamy na fonty, jeśli przeglądarka wspiera
  if(document.fonts && document.fonts.ready){
    wait(document.fonts.ready);
  }
  // awaryjny timeout: nie trzymaj preload w nieskończoność
  setTimeout(()=>{ if(!done._) done(); }, 1800);
})();</script>
</body>
</html>`.trim();
  }

  return files;
}


/* ==========================
   Preview rebuild
========================== */

let __previewBlobUrl = "";
const __previewScrollByPage = Object.create(null);
let __previewCurrentLabel = "";
let __previewToken = 0;

// Dedupe: czasem ten sam render wpada 2x (różne ścieżki UI). Zamiast
// przeładowywać iframe (mruganie + gubienie scrolla), ignorujemy duplikat.
let __previewLastKey = "";
let __previewLastSetAt = 0;

function _previewKey(label, html){
  const t = String(html || "");
  const a = t.slice(0, 180);
  const b = t.slice(Math.max(0, t.length - 180));
  return `${String(label || "").trim()}::${t.length}::${a}::${b}`;
}

// Coalesce: w praktyce UI potrafi wywołać podgląd kilka razy w krótkim czasie.
// Jeśli przeładujemy iframe 2x pod rząd, użytkownik widzi „podwójne miganie” i gubi scroll.
// Dlatego zawsze sklejmy wywołania w jeden update na klatkę.
let __previewApplyRAF = 0;
let __previewPending = null;

function previewSetHtml(html, label){
  __previewPending = { html, label };
  if(__previewApplyRAF) return;
  __previewApplyRAF = requestAnimationFrame(()=>{
    __previewApplyRAF = 0;
    const p = __previewPending;
    __previewPending = null;
    if(!p) return;
    _previewApplyHtml(p.html, p.label);
  });
}

function _previewApplyHtml(html, label){
  const iframe = $("previewFrame");
  if(!iframe) return;

  const token = ++__previewToken;

  // zapamiętaj scroll aktualnej strony przed przeładowaniem
  try{
    const cur = String(__previewCurrentLabel || iframe.getAttribute('data-page') || '').trim();
    if(cur && iframe.contentWindow){
      const w = iframe.contentWindow;
      const d = w.document;
      const se = d && (d.scrollingElement || d.documentElement);
      const y = (se && typeof se.scrollTop === 'number') ? se.scrollTop : (w.scrollY || 0);
      // nie nadpisuj sensownego scrolla "zerem" gdy iframe już zdążył przeskoczyć na górę
      const prev = __previewScrollByPage[cur] || 0;
      if(!(y === 0 && prev > 0 && (Date.now() - (__previewLastSetAt || 0)) < 800)){
        __previewScrollByPage[cur] = y;
      }
    }
  }catch(e){}

  try {
    if(__previewBlobUrl) URL.revokeObjectURL(__previewBlobUrl);
  } catch(e){}

  const text = String(html || "");

  // Dedupe: jeśli dokładnie ten sam HTML tej samej strony został ustawiony chwilę temu,
  // to nie przeładowujemy iframe po raz drugi.
  const k = _previewKey(label, text);
  const now = Date.now();
  if(k === __previewLastKey && (now - (__previewLastSetAt || 0)) < 800){
    setPreviewPageLabel(label || "");
    return;
  }
  __previewLastKey = k;
  __previewLastSetAt = now;
  if(!text){
    __previewBlobUrl = "";
    iframe.src = "about:blank";
    setPreviewPageLabel(label || "");
    return;
  }

  const blob = new Blob([text], { type: "text/html;charset=utf-8" });
  __previewBlobUrl = URL.createObjectURL(blob);
  iframe.setAttribute('data-page', String(label||''));
  __previewCurrentLabel = String(label||'');

  const __restoreY = (()=>{
    try{ return __previewScrollByPage[__previewCurrentLabel] || 0; }catch(e){ return 0; }
  })();

  iframe.onload = ()=>{
    if(token !== __previewToken) return;
    const tryRestore = ()=>{
      try{
        const w = iframe.contentWindow;
        if(!w) return;
        const d = w.document;
        const se = d && (d.scrollingElement || d.documentElement);
        try{ w.scrollTo(0, __restoreY); }catch(e){}
        if(se) se.scrollTop = __restoreY;
        if(d && d.body) d.body.scrollTop = __restoreY;
      }catch(e){}
    };

    // Czasem layout/docinanie obrazów zmienia wysokości po "load" — poprawiamy kilka razy.
    tryRestore();
    setTimeout(tryRestore, 60);
    setTimeout(tryRestore, 220);
    setTimeout(tryRestore, 520);
    setTimeout(tryRestore, 900);

    // Trackuj scroll na bieżąco, żeby przy kolejnym odświeżeniu wrócić dokładnie w to samo miejsce.
    try{
      const w = iframe.contentWindow;
      if(w){
        if(w.__kpoScrollTrackCleanup) { try{ w.__kpoScrollTrackCleanup(); }catch(e){} }
        let raf = 0;
        const onScroll = ()=>{
          if(token !== __previewToken) return;
          if(raf) return;
          raf = w.requestAnimationFrame(()=>{
            raf = 0;
            try{
              const d = w.document;
              const se = d && (d.scrollingElement || d.documentElement);
              const y = (se && typeof se.scrollTop === 'number') ? se.scrollTop : (w.scrollY || 0);
              const cur = String(__previewCurrentLabel || iframe.getAttribute('data-page') || '').trim();
              if(cur) __previewScrollByPage[cur] = y;
            }catch(e){}
          });
        };
        w.addEventListener('scroll', onScroll, { passive:true });
        w.__kpoScrollTrackCleanup = ()=>{ try{ w.removeEventListener('scroll', onScroll); }catch(e){} };
      }
    }catch(e){}
  };

  iframe.src = __previewBlobUrl;
  setPreviewPageLabel(label || "");
}

function rebuildPreview(force=false) {
  // Nie pozwalamy, żeby błąd w generowaniu podglądu uwalił cały generator.
  try {
    syncStateFromSettingsInputs();
  } catch (e) {
    try { console.error(e); } catch(_){ }
  }

  try {
    // Style preview (components demo)
    if (state.previewMode === "style") {
      zipPreviewFiles = null;
      zipPreviewCurrent = "style-preview.html";
      previewSetHtml(buildStylePreviewHtml({ inlineAssets: true, preview: true }), "Styl preview");
      return;
    }

    // Normal page preview
    if (state.exportMode === "single") {
      zipPreviewFiles = null;
      zipPreviewCurrent = "index.html";
      previewSetHtml(buildSingleHtml({ inlineAssets: true, preview: true }), "index.html");
      return;
    }

    // ZIP preview: build inline pages
    zipPreviewFiles = buildZipFiles({ inlineAssets: true, preview: true });

    if (!zipPreviewFiles[zipPreviewCurrent]) zipPreviewCurrent = "index.html";
    previewSetHtml(zipPreviewFiles[zipPreviewCurrent] || "", zipPreviewCurrent);
  } catch (e) {
    try { console.error(e); } catch(_){ }
    const msg = (e && (e.stack || e.message)) ? String(e.stack || e.message) : String(e);
    const safe = (typeof escapeHtml === 'function') ? escapeHtml(msg) : msg;
    const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
<script>document.documentElement.classList.add('kpo-preload');</script>
      <title>Podgląd: błąd</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;padding:24px;line-height:1.45;}
        .card{max-width:900px;margin:0 auto;border:1px solid #ddd;border-radius:16px;padding:18px;}
        h1{font-size:18px;margin:0 0 10px;}
        pre{white-space:pre-wrap;background:#f6f6f6;border-radius:12px;padding:12px;overflow:auto;}
        .hint{opacity:.75;font-size:13px;margin-top:10px;}
      </style>
    </head><body><div class="card">
      <h1>Podgląd nie wygenerował się — błąd w generatorze</h1>
      <pre>${safe}</pre>
      <div class="hint">Tip: jeśli to się powtarza, kliknij „Reset”, albo wyczyść draft w przeglądarce (localStorage) i spróbuj ponownie.</div>
    </div></body></html>`;
    previewSetHtml(html, "ERROR");
  }
}

/* ==========================
   Preview navigation from iframe (ZIP)
========================== */

window.addEventListener("message", (ev) => {
  const d = ev.data || {};
  if (d.type !== "NAVIGATE") return;

  if (state.previewMode === "style") return;

  const page = String(d.page || "").trim();
  if (!page) return;

  if (state.exportMode !== "zip") return;

  if (!zipPreviewFiles) zipPreviewFiles = buildZipFiles({ inlineAssets: true, preview: true });

  if (zipPreviewFiles[page]) {
    zipPreviewCurrent = page;
    previewSetHtml(zipPreviewFiles[page], page);
  }
});

/* ==========================
   Download
========================== */

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

/* ==========================
   ZIP Progress UI
========================== */

function zipProgressShow(titleText = 'Generuję ZIP…'){
  const el = document.getElementById('zipProgress');
  if (!el) return;
  el.hidden = false;
  const t = document.getElementById('zipProgressTitle');
  if (t) t.textContent = titleText;
  zipProgressUpdate(0, 'Przygotowanie…');

  // a11y polish: focus stays inside progress dialog
  try{
    if(!el.__modalA11y) el.__modalA11y = { opener: null, bound: false, cardSelector: '.zipProgress__card' };
    el.__modalA11y.opener = document.activeElement;
    if(!el.__modalA11y.bound){
      el.__modalA11y.bound = true;
      document.addEventListener('keydown', (e)=>{
        try{
          if(!el || el.hidden) return;
          const card = el.querySelector(el.__modalA11y.cardSelector);
          _trapTabKey(e, card);
        }catch(err){}
      }, true);
    }
    const card = el.querySelector(el.__modalA11y.cardSelector);
    requestAnimationFrame(()=>{ if(el && !el.hidden) _focusFirstInDialog(card); });
  }catch(e){}
}

function zipProgressUpdate(pct, msg){
  const el = document.getElementById('zipProgress');
  if (!el || el.hidden) return;
  const p = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
  const fill = document.getElementById('zipProgressFill');
  const pctEl = document.getElementById('zipProgressPct');
  const msgEl = document.getElementById('zipProgressMsg');
  if (fill) fill.style.width = p + '%';
  if (pctEl) pctEl.textContent = p + '%';
  if (msgEl && typeof msg === 'string' && msg.trim()) msgEl.textContent = msg;
}

function zipProgressHide(){
  const el = document.getElementById('zipProgress');
  if (!el) return;
  el.hidden = true;
  // restore focus to element that triggered export
  try{
    const opener = el.__modalA11y && el.__modalA11y.opener;
    if(el.__modalA11y) el.__modalA11y.opener = null;
    if(opener && document.contains(opener)){
      try{ opener.focus({ preventScroll: true }); }catch(e){ try{ opener.focus(); }catch(e2){} }
    }
  }catch(e){}
}

async function downloadZip(filesMap) {
  if (typeof JSZip === "undefined") {
    toast("Brak JSZip. Wersja offline wymaga pliku vendor/jszip.min.js.", "warn", 5200);
    return;
  }

  zipProgressShow("Generuję ZIP…");
  const yieldToUI = () => new Promise(r => setTimeout(r, 0));

  try {
    zipProgressUpdate(2, "Przygotowanie plików…");

    const zip = new JSZip();
    const root = zip.folder(ZIP_ROOT_FOLDER);

    // pages
    const entries = Object.entries(filesMap);
    for (let i = 0; i < entries.length; i++) {
      const [name, content] = entries[i];
      root.file(name, content);
      if (i === 0) continue;
      if (i % 3 === 0) zipProgressUpdate(5 + (i / Math.max(1, entries.length)) * 10, "Dodaję pliki…");
      if (i % 12 === 0) await yieldToUI();
    }

    zipProgressUpdate(18, "Pakuję assety…");

    // assets folder
    const assetsFolder = root.folder("assets");

    const heroCount = (assets.heroImages || []).length;
    const heroMobileCount = (assets.heroImagesMobile || []).length;
    const galCount = (assets.galleryImages || []).length;
    const pressPhotoCount = (assets.epkPressPhotos || []).length;
    const pressFileCount = (assets.epkFiles || []).length;
    const extraCount =
      (assets.logo && (assets.logo.dataUrl || assets.logo.id) ? 1 : 0) +
      (assets.favicon && (assets.favicon.dataUrl || assets.favicon.id) ? 1 : 0) +
      (assets.ogImage && (assets.ogImage.dataUrl || assets.ogImage.id) ? 1 : 0);

    const totalAssets = heroCount + heroMobileCount + galCount + pressPhotoCount + pressFileCount + extraCount;
    let doneAssets = 0;
    const bumpAssets = (label) => {
      doneAssets += 1;
      if (!totalAssets) return;
      const pct = 18 + (doneAssets / totalAssets) * 15; // 18..33
      zipProgressUpdate(pct, label || "Pakuję assety…");
    };

    if (heroCount) {
      const h = assetsFolder.folder("hero");
      for (let i = 0; i < heroCount; i++) {
        const img = imgObj(assets.heroImages[i]);
        const base = `hero-${String(i + 1).padStart(2, "0")}`;
        let written = false;

        if (img && img.id) {
          const rec = await mediaGet(img.id);
          if (rec?.blob) {
            const ext = guessExtFromMime(img.mime || rec.blob.type);
            h.file(`${base}.${ext}`, rec.blob);
            written = true;
          }
        }

        if (!written) {
          const parsed = parseDataUrl(img.dataUrl || img.url);
          if (parsed) {
            const ext = guessExtFromMime(img.mime || parsed.mime);
            h.file(`${base}.${ext}`, parsed.b64, { base64: true });
            written = true;
          }
        }

        bumpAssets(`Hero: ${i + 1}/${heroCount}`);
        if (i % 4 === 0) await yieldToUI();
      }
    }

    if (heroMobileCount) {
      const hm = assetsFolder.folder("hero-mobile");
      for (let i = 0; i < heroMobileCount; i++) {
        const img = imgObj(assets.heroImagesMobile[i]);
        const base = `hero-m-${String(i + 1).padStart(2, "0")}`;
        let written = false;

        if (img && img.id) {
          const rec = await mediaGet(img.id);
          if (rec?.blob) {
            const ext = guessExtFromMime(img.mime || rec.blob.type);
            hm.file(`${base}.${ext}`, rec.blob);
            written = true;
          }
        }

        if (!written) {
          const parsed = parseDataUrl(img.dataUrl || img.url);
          if (parsed) {
            const ext = guessExtFromMime(img.mime || parsed.mime);
            hm.file(`${base}.${ext}`, parsed.b64, { base64: true });
            written = true;
          }
        }

        bumpAssets(`Hero mobile: ${i + 1}/${heroMobileCount}`);
        if (i % 4 === 0) await yieldToUI();
      }
    }


    if (galCount) {
      const g = assetsFolder.folder("gallery");
      for (let i = 0; i < galCount; i++) {
        const img = imgObj(assets.galleryImages[i]);
        const base = `img-${String(i + 1).padStart(2, "0")}`;
        let written = false;

        if (img && img.id) {
          const rec = await mediaGet(img.id);
          if (rec?.blob) {
            const ext = guessExtFromMime(img.mime || rec.blob.type);
            g.file(`${base}.${ext}`, rec.blob);
            written = true;
          }
        }

        if (!written) {
          const parsed = parseDataUrl(img.dataUrl || img.url);
          if (parsed) {
            const ext = guessExtFromMime(img.mime || parsed.mime);
            g.file(`${base}.${ext}`, parsed.b64, { base64: true });
            written = true;
          }
        }

        bumpAssets(`Galeria: ${i + 1}/${galCount}`);
        if (i % 4 === 0) await yieldToUI();
      }
    }

    if (pressPhotoCount || pressFileCount) {
      const press = assetsFolder.folder("press");

      for (let i = 0; i < pressPhotoCount; i++) {
        const img = imgObj(assets.epkPressPhotos[i]);
        const base = `photo-${String(i + 1).padStart(2, "0")}`;
        let written = false;

        if (img && img.id) {
          const rec = await mediaGet(img.id);
          if (rec?.blob) {
            const ext = guessExtFromMime(img.mime || rec.blob.type);
            press.file(`${base}.${ext}`, rec.blob);
            written = true;
          }
        }

        if (!written) {
          const parsed = parseDataUrl(img.dataUrl || img.url);
          if (parsed) {
            const ext = guessExtFromMime(img.mime || parsed.mime);
            press.file(`${base}.${ext}`, parsed.b64, { base64: true });
            written = true;
          }
        }

        bumpAssets(`Press foto: ${i + 1}/${pressPhotoCount}`);
        if (i % 4 === 0) await yieldToUI();
      }

      for (let i = 0; i < pressFileCount; i++) {
        const f = (assets.epkFiles || [])[i];
        const zipNameRaw = String(f?.zipName || f?.name || 'file');
        const zipName = safeFilename(zipNameRaw);

        let written = false;
        if (f && f.id) {
          const rec = await mediaGet(f.id);
          if (rec?.blob) {
            press.file(zipName, rec.blob);
            written = true;
          }
        }
        if (!written && f && f.dataUrl) {
          const parsed = parseDataUrl(f.dataUrl);
          if (parsed) {
            press.file(zipName, parsed.b64, { base64: true });
          }
        }

        bumpAssets(`Press pliki: ${i + 1}/${pressFileCount}`);
        if (i % 2 === 0) await yieldToUI();
      }
    }

    if (assets.logo && (assets.logo.dataUrl || assets.logo.id)) {
      const a0 = imgObj(assets.logo);
      let written = false;
      if (a0.id) {
        const rec = await mediaGet(a0.id);
        if (rec?.blob) {
          const ext = guessExtFromMime(a0.mime || rec.blob.type);
          assetsFolder.file(`logo.${ext}`, rec.blob);
          written = true;
        }
      }
      if (!written) {
        const parsed = parseDataUrl(a0.dataUrl || a0.url);
        if (parsed) {
          const ext = guessExtFromMime(a0.mime || parsed.mime);
          assetsFolder.file(`logo.${ext}`, parsed.b64, { base64: true });
        }
      }
      bumpAssets("Logo");
      await yieldToUI();
    }

    if (assets.favicon && (assets.favicon.dataUrl || assets.favicon.id)) {
      const a0 = imgObj(assets.favicon);
      let written = false;
      if (a0.id) {
        const rec = await mediaGet(a0.id);
        if (rec?.blob) {
          const ext = guessExtFromMime(a0.mime || rec.blob.type);
          assetsFolder.file(`favicon.${ext}`, rec.blob);
          written = true;
        }
      }
      if (!written) {
        const parsed = parseDataUrl(a0.dataUrl || a0.url);
        if (parsed) {
          const ext = guessExtFromMime(a0.mime || parsed.mime);
          assetsFolder.file(`favicon.${ext}`, parsed.b64, { base64: true });
        }
      }
      bumpAssets("Favicon");
      await yieldToUI();
    }

    if (assets.ogImage && (assets.ogImage.dataUrl || assets.ogImage.id)) {
      const a0 = imgObj(assets.ogImage);
      let written = false;
      if (a0.id) {
        const rec = await mediaGet(a0.id);
        if (rec?.blob) {
          const ext = guessExtFromMime(a0.mime || rec.blob.type);
          assetsFolder.file(`og.${ext}`, rec.blob);
          written = true;
        }
      }
      if (!written) {
        const parsed = parseDataUrl(a0.dataUrl || a0.url);
        if (parsed) {
          const ext = guessExtFromMime(a0.mime || parsed.mime);
          assetsFolder.file(`og.${ext}`, parsed.b64, { base64: true });
        }
      }
      bumpAssets("OG image");
      await yieldToUI();
    }

    zipProgressUpdate(35, "Kompresuję…");

    const blob = await zip.generateAsync({ type: "blob" }, (meta) => {
      const pct = 35 + (Number(meta.percent) || 0) * 0.65;
      const msg = meta.currentFile ? `Kompresuję: ${meta.currentFile}` : "Kompresuję…";
      zipProgressUpdate(pct, msg);
    });

    zipProgressUpdate(100, "Gotowe. Pobieram…");

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ZIP_ROOT_FOLDER}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  } catch (err) {
    console.error(err);
    toast("Błąd podczas generowania ZIP. Sprawdź konsolę.", "warn", 5200);
  } finally {
    setTimeout(zipProgressHide, 350);
  }
}

