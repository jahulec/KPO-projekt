/* ==========================
   Generator strony artysty
   v6 (zip preview fixed, no focus loss, collapsible sections in HTML, new templates, hero bg + hero gallery)
========================== */

const STORAGE_KEY = "artist_site_generator_v6_draft";
const SNAPSHOT_KEY = "artist_site_generator_v6_snapshot";
const ZIP_ROOT_FOLDER = "strona-artysta";
const PANEL_COLLAPSED_KEY = "artist_site_generator_v6_panel_collapsed";

const $ = (id) => document.getElementById(id);

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function debounce(fn, delay = 180) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function setSaveStatus(msg) { $("saveStatus").textContent = msg; }
function setSnapshotStatus(msg) { $("snapshotStatus").textContent = msg; }
function setLiveStatus() {
  const el = $("liveStatus");
  if (!el) return;
  el.textContent = `LIVE: ${state.livePreview ? "ON" : "OFF"}`;
  el.setAttribute("aria-pressed", String(!!state.livePreview));
  el.classList.toggle("isOff", !state.livePreview);
}

function setPreviewPageLabel(label) { $("previewPageLabel").textContent = label; }

function setPreviewDevice(device) {
  const d = (device || "desktop").toLowerCase();
  state.previewDevice = (d === "tablet" || d === "mobile") ? d : "desktop";
  const wrap = document.querySelector(".preview__frameWrap");
  if (wrap) wrap.setAttribute("data-device", state.previewDevice);

  document.querySelectorAll("[data-device]").forEach((btn) => {
    btn.classList.toggle("isActive", btn.getAttribute("data-device") === state.previewDevice);
  });
}

function setPanelCollapsed(collapsed, persist = true) {
  const app = document.querySelector(".app");
  if (!app) return;

  app.classList.toggle("isPanelCollapsed", !!collapsed);

  const btn = $("btnTogglePanel");
  if (btn) {
    const isCollapsed = app.classList.contains("isPanelCollapsed");
    btn.textContent = isCollapsed ? "»" : "«";
    btn.setAttribute("aria-expanded", String(!isCollapsed));
    btn.title = isCollapsed ? "Rozwiń panel" : "Zwiń panel";
  }

  if (persist) {
    try { localStorage.setItem(PANEL_COLLAPSED_KEY, collapsed ? "1" : "0"); } catch (e) {}
  }
}

function bindPanelToggle() {
  const btn = $("btnTogglePanel");
  if (!btn) return;

  let initialCollapsed = false;
  try { initialCollapsed = localStorage.getItem(PANEL_COLLAPSED_KEY) === "1"; } catch (e) {}
  setPanelCollapsed(initialCollapsed, false);

  btn.addEventListener("click", () => {
    const app = document.querySelector(".app");
    const isCollapsed = !!(app && app.classList.contains("isPanelCollapsed"));
    setPanelCollapsed(!isCollapsed, true);
  });
}

/* ==========================
   Blocks + presets
========================== */

const BLOCKS = {
  hero:         { label: "HERO (start)", editor: "hero", locked: true },

  about:        { label: "O mnie", editor: "text" },
  gallery:      { label: "Galeria", editor: "gallery" },

  spotify:      { label: "Spotify", editor: "embed_spotify" },
  youtube:      { label: "YouTube", editor: "embed_youtube" },

  events:       { label: "Wydarzenia", editor: "events" },
  exhibitions:  { label: "Wystawy / występy", editor: "events" },

  projects:     { label: "Projekty", editor: "projects" },
  caseStudies:  { label: "Case studies", editor: "projects" },

  services:     { label: "Usługi", editor: "services" },
  clients:      { label: "Klienci", editor: "simpleList" },
  awards:       { label: "Nagrody / wyróżnienia", editor: "simpleList" },

  publications: { label: "Publikacje", editor: "publications" },
  testimonials: { label: "Opinie", editor: "testimonials" },

  epk:          { label: "EPK / Press kit", editor: "epk" },
  newsletter:   { label: "Newsletter / mailing list", editor: "newsletter" },

  contact:      { label: "Kontakt", editor: "contact" },
  social:       { label: "Social media", editor: "social" },
};

const ROLE_PRESETS = {
  musician: ["hero","about","spotify","youtube","events","epk","contact","social"],
  dj: ["hero","about","spotify","youtube","events","epk","contact","social"],
  photographer: ["hero","about","gallery","exhibitions","services","clients","contact","social"],
  visual: ["hero","about","gallery","exhibitions","awards","contact","social"],
  designer: ["hero","about","caseStudies","services","testimonials","clients","contact","social"],
  filmmaker: ["hero","about","youtube","projects","services","clients","contact","social"],
  writer: ["hero","about","publications","events","epk","newsletter","contact","social"],
  performer: ["hero","about","youtube","events","epk","contact","social"],
};

const OPTIONAL_BLOCKS = Object.keys(BLOCKS).filter(id => id !== "hero");

// Block instance helpers (allow duplicates via suffix like "youtube__2")
function baseBlockId(blockId) {
  return String(blockId || "").split("__")[0];
}

function blockSuffix(blockId) {
  const p = String(blockId || "").split("__");
  return p.length > 1 ? p.slice(1).join("__") : "";
}

function getBlockDef(blockId) {
  return BLOCKS[baseBlockId(blockId)] || { label: baseBlockId(blockId) || "Blok", editor: "text" };
}

function isLockedBlock(blockId) {
  return !!getBlockDef(blockId)?.locked;
}

const NON_DUPLICABLE_BASE = new Set(["hero", "gallery", "epk"]);

function canDuplicateBlock(blockId) {
  if (isLockedBlock(blockId)) return false;
  return !NON_DUPLICABLE_BASE.has(baseBlockId(blockId));
}

function duplicateBlock(blockId) {
  if (!canDuplicateBlock(blockId)) return;
  const base = baseBlockId(blockId);
  const newId = makeUniqueId(base);
  const src = state.blocks?.[blockId] || { enabled: true, title: "", data: {} };
  try {
    state.blocks[newId] = JSON.parse(JSON.stringify(src));
  } catch {
    state.blocks[newId] = { enabled: true, title: src.title || "", data: { ...(src.data || {}) } };
  }
  state.blocks[newId].enabled = true;
  // duplicates: hide from header menu by default
  if (base !== "hero") state.blocks[newId].showInHeader = false;

  const i = state.order.indexOf(blockId);
  if (i >= 0) state.order.splice(i + 1, 0, newId);
  else state.order.push(newId);

  state.activeBlockId = newId;
  structureChanged(true);
}

function getBlockDisplayName(blockId) {
  const cfg = state.blocks?.[blockId];
  if (cfg?.title) return cfg.title;
  const def = getBlockDef(blockId);
  const suf = blockSuffix(blockId);
  return def.label + (suf ? ` (${suf})` : "");
}

function makeUniqueId(base) {
  const b = String(base || "").trim();
  if (!b) return "";
  if (b === "hero") return "hero";
  if (!state.blocks[b]) return b;
  let max = 1;
  Object.keys(state.blocks || {}).forEach((k) => {
    if (baseBlockId(k) !== b) return;
    const suf = blockSuffix(k);
    const n = Number(suf);
    if (Number.isFinite(n) && n > max) max = n;
    if (!suf) max = Math.max(max, 1);
  });
  return `${b}__${max + 1}`;
}

/* ==========================
   State
========================== */

const state = {
  exportMode: "single",
  livePreview: true,

  role: "musician",
  theme: "minimalist",
  template: "square",
  accent: "#6d28d9",

  sectionHeadersAlign: "left",
  siteName: "Moje Portfolio",
  useLogoInHeader: false,

  metaTitle: "",
  metaDescription: "",
  previewDevice: "desktop",

  order: [],
  blocks: {},
  activeBlockId: null,
};

/* assets (not stored in localStorage) */
const assets = {
  heroImages: [],          // {dataUrl, alt}[]
  galleryImages: [],       // {dataUrl, alt}[]
  epkPressPhotos: [],      // {dataUrl, alt}[]
  epkFiles: [],            // {name, dataUrl, mime}

  logo: null,              // {dataUrl, mime} | null
  favicon: null,           // {dataUrl, mime} | null
  ogImage: null,           // {dataUrl, mime} | null
};

function imgObj(x) {
  if (!x) return { dataUrl: "", alt: "" };
  if (typeof x === "string") return { dataUrl: x, alt: "" };
  if (typeof x === "object") {
    return {
      dataUrl: String(x.dataUrl || x.url || ""),
      alt: String(x.alt || ""),
    };
  }
  return { dataUrl: String(x), alt: "" };
}

function normalizeAssets() {
  assets.heroImages = (Array.isArray(assets.heroImages) ? assets.heroImages : []).map(imgObj).filter(i => i.dataUrl);
  assets.galleryImages = (Array.isArray(assets.galleryImages) ? assets.galleryImages : []).map(imgObj).filter(i => i.dataUrl);
  assets.epkPressPhotos = (Array.isArray(assets.epkPressPhotos) ? assets.epkPressPhotos : []).map(imgObj).filter(i => i.dataUrl);
}

/* preview (zip) cache */
let zipPreviewFiles = null;     // preview pages (inline css/js)
let zipPreviewCurrent = "index.html";

/* ==========================
   History (undo/redo)
========================== */

let undoStack = [];
let redoStack = [];
let historySuppressed = false;
const HISTORY_LIMIT = 40;

function snapshotStateForHistory() {
  // draft payload data is small; we avoid storing binary assets here.
  return JSON.stringify(buildPayload().data);
}

function updateUndoRedoUi() {
  const u = $("btnUndo");
  const r = $("btnRedo");
  if (u) u.disabled = undoStack.length <= 1;
  if (r) r.disabled = redoStack.length === 0;
}

function pushHistory() {
  if (historySuppressed) return;
  const snap = snapshotStateForHistory();
  if (undoStack.length && undoStack[undoStack.length - 1] === snap) return;
  undoStack.push(snap);
  if (undoStack.length > HISTORY_LIMIT) undoStack.splice(0, undoStack.length - HISTORY_LIMIT);
  redoStack = [];
  updateUndoRedoUi();
}

const pushHistoryDebounced = debounce(pushHistory, 220);

function undo() {
  if (undoStack.length <= 1) return;
  const current = undoStack.pop();
  redoStack.push(current);
  const prev = undoStack[undoStack.length - 1];
  historySuppressed = true;
  try {
    applyPayload({ data: JSON.parse(prev), savedAt: new Date().toISOString() }, false);
    zipPreviewCurrent = "index.html";
    structureChanged(true);
  } catch (e) {
    // if something goes wrong, restore stacks
    undoStack.push(current);
    redoStack.pop();
  } finally {
    historySuppressed = false;
    updateUndoRedoUi();
  }
}

function redo() {
  if (!redoStack.length) return;
  const next = redoStack.pop();
  undoStack.push(next);
  historySuppressed = true;
  try {
    applyPayload({ data: JSON.parse(next), savedAt: new Date().toISOString() }, false);
    zipPreviewCurrent = "index.html";
    structureChanged(true);
  } catch (e) {
    // revert
    redoStack.push(undoStack.pop());
  } finally {
    historySuppressed = false;
    updateUndoRedoUi();
  }
}

/* ==========================
   Storage (draft + snapshot)
========================== */

function buildPayload() {
  const data = {
    exportMode: state.exportMode,
    livePreview: state.livePreview,
    role: state.role,
    theme: state.theme,
    template: state.template,
    accent: state.accent,
    sectionHeadersAlign: state.sectionHeadersAlign,
    siteName: state.siteName,
    useLogoInHeader: state.useLogoInHeader,

    metaTitle: state.metaTitle,
    metaDescription: state.metaDescription,
    previewDevice: state.previewDevice,
    order: state.order,
    blocks: state.blocks,
    activeBlockId: state.activeBlockId,
  };
  return { data, savedAt: new Date().toISOString() };
}

function applyPayload(payload, setStatusText = true) {
  const d = payload?.data;
  if (!d) return false;

  state.exportMode = d.exportMode ?? state.exportMode;
  state.livePreview = d.livePreview ?? state.livePreview;
  state.role = d.role ?? state.role;
  state.theme = d.theme ?? state.theme;
  state.template = d.template ?? state.template;
  state.accent = d.accent ?? state.accent;
  state.sectionHeadersAlign = d.sectionHeadersAlign ?? state.sectionHeadersAlign;
  state.siteName = d.siteName ?? state.siteName;
  state.useLogoInHeader = d.useLogoInHeader ?? state.useLogoInHeader;

  state.metaTitle = d.metaTitle ?? state.metaTitle;
  state.metaDescription = d.metaDescription ?? state.metaDescription;
  state.previewDevice = d.previewDevice ?? state.previewDevice;

  state.order = Array.isArray(d.order) ? d.order : state.order;
  state.blocks = d.blocks ?? state.blocks;
  state.activeBlockId = d.activeBlockId ?? state.activeBlockId;

  $("exportMode").value = state.exportMode;
  $("role").value = state.role;
  $("theme").value = state.theme;
  $("template").value = state.template;
  $("accent").value = state.accent;
  $("sectionHeadersAlign").value = state.sectionHeadersAlign;
  $("siteName").value = state.siteName;
  if ($("useLogoInHeader")) $("useLogoInHeader").checked = !!state.useLogoInHeader;

  if ($("metaTitle")) $("metaTitle").value = state.metaTitle;
  if ($("metaDescription")) $("metaDescription").value = state.metaDescription;

  setPreviewDevice(state.previewDevice || "desktop");

  hardLockHeroFirst();
  setLiveStatus();

  if (setStatusText) {
    const savedAt = payload?.savedAt ? new Date(payload.savedAt) : null;
    setSaveStatus(savedAt ? `Zapis: wczytano (${savedAt.toLocaleTimeString()})` : "Zapis: wczytano");
  }
  return true;
}

