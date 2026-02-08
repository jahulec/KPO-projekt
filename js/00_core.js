/* Auto-split from scripts.js | 00_core.js */

/* ==========================
   Generator strony artysty
   v9 (panel Styl + katalog szablonów + Styl preview + focus scroll)
========================== */

const STORAGE_KEY = "artist_site_generator_v9_draft";
const SNAPSHOT_KEY = "artist_site_generator_v9_snapshot"; // legacy single snapshot (backwards compatibility)
const SNAPSHOT_LIST_KEY = "artist_site_generator_v9_snapshots";
const SNAPSHOT_LIST_LIMIT = 20;
const ZIP_ROOT_FOLDER = "strona-artysta";
const PANEL_COLLAPSED_KEY = "artist_site_generator_v9_panel_collapsed";
const PANEL_SCROLLTOP_KEY = "artist_site_generator_v9_panel_scrolltop";
const PANEL_DETAILS_KEY = "artist_site_generator_v9_panel_details";
const LEGACY_STORAGE_KEY = "artist_site_generator_v6_draft";
const LEGACY_SNAPSHOT_KEY = "artist_site_generator_v6_snapshot";
const LEGACY_PANEL_COLLAPSED_KEY = "artist_site_generator_v6_panel_collapsed";

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


/* ==========================
   Modal focus + keyboard trap
   (polish: focus goes into modal, Tab stays inside, focus returns)
========================== */

function _isVisible(el){
  if(!el) return false;
  const r = el.getClientRects ? el.getClientRects() : null;
  return !!(r && r.length);
}

function _getFocusable(root){
  if(!root) return [];
  const sel = 'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),iframe,object,embed,[contenteditable="true"],[tabindex]:not([tabindex="-1"])';
  return Array.from(root.querySelectorAll(sel)).filter((el)=>{
    if(!el) return false;
    if(el.hasAttribute('disabled')) return false;
    if(el.getAttribute('aria-hidden') === 'true') return false;
    return _isVisible(el);
  });
}

function _focusFirstInDialog(card){
  if(!card) return;
  const f = _getFocusable(card);
  const target = f.length ? f[0] : card;
  if(target === card && !card.hasAttribute('tabindex')) card.setAttribute('tabindex','-1');
  try{ target.focus({ preventScroll: true }); }catch(e){ try{ target.focus(); }catch(e2){} }
}

function _trapTabKey(e, card){
  if(!card || e.key !== 'Tab') return;
  const f = _getFocusable(card);
  if(!f.length){ e.preventDefault(); return; }
  const first = f[0];
  const last = f[f.length - 1];
  const active = document.activeElement;
  const inside = card.contains(active);

  if(e.shiftKey){
    if(!inside || active === first){
      e.preventDefault();
      try{ last.focus({ preventScroll: true }); }catch(ex){ last.focus(); }
    }
  }else{
    if(!inside || active === last){
      e.preventDefault();
      try{ first.focus({ preventScroll: true }); }catch(ex){ first.focus(); }
    }
  }
}

function modalA11yOpen(wrap, cardSelector){
  if(!wrap) return;
  try{
    if(!wrap.__modalA11y) wrap.__modalA11y = { cardSelector, opener: null, bound: false };
    wrap.__modalA11y.cardSelector = cardSelector;
    wrap.__modalA11y.opener = document.activeElement;

    if(!wrap.__modalA11y.bound){
      wrap.__modalA11y.bound = true;
      document.addEventListener('keydown', (e)=>{
        try{
          // snapshot/issues use .isOpen
          const isOpen = wrap.classList && wrap.classList.contains('isOpen');
          if(!isOpen) return;
          const card = wrap.querySelector(wrap.__modalA11y.cardSelector);
          _trapTabKey(e, card);
        }catch(err){}
      }, true);
    }

    const card = wrap.querySelector(cardSelector);
    requestAnimationFrame(()=>{
      if(wrap.classList && wrap.classList.contains('isOpen')) _focusFirstInDialog(card);
    });
  }catch(e){}
}

function modalA11yClose(wrap){
  if(!wrap || !wrap.__modalA11y) return;
  try{
    const opener = wrap.__modalA11y.opener;
    wrap.__modalA11y.opener = null;
    if(opener && document.contains(opener)){
      try{ opener.focus({ preventScroll: true }); }catch(e){ try{ opener.focus(); }catch(e2){} }
    }
  }catch(e){}
}

function setSaveStatus(msg){ const el = document.getElementById("saveStatus"); if(el) el.textContent = msg; }
function setSnapshotStatus(msg){ const el = document.getElementById("snapshotStatus"); if(el) el.textContent = msg; }


