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

function setPanelCollapsed(collapsed, persist = true) {
  const app = document.querySelector(".app");
  if (!app) return;

  // ScrollTop musimy złapać PRZED zmianą klas (po zwinięciu panel ma overflow:hidden i scrollTop bywa zerowany).
  const panel = document.querySelector(".panel");
  const prevScrollTop = panel ? (panel.scrollTop || 0) : 0;

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
      desc: "Serif, hierarchia, dużo światła",
      thumb: "linear-gradient(135deg, #ffffff, #e5e7eb)",
      preset: {
        theme: "minimalist",
        headerLayout: "center",
        contentWidth: "normal",
        headerWidth: "normal",
        heroWidth: "normal",
        mediaLayout: "stack",
        density: "comfortable",
        borders: "thin",
        radius: "md",
        sectionDividers: "line",
        accentType: "underline",
        motion: "subtle",
        scrollMode: "normal",
        sectionHeadersAlign: "left",
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
      desc: "Ciemny, pełnoekranowy hero, minimal",
      thumb: "linear-gradient(135deg, #0b1020, #111827)",
      preset: {
        theme: "modern",
        headerLayout: "left",
        contentWidth: "wide",
        headerWidth: "full",
        heroWidth: "full",
        mediaLayout: "split",
        density: "normal",
        borders: "none",
        radius: "md",
        sectionDividers: "none",
        accentType: "gradient",
        motion: "subtle",
        scrollMode: "normal",
        sectionHeadersAlign: "left",
      },
      variants: [
        { id: "standard", label: "Standard", preset: {} },
        { id: "tight", label: "Tight", preset: { density: "compact" } },
        { id: "glow", label: "Glow", preset: { accentType: "gradient" } },
      ],
    },
    {
      id: "brutalist",
      name: "Brutalist Type",
      desc: "Mocna typografia i linie",
      thumb: "linear-gradient(135deg, #f8fafc, #111827)",
      preset: {
        theme: "minimalist",
        headerLayout: "left",
        contentWidth: "wide",
        headerWidth: "wide",
        heroWidth: "wide",
        mediaLayout: "split",
        density: "compact",
        borders: "thick",
        radius: "0",
        sectionDividers: "line",
        accentType: "outline",
        motion: "off",
        scrollMode: "normal",
        sectionHeadersAlign: "left",
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
      desc: "Glow, gradienty, nocny vibe",
      thumb: "linear-gradient(135deg, #0b1020, #4c1d95)",
      preset: {
        theme: "modern",
        headerLayout: "left",
        contentWidth: "normal",
        headerWidth: "full",
        heroWidth: "full",
        mediaLayout: "split",
        density: "comfortable",
        borders: "thin",
        radius: "lg",
        sectionDividers: "none",
        accentType: "gradient",
        motion: "strong",
        scrollMode: "normal",
        sectionHeadersAlign: "left",
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
      desc: "Miękkie tła, oddech, karty",
      thumb: "linear-gradient(135deg, #fdf2f8, #ecfeff)",
      preset: {
        theme: "minimalist",
        headerLayout: "center",
        contentWidth: "normal",
        headerWidth: "normal",
        heroWidth: "wide",
        mediaLayout: "stack",
        density: "comfortable",
        borders: "thin",
        radius: "lg",
        sectionDividers: "block",
        accentType: "pill",
        motion: "subtle",
        scrollMode: "normal",
        sectionHeadersAlign: "center",
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
      desc: "Siatka, ostre linie, minimal",
      thumb: "linear-gradient(135deg, #ffffff, #0f172a)",
      preset: {
        theme: "minimalist",
        headerLayout: "left",
        contentWidth: "wide",
        headerWidth: "wide",
        heroWidth: "normal",
        mediaLayout: "split",
        density: "normal",
        borders: "thin",
        radius: "0",
        sectionDividers: "line",
        accentType: "underline",
        motion: "off",
        scrollMode: "normal",
        sectionHeadersAlign: "left",
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
      desc: "Zaokrąglone elementy, nowocześnie",
      thumb: "linear-gradient(135deg, #e0e7ff, #ffffff)",
      preset: {
        theme: "minimalist",
        headerLayout: "left",
        contentWidth: "normal",
        headerWidth: "normal",
        heroWidth: "normal",
        mediaLayout: "split",
        density: "comfortable",
        borders: "thin",
        radius: "lg",
        sectionDividers: "none",
        accentType: "pill",
        motion: "subtle",
        scrollMode: "normal",
        sectionHeadersAlign: "left",
      },
      variants: [
        { id: "smooth", label: "Smooth", preset: {} },
        { id: "outline", label: "Outline", preset: { accentType: "outline" } },
        { id: "tight", label: "Tight", preset: { density: "normal" } },
      ],
    },
    {
      id: "colorwash",
      name: "Colorwash",
      desc: "Tła sekcji w kolorach, miękko",
      thumb: "linear-gradient(135deg, #fef3c7, #bfdbfe)",
      preset: {
        theme: "minimalist",
        headerLayout: "center",
        contentWidth: "normal",
        headerWidth: "normal",
        heroWidth: "wide",
        mediaLayout: "stack",
        density: "comfortable",
        borders: "none",
        radius: "lg",
        sectionDividers: "block",
        accentType: "underline",
        motion: "subtle",
        scrollMode: "normal",
        sectionHeadersAlign: "center",
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
      desc: "Aktywna sekcja 100%, reszta wygaszona",
      thumb: "linear-gradient(135deg, #111827, #f97316)",
      preset: {
        theme: "modern",
        headerLayout: "left",
        contentWidth: "normal",
        headerWidth: "wide",
        heroWidth: "wide",
        mediaLayout: "split",
        density: "normal",
        borders: "thin",
        radius: "md",
        sectionDividers: "none",
        accentType: "gradient",
        motion: "subtle",
        scrollMode: "focus",
        sectionHeadersAlign: "left",
      },
      variants: [
        { id: "focus", label: "Focus", preset: { scrollMode: "focus" } },
        { id: "normal", label: "Normal", preset: { scrollMode: "normal" } },
      ],
    },
    {
      id: "square",
      name: "Square Minimal",
      desc: "Prosto i równo",
      thumb: "linear-gradient(135deg, #ffffff, #e2e8f0)",
      preset: {
        theme: "minimalist",
        headerLayout: "left",
        contentWidth: "normal",
        headerWidth: "normal",
        heroWidth: "normal",
        mediaLayout: "stack",
        density: "compact",
        borders: "thin",
        radius: "0",
        sectionDividers: "line",
        accentType: "underline",
        motion: "off",
        scrollMode: "normal",
        sectionHeadersAlign: "left",
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
  if ($("sectionTitleAlign")) $("sectionTitleAlign").value = state.sectionHeadersAlign;
  if ($("accentType")) $("accentType").value = state.accentType;
  if ($("motion")) $("motion").value = state.motion;
  if ($("scrollMode")) $("scrollMode").value = state.scrollMode;
  if ($("mediaLayout")) $("mediaLayout").value = state.mediaLayout;
  if ($("headerLayout")) $("headerLayout").value = state.headerLayout;
  if ($("contentWidth")) $("contentWidth").value = state.contentWidth;
  if ($("density")) $("density").value = state.density;
  if ($("borders")) $("borders").value = state.borders;
  if ($("radius")) $("radius").value = state.radius;
  if ($("sectionDividers")) $("sectionDividers").value = state.sectionDividers;

  syncStyleCollectionButtons();
  syncThemeButtons();
}

function selectStyleTemplate(templateId) {
  const entry = findStyleEntry(templateId);
  if (!entry) return;

  state.template = entry.id;

  applyStylePreset(entry.preset);

  // Warianty usunięte: jeden szablon = jeden preset.
  state.templateVariant = "";

  renderStyleUi();
  if ($("headerWidth")) $("headerWidth").value = state.headerWidth;
  if ($("heroWidth")) $("heroWidth").value = state.heroWidth;
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