function saveDraft() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPayload()));
    setSaveStatus(`Zapis: ${new Date().toLocaleTimeString()}`);
  } catch {
    setSaveStatus("Zapis: błąd (brak miejsca?)");
  }
}

function loadDraft() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try { return applyPayload(JSON.parse(raw), true); } catch { return false; }
}

function resetDraft() {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

function hasSnapshot() {
  return !!localStorage.getItem(SNAPSHOT_KEY);
}

function updateSnapshotPill() {
  const has = hasSnapshot();
  const btnLoad = $("btnLoadSnapshot");
  if (btnLoad) btnLoad.disabled = !has;
  setSnapshotStatus(has ? "Snapshot: jest" : "Snapshot: brak");
}

function saveSnapshot() {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(buildPayload()));
    updateSnapshotPill();
    setSnapshotStatus("Snapshot: zapisany");
  } catch {
    setSnapshotStatus("Snapshot: błąd");
  }
}

function loadSnapshot() {
  const raw = localStorage.getItem(SNAPSHOT_KEY);
  if (!raw) return;
  try {
    applyPayload(JSON.parse(raw), false);
    zipPreviewCurrent = "index.html";
    structureChanged(true);
    setSnapshotStatus("Snapshot: wczytany");
    updateSnapshotPill();
  } catch {
    setSnapshotStatus("Snapshot: błąd");
  }
}

function clearSnapshot() {
  localStorage.removeItem(SNAPSHOT_KEY);
  updateSnapshotPill();
  setSnapshotStatus("Snapshot: usunięty");
}

// Generate example content (for client preview)
function _svgPlaceholderDataUrl(label, w = 1400, h = 900) {
  const accent = String(state.accent || "#6d28d9");
  const t = escapeHtml(label || "Obraz");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#111" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect x="40" y="40" width="${w-80}" height="${h-80}" fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.25)"/>
  <text x="70" y="120" fill="#fff" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="46" font-weight="900">${t}</text>
  <text x="70" y="170" fill="rgba(255,255,255,0.82)" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="22" font-weight="700">Przykładowy obraz — podmień na własny</text>
</svg>`;

  // base64 (so ZIP export can pack it to /assets)
  const utf8 = encodeURIComponent(svg).replace(/%([0-9A-F]{2})/g, (_, p) => String.fromCharCode(parseInt(p, 16)));
  return `data:image/svg+xml;base64,${btoa(utf8)}`;
}

function generateSampleData() {
  const ok = confirm("Wygenerować przykładowe dane? Nadpisze bieżący szkic (snapshot zostaje).");
  if (!ok) return;

  const role = ($("role")?.value || state.role || "musician");
  const preset = (ROLE_PRESETS[role] || ROLE_PRESETS.musician).slice();

  // dla czytelnego demo dokładamy galerię (po 'about' jeśli istnieje)
  if (!preset.includes("gallery")) {
    const idx = preset.indexOf("about");
    if (idx >= 0) preset.splice(idx + 1, 0, "gallery");
    else preset.splice(1, 0, "gallery");
  }

  // unique + HERO first
  const seen = new Set();
  const order = [];
  for (const id of preset) {
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(id);
  }
  const finalOrder = order.filter(x => x !== "hero");
  finalOrder.unshift("hero");

  const siteName = "Przykładowy Artysta";

  const blocks = {};
  const setBlock = (id, title, data = {}) => {
    blocks[id] = { enabled: true, title: title || (BLOCKS[id]?.label || id), data };
  };

  // HERO
  setBlock("hero", BLOCKS.hero.label, {
    headline: siteName,
    subheadline: "Nowoczesny rock / alternatywa. Single, klipy, koncerty.",
    primaryCtaText: "Zobacz więcej",
    primaryCtaTarget: "auto",
    primaryCtaUrl: "",
  });

  // CONTENT
  for (const id of finalOrder) {
    if (id === "hero") continue;

    const ed = BLOCKS[id]?.editor;

    if (ed === "text") {
      setBlock(id, id === "about" ? "O nas" : (BLOCKS[id]?.label || id), {
        text: "Krótko: prawdziwe granie, bez udawania.\n\nTu wstaw 2–3 zdania o sobie: styl, inspiracje, osiągnięcia.\n\nNa dole zostawiliśmy kontakt i social media."
      });
      continue;
    }

    if (ed === "gallery") {
      setBlock(id, "Galeria", { layout: "grid" });
      continue;
    }

    if (ed === "embed_spotify") {
      setBlock(id, "Muzyka", {
        items: [
          { url: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M" },
          { url: "https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd" }
        ]
      });
      continue;
    }

    if (ed === "embed_youtube") {
      setBlock(id, "Wideo", {
        items: [
          { url: "https://youtu.be/dQw4w9WgXcQ" },
          { url: "https://youtu.be/9bZkp7q19f0" }
        ]
      });
      continue;
    }

    if (ed === "events") {
      setBlock(id, id === "exhibitions" ? "Występy" : "Wydarzenia", {
        items: [
          { date: "17.01.2026", city: "Gdańsk", place: "Bramie Nizinnej", link: "https://example.com" },
          { date: "24.01.2026", city: "Warszawa", place: "Klub (przykład)", link: "https://example.com" },
          { date: "01.02.2026", city: "Kraków", place: "Scena (przykład)", link: "https://example.com" }
        ]
      });
      continue;
    }

    if (ed === "projects") {
      setBlock(id, id === "caseStudies" ? "Case studies" : "Projekty", {
        items: [
          { title: "Single: 'Przebudzenie'", desc: "Opis w 2 zdaniach. Co to za projekt i co jest w nim mocne.", tags: "single • 2026", link: "https://example.com" },
          { title: "Teledysk", desc: "Klip, klimat, reżyseria.\nDodaj link do YouTube.", tags: "video", link: "https://example.com" },
          { title: "Sesja zdjęciowa", desc: "3–4 zdjęcia promocyjne do pobrania w EPK.", tags: "press", link: "https://example.com" }
        ]
      });
      continue;
    }

    if (ed === "services") {
      setBlock(id, "Usługi", {
        items: [
          { name: "Koncert klubowy", price: "od 2000 zł", desc: "Czas, skład, wymagania techniczne." },
          { name: "Event firmowy", price: "wycena", desc: "Dopasowanie setu i czasu trwania." },
          { name: "Współpraca", price: "", desc: "Feat, support, gościnny udział." }
        ]
      });
      continue;
    }

    if (ed === "simpleList") {
      const title = id === "clients" ? "Klienci" : (id === "awards" ? "Nagrody" : (BLOCKS[id]?.label || id));
      setBlock(id, title, {
        items: [
          { text: "Przykładowa pozycja #1", link: "https://example.com" },
          { text: "Przykładowa pozycja #2", link: "https://example.com" },
          { text: "Przykładowa pozycja #3", link: "https://example.com" }
        ]
      });
      continue;
    }

    if (ed === "publications") {
      setBlock(id, "Publikacje", {
        items: [
          { title: "Wywiad", where: "Portal muzyczny", year: "2026", url: "https://example.com" },
          { title: "Recenzja koncertu", where: "Magazyn", year: "2026", url: "https://example.com" }
        ]
      });
      continue;
    }

    if (ed === "testimonials") {
      setBlock(id, "Opinie", {
        items: [
          { quote: "Świetna energia na żywo i bardzo dobry kontakt z publiką.", who: "Organizator", link: "https://example.com" },
          { quote: "Nowocześnie, głośno i z emocją — tak ma być.", who: "Słuchacz", link: "https://example.com" }
        ]
      });
      continue;
    }

    if (ed === "epk") {
      setBlock(id, "EPK / Press kit", {
        shortBio: "Krótka notka (5–7 zdań): skład, gatunek, najważniejsze osiągnięcia, trasa.",
        pressLinks: [
          { name: "Recenzja", url: "https://example.com" },
          { name: "Wywiad", url: "https://example.com" }
        ],
        downloadLinks: [
          { name: "Stage plot (PDF)", url: "https://example.com" },
          { name: "Rider techniczny", url: "https://example.com" }
        ]
      });
      continue;
    }

    if (ed === "newsletter") {
      setBlock(id, "Newsletter", {
        title: "Bądź na bieżąco",
        desc: "Nowe utwory, koncerty i materiały zza kulis.",
        btn: "Zapisz się",
        url: "https://example.com"
      });
      continue;
    }

    if (ed === "contact") {
      setBlock(id, "Kontakt", {
        email: "kontakt@przyklad.pl",
        phone: "+48 600 000 000",
        city: "Kraków",
        cta: "Napisz maila"
      });
      continue;
    }

    if (ed === "social") {
      setBlock(id, "Social media", {
        items: [
          { name: "Instagram", url: "https://instagram.com" },
          { name: "YouTube", url: "https://youtube.com" },
          { name: "Spotify", url: "https://open.spotify.com" }
        ]
      });
      continue;
    }

    // fallback
    setBlock(id, BLOCKS[id]?.label || id, {});
  }

  // assets (demo)
  assets.heroImages = [
    { dataUrl: _svgPlaceholderDataUrl("HERO — tło", 1600, 1000), alt: "HERO — tło" },
    { dataUrl: _svgPlaceholderDataUrl("HERO — zdjęcie 1", 900, 900), alt: "HERO — zdjęcie 1" },
    { dataUrl: _svgPlaceholderDataUrl("HERO — zdjęcie 2", 900, 900), alt: "HERO — zdjęcie 2" },
  ];

  assets.galleryImages = preset.includes('gallery') ? [
    { dataUrl: _svgPlaceholderDataUrl("Galeria 01", 900, 900), alt: "Galeria 01" },
    { dataUrl: _svgPlaceholderDataUrl("Galeria 02", 900, 900), alt: "Galeria 02" },
    { dataUrl: _svgPlaceholderDataUrl("Galeria 03", 900, 900), alt: "Galeria 03" },
    { dataUrl: _svgPlaceholderDataUrl("Galeria 04", 900, 900), alt: "Galeria 04" },
    { dataUrl: _svgPlaceholderDataUrl("Galeria 05", 900, 900), alt: "Galeria 05" },
    { dataUrl: _svgPlaceholderDataUrl("Galeria 06", 900, 900), alt: "Galeria 06" },
    { dataUrl: _svgPlaceholderDataUrl("Galeria 07", 900, 900), alt: "Galeria 07" },
    { dataUrl: _svgPlaceholderDataUrl("Galeria 08", 900, 900), alt: "Galeria 08" },
  ] : [];

  assets.epkPressPhotos = preset.includes('epk') ? [
    { dataUrl: _svgPlaceholderDataUrl("Press photo 01", 1200, 800), alt: "Press photo 01" },
    { dataUrl: _svgPlaceholderDataUrl("Press photo 02", 1200, 800), alt: "Press photo 02" },
    { dataUrl: _svgPlaceholderDataUrl("Press photo 03", 1200, 800), alt: "Press photo 03" },
  ] : [];

  assets.epkFiles = [];

  const payload = {
    data: {
      exportMode: $("exportMode")?.value || state.exportMode,
      livePreview: true,
      role,
      theme: $("theme")?.value || state.theme,
      template: $("template")?.value || state.template,
      accent: $("accent")?.value || state.accent,
      sectionHeadersAlign: $("sectionHeadersAlign")?.value || state.sectionHeadersAlign,
      siteName,
      order: finalOrder,
      blocks,
      activeBlockId: "hero",
    },
    savedAt: new Date().toISOString()
  };

  applyPayload(payload, true);
  zipPreviewCurrent = "index.html";
  structureChanged(true);
}

/* ==========================
   Defaults + role switching
========================== */

function ensureBlock(blockId) {
  const isHero = baseBlockId(blockId) === "hero";
  const isDup = !!blockSuffix(blockId);

  if (!state.blocks[blockId]) {
    // new block
    state.blocks[blockId] = {
      enabled: true,
      title: "",
      data: {},
      // default: hero hidden in menu; duplicates hidden in menu
      showInHeader: (!isHero && !isDup),
      // default: show H2 title for normal sections
      showHeading: (!isHero)
    };
  } else {
    // migrate older drafts
    if (typeof state.blocks[blockId].showInHeader === "undefined") {
      state.blocks[blockId].showInHeader = (!isHero && !isDup);
    }
    if (typeof state.blocks[blockId].showHeading === "undefined") {
      state.blocks[blockId].showHeading = (!isHero);
    }
  }
  return state.blocks[blockId];
}


function hardLockHeroFirst() {
  ensureBlock("hero").enabled = true;
  state.order = state.order.filter(id => id !== "hero");
  state.order.unshift("hero");
}

function applyRolePreset(role) {
  const preset = ROLE_PRESETS[role] || ROLE_PRESETS.musician;

  // enable only the preset base blocks (no duplicates)
  preset.forEach(id => ensureBlock(id).enabled = true);
  Object.keys(state.blocks).forEach((id) => {
    state.blocks[id].enabled = preset.includes(id);
  });

  state.role = role;
  state.order = [...preset];
  hardLockHeroFirst();

  state.activeBlockId = state.order.find(id => state.blocks[id]?.enabled) || "hero";

  const hero = ensureBlock("hero");
  hero.data.headline = hero.data.headline ?? "Nowa strona artysty";
  hero.data.subheadline = hero.data.subheadline ?? "Pokaż prace, materiały i kontakt. Estetycznie i bez korpo.";
  hero.data.primaryCtaText = hero.data.primaryCtaText ?? "Zobacz";
  hero.data.primaryCtaTarget = hero.data.primaryCtaTarget ?? "auto"; // auto | contact | custom
  hero.data.primaryCtaUrl = hero.data.primaryCtaUrl ?? "";
}

/* ==========================
   Structure changes vs Content changes (IMPORTANT for focus)
========================== */

function syncStateFromSettingsInputs() {
  state.exportMode = $("exportMode").value;
  state.role = $("role").value;
  state.theme = $("theme").value;
  state.template = $("template").value;
  state.accent = $("accent").value;
  state.sectionHeadersAlign = $("sectionHeadersAlign").value;
  state.siteName = $("siteName").value;
  if ($("useLogoInHeader")) state.useLogoInHeader = $("useLogoInHeader").checked;

  if ($("metaTitle")) state.metaTitle = $("metaTitle").value;
  if ($("metaDescription")) state.metaDescription = $("metaDescription").value;

  setLiveStatus();
}

function collectIssues() {
  const issues = [];

  // SEO (soft warnings)
  if (!String(state.metaTitle || "").trim()) issues.push("SEO: brak tytułu (meta title).");
  if (!String(state.metaDescription || "").trim()) issues.push("SEO: brak opisu (meta description).");

  // Contact
  for (const id of enabledBlocksInOrder()) {
    if (baseBlockId(id) !== "contact") continue;
    const c = state.blocks[id]?.data || {};
    const email = String(c.email || "").trim();
    const phone = String(c.phone || "").trim();
    if (!email && !phone) issues.push("Kontakt: brak email i telefonu.");
  }

  // Embeds
  for (const id of enabledBlocksInOrder()) {
    const t = baseBlockId(id);
    const d = state.blocks[id]?.data || {};
    if (t === "spotify") {
      const items = Array.isArray(d.items) ? d.items : [];
      for (const it of items) {
        const u = String(it.url || "").trim();
        if (u && !normalizeSpotify(u)) issues.push("Spotify: nie rozpoznaję jednego z linków (wklej pełny link lub iframe)." );
      }
    }
    if (t === "youtube") {
      const items = Array.isArray(d.items) ? d.items : [];
      for (const it of items) {
        const u = String(it.url || "").trim();
        if (u && !normalizeYouTube(u)) issues.push("YouTube: nie rozpoznaję jednego z linków (wklej pełny link lub iframe)." );
      }
    }
  }

  return issues;
}

function updateIssuesPill() {
  const el = $("issuesPill");
  if (!el) return;
  const issues = collectIssues();
  el.textContent = `Problemy: ${issues.length}`;
  el.dataset.count = String(issues.length);
}

let _issuesModalEl = null;

function ensureIssuesModal() {
  if (_issuesModalEl) return _issuesModalEl;

  const wrap = document.createElement('div');
  wrap.className = 'issuesModal';
  wrap.innerHTML = `
    <div class="issuesModal__backdrop" data-issues-close="1"></div>
    <div class="issuesModal__card" role="dialog" aria-modal="true" aria-label="Problemy i ostrzeżenia">
      <div class="issuesModal__head">
        <strong>Problemy i ostrzeżenia</strong>
        <button type="button" class="iconBtn" data-issues-close="1" aria-label="Zamknij">✕</button>
      </div>
      <div class="issuesModal__body">
        <div class="issuesModal__hint">To są podpowiedzi — strona może działać mimo ostrzeżeń.</div>
        <ul class="issuesModal__list" id="issuesModalList"></ul>
      </div>
    </div>
  `;

  wrap.addEventListener('click', (e) => {
    const close = e.target.closest('[data-issues-close]');
    if (close) closeIssuesModal();
  });

  document.addEventListener('keydown', (e) => {
    if (!_issuesModalEl || !_issuesModalEl.classList.contains('isOpen')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeIssuesModal();
    }
  }, true);

  document.body.appendChild(wrap);
  _issuesModalEl = wrap;
  return wrap;
}

function openIssuesModal() {
  const modal = ensureIssuesModal();
  const list = modal.querySelector('#issuesModalList');
  const issues = collectIssues();

  list.innerHTML = issues.length
    ? issues.map((t) => `<li>${escapeHtml(t)}</li>`).join('')
    : `<li>Brak problemów 🎉</li>`;

  modal.classList.add('isOpen');
}

function closeIssuesModal() {
  if (!_issuesModalEl) return;
  _issuesModalEl.classList.remove('isOpen');
}

const contentChanged = debounce(() => {
  pushHistoryDebounced();
  saveDraft();
  updateIssuesPill();
  if (state.livePreview) rebuildPreview(true);
}, 120);

function structureChanged(forcePreview = false) {
  syncStateFromSettingsInputs();
  hardLockHeroFirst();
  renderBlocksList();
  renderAddBlockSelect();
  renderBlockEditor();
  pushHistory();
  saveDraft();
  updateIssuesPill();

  if (state.livePreview || forcePreview) rebuildPreview(true);
}

/* ==========================
   Reorder / enable / add
========================== */

function moveBlock(blockId, dir) {
  if (isLockedBlock(blockId)) return;
  const idx = state.order.indexOf(blockId);
  if (idx < 0) return;
  const newIdx = idx + dir;
  if (newIdx < 1) return;
  if (newIdx >= state.order.length) return;

  const arr = [...state.order];
  const [item] = arr.splice(idx, 1);
  arr.splice(newIdx, 0, item);
  state.order = arr;
  hardLockHeroFirst();
}

function toggleBlock(blockId, enabled) {
  if (BLOCKS[blockId]?.locked) return;
  ensureBlock(blockId).enabled = enabled;

  if (enabled && !state.order.includes(blockId)) state.order.push(blockId);
  if (!enabled && state.activeBlockId === blockId) {
    const next = state.order.find(id => state.blocks[id]?.enabled);
    state.activeBlockId = next || "hero";
  }
  hardLockHeroFirst();
}

function removeBlockFromPage(blockId) {
  if (BLOCKS[blockId]?.locked) return;
  state.order = state.order.filter(x => x !== blockId);
  ensureBlock(blockId).enabled = false;
  if (state.activeBlockId === blockId) {
    const next = state.order.find(id => state.blocks[id]?.enabled);
    state.activeBlockId = next || "hero";
  }
  hardLockHeroFirst();
}

/* ==========================
   Embed normalization
========================== */

function extractIframeSrc(input) {
  const m = String(input || "").match(/src\s*=\s*"(.*?)"/i);
  return m ? m[1] : "";
}

function clampNum(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, x));
}

function tryParseUrl(input) {
  const s = String(input || "").trim();
  if (!s) return null;
  // If user pasted something like "youtube.com/watch?v=..." without protocol
  // try adding https://.
  try { return new URL(s); } catch (e) {}
  try { return new URL(`https://${s.replace(/^\/\//, "")}`); } catch (e) {}
  return null;
}