let __toastT = 0;
function toast(msg, type = 'warn', ms = 4200){
  try{
    const host = document.getElementById('toastHost');
    if(!host) return;
    const el = document.createElement('div');
    el.className = 'toast toast--' + (type || 'warn');
    el.textContent = String(msg || '');
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('isIn'));
    window.setTimeout(() => {
      try{
        el.classList.remove('isIn');
        el.classList.add('isOut');
        window.setTimeout(() => { try{ el.remove(); }catch(e){} }, 260);
      }catch(e){}
    }, ms);
  }catch(e){}
}

let __flashT = null;
function flashStatus(msg, ms = 3500) {
  try {
    if (__flashT) clearTimeout(__flashT);
    const base = document.getElementById('saveStatus');
    if (base) {
      const prev = base.textContent;
      base.textContent = msg;
      base.classList.add('isWarn');
      __flashT = setTimeout(() => {
        base.textContent = prev;
        base.classList.remove('isWarn');
        __flashT = null;
      }, ms);
    }
    toast(msg, 'warn', ms);
  } catch (e) {}
}
function getLiveMode() {
  const m = String(state.liveMode || '').toLowerCase();
  if (m === 'off' || m === 'eco' || m === 'on') return m;
  return state.livePreview ? 'on' : 'off';
}

function setLiveMode(mode) {
  const m = String(mode || '').toLowerCase();
  state.liveMode = (m === 'eco' || m === 'off') ? m : 'on';
  // keep boolean for older code paths (but we try not to rely on it)
  state.livePreview = (state.liveMode !== 'off');
  setLiveStatus();
}

let _liveRebuildT = null;
let _liveRebuildRAF = 0;

function _queueLiveRebuild(){
  if (_liveRebuildRAF) return;
  _liveRebuildRAF = requestAnimationFrame(() => {
    _liveRebuildRAF = 0;
    rebuildPreview(true);
  });
}

function requestPreviewRebuild(kind = 'content', force = false) {
  if (force) {
    if (_liveRebuildT) { clearTimeout(_liveRebuildT); _liveRebuildT = null; }
    if (_liveRebuildRAF) { cancelAnimationFrame(_liveRebuildRAF); _liveRebuildRAF = 0; }
    rebuildPreview(true);
    return;
  }
  const mode = getLiveMode();
  if (mode === 'off') return;
  if (mode === 'on') {
    // Sklej wiele wywołań w jeden render (unikamy podwójnych odświeżeń)
    _queueLiveRebuild();
    return;
  }
  // ECO
  const delay = (kind === 'structure') ? 180 : 650;
  if (_liveRebuildT) clearTimeout(_liveRebuildT);
  _liveRebuildT = setTimeout(() => {
    _liveRebuildT = null;
    rebuildPreview(true);
  }, delay);
}

function setLiveStatus() {
  const el = $("liveStatus");
  if (!el) return;
  const mode = getLiveMode();
  const label = (mode === 'eco') ? 'ECO' : (mode === 'on' ? 'ON' : 'OFF');
  el.textContent = `LIVE: ${label}`;
  el.setAttribute("aria-pressed", String(mode !== 'off'));
  el.classList.toggle("isOff", mode === 'off');
  el.classList.toggle("isEco", mode === 'eco');
  el.title = "Zmień tryb LIVE (ON / ECO / OFF)";

  // Sync collapsed quick dock LIVE indicator.
  const q = document.getElementById("btnQuickLive");
  if (q) {
    q.classList.toggle("isOff", mode === 'off');
    q.classList.toggle("isEco", mode === 'eco');
    q.title = `LIVE: ${label} (klik: przełącz)`;
    q.setAttribute("aria-label", `LIVE: ${label}`);
  }
}

function setPreviewPageLabel(label) { $("previewPageLabel").textContent = label; }

function setPreviewMode(mode, doRebuild = true) {
  const m = (mode === "style") ? "style" : "page";
  state.previewMode = m;

  const btnPage = $("btnPreviewPage");
  const btnStyle = $("btnPreviewStyle");
  if (btnPage) btnPage.classList.toggle("isActive", m === "page");
  if (btnStyle) btnStyle.classList.toggle("isActive", m === "style");

  if (doRebuild) {
    saveDraft();
    rebuildPreview(true);
  }
}

function setPreviewDevice(device) {
  const d = (device || "desktop").toLowerCase();
  state.previewDevice = (d === "tablet" || d === "mobile") ? d : "desktop";
  const wrap = document.querySelector(".preview__frameWrap");
  if (wrap) wrap.setAttribute("data-device", state.previewDevice);

  document.querySelectorAll("[data-device]").forEach((btn) => {
    btn.classList.toggle("isActive", btn.getAttribute("data-device") === state.previewDevice);
  });
}

function freezePreviewAnimations(durationMs = 650) {
  const iframe = $("previewFrame");
  if (!iframe) return;
  try {
    const doc = iframe.contentDocument;
    if (!doc) return;
    const root = doc.documentElement;
    if (!root) return;
    root.classList.add("kpo-preload"); // reuse preview CSS: disables transitions/animations
    // clear previous timer
    try {
      if (freezePreviewAnimations._t) clearTimeout(freezePreviewAnimations._t);
    } catch (e) {}
    freezePreviewAnimations._t = setTimeout(() => {
      try { root.classList.remove("kpo-preload"); } catch (e) {}
    }, Math.max(0, Number(durationMs) || 0));
  } catch (e) {}
}

function setPanelCollapsed(collapsed, persist = true) {
  const app = document.querySelector(".app");
  if (!app) return;

  // ScrollTop musimy złapać PRZED zmianą klas (po zwinięciu panel ma overflow:hidden i scrollTop bywa zerowany).
  const panel = document.querySelector(".panel");
  const prevScrollTop = panel ? (panel.scrollTop || 0) : 0;

    // Zmiana szerokości podglądu potrafi odpalać animacje (np. hamburger). Tymczasowo je blokujemy.
  freezePreviewAnimations(750);

  app.classList.toggle("isPanelCollapsed", !!collapsed);

  // Zapamiętaj pozycję scrolla panelu przy zwijaniu i przywróć przy rozwinięciu.
  if (panel) {
    if (collapsed) {
      try { localStorage.setItem(PANEL_SCROLLTOP_KEY, String(prevScrollTop)); } catch (e) {}
    } else {
      let st = 0;
      try { st = Number(localStorage.getItem(PANEL_SCROLLTOP_KEY) || 0) || 0; } catch (e) {}
      // Dwa RAF-y, bo po rozwinięciu DOM i wysokości detailsów potrafią się przeliczyć dopiero w kolejnej klatce.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        try { panel.scrollTop = st; } catch (e) {}
      }));
    }
  }

  // If a "Więcej" overlay is open, close it when panel state changes.
  try { closeQuickMoreMenu(); } catch (e) {}

  const btn = $("btnTogglePanel");
  if (btn) {
    const isCollapsed = app.classList.contains("isPanelCollapsed");
    // Stały rozmiar ikony (SVG chevron) – taki sam dla rozwiń/zwiń.
    const iconExpand = '<svg class="qi qi--toggle" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
      + '<path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
      + '</svg>';
    const iconCollapse = '<svg class="qi qi--toggle" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
      + '<path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
      + '</svg>';
    btn.innerHTML = isCollapsed ? iconExpand : iconCollapse;
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
  try {
    const v9 = localStorage.getItem(PANEL_COLLAPSED_KEY);
    const v6 = localStorage.getItem(LEGACY_PANEL_COLLAPSED_KEY);
    initialCollapsed = (v9 ?? v6) === "1";
  } catch (e) {}
  setPanelCollapsed(initialCollapsed, false);

  btn.addEventListener("click", () => {
    const app = document.querySelector(".app");
    const isCollapsed = !!(app && app.classList.contains("isPanelCollapsed"));
    setPanelCollapsed(!isCollapsed, true);
  });
}


function bindPanelDetailsPersistence() {
  // Persist open/close state for main panel sections (ids on <details>). 
  // Important: persist ONLY user-initiated toggles (click on <summary>), not programmatic opens (np. focus z listy błędów).
  const details = Array.from(document.querySelectorAll('.panel .panel__section[id]'));
  if (!details.length) return;

  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(PANEL_DETAILS_KEY) || '{}') || {}; } catch (e) { saved = {}; }

  // Restore
  for (const d of details) {
    const id = d.id;
    if (!id) continue;
    if (Object.prototype.hasOwnProperty.call(saved, id)) {
      try { d.open = !!saved[id]; } catch (e) {}
    }
  }

  // Track user toggles
  let lastUserToggleId = null;
  for (const d of details) {
    const sum = d.querySelector(':scope > summary');
    if (sum) {
      sum.addEventListener('click', () => { lastUserToggleId = d.id || null; }, true);
    }
  }

  function persistIfUser(det) {
    if (!det || !det.id) return;
    if (det.id != lastUserToggleId) return;
    lastUserToggleId = null;

    const out = {};
    for (const d of details) {
      if (d.id) out[d.id] = !!d.open;
    }
    try { localStorage.setItem(PANEL_DETAILS_KEY, JSON.stringify(out)); } catch (e) {}
  }

  for (const d of details) {
    d.addEventListener('toggle', () => persistIfUser(d));
  }
}


/* ==========================
   Quick actions dock (collapsed panel)
   Reuses existing buttons from the "Akcje" section.
========================== */

let __quickMoreOpen = false;

function closeQuickMoreMenu() {
  const menu = document.getElementById("quickMoreMenu");
  const btn = document.getElementById("btnQuickMore");
  if (menu) {
    menu.hidden = true;
    menu.style.left = "";
    menu.style.top = "";
  }
  if (btn) btn.setAttribute("aria-expanded", "false");
  __quickMoreOpen = false;
  document.removeEventListener("click", __quickMoreOutsideClick, true);
  document.removeEventListener("keydown", __quickMoreKeydown, true);
  window.removeEventListener("resize", __quickMoreReposition, true);
}