function pad2(n) {
  const x = String(n || "");
  return x.length === 1 ? `0${x}` : x;
}

function toIsoDateLoose(input) {
  const s = String(input || "").trim();
  if (!s) return "";
  // yyyy-mm-dd
  const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;
  // dd.mm.yyyy or dd/mm/yyyy or dd-mm-yyyy
  const m2 = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (m2) {
    const d = pad2(m2[1]);
    const mo = pad2(m2[2]);
    const y = m2[3];
    return `${y}-${mo}-${d}`;
  }
  // yyyy.mm.dd
  const m3 = s.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/);
  if (m3) {
    const y = m3[1];
    const mo = pad2(m3[2]);
    const d = pad2(m3[3]);
    return `${y}-${mo}-${d}`;
  }
  return "";
}

function formatDatePL(input) {
  const iso = toIsoDateLoose(input);
  if (!iso) return String(input || "").trim();
  const parts = iso.split("-");
  if (parts.length !== 3) return String(input || "").trim();
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}


function parseYouTubeTimeToSeconds(t) {
  const raw = String(t || "").trim();
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) return Number(raw);
  const s = raw.replace(/^\?t=/, "").replace(/\s+/g, "");
  // Formats: 90s, 1m30s, 1h2m3s
  const m = s.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (m && (m[1] || m[2] || m[3])) {
    const h = Number(m[1] || 0);
    const mm = Number(m[2] || 0);
    const ss = Number(m[3] || 0);
    return h * 3600 + mm * 60 + ss;
  }
  // Fallback: sometimes "1m30" (no trailing s)
  const m2 = s.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+))$/i);
  if (m2 && (m2[1] || m2[2] || m2[3])) {
    const h = Number(m2[1] || 0);
    const mm = Number(m2[2] || 0);
    const ss = Number(m2[3] || 0);
    return h * 3600 + mm * 60 + ss;
  }
  return 0;
}

function parseYouTube(input) {
  const s0 = String(input || "").trim();
  if (!s0) return { embedUrl: "", openUrl: "", kind: "" };

  // iframe pasted
  if (s0.includes("<iframe")) {
    const src = extractIframeSrc(s0);
    return src ? parseYouTube(src) : { embedUrl: "", openUrl: "", kind: "" };
  }

  const u = tryParseUrl(s0);
  // If it's not a URL at all, give up.
  if (!u) return { embedUrl: "", openUrl: "", kind: "" };

  const host = (u.hostname || "").toLowerCase();
  const path = u.pathname || "";
  const params = u.searchParams;

  const listId = params.get("list") || "";
  const vParam = params.get("v") || "";

  let videoId = "";
  let kind = "";

  if (host === "youtu.be") {
    // /ID
    const seg = path.split("/").filter(Boolean)[0] || "";
    videoId = seg;
    kind = "video";
  } else if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    if (path.startsWith("/watch")) {
      if (vParam) { videoId = vParam; kind = "video"; }
    } else if (path.startsWith("/shorts/")) {
      videoId = path.split("/")[2] || "";
      kind = "video";
    } else if (path.startsWith("/live/")) {
      videoId = path.split("/")[2] || "";
      kind = "video";
    } else if (path.startsWith("/embed/")) {
      videoId = path.split("/")[2] || "";
      kind = (videoId === "videoseries") ? "playlist" : "video";
    } else if (path.startsWith("/v/")) {
      videoId = path.split("/")[2] || "";
      kind = "video";
    } else if (path.startsWith("/playlist")) {
      kind = "playlist";
    }

    // If there is a list but no video id, treat as playlist.
    if (!videoId && listId) kind = "playlist";
  }

  // sanitize id shapes a bit (avoid injecting garbage into src)
  const safeId = (x) => String(x || "").match(/^[a-zA-Z0-9_-]{6,}$/) ? String(x) : "";
  videoId = safeId(videoId);
  const safeList = safeId(listId);

  const start = parseYouTubeTimeToSeconds(params.get("t") || params.get("start") || "");

  if (kind === "playlist" && safeList) {
    const openUrl = `https://www.youtube.com/playlist?list=${safeList}`;
    let embedUrl = `https://www.youtube-nocookie.com/embed/videoseries?list=${safeList}`;
    if (start > 0) embedUrl += `&start=${start}`;
    return { embedUrl, openUrl, kind: "playlist" };
  }

  if (videoId) {
    const openUrl = `https://www.youtube.com/watch?v=${videoId}`;
    let embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;
    const qs = [];
    if (safeList) qs.push(`list=${safeList}`);
    if (start > 0) qs.push(`start=${start}`);
    if (qs.length) embedUrl += `?${qs.join("&")}`;
    return { embedUrl, openUrl, kind: "video" };
  }

  // Could be channel / handle / search etc. Not embeddable.
  return { embedUrl: "", openUrl: u.toString(), kind: "link" };
}

function parseSpotify(input) {
  const s0 = String(input || "").trim();
  if (!s0) return { embedUrl: "", openUrl: "", kind: "" };

  if (s0.includes("<iframe")) {
    const src = extractIframeSrc(s0);
    return src ? parseSpotify(src) : { embedUrl: "", openUrl: "", kind: "" };
  }

  // spotify URI: spotify:track:ID etc
  if (s0.startsWith("spotify:")) {
    const parts = s0.split(":").filter(Boolean);
    const type = parts[1] || "";
    const id = parts[2] || "";
    if (type && id) {
      const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
      const openUrl = `https://open.spotify.com/${type}/${id}`;
      return { embedUrl, openUrl, kind: type };
    }
  }

  const u = tryParseUrl(s0);
  if (!u) return { embedUrl: "", openUrl: "", kind: "" };
  const host = (u.hostname || "").toLowerCase();
  const path = u.pathname || "";

  // Short links like spoti.fi usually require a redirect we can't reliably follow in pure front-end (CORS).
  if (host === "spoti.fi") {
    return { embedUrl: "", openUrl: u.toString(), kind: "short" };
  }

  if (host.endsWith("spotify.com")) {
    // Already embed
    if (path.startsWith("/embed/")) {
      const embedUrl = `https://open.spotify.com${path}`;
      const openUrl = `https://open.spotify.com${path.replace("/embed/", "/")}`;
      return { embedUrl, openUrl, kind: "embed" };
    }

    // Normal open.spotify.com/{type}/{id}
    const segs = path.split("/").filter(Boolean);
    const type = segs[0] || "";
    const id = segs[1] || "";
    const safe = (x) => String(x || "").match(/^[a-zA-Z0-9]+$/) ? String(x) : "";
    if (type && id && safe(id)) {
      const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
      const openUrl = `https://open.spotify.com/${type}/${id}`;
      return { embedUrl, openUrl, kind: type };
    }

    return { embedUrl: "", openUrl: u.toString(), kind: "link" };
  }

  return { embedUrl: "", openUrl: u.toString(), kind: "link" };
}

function normalizeSpotify(input) {
  return parseSpotify(input).embedUrl || "";
}

function normalizeYouTube(input) {
  return parseYouTube(input).embedUrl || "";
}