function __quickMoreOutsideClick(e) {
  const menu = document.getElementById("quickMoreMenu");
  const btn = document.getElementById("btnQuickMore");
  if (!__quickMoreOpen) return;
  if (menu && menu.contains(e.target)) return;
  if (btn && btn.contains(e.target)) return;
  closeQuickMoreMenu();
}

function __quickMoreKeydown(e) {
  if (!__quickMoreOpen) return;
  if (e && (e.key === "Escape" || e.key === "Esc")) {
    e.preventDefault();
    closeQuickMoreMenu();
  }
}

function __quickMoreReposition() {
  if (!__quickMoreOpen) return;
  positionQuickMoreMenu();
}

function positionQuickMoreMenu() {
  const menu = document.getElementById("quickMoreMenu");
  const btn = document.getElementById("btnQuickMore");
  if (!menu || !btn) return;
  if (menu.hidden) return;

  const rect = btn.getBoundingClientRect();
  const panel = document.querySelector(".panel");
  const panelRect = panel ? panel.getBoundingClientRect() : null;
  const margin = 12;

  // Ensure the menu has a layout box we can measure.
  menu.style.left = "0px";
  menu.style.top = "0px";

  const m = menu.getBoundingClientRect();

  // Menu ma wyglądać symetrycznie: stały odstęp od krawędzi panelu + wycentrowanie względem przycisku.
  let left = (panelRect ? panelRect.right + 12 : rect.right + 10);
  let top = rect.top + (rect.height / 2) - (m.height / 2);

  if (left + m.width > window.innerWidth - margin) {
    left = window.innerWidth - margin - m.width;
  }
  if (top + m.height > window.innerHeight - margin) {
    top = window.innerHeight - margin - m.height;
  }
  if (left < margin) left = margin;
  if (top < margin) top = margin;

  menu.style.left = `${Math.round(left)}px`;
  menu.style.top = `${Math.round(top)}px`;
}

function openQuickMoreMenu() {
  const app = document.querySelector(".app");
  if (!app || !app.classList.contains("isPanelCollapsed")) return;

  const menu = document.getElementById("quickMoreMenu");
  const btn = document.getElementById("btnQuickMore");
  if (!menu || !btn) return;

  menu.hidden = false;
  __quickMoreOpen = true;
  btn.setAttribute("aria-expanded", "true");

  positionQuickMoreMenu();

  document.addEventListener("click", __quickMoreOutsideClick, true);
  document.addEventListener("keydown", __quickMoreKeydown, true);
  window.addEventListener("resize", __quickMoreReposition, true);
}

function toggleQuickMoreMenu() {
  if (__quickMoreOpen) closeQuickMoreMenu();
  else openQuickMoreMenu();
}

function bindQuickDock() {
  const dock = document.getElementById("quickDock");
  if (dock) {
    dock.addEventListener("click", (e) => {
      const moreBtn = e.target.closest("#btnQuickMore");
      if (moreBtn) {
        toggleQuickMoreMenu();
        return;
      }
      const b = e.target.closest("[data-fire]");
      if (!b) return;
      const id = b.getAttribute("data-fire");
      const target = id ? document.getElementById(id) : null;
      if (target) target.click();
    });
  }

  const menu = document.getElementById("quickMoreMenu");
  if (menu) {
    menu.addEventListener("click", (e) => {
      const item = e.target.closest("[data-fire]");
      if (!item) return;
      const id = item.getAttribute("data-fire");
      const target = id ? document.getElementById(id) : null;
      if (target) target.click();
      closeQuickMoreMenu();
    });
  }
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
  store:        { label: "Merch / sklep", editor: "store" },
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
  musician: ["hero","about","spotify","youtube","events","store","epk","contact","social"],
  dj: ["hero","about","spotify","youtube","events","store","epk","contact","social"],
  photographer: ["hero","about","gallery","exhibitions","services","clients","contact","social"],
  visual: ["hero","about","gallery","exhibitions","awards","contact","social"],
  designer: ["hero","about","caseStudies","services","testimonials","clients","contact","social"],
  filmmaker: ["hero","about","youtube","projects","services","clients","contact","social"],
  writer: ["hero","about","publications","events","epk","newsletter","contact","social"],
  performer: ["hero","about","youtube","events","epk","contact","social"],
};

/* ==========================
   Styl: katalog + UI
========================== */

const BASIC_VARIANTS = [
  { id: "underline", label: "Underline", preset: { accentType: "underline" } },
  { id: "pills", label: "Pills", preset: { accentType: "pill", radius: "lg" } },
  { id: "outline", label: "Outline", preset: { accentType: "outline" } },
  { id: "glow", label: "Glow", preset: { accentType: "gradient" } },
];

const STYLE_CATALOG = {
  flagship: [
    {
      id: "editorial",
      name: "Editorial / Magazine",
      desc: "Serif + linie: jak magazyn",
      thumb: "linear-gradient(135deg, #ffffff, #e5e7eb)",
      preset: {
        theme: "minimalist",
        fontPreset: "editorial",
        accent: "#9f1239",
        accentType: "underline",

        headerLayout: "left",
        headerBg: "solid",
        headerWidth: "normal",

        heroWidth: "normal",
        contentWidth: "normal",

        density: "comfortable",
        borders: "thin",
        radius: "0",
        sectionDividers: "line",
        motion: "subtle",
        scrollMode: "normal",
        sectionHeadersAlign: "left",
        mediaLayout: "stack",
      },
      blockPreset: {
        gallery: { layout: "grid", cols: 4, masonryCols: 3 },
        spotify: { embedSize: 75 },
        youtube: { embedSize: 75 },
      },
      variants: [
        { id: "classic", label: "Classic", preset: {} },
        { id: "wide", label: "Wide", preset: { contentWidth: "wide" } },
        { id: "compact", label: "Compact", preset: { density: "compact" } },
      ],
    },

    {
      id: "cinematic",
      name: "Cinematic Dark",
      desc: "Ciemny landing, full-bleed HERO",
      thumb: "linear-gradient(135deg, #0b1020, #111827)",
      preset: {
        theme: "modern",
        fontPreset: "space",
        accent: "#14b8a6",
        accentType: "gradient",

        headerLayout: "left",
        headerBg: "transparent",
        headerWidth: "full",

        heroWidth: "full",
        contentWidth: "normal",

        density: "normal",
        borders: "none",
        radius: "md",
        sectionDividers: "none",
        motion: "strong",
        scrollMode: "normal",
        sectionHeadersAlign: "left",
        mediaLayout: "split",
      },
      blockPreset: {
        gallery: { layout: "masonry", cols: 4, masonryCols: 3 },
        spotify: { embedSize: 60 },
        youtube: { embedSize: 60 },
      },
      variants: [
        { id: "standard", label: "Standard", preset: {} },
        { id: "tight", label: "Tight", preset: { density: "compact" } },
        { id: "glow", label: "Glow", preset: { motion: "strong" } },
      ],
    },

    {
      id: "brutalist",
      name: "Brutalist Type",
      desc: "Grube linie, zero ozdobników",
      thumb: "linear-gradient(135deg, #f8fafc, #111827)",
      preset: {
        theme: "minimalist",
        fontPreset: "plex",
        accent: "#dc2626",
        accentType: "outline",

        headerLayout: "left",
        headerBg: "solid",
        headerWidth: "full",

        heroWidth: "wide",
        contentWidth: "normal",

        density: "compact",
        borders: "thick",
        radius: "0",
        sectionDividers: "block",
        motion: "off",
        scrollMode: "normal",
        sectionHeadersAlign: "left",
        mediaLayout: "stack",
      },
      blockPreset: {
        gallery: { layout: "grid", cols: 6, masonryCols: 3 },
        spotify: { embedSize: 55 },
        youtube: { embedSize: 55 },
      },
      variants: [
        { id: "poster", label: "Poster", preset: {} },
        { id: "clean", label: "Clean", preset: { borders: "thin" } },
        { id: "compact", label: "Compact", preset: { density: "compact" } },
      ],
    },

    {
      id: "neon",
      name: "Neon Club",
      desc: "Glow, pill header, nocny vibe",
      thumb: "linear-gradient(135deg, #0b1020, #4c1d95)",
      preset: {
        theme: "modern",
        fontPreset: "space",
        accent: "#a855f7",
        accentType: "gradient",

        headerLayout: "center",
        headerBg: "pill",
        headerWidth: "wide",

        heroWidth: "full",
        contentWidth: "wide",

        density: "normal",
        borders: "thin",
        radius: "lg",
        sectionDividers: "none",
        motion: "strong",
        scrollMode: "normal",
        sectionHeadersAlign: "center",
        mediaLayout: "split",
      },
      blockPreset: {
        gallery: { layout: "masonry", cols: 4, masonryCols: 4 },
        spotify: { embedSize: 60 },
        youtube: { embedSize: 60 },
      },
      variants: [
        { id: "club", label: "Club", preset: {} },
        { id: "soft", label: "Soft", preset: { motion: "subtle" } },
        { id: "outline", label: "Outline", preset: { accentType: "outline" } },
      ],
    },

    {
      id: "soft",
      name: "Soft Pastel",
      desc: "Miękko, karty, dużo oddechu",
      thumb: "linear-gradient(135deg, #fdf2f8, #ecfeff)",
      preset: {
        theme: "minimalist",
        fontPreset: "inter",
        accent: "#ec4899",
        accentType: "pill",

        headerLayout: "left",
        headerBg: "pill",
        headerWidth: "normal",

        heroWidth: "wide",
        contentWidth: "normal",

        density: "comfortable",
        borders: "thin",
        radius: "lg",
        sectionDividers: "none",
        motion: "subtle",
        scrollMode: "normal",
        sectionHeadersAlign: "center",
        mediaLayout: "stack",
      },
      blockPreset: {
        gallery: { layout: "grid", cols: 3, masonryCols: 3 },
        spotify: { embedSize: 80 },
        youtube: { embedSize: 80 },
      },
      variants: [
        { id: "cards", label: "Cards", preset: {} },
        { id: "tight", label: "Tight", preset: { density: "normal" } },
        { id: "line", label: "Line", preset: { sectionDividers: "line" } },
      ],
    },

    {
      id: "swiss",
      name: "Swiss Grid",
      desc: "Minimal, siatka, równe linie",
      thumb: "linear-gradient(135deg, #ffffff, #0f172a)",
      preset: {
        theme: "minimalist",
        fontPreset: "system",
        accent: "#2563eb",
        accentType: "underline",

        headerLayout: "left",
        headerBg: "solid",
        headerWidth: "normal",

        heroWidth: "wide",
        contentWidth: "wide",

        density: "compact",
        borders: "thin",
        radius: "0",
        sectionDividers: "line",
        motion: "off",
        scrollMode: "normal",
        sectionHeadersAlign: "left",
        mediaLayout: "split",
      },
      blockPreset: {
        gallery: { layout: "grid", cols: 4, masonryCols: 3 },
        spotify: { embedSize: 60 },
        youtube: { embedSize: 60 },
      },
      variants: [
        { id: "grid", label: "Grid", preset: {} },
        { id: "wide", label: "Wide", preset: { contentWidth: "wide" } },
        { id: "compact", label: "Compact", preset: { density: "compact" } },
      ],
    },

    {
      id: "rounded",
      name: "Rounded Modern",
      desc: "Nowoczesne karty, miękkie UI",
      thumb: "linear-gradient(135deg, #e0e7ff, #ffffff)",
      preset: {
        theme: "minimalist",
        fontPreset: "inter",
        accent: "#16a34a",
        accentType: "pill",

        headerLayout: "left",
        headerBg: "solid",
        headerWidth: "wide",

        heroWidth: "wide",
        contentWidth: "normal",

        density: "normal",
        borders: "none",
        radius: "lg",
        sectionDividers: "block",
        motion: "subtle",
        scrollMode: "normal",
        sectionHeadersAlign: "left",
        mediaLayout: "stack",
      },
      blockPreset: {
        gallery: { layout: "grid", cols: 3, masonryCols: 3 },
        spotify: { embedSize: 70 },
        youtube: { embedSize: 70 },
      },
      variants: [
        { id: "smooth", label: "Smooth", preset: {} },
        { id: "outline", label: "Outline", preset: { accentType: "outline" } },
        { id: "tight", label: "Tight", preset: { density: "compact" } },
      ],
    },

    {
      id: "colorwash",
      name: "Colorwash",
      desc: "Sekcje jak plansze, ciepły vibe",
      thumb: "linear-gradient(135deg, #fef3c7, #bfdbfe)",
      preset: {
        theme: "minimalist",
        fontPreset: "inter",
        accent: "#f59e0b",
        bgColor: "#fef3c7",
        accentType: "pill",

        headerLayout: "center",
        headerBg: "transparent",
        headerWidth: "wide",

        heroWidth: "wide",
        contentWidth: "normal",

        density: "comfortable",
        borders: "none",
        radius: "lg",
        sectionDividers: "block",
        motion: "subtle",
        scrollMode: "normal",
        sectionHeadersAlign: "center",
        mediaLayout: "split",
      },
      blockPreset: {
        gallery: { layout: "masonry", cols: 3, masonryCols: 3 },
        spotify: { embedSize: 70 },
        youtube: { embedSize: 70 },
      },
      variants: [
        { id: "soft", label: "Soft", preset: {} },
        { id: "wide", label: "Wide", preset: { contentWidth: "wide" } },
        { id: "pills", label: "Pills", preset: { accentType: "pill" } },
      ],
    },

    {
      id: "spotlight",
      name: "Spotlight Sections",
      desc: "Prowadzi wzrok: focus scroll",
      thumb: "linear-gradient(135deg, #111827, #f97316)",
      preset: {
        theme: "modern",
        fontPreset: "editorial",
        accent: "#f97316",
        accentType: "gradient",

        headerLayout: "left",
        headerBg: "transparent",
        headerWidth: "full",

        heroWidth: "full",
        contentWidth: "normal",

        density: "normal",
        borders: "none",
        radius: "md",
        sectionDividers: "none",
        motion: "subtle",
        scrollMode: "focus",
        sectionHeadersAlign: "left",
        mediaLayout: "stack",
      },
      blockPreset: {
        gallery: { layout: "masonry", cols: 3, masonryCols: 3 },
        spotify: { embedSize: 75 },
        youtube: { embedSize: 75 },
      },
      variants: [
        { id: "focus", label: "Focus", preset: { scrollMode: "focus" } },
        { id: "normal", label: "Normal", preset: { scrollMode: "normal" } },
      ],
    },

    {
      id: "square",
      name: "Monochrome",
      desc: "Czarno-białe: kontrast i typografia",
      thumb: "linear-gradient(135deg, #0b0f19, #ffffff)",
      preset: {
        theme: "minimalist",
        fontPreset: "system",
        accent: "#111827",
        accentType: "underline",

        headerLayout: "left",
        headerBg: "solid",
        headerWidth: "normal",

        heroWidth: "normal",
        contentWidth: "normal",

        density: "normal",
        borders: "thin",
        radius: "0",
        sectionDividers: "none",
        motion: "off",
        scrollMode: "normal",
        sectionHeadersAlign: "left",
        mediaLayout: "stack",
      },
      blockPreset: {
        gallery: { layout: "grid", cols: 4, masonryCols: 3 },
        spotify: { embedSize: 65 },
        youtube: { embedSize: 65 },
      },
      variants: [
        { id: "standard", label: "Standard", preset: {} },
        { id: "compact", label: "Compact", preset: { density: "compact" } },
        { id: "wide", label: "Wide", preset: { contentWidth: "wide" } },
      ],
    },
  ],
  basic: [
    {
      id: "basic-clean",
      name: "Basic Clean",
      desc: "Szybko i schludnie",
      thumb: "linear-gradient(135deg, #ffffff, #f1f5f9)",
      preset: {
        theme: "minimalist",
        headerLayout: "left",
        contentWidth: "normal",
        headerWidth: "normal",
        heroWidth: "normal",
        mediaLayout: "stack",
        density: "comfortable",
        borders: "thin",
        radius: "md",
        sectionDividers: "none",
        motion: "subtle",
        scrollMode: "normal",
        sectionHeadersAlign: "left",
      },
      variants: BASIC_VARIANTS,
    },
    {
      id: "basic-dark",
      name: "Basic Dark",
      desc: "Ciemny, prosty, czytelny",
      thumb: "linear-gradient(135deg, #0b1020, #111827)",
      preset: {
        theme: "modern",
        headerLayout: "left",
        contentWidth: "normal",
        headerWidth: "normal",
        heroWidth: "wide",
        mediaLayout: "split",
        density: "comfortable",
        borders: "thin",
        radius: "md",
        sectionDividers: "none",
        motion: "subtle",
        scrollMode: "normal",
        sectionHeadersAlign: "left",
      },
      variants: BASIC_VARIANTS,
    },
    {
      id: "basic-cards",
      name: "Basic Cards",
      desc: "Sekcje jako karty",
      thumb: "linear-gradient(135deg, #ecfeff, #e0e7ff)",
      preset: {
        theme: "minimalist",
        headerLayout: "center",
        contentWidth: "normal",
        headerWidth: "normal",
        heroWidth: "wide",
        mediaLayout: "split",
        density: "comfortable",
        borders: "thin",
        radius: "lg",
        sectionDividers: "block",
        motion: "subtle",
        scrollMode: "normal",
        sectionHeadersAlign: "center",
      },
      variants: BASIC_VARIANTS,
    },
    {
      id: "basic-colorwash",
      name: "Basic Colorwash",
      desc: "Delikatne tła sekcji",
      thumb: "linear-gradient(135deg, #fef3c7, #bfdbfe)",
      preset: {
        theme: "minimalist",
        headerLayout: "center",
        contentWidth: "normal",
        headerWidth: "wide",
        heroWidth: "normal",
        mediaLayout: "stack",
        density: "comfortable",
        borders: "none",
        radius: "lg",
        sectionDividers: "block",
        motion: "subtle",
        scrollMode: "normal",
        sectionHeadersAlign: "center",
      },
      variants: BASIC_VARIANTS,
    },
    {
      id: "basic-classic",
      name: "Basic Classic",
      desc: "Spokojnie, tradycyjnie",
      thumb: "linear-gradient(135deg, #fff7ed, #fafaf9)",
      preset: {
        theme: "minimalist",
        headerLayout: "left",
        contentWidth: "normal",
        headerWidth: "normal",
        heroWidth: "normal",
        mediaLayout: "stack",
        density: "normal",
        borders: "thin",
        radius: "md",
        sectionDividers: "line",
        motion: "off",
        scrollMode: "normal",
        sectionHeadersAlign: "left",
      },
      variants: BASIC_VARIANTS,
    },
  ],
};