/* ==========================
   Files / dataURL helpers
========================== */

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) return resolve("");
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => resolve("");
    r.readAsDataURL(file);
  });
}

async function readMultipleImages(fileList) {
  const files = Array.from(fileList || []);
  const out = [];
  for (const f of files) {
    const dataUrl = await readFileAsDataUrl(f);
    if (!dataUrl) continue;
    const alt = String(f?.name || "")
      .replace(/\.[^/.]+$/, "")
      .replace(/[\-_]+/g, " ")
      .trim();
    out.push({ dataUrl, alt });
  }
  return out;
}

function parseDataUrl(dataUrl) {
  const m = String(dataUrl || "").match(/^data:(.*?);base64,(.*)$/);
  if (!m) return null;
  return { mime: m[1], b64: m[2] };
}

function guessExtFromMime(mime) {
  if (!mime) return "bin";
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("zip")) return "zip";
  return "bin";
}

function cssUrl(dataUrl) {
  // minimal safe for quotes
  return String(dataUrl || "").replaceAll("'", "%27");
}

/* ==========================
   UI rendering
========================== */

function enabledBlocksInOrder() {
  return state.order.filter(id => state.blocks[id]?.enabled);
}



function renderBlocksList() {
  const host = $("blocksList");
  host.innerHTML = "";

  state.order.forEach((id, idx) => {
    ensureBlock(id);
    const cfg = state.blocks[id];
    const isActive = state.activeBlockId === id;
    const def = getBlockDef(id);
    const locked = isLockedBlock(id);
    const suf = blockSuffix(id);
    const label = `${def.label}${suf ? ` (${suf})` : ""}`;
    const canDup = canDuplicateBlock(id);

    const el = document.createElement("div");
    el.className = `blockItem ${isActive ? "blockItem--active" : ""}`;

    const checkboxHtml = locked
      ? `<span class="pill" style="padding:4px 10px; font-size:11px;">STAŁE</span>`
      : `<div class="tog"><input type="checkbox" data-toggle="${id}" ${cfg.enabled ? "checked" : ""} /></div>`;

    el.innerHTML = `
      <div class="blockLabel" data-select="${id}">
        ${checkboxHtml}
        <div>
          <strong>${escapeHtml(label)}</strong><br/>
          <small data-small="${id}">${escapeHtml(cfg.title || "")}</small>
        </div>
      </div>

      <div class="blockActions">
        <button class="iconBtn" data-up="${id}" ${locked || idx <= 1 ? "disabled" : ""} title="Góra">↑</button>
        <button class="iconBtn" data-down="${id}" ${locked || idx === state.order.length - 1 ? "disabled" : ""} title="Dół">↓</button>
        <button class="iconBtn" data-dup="${id}" ${!canDup ? "disabled" : ""} title="Duplikuj">⧉</button>
        <button class="iconBtn" data-remove="${id}" ${locked ? "disabled" : ""} title="Usuń z układu">✕</button>
      </div>
    `;

    host.appendChild(el);
  });

  host.querySelectorAll("[data-select]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.activeBlockId = btn.getAttribute("data-select");
      renderBlocksList();
      renderBlockEditor();
    });
  });

  host.querySelectorAll("[data-toggle]").forEach(chk => {
    chk.addEventListener("change", () => {
      const id = chk.getAttribute("data-toggle");
      toggleBlock(id, chk.checked);
      structureChanged();
    });
  });

  host.querySelectorAll("[data-up]").forEach(b => {
    b.addEventListener("click", () => {
      moveBlock(b.getAttribute("data-up"), -1);
      structureChanged();
    });
  });

  host.querySelectorAll("[data-down]").forEach(b => {
    b.addEventListener("click", () => {
      moveBlock(b.getAttribute("data-down"), +1);
      structureChanged();
    });
  });

  host.querySelectorAll("[data-dup]").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-dup");
      duplicateBlock(id);
    });
  });

  host.querySelectorAll("[data-remove]").forEach(b => {
    b.addEventListener("click", () => {
      removeBlockFromPage(b.getAttribute("data-remove"));
      structureChanged();
    });
  });
}

function renderAddBlockSelect() {
  const sel = $("addBlockSelect");
  const existing = new Set(state.order);
  const options = OPTIONAL_BLOCKS
    .filter(id => !existing.has(id))
    .map(id => `<option value="${id}">${escapeHtml(BLOCKS[id].label)}</option>`)
    .join("");

  sel.innerHTML = options || `<option value="">Brak bloków do dodania</option>`;
  sel.disabled = !options;
  $("addBlockBtn").disabled = !options;
}

function fieldRow(label, inputHtml, hint = "") {
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      ${inputHtml}
      ${hint ? `<div class="hint" style="margin-top:6px;">${hint}</div>` : ""}
    </label>
  `;
}

function setByPath(rootObj, path, value) {
  const parts = String(path).split(".");
  let obj = rootObj;

  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    const next = parts[i + 1];
    const isIndex = /^\d+$/.test(next);

    if (!(k in obj)) obj[k] = isIndex ? [] : {};
    obj = obj[k];
  }

  const last = parts[parts.length - 1];
  if (/^\d+$/.test(last)) obj[Number(last)] = value;
  else obj[last] = value;
}

function listEditor(items, listKey, label, schema) {
  const cards = items.map((it, idx) => {
    const fieldsHtml = schema.map(f => {
      const path = `${listKey}.${idx}.${f.key}`;
      if (f.type === "textarea") {
        return `
          <label class="field" style="margin:0;">
            <span>${escapeHtml(f.label)}</span>
            <textarea data-path="${escapeHtml(path)}" rows="3" placeholder="${escapeHtml(f.placeholder || "")}">${escapeHtml(it[f.key] || "")}</textarea>
          </label>`;
      }
      return `
        <label class="field" style="margin:0;">
          <span>${escapeHtml(f.label)}</span>
          <input data-path="${escapeHtml(path)}" type="${escapeHtml(f.type || "text")}" value="${escapeHtml(it[f.key] || "")}" placeholder="${escapeHtml(f.placeholder || "")}"/>
        </label>`;
    }).join("");

    return `
      <div class="itemCard" data-list="${escapeHtml(listKey)}" data-idx="${idx}">
        <div class="itemCardTop">
          <strong>${escapeHtml(label)} #${idx+1}</strong>
          <button class="btnSmall" type="button" data-remove-item="${escapeHtml(listKey)}" data-idx="${idx}">Usuń</button>
        </div>
        <div class="itemGrid2">${fieldsHtml}</div>
      </div>
    `;
  }).join("");

  return `
    <div class="itemList">
      ${cards || `<div class="hint">Brak pozycji. Dodaj pierwszą.</div>`}
      <div class="itemActions">
        <button class="btnSmall" type="button" data-add-item="${escapeHtml(listKey)}">+ Dodaj</button>
      </div>
    </div>
  `;
}

function updateBlockSmallTitle(blockId, title) {
  const small = document.querySelector(`[data-small="${blockId}"]`);
  if (small) small.textContent = title || "";
}

/* ==========================
   Block editor (NO rerender per keystroke)
========================== */

function renderBlockEditor() {
  const host = $("blockEditor");
  const id = state.activeBlockId;

  if (!id || !state.blocks[id]) {
    host.innerHTML = `<div class="emptyEditor">Wybierz blok z listy powyżej.</div>`;
    return;
  }

  const cfg = ensureBlock(id);
  const def = getBlockDef(id);

  let common = fieldRow(
    "Tytuł sekcji",
    `<input id="ed_title" type="text" value="${escapeHtml(cfg.title || "")}" />`,
    def.locked ? "HERO jest stały i zawsze na górze." : "Tytuł w menu i nagłówku sekcji."
  );

  if (!def.locked) {
    common += `
      <div class="grid2">
        <label class="toggleRow"><input id="ed_showInHeader" type="checkbox" ${cfg.showInHeader === false ? "" : "checked"} /> <span class="toggleText">Pokaż w menu</span></label>
        <label class="toggleRow"><input id="ed_showHeading" type="checkbox" ${cfg.showHeading === false ? "" : "checked"} /> <span class="toggleText">Pokaż nagłówek</span></label>
      </div>
      <div class="hint" style="margin-top:6px;">
        „Pokaż w menu” decyduje, czy sekcja będzie widoczna w nagłówku strony. „Pokaż nagłówek” steruje H2 w treści sekcji.
      </div>
    `;
  }

  let specific = "";

  if (def.editor === "hero") {
    const h = cfg.data;
    const heroInfo = assets.heroImages.length
      ? `<div class="hint">HERO zdjęcia: ${assets.heroImages.length} (pierwsze = tło)</div>
         <div class="itemList">
           ${assets.heroImages.map((img, i) => `
             <div class="itemCard">
               <div class="itemCardTop">
                 <strong>Zdjęcie #${i+1}</strong>
                 <button class="btnSmall" type="button" data-remove-heroimg="${i}">Usuń</button>
               </div>
               <label class="field" style="margin:10px 0 0 0;">
                 <span>Alt</span>
                 <input type="text" data-hero-alt="${i}" value="${escapeHtml(imgObj(img).alt || "")}" placeholder="Opis zdjęcia (alt)" />
               </label>
             </div>
           `).join("")}
         </div>`
      : `<div class="hint">Brak zdjęć w HERO. Dodaj co najmniej 1, żeby mieć tło.</div>`;

    specific = `
      ${fieldRow("Nagłówek (H1)", `<input id="ed_hero_headline" type="text" value="${escapeHtml(h.headline || "")}" />`)}
      ${fieldRow("Opis", `<textarea id="ed_hero_sub" rows="4">${escapeHtml(h.subheadline || "")}</textarea>`)}
      <div class="grid2">
        ${fieldRow("Tekst przycisku", `<input id="ed_hero_cta_text" type="text" value="${escapeHtml(h.primaryCtaText || "Zobacz")}" />`)}
        ${fieldRow("Cel przycisku", `
          <select id="ed_hero_cta_target">
            <option value="auto" ${h.primaryCtaTarget==="auto"?"selected":""}>Automatycznie</option>
            <option value="contact" ${h.primaryCtaTarget==="contact"?"selected":""}>Kontakt</option>
            <option value="custom" ${h.primaryCtaTarget==="custom"?"selected":""}>Własny URL</option>
          </select>
        `)}
      </div>
      <div id="heroCustomUrlWrap" style="display:${h.primaryCtaTarget==="custom"?"block":"none"};">
        ${fieldRow("Własny URL", `<input id="ed_hero_cta_url" type="url" value="${escapeHtml(h.primaryCtaUrl || "")}" placeholder="https://..." />`)}
      </div>

      ${fieldRow("Zdjęcia HERO (upload, multi)", `<input id="ed_hero_images" type="file" accept="image/*" multiple />`,
        "1 zdjęcie = tło. 2+ zdjęcia = mini-galeria w HERO automatycznie."
      )}
      ${heroInfo}
    `;
  }

  if (def.editor === "text") {
    specific = fieldRow("Treść", `<textarea id="ed_text" rows="7">${escapeHtml(cfg.data.text || "")}</textarea>`);
  }

  if (def.editor === "gallery") {
    const layout = cfg.data.layout ?? "grid";
    cfg.data.cols = clampNum(cfg.data.cols ?? 4, 2, 6);
    cfg.data.masonryCols = clampNum(cfg.data.masonryCols ?? 3, 2, 6);

    const thumbs = assets.galleryImages.length
      ? `<div class="hint">Wgrane zdjęcia: ${assets.galleryImages.length}</div>
         <div class="itemList">
            ${assets.galleryImages.map((img, i) => `
              <div class="itemCard">
                <div class="itemCardTop">
                  <strong>Zdjęcie #${i+1}</strong>
                  <button class="btnSmall" type="button" data-remove-gallery="${i}">Usuń</button>
                </div>
                <label class="field" style="margin:10px 0 0 0;">
                  <span>Alt</span>
                  <input type="text" data-gallery-alt="${i}" value="${escapeHtml(imgObj(img).alt || "")}" placeholder="Opis zdjęcia (alt)" />
                </label>
              </div>
            `).join("")}
         </div>`
      : `<div class="hint">Brak zdjęć. Wgraj poniżej.</div>`;

    specific = `
      ${fieldRow("Układ galerii", `
        <select id="ed_gallery_layout">
          <option value="grid" ${layout==="grid"?"selected":""}>Siatka</option>
          <option value="masonry" ${layout==="masonry"?"selected":""}>Masonry</option>
        </select>
      `)}

      <div class="grid2">
        ${fieldRow("Kolumny (siatka)", `
          <div class="rangeRow">
            <input id="ed_gallery_cols" type="range" min="2" max="6" step="1" value="${cfg.data.cols}" />
            <div class="pill"><output id="ed_gallery_cols_out">${cfg.data.cols}</output></div>
          </div>
        `, "Działa w układzie: Siatka.")}

        ${fieldRow("Kolumny (masonry)", `
          <div class="rangeRow">
            <input id="ed_gallery_mcols" type="range" min="2" max="6" step="1" value="${cfg.data.masonryCols}" />
            <div class="pill"><output id="ed_gallery_mcols_out">${cfg.data.masonryCols}</output></div>
          </div>
        `, "Działa w układzie: Masonry.")}
      </div>

      ${fieldRow("Wgraj zdjęcia", `<input id="ed_gallery_upload" type="file" accept="image/*" multiple />`)}
      ${thumbs}
    `;
  }

  if (def.editor === "embed_spotify") {
    cfg.data.items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const sz = clampNum(cfg.data.embedSize ?? 100, 60, 100);
    specific =
      fieldRow("Rozmiar okna", `
        <div class="rangeRow">
          <input id="ed_spotify_size" type="range" min="60" max="100" step="5" value="${sz}" data-path="embedSize" />
          <div class="pill"><output id="ed_spotify_size_out">${sz}%</output></div>
        </div>
      `)
      + listEditor(cfg.data.items, "items", "Link", [
          { key: "url", label: "Link Spotify", type: "url", placeholder: "https://open.spotify.com/..." }
        ])
      + `<div class="hint">Najpewniej działa pełny link <strong>open.spotify.com</strong> (skróty typu <strong>spoti.fi</strong> mogą nie osadzić).</div>`;
  }

  if (def.editor === "embed_youtube") {
    cfg.data.items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const sz = clampNum(cfg.data.embedSize ?? 100, 60, 100);
    specific =
      fieldRow("Rozmiar okna", `
        <div class="rangeRow">
          <input id="ed_youtube_size" type="range" min="60" max="100" step="5" value="${sz}" data-path="embedSize" />
          <div class="pill"><output id="ed_youtube_size_out">${sz}%</output></div>
        </div>
      `)
      + listEditor(cfg.data.items, "items", "Link", [
          { key: "url", label: "Link YouTube", type: "url", placeholder: "https://youtube.com/watch?v=... / shorts / live / playlist" }
        ])
      + `<div class="hint">Generator przerabia link na embed automatycznie. Jeśli autor zablokował osadzanie, zostanie przycisk „Otwórz”.</div>`;
  }

  if (def.editor === "events") {
    cfg.data.items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    specific = listEditor(cfg.data.items, "items", "Wydarzenie", [
      { key: "date", label: "Data", type: "date" },
      { key: "city", label: "Miasto", type: "text", placeholder: "Kraków" },
      { key: "place", label: "Miejsce", type: "text", placeholder: "Klub / galeria" },
      { key: "link", label: "Link", type: "url", placeholder: "https://..." },
    ]);
  }

  if (def.editor === "projects") {
    cfg.data.items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    specific = listEditor(cfg.data.items, "items", "Projekt", [
      { key: "title", label: "Tytuł", type: "text" },
      { key: "link", label: "Link", type: "url" },
      { key: "desc", label: "Opis", type: "textarea", placeholder: "1–3 zdania" },
      { key: "tags", label: "Tagi", type: "text", placeholder: "np. okładki, live, klip" },
    ]);
  }

  if (def.editor === "services") {
    cfg.data.items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    specific = listEditor(cfg.data.items, "items", "Usługa", [
      { key: "name", label: "Nazwa", type: "text" },
      { key: "price", label: "Cena (opcjonalnie)", type: "text", placeholder: "od 500 zł" },
      { key: "desc", label: "Opis", type: "textarea" },
    ]);
  }

  if (def.editor === "simpleList") {
    cfg.data.items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    specific = listEditor(cfg.data.items, "items", "Wpis", [
      { key: "text", label: "Treść", type: "text" },
      { key: "link", label: "Link (opcjonalnie)", type: "url" },
    ]);
  }

  if (def.editor === "publications") {
    cfg.data.items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    specific = listEditor(cfg.data.items, "items", "Publikacja", [
      { key: "title", label: "Tytuł", type: "text" },
      { key: "year", label: "Rok", type: "text", placeholder: "2025" },
      { key: "where", label: "Gdzie", type: "text", placeholder: "Magazyn / wydawnictwo" },
      { key: "url", label: "Link", type: "url" },
    ]);
  }

  if (def.editor === "testimonials") {
    cfg.data.items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    specific = listEditor(cfg.data.items, "items", "Opinia", [
      { key: "quote", label: "Cytat", type: "textarea" },
      { key: "who", label: "Autor", type: "text" },
      { key: "link", label: "Link (opcjonalnie)", type: "url" },
    ]);
  }

  if (def.editor === "newsletter") {
    cfg.data.title = cfg.data.title ?? "Zapisz się";
    cfg.data.desc = cfg.data.desc ?? "Dostaniesz nowe rzeczy jako pierwszy.";
    cfg.data.btn = cfg.data.btn ?? "Dołącz";
    cfg.data.url = cfg.data.url ?? "";

    specific = `
      ${fieldRow("Tytuł", `<input id="ed_news_title" type="text" value="${escapeHtml(cfg.data.title)}"/>`)}
      ${fieldRow("Opis", `<textarea id="ed_news_desc" rows="4">${escapeHtml(cfg.data.desc)}</textarea>`)}
      <div class="grid2">
        ${fieldRow("Tekst przycisku", `<input id="ed_news_btn" type="text" value="${escapeHtml(cfg.data.btn)}"/>`)}
        ${fieldRow("Link do zapisu", `<input id="ed_news_url" type="url" value="${escapeHtml(cfg.data.url)}" placeholder="https://..."/>`)}
      </div>
    `;
  }

  if (def.editor === "epk") {
    cfg.data.shortBio = cfg.data.shortBio ?? "";
    cfg.data.pressLinks = Array.isArray(cfg.data.pressLinks) ? cfg.data.pressLinks : [];
    cfg.data.downloadLinks = Array.isArray(cfg.data.downloadLinks) ? cfg.data.downloadLinks : [];

    const photosInfo = assets.epkPressPhotos.length
      ? `<div class="hint">Zdjęcia prasowe: ${assets.epkPressPhotos.length}</div>
         <div class="itemList">
            ${assets.epkPressPhotos.map((img, i) => `
              <div class="itemCard">
                <div class="itemCardTop">
                  <strong>Press photo #${i+1}</strong>
                  <button class="btnSmall" type="button" data-remove-epkphoto="${i}">Usuń</button>
                </div>
                <label class="field" style="margin:10px 0 0 0;">
                  <span>Alt</span>
                  <input type="text" data-epkphoto-alt="${i}" value="${escapeHtml(imgObj(img).alt || "")}" placeholder="Opis zdjęcia (alt)" />
                </label>
              </div>
            `).join("")}
         </div>`
      : `<div class="hint">Brak zdjęć prasowych. Wgraj poniżej.</div>`;

    const filesInfo = assets.epkFiles.length
      ? `<div class="hint">Pliki presspack: ${assets.epkFiles.length}</div>
         <div class="itemList">
           ${assets.epkFiles.map((f, i) => `
             <div class="itemCard">
               <div class="itemCardTop">
                 <strong>${escapeHtml(f.name)}</strong>
                 <button class="btnSmall" type="button" data-remove-epkfile="${i}">Usuń</button>
               </div>
             </div>
           `).join("")}
         </div>`
      : `<div class="hint">Brak plików. Wgraj poniżej.</div>`;

    specific = `
      ${fieldRow("Krótki opis (bio)", `<textarea id="ed_epk_bio" rows="6">${escapeHtml(cfg.data.shortBio)}</textarea>`)}
      ${fieldRow("Linki prasowe", "", "")}
      ${listEditor(cfg.data.pressLinks, "pressLinks", "Link", [
        { key: "name", label: "Nazwa", type: "text", placeholder: "Recenzja / wywiad" },
        { key: "url", label: "URL", type: "url", placeholder: "https://..." },
      ])}

      ${fieldRow("Linki do pobrania (opcjonalnie)", "", "")}
      ${listEditor(cfg.data.downloadLinks, "downloadLinks", "Plik", [
        { key: "name", label: "Nazwa", type: "text", placeholder: "Press kit PDF" },
        { key: "url", label: "URL", type: "url", placeholder: "https://..." },
      ])}

      ${fieldRow("Zdjęcia prasowe (upload)", `<input id="ed_epk_photos" type="file" accept="image/*" multiple />`, "Do ZIP trafią do assets/press/")}
      ${photosInfo}

      ${fieldRow("Pliki presspack (upload)", `<input id="ed_epk_files" type="file" accept=".pdf,.zip,.png,.jpg,.jpeg,.webp" multiple />`, "Do ZIP trafią do assets/press/")}
      ${filesInfo}
    `;
  }

  if (def.editor === "contact") {
    cfg.data.email = cfg.data.email ?? "";
    cfg.data.phone = cfg.data.phone ?? "";
    cfg.data.city = cfg.data.city ?? "";
    cfg.data.cta = cfg.data.cta ?? "Napisz do mnie";
    specific = `
      <div class="grid2">
        ${fieldRow("Email", `<input id="ed_contact_email" type="email" value="${escapeHtml(cfg.data.email)}" placeholder="mail@..." />`)}
        ${fieldRow("Telefon", `<input id="ed_contact_phone" type="text" value="${escapeHtml(cfg.data.phone)}" placeholder="+48 ..." />`)}
      </div>
      <div class="grid2">
        ${fieldRow("Miasto", `<input id="ed_contact_city" type="text" value="${escapeHtml(cfg.data.city)}" placeholder="Kraków" />`)}
        ${fieldRow("Tekst CTA", `<input id="ed_contact_cta" type="text" value="${escapeHtml(cfg.data.cta)}" />`)}
      </div>
    `;
  }

  if (def.editor === "social") {
    cfg.data.items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    specific = listEditor(cfg.data.items, "items", "Profil", [
      { key: "name", label: "Nazwa", type: "text", placeholder: "Instagram" },
      { key: "url", label: "URL", type: "url", placeholder: "https://..." },
    ]);
  }

  host.innerHTML = common + specific;

  bindEditorHandlers(host, id);
}

function bindEditorHandlers(host, blockId) {
  const cfg = ensureBlock(blockId);
  const def = getBlockDef(blockId);

  // title (update small label without rerender)
  const titleEl = host.querySelector("#ed_title");
  if (titleEl) {
    titleEl.addEventListener("input", () => {
      cfg.title = titleEl.value;
      updateBlockSmallTitle(blockId, cfg.title);
      contentChanged();
    });
  // show in header
  const inHeaderEl = host.querySelector("#ed_showInHeader");
  if (inHeaderEl) {
    inHeaderEl.addEventListener("change", () => {
      cfg.showInHeader = !!inHeaderEl.checked;
      contentChanged();
    });
  }

  // show section heading
  const headingEl = host.querySelector("#ed_showHeading");
  if (headingEl) {
    headingEl.addEventListener("change", () => {
      cfg.showHeading = !!headingEl.checked;
      contentChanged();
    });
  }

  }

  // list add/remove (structural inside editor -> rerender OK)
  host.querySelectorAll("[data-add-item]").forEach(btn => {
    btn.addEventListener("click", () => {
      const listKey = btn.getAttribute("data-add-item");
      cfg.data[listKey] = Array.isArray(cfg.data[listKey]) ? cfg.data[listKey] : [];
      cfg.data[listKey].push({});
      renderBlockEditor();
      saveDraft();
      if (state.livePreview) rebuildPreview(true);
    });
  });

  host.querySelectorAll("[data-remove-item]").forEach(btn => {
    btn.addEventListener("click", () => {
      const listKey = btn.getAttribute("data-remove-item");
      const idx = Number(btn.getAttribute("data-idx"));
      cfg.data[listKey] = Array.isArray(cfg.data[listKey]) ? cfg.data[listKey] : [];
      cfg.data[listKey].splice(idx, 1);
      renderBlockEditor();
      saveDraft();
      if (state.livePreview) rebuildPreview(true);
    });
  });

  // list field edits (NO rerender)
  host.querySelectorAll("[data-path]").forEach(el => {
    el.addEventListener("input", () => {
      const path = el.getAttribute("data-path");
      setByPath(cfg.data, path, el.value);
      contentChanged();
    });
  });

  // HERO
  if (def.editor === "hero") {
    const h = cfg.data;

    const headline = host.querySelector("#ed_hero_headline");
    const sub = host.querySelector("#ed_hero_sub");
    const ctaText = host.querySelector("#ed_hero_cta_text");
    const ctaTarget = host.querySelector("#ed_hero_cta_target");
    const ctaUrl = host.querySelector("#ed_hero_cta_url");
    const customWrap = host.querySelector("#heroCustomUrlWrap");
    const imgs = host.querySelector("#ed_hero_images");

    if (headline) headline.addEventListener("input", () => { h.headline = headline.value; contentChanged(); });
    if (sub) sub.addEventListener("input", () => { h.subheadline = sub.value; contentChanged(); });
    if (ctaText) ctaText.addEventListener("input", () => { h.primaryCtaText = ctaText.value; contentChanged(); });

    if (ctaTarget) {
      ctaTarget.addEventListener("change", () => {
        h.primaryCtaTarget = ctaTarget.value;
        if (customWrap) customWrap.style.display = (ctaTarget.value === "custom") ? "block" : "none";
        saveDraft();
        if (state.livePreview) rebuildPreview(true);
      });
    }

    if (ctaUrl) ctaUrl.addEventListener("input", () => { h.primaryCtaUrl = ctaUrl.value; contentChanged(); });

    if (imgs) {
      imgs.addEventListener("change", async () => {
        const newImgs = await readMultipleImages(imgs.files);
        assets.heroImages.push(...newImgs);
        renderBlockEditor(); // structural (list)
        saveDraft();
        if (state.livePreview) rebuildPreview(true);
      });
    }

    host.querySelectorAll("[data-remove-heroimg]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-remove-heroimg"));
        assets.heroImages.splice(idx, 1);
        renderBlockEditor();
        saveDraft();
        if (state.livePreview) rebuildPreview(true);
      });
    });
  }

  if (def.editor === "text") {
    const t = host.querySelector("#ed_text");
    if (t) t.addEventListener("input", () => { cfg.data.text = t.value; contentChanged(); });
  }

  if (def.editor === "gallery") {
    const layout = host.querySelector("#ed_gallery_layout");
    const upload = host.querySelector("#ed_gallery_upload");

    if (layout) layout.addEventListener("change", () => { cfg.data.layout = layout.value; saveDraft(); if (state.livePreview) rebuildPreview(true); });

    if (upload) {
      upload.addEventListener("change", async () => {
        const imgs = await readMultipleImages(upload.files);
        assets.galleryImages.push(...imgs);
        renderBlockEditor();
        saveDraft();
        if (state.livePreview) rebuildPreview(true);
      });
    }

    host.querySelectorAll("[data-remove-gallery]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-remove-gallery"));
        assets.galleryImages.splice(idx, 1);
        renderBlockEditor();
        saveDraft();
        if (state.livePreview) rebuildPreview(true);
      });
    });
  }

  if (def.editor === "epk") {
    const bio = host.querySelector("#ed_epk_bio");
    if (bio) bio.addEventListener("input", () => { cfg.data.shortBio = bio.value; contentChanged(); });

    const photos = host.querySelector("#ed_epk_photos");
    if (photos) {
      photos.addEventListener("change", async () => {
        const imgs = await readMultipleImages(photos.files);
        assets.epkPressPhotos.push(...imgs);
        renderBlockEditor();
        saveDraft();
        if (state.livePreview) rebuildPreview(true);
      });
    }

    host.querySelectorAll("[data-remove-epkphoto]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-remove-epkphoto"));
        assets.epkPressPhotos.splice(idx, 1);
        renderBlockEditor();
        saveDraft();
        if (state.livePreview) rebuildPreview(true);
      });
    });

    const files = host.querySelector("#ed_epk_files");
    if (files) {
      files.addEventListener("change", async () => {
        const list = Array.from(files.files || []);
        for (const f of list) {
          const dataUrl = await readFileAsDataUrl(f);
          const parsed = parseDataUrl(dataUrl);
          assets.epkFiles.push({
            name: f.name,
            dataUrl,
            mime: parsed?.mime || "",
          });
        }
        renderBlockEditor();
        saveDraft();
        if (state.livePreview) rebuildPreview(true);
      });
    }

    host.querySelectorAll("[data-remove-epkfile]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-remove-epkfile"));
        assets.epkFiles.splice(idx, 1);
        renderBlockEditor();
        saveDraft();
        if (state.livePreview) rebuildPreview(true);
      });
    });
  }

  if (def.editor === "newsletter") {
    const a = host.querySelector("#ed_news_title");
    const b = host.querySelector("#ed_news_desc");
    const c = host.querySelector("#ed_news_btn");
    const d = host.querySelector("#ed_news_url");
    if (a) a.addEventListener("input", () => { cfg.data.title = a.value; contentChanged(); });
    if (b) b.addEventListener("input", () => { cfg.data.desc = b.value; contentChanged(); });
    if (c) c.addEventListener("input", () => { cfg.data.btn = c.value; contentChanged(); });
    if (d) d.addEventListener("input", () => { cfg.data.url = d.value; contentChanged(); });
  }

  if (def.editor === "contact") {
    const email = host.querySelector("#ed_contact_email");
    const phone = host.querySelector("#ed_contact_phone");
    const city = host.querySelector("#ed_contact_city");
    const cta = host.querySelector("#ed_contact_cta");
    if (email) email.addEventListener("input", () => { cfg.data.email = email.value; contentChanged(); });
    if (phone) phone.addEventListener("input", () => { cfg.data.phone = phone.value; contentChanged(); });
    if (city) city.addEventListener("input", () => { cfg.data.city = city.value; contentChanged(); });
    if (cta) cta.addEventListener("input", () => { cfg.data.cta = cta.value; contentChanged(); });
  }

  // Embed size sliders (UI-only output label)
  if (def.editor === "embed_spotify") {
    const r = host.querySelector("#ed_spotify_size");
    const o = host.querySelector("#ed_spotify_size_out");
    if (r && o) r.addEventListener("input", () => { o.textContent = `${r.value}%`; });
  }
  if (def.editor === "embed_youtube") {
    const r = host.querySelector("#ed_youtube_size");
    const o = host.querySelector("#ed_youtube_size_out");
    if (r && o) r.addEventListener("input", () => { o.textContent = `${r.value}%`; });
  }
}

/* ==========================
   Site HTML/CSS/JS generation
========================== */

function blockToFile(id) { return `${id}.html`; }

function getNavItemsZip() {
  const items = [{ label: "Home", href: "index.html", id: "home" }];

  const added = new Set();
  for (const id of enabledBlocksInOrder()) {
    if (id === "hero") continue;
    const cfg = ensureBlock(id);
    if (cfg.showInHeader === false) continue;

    const base = baseBlockId(id);
    if (added.has(base)) continue; // one page per base in ZIP nav
    added.add(base);

    items.push({ label: getBlockDisplayName(id), href: blockToFile(base), id: base });
  }
  return items;
}

function getNavItemsSingle() {
  const items = [];
  for (const id of enabledBlocksInOrder()) {
    const cfg = ensureBlock(id);
    if (cfg.showInHeader === false) continue;
    // on single we allow duplicates if user explicitly wants them
    items.push({ label: getBlockDisplayName(id), href: `#${id}`, id });
  }
  return items;
}