function getStyleEntries() {
  return STYLE_CATALOG[state.styleCollection] || STYLE_CATALOG.flagship;
}

function findStyleEntry(id) {
  const all = [...(STYLE_CATALOG.flagship || []), ...(STYLE_CATALOG.basic || [])];
  return all.find(e => e.id === id) || null;
}

function syncStyleCollectionButtons() {
  const a = state.styleCollection === "basic" ? "basic" : "flagship";
  const bFlag = $("btnCollectionFlagship");
  const bBasic = $("btnCollectionBasic");
  if (bFlag) bFlag.classList.toggle("isActive", a === "flagship");
  if (bBasic) bBasic.classList.toggle("isActive", a === "basic");
}

function syncThemeButtons() {
  const bLight = $("btnThemeLight");
  const bDark = $("btnThemeDark");

  const t = String(state.theme || "");
  // Usuwamy "elegant" — zostaje tylko jasny/ciemny.
  if (!t || !["minimalist","modern"].includes(t)) state.theme = "minimalist";

  if (bLight) bLight.classList.toggle("isActive", state.theme === "minimalist");
  if (bDark) bDark.classList.toggle("isActive", state.theme === "modern");
}

function applyStylePreset(preset) {
  if (!preset) return;
  for (const [k, v] of Object.entries(preset)) {
    if (k in state) state[k] = v;
  }
  if ($("accent")) $("accent").value = state.accent;
  if ($("bgColor")) $("bgColor").value = state.bgColor;
  if ($("fontPreset")) $("fontPreset").value = state.fontPreset;
  if ($("sectionTitleAlign")) $("sectionTitleAlign").value = state.sectionHeadersAlign;
  if ($("accentType")) $("accentType").value = state.accentType;
  if ($("motion")) $("motion").value = state.motion;
  if ($("scrollMode")) $("scrollMode").value = state.scrollMode;
  if ($("mediaLayout")) $("mediaLayout").value = state.mediaLayout;
  if ($("headerLayout")) $("headerLayout").value = state.headerLayout;
  if ($("headerBg")) $("headerBg").value = state.headerBg;
  if ($("contentWidth")) $("contentWidth").value = state.contentWidth;
  if ($("headerWidth")) $("headerWidth").value = state.headerWidth;
  if ($("heroWidth")) $("heroWidth").value = state.heroWidth;
  if ($("density")) $("density").value = state.density;
  if ($("borders")) $("borders").value = state.borders;
  if ($("radius")) $("radius").value = state.radius;
  if ($("sectionDividers")) $("sectionDividers").value = state.sectionDividers;

  syncStyleCollectionButtons();
  syncThemeButtons();

  // pokaż/ukryj kontrolki zależne od szablonu
  syncTemplateDependentStyleControls();
}