function buildSiteCss() {
  const accent = state.accent || "#6d28d9";
  const headersAlign = state.sectionHeadersAlign === "center" ? "center" : "left";

  return `
:root{
  --accent:${accent};
  --max: 1160px;
  --radius: 0px;
  --shadow: none;
}

/* theme */
body{ margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; }
body.theme-minimalist{
  color:#0b1020;
  background:#f7f7fb;
}
body.theme-modern{
  color:#eaf0ff;
  background:#06070b;
}
body.theme-elegant{
  color:#12131a;
  background:#f4f0ea;
}

/* core */
.container{ max-width: var(--max); margin: 0 auto; padding: 26px 18px 70px; }
.sectionTitle{ text-align:${headersAlign}; margin:0 0 14px 0; font-size: 22px; letter-spacing:.2px; }
.muted{ opacity:.75; line-height:1.65; }

.siteHeader{
  position: sticky; top:0; z-index:50;
  background: rgba(255,255,255,.85);
  border-bottom: 1px solid rgba(20,20,20,.12);
  backdrop-filter: blur(10px);
}
.theme-modern .siteHeader{
  background: rgba(6,7,11,.80);
  border-bottom: 1px solid rgba(255,255,255,.12);
}
.headerInner{
  max-width: var(--max);
  margin:0 auto;
  padding: 14px 18px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:18px;
}
.brand{
  display:flex; align-items:center; gap:10px;
  font-weight: 900;
  letter-spacing:.2px;
}
.brandDotRemoved{
  width:12px; height:12px;
  background: var(--accent);
}
.nav{ display:flex; gap:14px; flex-wrap:wrap; align-items:center; justify-content:flex-end; }
.nav a{
  text-decoration:none;
  color: inherit;
  opacity:.75;
  font-weight: 800;
  font-size: 13px;
  padding: 8px 8px;
}
.nav a:hover{ opacity:1; }
.nav a.active{ opacity:1; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 6px; }

.btn{
  display:inline-flex; align-items:center; justify-content:center;
  border: 1px solid rgba(20,20,20,.18);
  padding: 10px 14px;
  font-weight: 900;
  text-decoration:none;
  color: inherit;
  background: transparent;
}
.theme-modern .btn{ border-color: rgba(255,255,255,.16); }
.btn.primary{
  border-color: transparent;
  background: var(--accent);
  color: #fff;
}
.btn:hover{ filter: brightness(1.03); }

.grid{ display:grid; gap:16px; }
.grid2{ display:grid; gap:16px; grid-template-columns: 1fr 1fr; }
@media (max-width: 900px){ .grid2{ grid-template-columns: 1fr; } }

/* hero with background */
.hero{
  position:relative;
  min-height: 520px;
  display:flex;
  align-items:flex-end;
  padding: 28px;
  background: #111;
  color:#fff;
  overflow:hidden;
}
.hero::before{
  content:"";
  position:absolute; inset:0;
  background-image: var(--hero-bg);
  background-size: cover;
  background-position: center;
  filter: saturate(1.05);
  transform: scale(1.02);
}
.hero::after{
  content:"";
  position:absolute; inset:0;
  background:
    linear-gradient(180deg, rgba(0,0,0,.25), rgba(0,0,0,.72));
}
.heroInner{
  position:relative;
  max-width: 70ch;
}
.hero .kicker{
  display:inline-flex; align-items:center; gap:10px;
  font-weight:900;
  opacity:.95;
}
.kdot{ width:10px; height:10px; background: var(--accent); }
.hero h1{ margin: 10px 0 10px 0; font-size: 52px; letter-spacing:-.6px; }
.hero p{ margin: 0 0 18px 0; font-size: 16px; opacity:.88; }

.heroActions{ display:flex; gap:10px; flex-wrap:wrap; }
.heroGallery{
  position:relative;
  margin-top: 16px;
  display:grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
}
@media (max-width: 900px){ .hero{ min-height: 520px; } .heroGallery{ grid-template-columns: repeat(3,1fr);} }
.heroGallery a{
  display:block;
  aspect-ratio: 1 / 1;
  overflow:hidden;
}
.heroGallery img{
  width:100%; height:100%; object-fit: cover; display:block;
}

/* sections default (borderless) */
.section{
  margin-top: 26px;
}

/* gallery */
.galleryGrid{
  display:grid;
  grid-template-columns: repeat(var(--gcols, 4), 1fr);
  gap: 14px;
}
@media (max-width: 900px){ .galleryGrid{ grid-template-columns: repeat(var(--gcols-m, 2),1fr); } }
.galleryGrid img{ width:100%; height:auto; display:block; }

.masonry{
  column-count: var(--mcols, 3);
  column-gap: 14px;
}
@media (max-width: 900px){ .masonry{ column-count: var(--mcols-m, 2); } }
.masonryItem{ break-inside: avoid; margin:0 0 14px 0; }
.masonryItem img{ width:100%; height:auto; display:block; }

.embed{ width:100%; aspect-ratio: 16/9; border:0; }
.embed.tall{ aspect-ratio: 16/10; }

.embedGrid{ --embed-max: 100%; }
.embedWrap{ width: var(--embed-max); max-width: 100%; margin-inline:auto; }
@media (max-width: 700px){ .embedWrap{ width: 100%; } }
.embedMeta{ display:flex; justify-content:flex-end; margin-top:8px; }
.embedMeta .btn{ padding: 8px 12px; font-size: 12px; }
.embedCard{ border:1px solid rgba(127,127,127,.18); padding:12px; border-radius: var(--radius); }
body.theme-modern .embedCard{ border-color: rgba(255,255,255,.14); }

.footer{ margin-top: 36px; opacity:.7; font-size: 12px; text-align:center; }

/* lightbox */
.lbOverlay{ position:fixed; inset:0; background: rgba(0,0,0,.86); display:none; align-items:center; justify-content:center; padding: 18px; z-index: 9999; }
.lbOverlay.isOpen{ display:flex; }
.lbBox{ width: min(1120px, 94vw); max-height: 92vh; display:grid; gap: 10px; }
.lbImg{ width:100%; max-height: 78vh; object-fit: contain; background:#000; border-radius: var(--radius); box-shadow: 0 20px 70px rgba(0,0,0,.55); }
.lbBar{ display:flex; align-items:center; justify-content:space-between; gap: 10px; color:#fff; font-size: 12px; opacity:.92; }
.lbCaption{ overflow:hidden; text-overflow: ellipsis; white-space: nowrap; }
.lbControls{ display:flex; gap: 8px; align-items:center; }
.lbBtn{ border:1px solid rgba(255,255,255,.22); background: rgba(0,0,0,.35); color:#fff; padding: 8px 10px; border-radius: 12px; font-weight: 900; cursor:pointer; }
.lbBtn:hover{ background: rgba(255,255,255,.08); }


/* TEMPLATE: Square Grid (minimal like your ref #2) */
body.tpl-square{
  --radius: 0px;
}
body.tpl-square .container{ padding-top: 18px; }
body.tpl-square .brandDotRemoved{ box-shadow:none; }
body.tpl-square .nav a{ letter-spacing:.2px; }
body.tpl-square .btn{ border-radius: 0; }
body.tpl-square .hero{ border-radius: 0; }

/* TEMPLATE: Colorwash (minimal with colored backdrop like ref #3) */
body.tpl-colorwash{
  background:
    linear-gradient(0deg,
      color-mix(in oklab, var(--accent), white 85%),
      color-mix(in oklab, var(--accent), white 85%)
    );
}
body.theme-modern.tpl-colorwash{
  background:
    linear-gradient(0deg,
      color-mix(in oklab, var(--accent), black 75%),
      color-mix(in oklab, var(--accent), black 75%)
    );
}
body.tpl-colorwash .siteHeader{
  background: rgba(255,255,255,.75);
}
body.theme-modern.tpl-colorwash .siteHeader{
  background: rgba(6,7,11,.78);
}
body.tpl-colorwash .hero{
  min-height: 560px;
}
body.tpl-colorwash .brandDotRemoved{ background:#111; }
body.theme-modern.tpl-colorwash .brandDotRemoved{ background:#fff; }

/* TEMPLATE: Rounded (cards) */
body.tpl-rounded{ --radius: 18px; }
body.tpl-rounded .btn{ border-radius: 999px; }
body.tpl-rounded .hero{ border-radius: 26px; }
body.tpl-rounded .siteHeader{ border-bottom-color: rgba(127,127,127,.20); }

/* TEMPLATE: Editorial */
body.tpl-editorial{
  font-family: ui-serif, Georgia, "Times New Roman", serif;
}
body.tpl-editorial .nav a{ font-family: ui-sans-serif, system-ui; }
body.tpl-editorial .hero h1{ font-size: 58px; }

/* TEMPLATE: Neon */
body.tpl-neon .hero::after{
  background:
    radial-gradient(800px 420px at 20% 15%, rgba(109,40,217,.35), transparent 60%),
    linear-gradient(180deg, rgba(0,0,0,.18), rgba(0,0,0,.75));
}

/* TEMPLATE: Soft */
body.tpl-soft .hero::after{
  background:
    linear-gradient(180deg, rgba(255,255,255,.00), rgba(0,0,0,.78));
}

.navToggle{
  display:none;
  border:1px solid rgba(0,0,0,.15);
  background: rgba(255,255,255,.65);
  color: inherit;
  border-radius: 12px;
  padding: 8px 10px;
  line-height: 1;
  cursor:pointer;
}
.brandLogo{ height: 28px; width: auto; display:block; }

@media (max-width: 820px){
  .navToggle{ display:block; }
  .nav{
    display:none;
    position:absolute;
    left:0; right:0;
    top: 100%;
    background: rgba(255,255,255,.98);
    border-bottom: 1px solid rgba(0,0,0,.10);
    padding: 10px 14px 14px;
  }
  .nav a{ display:block; padding: 10px 8px; border-radius: 12px; }
  .siteHeader.menuOpen .nav{ display:block; }
  .headerInner{ position:relative; }
}
`;
}

function buildSiteScript() {
  // Works for both single + ZIP pages. In preview, intercept internal navigation.
  return `
(function(){
  const IN_PREVIEW = document.documentElement.hasAttribute('data-kpo-preview');

  function setupHamburger(){
    const header = document.querySelector('.siteHeader');
    if(!header) return;
    const btn = header.querySelector('.navToggle');
    const nav = header.querySelector('.nav');
    if(!btn || !nav) return;

    function close(){
      header.classList.remove('menuOpen');
      btn.setAttribute('aria-expanded','false');
    }
    function toggle(){
      const open = header.classList.toggle('menuOpen');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

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

  function send(msg){
    try { parent.postMessage(msg, '*'); } catch (e) {}
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
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  document.addEventListener('DOMContentLoaded', () => {
    initEventsArchive();
    setupLightbox();
    setupHamburger();
  });
})();
`;
}

function buildHeader(navItems, activeHref, inlineAssets) {
  const name = String(state.siteName || "Portfolio").trim() || "Portfolio";
  const brandText = escapeHtml(name);

  // logo (optional)
  let brandHtml = brandText;
  if (state.useLogoInHeader && assets.logo && assets.logo.dataUrl) {
    const href = assetHrefForHead(assets.logo, !!inlineAssets, "assets/logo");
    if (href) {
      brandHtml = `<img class="brandLogo" src="${escapeHtml(href)}" alt="${brandText}"/>`;
    }
  }

  const links = navItems.map(it => {
    const isActive = it.href === activeHref;
    return `<a href="${it.href}" class="${isActive ? "active" : ""}">${escapeHtml(it.label)}</a>`;
  }).join("");

  return `
<header class="siteHeader">
  <div class="headerInner">
    <div class="brand">${brandHtml}</div>
    <button class="navToggle" type="button" aria-label="Menu" aria-expanded="false">☰</button>
    <nav class="nav" aria-label="Nawigacja">${links}</nav>
  </div>
</header>`;
}

function renderHeroSection(mode) {
  const hero = ensureBlock("hero");
  const h = hero.data || {};
  const headline = escapeHtml(h.headline || "");
  const sub = escapeHtml(h.subheadline || "");
  const btnText = escapeHtml(h.primaryCtaText || "Zobacz");
  const target = h.primaryCtaTarget || "auto";
  const customUrl = String(h.primaryCtaUrl || "").trim();

  normalizeAssets();
  const heroImgs = assets.heroImages;

  const enabled = enabledBlocksInOrder().filter(id => id !== "hero");
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


  const bg = heroImgs[0]?.dataUrl
    ? `url('${cssUrl(heroImgs[0].dataUrl)}')`
    : `linear-gradient(135deg, var(--accent), #111)`;

  const heroGallery = heroImgs.length > 1
    ? `<div class="heroGallery js-lightbox-group">
        ${heroImgs.map((img, i) => {
          const u = img.dataUrl;
          const alt = escapeHtml(img.alt || `HERO ${i+1}`);
          return `
          <a href="${u}" data-lightbox="hero" title="HERO #${i+1}">
            <img src="${u}" alt="${alt}"/>
          </a>`;
        }).join("")}
      </div>`
    : "";

  return `
<section id="hero" class="hero" style="--hero-bg:${bg};">
  <div class="heroInner">
    <div class="kicker"><span class="kdot"></span> Oficjalna strona</div>
    <h1>${headline}</h1>
    <p>${sub}</p>
    <div class="heroActions">
      <a class="btn primary" href="${ctaHref}">${btnText}</a>
      <a class="btn" href="${mode==="single" ? "#contact" : "contact.html"}">Kontakt</a>
    </div>
    ${heroGallery}
  </div>
</section>
`;
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
    const text = escapeHtml(cfg.data.text || "").replaceAll("\n", "<br/>");
    return `
<section id="${id}" class="section">
  ${headingHtml}
  <div class="muted">${text || "—"}</div>
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
            const u = imgObj(img).dataUrl;
            const alt = escapeHtml(imgObj(img).alt || `${fallbackAltBase} ${i+1}`);
            return `<div class="masonryItem"><a href="${u}" data-lightbox="gallery"><img src="${u}" alt="${alt}"/></a></div>`;
          }).join("")}
        </div>`
      : `<div class="galleryGrid js-lightbox-group" style="--gcols:${cols};">
          ${items.map((img, i) => {
            const u = imgObj(img).dataUrl;
            const alt = escapeHtml(imgObj(img).alt || `${fallbackAltBase} ${i+1}`);
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
    const sz = clampNum(cfg.data.embedSize ?? 100, 60, 100);
    const parts = items.map(it => {
      const p = parseSpotify(it.url || "");
      if (p.embedUrl) {
        const open = escapeHtml(p.openUrl || it.url || "");
        return `
<div class="embedWrap">
  <iframe class="embed tall" src="${escapeHtml(p.embedUrl)}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
  ${open ? `<div class="embedMeta"><a class="btn" href="${open}" target="_blank" rel="noopener">Otwórz</a></div>` : ``}
</div>`;
      }
      if (p.openUrl) {
        const open = escapeHtml(p.openUrl);
        return `
<div class="embedWrap">
  <div class="embedCard">
    <div style="font-weight:900;">Spotify</div>
    <div class="muted" style="margin-top:6px;">Tego linku nie da się osadzić. Wklej pełny link <strong>open.spotify.com</strong>.</div>
    <div style="margin-top:10px;"><a class="btn primary" href="${open}" target="_blank" rel="noopener">Otwórz</a></div>
  </div>
</div>`;
      }
      return "";
    }).filter(Boolean).join("");

    return `
<section id="${id}" class="section">
  ${headingHtml}
  <div class="grid embedGrid" style="--embed-max:${sz}%;">${parts || `<div class="muted">Wklej linki Spotify w generatorze.</div>`}</div>
</section>`;
  }

  if (editor === "embed_youtube") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const sz = clampNum(cfg.data.embedSize ?? 100, 60, 100);
    const parts = items.map(it => {
      const p = parseYouTube(it.url || "");
      if (p.embedUrl) {
        const open = escapeHtml(p.openUrl || it.url || "");
        return `
<div class="embedWrap">
  <iframe class="embed" src="${escapeHtml(p.embedUrl)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
  ${open ? `<div class="embedMeta"><a class="btn" href="${open}" target="_blank" rel="noopener">Otwórz</a></div>` : ``}
</div>`;
      }
      if (p.openUrl) {
        const open = escapeHtml(p.openUrl);
        return `
<div class="embedWrap">
  <div class="embedCard">
    <div style="font-weight:900;">YouTube</div>
    <div class="muted" style="margin-top:6px;">Tego linku nie da się osadzić jako player. Zostawiamy przycisk.</div>
    <div style="margin-top:10px;"><a class="btn primary" href="${open}" target="_blank" rel="noopener">Otwórz</a></div>
  </div>
</div>`;
      }
      return "";
    }).filter(Boolean).join("");

    return `
<section id="${id}" class="section">
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
      const link = (it.link || "").trim();
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
      const desc = escapeHtml(it.desc || "").replaceAll("\n","<br/>");
      const tags = escapeHtml(it.tags || "");
      const link = (it.link || "").trim();
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
  <div class="muted" style="margin-top:8px;">${escapeHtml(it.desc || "").replaceAll("\n","<br/>")}</div>
</div>`).join("");

    return `
<section id="${id}" class="section">
  ${headingHtml}
  <div>${rows || `<div class="muted">Dodaj usługi w generatorze.</div>`}</div>
</section>`;
  }

  if (editor === "simpleList") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const rows = items.map(it => {
      const text = escapeHtml(it.text || "");
      const link = (it.link || "").trim();
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
    const rows = items.map(it => `
<div style="padding:12px 0; border-bottom:1px solid rgba(127,127,127,.18);">
  <div style="font-weight:900;">${escapeHtml(it.title || "—")}</div>
  <div class="muted" style="margin-top:6px;">${escapeHtml(it.where || "")} ${it.year ? "• " + escapeHtml(it.year) : ""}</div>
  ${it.url ? `<div style="margin-top:10px;"><a class="btn" href="${escapeHtml(it.url)}" target="_blank" rel="noopener">Czytaj</a></div>` : ``}
</div>`).join("");

    return `
<section id="${id}" class="section">
  ${headingHtml}
  <div>${rows || `<div class="muted">Dodaj publikacje w generatorze.</div>`}</div>
</section>`;
  }

  if (editor === "testimonials") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const rows = items.map(it => `
<div style="padding:12px 0; border-bottom:1px solid rgba(127,127,127,.18);">
  <div style="font-weight:900;">„${escapeHtml(it.quote || "—").replaceAll("\n"," ")}”</div>
  <div class="muted" style="margin-top:8px;">— ${escapeHtml(it.who || "")}</div>
  ${it.link ? `<div style="margin-top:10px;"><a class="btn" href="${escapeHtml(it.link)}" target="_blank" rel="noopener">Źródło</a></div>` : ``}
</div>`).join("");

    return `
<section id="${id}" class="section">
  ${headingHtml}
  <div>${rows || `<div class="muted">Dodaj opinie w generatorze.</div>`}</div>
</section>`;
  }

  if (editor === "epk") {
    const bio = escapeHtml(cfg.data.shortBio || "").replaceAll("\n","<br/>");

    const pressLinks = (cfg.data.pressLinks || []).map(it => `
      <div style="padding:10px 0; border-bottom:1px solid rgba(127,127,127,.18);">
        <strong>${escapeHtml(it.name || "Link")}</strong>
        ${it.url ? ` <a class="btn" style="margin-left:10px;" href="${escapeHtml(it.url)}" target="_blank" rel="noopener">Otwórz</a>` : ``}
      </div>
    `).join("");

    const dlLinks = (cfg.data.downloadLinks || []).map(it => `
      <div style="padding:10px 0; border-bottom:1px solid rgba(127,127,127,.18);">
        <strong>${escapeHtml(it.name || "Plik")}</strong>
        ${it.url ? ` <a class="btn primary" style="margin-left:10px;" href="${escapeHtml(it.url)}" target="_blank" rel="noopener">Pobierz</a>` : ``}
      </div>
    `).join("");

    const photos = assets.epkPressPhotos.length
      ? `<div class="galleryGrid js-lightbox-group">${assets.epkPressPhotos.map((img, i) => {
          const u = imgObj(img).dataUrl;
          const alt = escapeHtml(imgObj(img).alt || `Press photo ${i+1}`);
          return `<a href="${u}" data-lightbox="press"><img src="${u}" alt="${alt}"/></a>`;
        }).join("")}</div>`
      : `<div class="muted">Brak zdjęć prasowych.</div>`;

    const files = assets.epkFiles.length
      ? assets.epkFiles.map(f => `
        <div style="padding:10px 0; border-bottom:1px solid rgba(127,127,127,.18);">
          <strong>${escapeHtml(f.name)}</strong>
          <a class="btn primary" style="margin-left:10px;" href="${f.dataUrl}" download="${escapeHtml(f.name)}">Pobierz</a>
        </div>
      `).join("")
      : `<div class="muted">Brak plików presspack.</div>`;

    return `
<section id="${id}" class="section">
  ${headingHtml}

  <div class="grid2">
    <div>
      <h3 style="margin:0 0 10px 0;">Bio</h3>
      <div class="muted">${bio || "—"}</div>
    </div>
    <div>
      <h3 style="margin:0 0 10px 0;">Linki prasowe</h3>
      <div>${pressLinks || `<div class="muted">—</div>`}</div>
      <h3 style="margin:18px 0 10px 0;">Do pobrania</h3>
      <div>${dlLinks || `<div class="muted">—</div>`}</div>
    </div>
  </div>

  <h3 style="margin:22px 0 10px 0;">Zdjęcia prasowe</h3>
  ${photos}

  <h3 style="margin:22px 0 10px 0;">Pliki</h3>
  <div>${files}</div>
</section>`;
  }

  if (editor === "contact") {
    const email = escapeHtml(cfg.data.email || "");
    const phone = escapeHtml(cfg.data.phone || "");
    const city = escapeHtml(cfg.data.city || "");
    const cta = escapeHtml(cfg.data.cta || "Napisz do mnie");

    return `
<section id="${id}" class="section">
  ${headingHtml}
  <div class="muted">
    ${email ? `Email: <strong>${email}</strong><br/>` : ``}
    ${phone ? `Telefon: <strong>${phone}</strong><br/>` : ``}
    ${city ? `Miasto: <strong>${city}</strong><br/>` : ``}
  </div>
  ${email ? `<div style="margin-top:12px;"><a class="btn primary" href="mailto:${email}">${cta}</a></div>` : ``}
</section>`;
  }

  if (editor === "social") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const rows = items.map(it => `
<div style="padding:10px 0; border-bottom:1px solid rgba(127,127,127,.18);">
  <strong>${escapeHtml(it.name || "Profil")}</strong>
  ${it.url ? ` <a class="btn" style="margin-left:10px;" href="${escapeHtml(it.url)}" target="_blank" rel="noopener">Otwórz</a>` : ``}
</div>`).join("");

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
  if (!assetObj || !assetObj.dataUrl) return "";
  if (inlineAssets) return assetObj.dataUrl;
  const parsed = parseDataUrl(assetObj.dataUrl);
  const mime = assetObj.mime || (parsed ? parsed.mime : "");
  const ext = guessExtFromMime(mime);
  return `${outPathNoExt}.${ext}`;
}

function buildHeadMetaTags(pageTitle, inlineAssets) {
  const baseTitle = String(state.metaTitle || "").trim() || String(state.siteName || "").trim() || "Portfolio";
  const desc = String(state.metaDescription || "").trim();

  const ogTitle = pageTitle || baseTitle;
  const tags = [];

  if (desc) tags.push(`<meta name="description" content="${escapeHtml(desc)}"/>`);

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

function buildSingleHtml(opts = {}) {
  const inlineAssets = opts.inlineAssets !== false; // default true
  const preview = !!opts.preview;

  const nav = getNavItemsSingle();
  const css = buildSiteCss();
  const js = buildSiteScript();
  const bodySections = enabledBlocksInOrder().map(id => renderBlockSection(id, "single")).join("");

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
<title>${escapeHtml(pageTitle)}</title>
${buildHeadMetaTags(pageTitle, inlineAssets)}
${headCss}
</head>
<body class="theme-${escapeHtml(state.theme)} tpl-${escapeHtml(state.template)}">
  ${buildHeader(nav, nav[0]?.href || "#hero", inlineAssets)}
  <main class="container">
    ${bodySections}
    <div class="footer">© ${escapeHtml(state.siteName || "Artysta")}</div>
  </main>
${footJs}
</body>
</html>`.trim();
}