function syncTemplateDependentStyleControls(){
  const wrap = $("bgColorControls");
  if (wrap) {
    const isCW = String(state.template || "") === "colorwash";
    wrap.classList.toggle("isHiddenControl", !isCW);
  }
}

function applyBlockPresetForStyle(entry){
  const p = entry && entry.blockPreset;
  if (!p) return;
  const blocks = state.blocks || {};
  for (const blockId of Object.keys(blocks)) {
    const base = String(blockId || "").split("__")[0];
    const bp = p[base];
    if (!bp) continue;
    const cfg = blocks[blockId];
    if (!cfg) continue;
    if (!cfg.data || typeof cfg.data !== 'object') cfg.data = {};
    for (const [k, v] of Object.entries(bp)) {
      cfg.data[k] = v;
    }
  }
}

function selectStyleTemplate(templateId) {
  const entry = findStyleEntry(templateId);
  if (!entry) return;

  state.template = entry.id;

  applyStylePreset(entry.preset);

  // Style może chcieć narzucić domyślne zachowanie bloków (np. galeria: grid/masonry, rozmiar embedów).
  // Celowo: zmiana stylu ma realnie zmieniać wygląd, więc aktualizujemy ustawienia bloków.
  applyBlockPresetForStyle(entry);

  // Warianty usunięte: jeden szablon = jeden preset.
  state.templateVariant = "";

  renderStyleUi();
  contentChanged();
}

function renderStyleUi() {
  const grid = $("templateGrid");
  if (!grid) return;

  const entries = getStyleEntries();
  grid.innerHTML = entries.map((e) => {
    const active = e.id === state.template ? " isActive" : "";
    const thumb = e.thumb || "linear-gradient(135deg,#e5e7eb,#ffffff)";
    return `
      <button type="button" class="tplCard${active}" data-template-id="${escapeHtml(e.id)}" aria-pressed="${e.id === state.template}">
        <div class="tplThumb" style="background:${thumb}"></div>
        <div class="tplMeta">
          <div class="tplName">${escapeHtml(e.name)}</div>
          <div class="tplDesc">${escapeHtml(e.desc)}</div>
        </div>
      </button>
    `;
  }).join("");
}

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