function buildZipFiles(opts = {}) {
  const inlineAssets = !!opts.inlineAssets;
  const preview = !!opts.preview;

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
  const enabled = enabledBlocksInOrder().filter(id => id !== "hero");

  // Home in ZIP behaves like "sekcje": HERO + wszystkie sekcje (w tym duplikaty)
  const indexBody = `
    ${renderBlockSection("hero", "single")}
    ${enabled.map(id => renderBlockSection(id, "single")).join("")}
  `;

  files["index.html"] = `
<!doctype html>
<html lang="pl"${previewAttr}>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(baseTitle)}</title>
${buildHeadMetaTags(baseTitle, inlineAssets)}
${headCss}
</head>
<body class="theme-${escapeHtml(state.theme)} tpl-${escapeHtml(state.template)}">
  ${buildHeader(nav, "index.html", inlineAssets)}
  <main class="container">
    ${indexBody}
    <div class="footer">© ${escapeHtml(state.siteName || "Artysta")}</div>
  </main>
${footJs}
</body>
</html>`.trim();

  // pages per block (one page per base id)
  const baseFirst = new Map();
  const basePage = new Map();

  enabled.forEach((id) => {
    const base = baseBlockId(id);
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
<title>${escapeHtml(pageTitle)}</title>
${buildHeadMetaTags(pageTitle, inlineAssets)}
${headCss}
</head>
<body class="theme-${escapeHtml(state.theme)} tpl-${escapeHtml(state.template)}">
  ${buildHeader(nav, file, inlineAssets)}
  <main class="container">
    ${renderBlockSection(id, "zip")}
    <div class="footer">© ${escapeHtml(state.siteName || "Artysta")}</div>
  </main>
${footJs}
</body>
</html>`.trim();
  }

  return files;
}


/* ==========================
   Preview rebuild
========================== */

function rebuildPreview(force=false) {
  syncStateFromSettingsInputs();

  const iframe = $("previewFrame");

  if (state.exportMode === "single") {
    zipPreviewFiles = null;
    zipPreviewCurrent = "index.html";
    iframe.srcdoc = buildSingleHtml({ inlineAssets: true, preview: true });
    setPreviewPageLabel("index.html");
    return;
  }

  // ZIP preview: build inline pages (fixes your broken preview)
  zipPreviewFiles = buildZipFiles({ inlineAssets: true, preview: true });

  if (!zipPreviewFiles[zipPreviewCurrent]) zipPreviewCurrent = "index.html";
  iframe.srcdoc = zipPreviewFiles[zipPreviewCurrent] || "";
  setPreviewPageLabel(zipPreviewCurrent);
}

/* ==========================
   Preview navigation from iframe (ZIP)
========================== */

window.addEventListener("message", (ev) => {
  const d = ev.data || {};
  if (d.type !== "NAVIGATE") return;

  const page = String(d.page || "").trim();
  if (!page) return;

  if (state.exportMode !== "zip") return;

  if (!zipPreviewFiles) zipPreviewFiles = buildZipFiles({ inlineAssets: true, preview: true });

  if (zipPreviewFiles[page]) {
    zipPreviewCurrent = page;
    $("previewFrame").srcdoc = zipPreviewFiles[page];
    setPreviewPageLabel(page);
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

async function downloadZip(filesMap) {
  const zip = new JSZip();
  const root = zip.folder(ZIP_ROOT_FOLDER);

  for (const [name, content] of Object.entries(filesMap)) {
    root.file(name, content);
  }

  // assets folder
  const assetsFolder = root.folder("assets");

  if (assets.heroImages.length) {
    const h = assetsFolder.folder("hero");
    assets.heroImages.forEach((img, i) => {
      const parsed = parseDataUrl(imgObj(img).dataUrl);
      if (!parsed) return;
      const ext = guessExtFromMime(parsed.mime);
      h.file(`hero-${String(i+1).padStart(2,"0")}.${ext}`, parsed.b64, { base64: true });
    });
  }

  if (assets.galleryImages.length) {
    const g = assetsFolder.folder("gallery");
    assets.galleryImages.forEach((img, i) => {
      const parsed = parseDataUrl(imgObj(img).dataUrl);
      if (!parsed) return;
      const ext = guessExtFromMime(parsed.mime);
      g.file(`img-${String(i+1).padStart(2,"0")}.${ext}`, parsed.b64, { base64: true });
    });
  }

  if (assets.epkPressPhotos.length || assets.epkFiles.length) {
    const p = assetsFolder.folder("press");

    assets.epkPressPhotos.forEach((img, i) => {
      const parsed = parseDataUrl(imgObj(img).dataUrl);
      if (!parsed) return;
      const ext = guessExtFromMime(parsed.mime);
      p.file(`photo-${String(i+1).padStart(2,"0")}.${ext}`, parsed.b64, { base64: true });
    });

    assets.epkFiles.forEach((f) => {
      const parsed = parseDataUrl(f.dataUrl);
      if (!parsed) return;
      p.file(f.name, parsed.b64, { base64: true });
    });
  }

  // SEO assets (favicon / og image)
  if (assets.favicon && assets.favicon.dataUrl) {
    const parsed = parseDataUrl(assets.favicon.dataUrl);
    if (parsed) {
      const ext = guessExtFromMime(assets.favicon.mime || parsed.mime);
      assetsFolder.file(`favicon.${ext}`, parsed.b64, { base64: true });
    }
  }

  if (assets.ogImage && assets.ogImage.dataUrl) {
    const parsed = parseDataUrl(assets.ogImage.dataUrl);
    if (parsed) {
      const ext = guessExtFromMime(assets.ogImage.mime || parsed.mime);
      assetsFolder.file(`og.${ext}`, parsed.b64, { base64: true });
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ZIP_ROOT_FOLDER}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

/* ==========================
   Init + bindings
========================== */

function bindSettings() {
  $("exportMode").addEventListener("change", () => {
    state.exportMode = $("exportMode").value;
    if (state.exportMode === "zip") zipPreviewCurrent = "index.html";
    structureChanged(true);
  });

  // LIVE toggle (only in top status row)
  const liveBtn = $("liveStatus");
  if (liveBtn) liveBtn.addEventListener("click", () => {
    state.livePreview = !state.livePreview;
    setLiveStatus();
    saveDraft();
    if (state.livePreview) rebuildPreview(true);
  });

  $("role").addEventListener("change", () => {
    applyRolePreset($("role").value);
    structureChanged(true);
  });

  // settings that should NOT rerender UI on each key
  ["theme","template","accent","sectionHeadersAlign","siteName","metaTitle","metaDescription"].forEach(id => {
    $(id).addEventListener("input", () => {
      syncStateFromSettingsInputs();
      contentChanged();
    });
    $(id).addEventListener("change", () => {
      syncStateFromSettingsInputs();
      saveDraft();
      if (state.livePreview) rebuildPreview(true);
    });
  });

  $("addBlockBtn").addEventListener("click", () => {
    const id = $("addBlockSelect").value;
    if (!id) return;
    ensureBlock(id).enabled = true;
    if (!state.order.includes(id)) state.order.push(id);
    hardLockHeroFirst();
    state.activeBlockId = id;
    structureChanged();
  });

  $("btnManualRefresh").addEventListener("click", () => {
    rebuildPreview(true);
  });


  // Preview device buttons (Desktop / Tablet / Mobile)
  document.querySelectorAll('.segBtn[data-device]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setPreviewDevice(btn.getAttribute('data-device'));
      saveDraft();
    });
  });

  // Undo / Redo
  if ($("btnUndo")) $("btnUndo").addEventListener("click", () => undo());
  if ($("btnRedo")) $("btnRedo").addEventListener("click", () => redo());

  // Issues list
  if ($("issuesPill")) $("issuesPill").addEventListener("click", () => openIssuesModal());


  // Logo upload + header option
  const logoUp = $("logoUpload");
  if (logoUp) logoUp.addEventListener("change", async () => {
    const file = logoUp.files && logoUp.files[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    if (!dataUrl) return;
    assets.logo = { dataUrl, mime: file.type || (parseDataUrl(dataUrl)?.mime || '') };
    contentChanged();
    if (state.livePreview) rebuildPreview(true);
  });

  const useLogo = $("useLogoInHeader");
  if (useLogo) useLogo.addEventListener("change", () => {
    state.useLogoInHeader = !!useLogo.checked;
    contentChanged();
    if (state.livePreview) rebuildPreview(true);
  });


  const fav = $("faviconUpload");
  if (fav) fav.addEventListener("change", async () => {
    const file = fav.files && fav.files[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    if (!dataUrl) return;
    assets.favicon = { dataUrl, mime: file.type || (parseDataUrl(dataUrl)?.mime || '') };
    contentChanged();
    if (state.livePreview) rebuildPreview(true);
  });

  const og = $("ogImageUpload");
  if (og) og.addEventListener("change", async () => {
    const file = og.files && og.files[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    if (!dataUrl) return;
    assets.ogImage = { dataUrl, mime: file.type || (parseDataUrl(dataUrl)?.mime || '') };
    contentChanged();
    if (state.livePreview) rebuildPreview(true);
  });

  $("btnDownload").addEventListener("click", async () => {
    syncStateFromSettingsInputs();
    if (state.exportMode === "single") {
      // export: separate files? -> simplest: one index.html with inline CSS/JS
      downloadText("index.html", buildSingleHtml({ inlineAssets: true, preview: false }));
      return;
    }
    const files = buildZipFiles({ inlineAssets: false, preview: false }); // export = external style.css + site.js
    await downloadZip(files);
  });

  $("btnReset").addEventListener("click", () => {
    const ok = confirm("Reset? Usunie bieżący szkic (lokalny zapis). Snapshot zostaje.");
    if (ok) resetDraft();
  });
  $("btnSaveSnapshot").addEventListener("click", () => saveSnapshot());
  $("btnLoadSnapshot").addEventListener("click", () => {
    const ok = confirm("Wczytać snapshot? Nadpisze bieżący szkic.");
    if (ok) loadSnapshot();
  });
  $("btnSampleData").addEventListener("click", () => generateSampleData());
}

function bindKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (!mod) return;

    const key = String(e.key || "").toLowerCase();
    const target = e.target;
    const tag = target && target.tagName ? target.tagName.toLowerCase() : "";
    const inInput = tag === "input" || tag === "textarea" || (target && target.isContentEditable);

    if (key === "s") {
      e.preventDefault();
      saveSnapshot();
      return;
    }

    // In inputs, keep native undo/redo.
    if (inInput) return;

    if (key === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }

    if (key === "y") {
      e.preventDefault();
      redo();
    }
  }, true);
}

function init() {
  bindPanelToggle();
  applyRolePreset(state.role);

  const loaded = loadDraft();
  if (!loaded) {
    $("exportMode").value = state.exportMode;
    $("role").value = state.role;
    $("theme").value = state.theme;
    $("template").value = state.template;
    $("accent").value = state.accent;
    $("sectionHeadersAlign").value = state.sectionHeadersAlign;
    $("siteName").value = state.siteName;
  } else {
    hardLockHeroFirst();
  }

  updateSnapshotPill();
  setLiveStatus();
  bindSettings();
  bindKeyboardShortcuts();

  setPreviewDevice(state.previewDevice || "desktop");

  // first render
  syncStateFromSettingsInputs();
  renderBlocksList();
  renderAddBlockSelect();
  renderBlockEditor();
  rebuildPreview(true);
}

init();
