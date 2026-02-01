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
function requestPreviewRebuild(kind = 'content', force = false) {
  if (force) {
    if (_liveRebuildT) { clearTimeout(_liveRebuildT); _liveRebuildT = null; }
    rebuildPreview(true);
    return;
  }
  const mode = getLiveMode();
  if (mode === 'off') return;
  if (mode === 'on') {
    rebuildPreview(true);
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
        density: "normal",
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
        density: "normal",
        borders: "thin",
        radius: "md",
        sectionDividers: "none",
        accentType: "underline",
        motion: "subtle",
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

  const variants = Array.isArray(entry.variants) ? entry.variants : [];
  if (variants.length) {
    if (!variants.some(v => v.id === state.templateVariant)) {
      state.templateVariant = variants[0].id;
    }
    const v = variants.find(x => x.id === state.templateVariant);
    if (v?.preset) applyStylePreset(v.preset);
  } else {
    state.templateVariant = "";
  }

  renderStyleUi();
  if ($("heroEdge")) $("heroEdge").checked = !!state.heroEdge;
  contentChanged();
}

function selectTemplateVariant(variantId) {
  const entry = findStyleEntry(state.template);
  if (!entry) return;
  const variants = Array.isArray(entry.variants) ? entry.variants : [];
  const v = variants.find(x => x.id === variantId);
  if (!v) return;
  state.templateVariant = v.id;
  applyStylePreset(v.preset);
  renderStyleUi();
  if ($("heroEdge")) $("heroEdge").checked = !!state.heroEdge;
  contentChanged();
}

function renderStyleUi() {
  const grid = $("templateGrid");
  const chips = $("variantChips");
  if (!grid || !chips) return;

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

  // variants
  const entry = findStyleEntry(state.template);
  const variants = Array.isArray(entry?.variants) ? entry.variants : [];
  if (variants.length) {
    if (!variants.some(v => v.id === state.templateVariant)) {
      state.templateVariant = variants[0].id;
    }
    chips.innerHTML = variants.map((v) => {
      const active = v.id === state.templateVariant ? " isActive" : "";
      return `<button type="button" class="chip${active}" data-variant-id="${escapeHtml(v.id)}">${escapeHtml(v.label)}</button>`;
    }).join("");
  } else {
    state.templateVariant = "";
    chips.innerHTML = `<span class="hint" style="margin:0;">Brak wariantów</span>`;
  }
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

/* ==========================
   State
========================== */

const state = {
  exportMode: "single",
  livePreview: true,

  /* Preview Mode */
  previewMode: "page", // page | style

  /* Styl / global */
  styleCollection: "flagship", // flagship | basic
  templateVariant: "",
  accentType: "underline",
  headerLayout: "left",       // left | center
  contentWidth: "normal",     // normal | wide
  density: "comfortable",     // comfortable | normal | compact
  borders: "thin",            // none | thin | thick
  radius: "md",               // 0 | md | lg
  sectionDividers: "none",    // none | line | block
  motion: "subtle",           // off | subtle | strong
  scrollMode: "normal",       // normal | focus
  heroEdge: false,
  mediaLayout: "stack",       // stack | split  (dotyczy kolejnych embedów YouTube/Spotify)

  role: "musician",
  theme: "minimalist",
  template: "square",
  accent: "#6d28d9",

  sectionHeadersAlign: "left",
  siteName: "Moje Portfolio",
  useLogoInHeader: false,

  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",

  /* Analityka */
  gtmId: "",
  cookieBanner: true,
  privacyAuto: true,
  privacyUrl: "",

  previewDevice: "desktop",

  order: [],
  blocks: {},
  activeBlockId: null,
};

/* assets (not stored in localStorage) */
const assets = {
  heroImages: [],          // {dataUrl, alt}[]
  heroImagesMobile: [],    // {dataUrl, alt}[]
  galleryImages: [],       // {dataUrl, alt}[]
  epkPressPhotos: [],      // {dataUrl, alt}[]
  epkFiles: [],            // {id, name, zipName, mime, bytes, url?, dataUrl?}

  logo: null,              // {dataUrl, mime} | null
  favicon: null,           // {dataUrl, mime} | null
  ogImage: null,           // {dataUrl, mime} | null
};

function imgObj(x) {
  if (!x) return { id: "", dataUrl: "", alt: "", mime: "", width: 0, height: 0, bytes: 0, url: "" };

  if (typeof x === "string") {
    const parsed = parseDataUrl(x);
    return {
      id: "",
      dataUrl: x,
      alt: "",
      mime: parsed ? (parsed.mime || "") : "",
      width: 0,
      height: 0,
      bytes: 0,
      url: "",
    };
  }

  if (typeof x === "object") {
    const dataUrl = String(x.dataUrl || "");
    const url = String(x.url || "");
    const parsed = parseDataUrl(dataUrl || url);
    return {
      id: String(x.id || ""),
      dataUrl: dataUrl,
      url: url,
      alt: String(x.alt || ""),
      mime: String(x.mime || (parsed ? (parsed.mime || "") : "")),
      width: Number(x.width || 0),
      height: Number(x.height || 0),
      bytes: Number(x.bytes || 0),
    };
  }

  const s = String(x);
  const parsed = parseDataUrl(s);
  return { id: "", dataUrl: s, alt: "", mime: parsed ? (parsed.mime || "") : "", width: 0, height: 0, bytes: 0, url: "" };
}

function normalizeAssets() {
  const normImgs = (arr) => (Array.isArray(arr) ? arr : []).map(imgObj).filter(i => (i.dataUrl || i.url || i.id));
  assets.heroImages = normImgs(assets.heroImages);
  assets.heroImagesMobile = normImgs(assets.heroImagesMobile);
  assets.galleryImages = normImgs(assets.galleryImages);
  assets.epkPressPhotos = normImgs(assets.epkPressPhotos);
  assets.epkFiles = (Array.isArray(assets.epkFiles) ? assets.epkFiles : []).filter(f => f && String(f.name || '').trim() && (f.id || f.dataUrl || f.url));
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



/* ==========================
   Assets persistence (IDB refs in draft)
========================== */

function _ensureIdSync(it, prefix) {
  if (!it) return it;
  if (!it.id) it.id = makeMediaId(prefix || "a");
  return it;
}

function buildAssetsRef() {
  // UWAGA: w payload zapisujemy tylko referencje (bez base64)
  const imgRef = (it, prefix) => {
    if (!it) return null;
    _ensureIdSync(it, prefix);
    return {
      id: String(it.id || ""),
      alt: String(it.alt || ""),
      mime: String(it.mime || (parseDataUrl(it.dataUrl)?.mime || "")),
      width: Number(it.width || 0),
      height: Number(it.height || 0),
      bytes: Number(it.bytes || 0),
    };
  };
  const singleRef = (obj, stableId) => {
    if (!obj) return null;
    if (!obj.id) obj.id = stableId;
    return {
      id: String(obj.id || stableId),
      mime: String(obj.mime || (parseDataUrl(obj.dataUrl)?.mime || "")),
      bytes: Number(obj.bytes || 0),
    };
  };


  const fileRef = (f, prefix) => {
    if (!f) return null;
    if (!f.id) f.id = makeMediaId(prefix || 'file');
    const name = String(f.name || '').trim();
    const zipName = String(f.zipName || name).trim();
    if (!name) return null;
    return {
      id: String(f.id || ''),
      name,
      zipName,
      mime: String(f.mime || ''),
      bytes: Number(f.bytes || 0),
    };
  };

  return {
    heroImages: (assets.heroImages || []).map(it => imgRef(it, "hero")).filter(Boolean),
    heroImagesMobile: (assets.heroImagesMobile || []).map(it => imgRef(it, "heroM")).filter(Boolean),
    galleryImages: (assets.galleryImages || []).map(it => imgRef(it, "gal")).filter(Boolean),
    epkPressPhotos: (assets.epkPressPhotos || []).map(it => imgRef(it, "press")).filter(Boolean),
    epkFiles: (assets.epkFiles || []).map(f => fileRef(f, "pressfile")).filter(Boolean),
    logo: singleRef(assets.logo, "single_logo"),
    favicon: singleRef(assets.favicon, "single_favicon"),
    ogImage: singleRef(assets.ogImage, "single_og"),
  };
}

function applyAssetsRef(ref) {
  if (!ref || typeof ref !== 'object') return;

  const mapImg = (r) => ({
    id: String(r?.id || ""),
    dataUrl: "",
    alt: String(r?.alt || ""),
    mime: String(r?.mime || ""),
    width: Number(r?.width || 0),
    height: Number(r?.height || 0),
    bytes: Number(r?.bytes || 0),
  });

  const mapFile = (r) => ({
    id: String(r?.id || ''),
    name: String(r?.name || ''),
    zipName: String(r?.zipName || r?.name || ''),
    mime: String(r?.mime || ''),
    bytes: Number(r?.bytes || 0),
    url: '',
    dataUrl: '',
  });

  assets.heroImages = Array.isArray(ref.heroImages) ? ref.heroImages.map(mapImg) : assets.heroImages;
  assets.heroImagesMobile = Array.isArray(ref.heroImagesMobile) ? ref.heroImagesMobile.map(mapImg) : assets.heroImagesMobile;
  assets.galleryImages = Array.isArray(ref.galleryImages) ? ref.galleryImages.map(mapImg) : assets.galleryImages;
  assets.epkPressPhotos = Array.isArray(ref.epkPressPhotos) ? ref.epkPressPhotos.map(mapImg) : assets.epkPressPhotos;
  assets.epkFiles = Array.isArray(ref.epkFiles) ? ref.epkFiles.map(mapFile) : assets.epkFiles;

  const mapSingle = (r, stableId) => r ? ({ id: String(r.id || stableId), dataUrl: "", mime: String(r.mime || ""), bytes: Number(r.bytes || 0) }) : null;
  assets.logo = mapSingle(ref.logo, "single_logo") || null;
  assets.favicon = mapSingle(ref.favicon, "single_favicon") || null;
  assets.ogImage = mapSingle(ref.ogImage, "single_og") || null;
}

async function rehydrateAssetsFromIdb() {
  const imgTargets = [];
  const fileTargets = [];

  const addMany = (arr) => {
    for (const it of (arr || [])) {
      if (it && it.id && !it.dataUrl) imgTargets.push(it);
    }
  };

  addMany(assets.heroImages);
  addMany(assets.heroImagesMobile);
  addMany(assets.galleryImages);
  addMany(assets.epkPressPhotos);

  for (const f of (assets.epkFiles || [])) {
    if (f && f.id && !f.url && !f.dataUrl) fileTargets.push(f);
  }

  [assets.logo, assets.favicon, assets.ogImage].forEach((x) => {
    if (x && x.id && !x.dataUrl) imgTargets.push(x);
  });

  if (!imgTargets.length && !fileTargets.length) return;

  let missing = 0;

  for (const it of imgTargets) {
    const rec = await mediaGet(it.id);
    const blob = rec?.blob;
    if (!blob) {
      missing++;
      continue;
    }
    const mime = it.mime || rec?.meta?.mime || blob.type || "";
    it.dataUrl = await dataUrlFromBlob(blob, mime);
    it.mime = mime;
    it.bytes = Number(it.bytes || blob.size || 0);
  }

  for (const f of fileTargets) {
    const rec = await mediaGet(f.id);
    const blob = rec?.blob;
    if (!blob) {
      missing++;
      continue;
    }
    try {
      if (f.url) URL.revokeObjectURL(f.url);
    } catch (e) {}
    f.mime = f.mime || rec?.meta?.mime || blob.type || "";
    f.bytes = Number(f.bytes || blob.size || 0);
    f.url = URL.createObjectURL(blob);
  }

  if (missing) {
    toast(`⚠ Nie udało się odtworzyć ${missing} plików (IndexedDB puste / wyczyszczone).`, 'warn', 5200);
  }
}

async function persistAllAssetsNow() {
  // Persist arrays
  await persistImageItems(assets.heroImages || [], "hero");
  await persistImageItems(assets.heroImagesMobile || [], "heroM");
  await persistImageItems(assets.galleryImages || [], "gal");
  await persistImageItems(assets.epkPressPhotos || [], "press");
  await persistFileItems(assets.epkFiles || [], "pressfile");

  // Persist singles
  await persistSingleAsset(assets.logo, "single_logo", { kind: "logo" });
  await persistSingleAsset(assets.favicon, "single_favicon", { kind: "favicon" });
  await persistSingleAsset(assets.ogImage, "single_og", { kind: "og" });
}

const persistAllAssetsDebounced = debounce(() => {
  persistAllAssetsNow().catch(() => {});
}, 650);

function schedulePersistAllAssets() {
  persistAllAssetsDebounced();
}

function buildPayload() {
  const data = {
    exportMode: state.exportMode,
    livePreview: state.livePreview,
    liveMode: state.liveMode || (state.livePreview ? 'on' : 'off'),

    previewMode: state.previewMode,
    styleCollection: state.styleCollection,
    templateVariant: state.templateVariant,
    accentType: state.accentType,
    headerLayout: state.headerLayout,
    contentWidth: state.contentWidth,
    density: state.density,
    borders: state.borders,
    radius: state.radius,
    sectionDividers: state.sectionDividers,
    motion: state.motion,
    scrollMode: state.scrollMode,
    heroEdge: !!state.heroEdge,
    mediaLayout: state.mediaLayout,

    role: state.role,
    theme: state.theme,
    template: state.template,
    accent: state.accent,
    sectionHeadersAlign: state.sectionHeadersAlign,
    siteName: state.siteName,
    useLogoInHeader: state.useLogoInHeader,

    metaTitle: state.metaTitle,
    metaDescription: state.metaDescription,
    metaKeywords: state.metaKeywords,

    gtmId: state.gtmId,
    cookieBanner: !!state.cookieBanner,
    privacyAuto: !!state.privacyAuto,
    privacyUrl: state.privacyUrl,

    previewDevice: state.previewDevice,
    order: state.order,
    blocks: state.blocks,
    activeBlockId: state.activeBlockId,
    assetsRef: buildAssetsRef(),
  };
  return { data, savedAt: new Date().toISOString() };
}

function applyPayload(payload, setStatusText = true) {
  const d = payload?.data;
  if (!d) return false;

  state.exportMode = d.exportMode ?? state.exportMode;
  // Live mode: new (liveMode) + legacy boolean (livePreview)
  if (typeof d.liveMode !== 'undefined') {
    state.liveMode = String(d.liveMode || '').toLowerCase();
  } else if (typeof d.livePreview !== 'undefined') {
    state.liveMode = d.livePreview ? 'on' : 'off';
  }
  setLiveMode(state.liveMode);

  state.previewMode = d.previewMode ?? state.previewMode;
  state.styleCollection = d.styleCollection ?? state.styleCollection;
  state.templateVariant = d.templateVariant ?? state.templateVariant;
  state.accentType = d.accentType ?? state.accentType;
  state.headerLayout = d.headerLayout ?? state.headerLayout;
  state.contentWidth = d.contentWidth ?? state.contentWidth;
  state.density = d.density ?? state.density;
  state.borders = d.borders ?? state.borders;
  state.radius = d.radius ?? state.radius;
  state.sectionDividers = d.sectionDividers ?? state.sectionDividers;
  state.motion = d.motion ?? state.motion;
  state.scrollMode = d.scrollMode ?? state.scrollMode;
  state.heroEdge = d.heroEdge ?? state.heroEdge;
  state.mediaLayout = d.mediaLayout ?? state.mediaLayout;
  state.role = d.role ?? state.role;
  state.theme = d.theme ?? state.theme;
  if (state.theme === "elegant") state.theme = "minimalist";
  state.template = d.template ?? state.template;
  state.accent = d.accent ?? state.accent;
  state.sectionHeadersAlign = d.sectionHeadersAlign ?? state.sectionHeadersAlign;
  state.siteName = d.siteName ?? state.siteName;
  state.useLogoInHeader = d.useLogoInHeader ?? state.useLogoInHeader;

  state.metaTitle = d.metaTitle ?? state.metaTitle;
  state.metaDescription = d.metaDescription ?? state.metaDescription;
  state.metaKeywords = d.metaKeywords ?? state.metaKeywords;

  state.gtmId = d.gtmId ?? state.gtmId;
  state.cookieBanner = (typeof d.cookieBanner === 'boolean') ? d.cookieBanner : state.cookieBanner;
  state.privacyAuto = (typeof d.privacyAuto === 'boolean') ? d.privacyAuto : (typeof state.privacyAuto === 'boolean' ? state.privacyAuto : true);
  state.privacyUrl = d.privacyUrl ?? state.privacyUrl;

  state.previewDevice = d.previewDevice ?? state.previewDevice;

  state.order = Array.isArray(d.order) ? d.order : state.order;
  state.blocks = d.blocks ?? state.blocks;
  state.activeBlockId = d.activeBlockId ?? state.activeBlockId;

  $("exportMode").value = state.exportMode;
  $("role").value = state.role;
  $("accent").value = state.accent;
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
  $("siteName").value = state.siteName;
  if ($("useLogoInHeader")) $("useLogoInHeader").checked = !!state.useLogoInHeader;

  setPreviewMode(state.previewMode, false);
  syncStyleCollectionButtons();
  syncThemeButtons();
  renderStyleUi();
  if ($("heroEdge")) $("heroEdge").checked = !!state.heroEdge;

  if ($("metaTitle")) $("metaTitle").value = state.metaTitle;
  if ($("metaDescription")) $("metaDescription").value = state.metaDescription;
  if ($("metaKeywords")) $("metaKeywords").value = state.metaKeywords || "";

  if ($("gtmId")) $("gtmId").value = state.gtmId;
  if ($("cookieBanner")) $("cookieBanner").checked = !!state.cookieBanner;
  if ($("privacyAuto")) $("privacyAuto").checked = !!state.privacyAuto;
  if ($("privacyUrl")) $("privacyUrl").value = state.privacyUrl;
  syncPrivacySettingsUi();

  setPreviewDevice(state.previewDevice || "desktop");

  hardLockHeroFirst();
  setLiveStatus();

  if (setStatusText) {
    const savedAt = payload?.savedAt ? new Date(payload.savedAt) : null;
    setSaveStatus(savedAt ? `Szkic: wczytano (${savedAt.toLocaleTimeString()})` : "Szkic: wczytano");
  }
  return true;
}

function saveDraft() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPayload()));
    setSaveStatus(`Szkic: ${new Date().toLocaleTimeString()}`);
  } catch {
    setSaveStatus("Szkic: błąd (brak miejsca?)");
  }

  schedulePersistAllAssets();
}

async function loadDraft() {
  // v9
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const payload = JSON.parse(raw);
      const ok = applyPayload(payload, true);
      if (ok) {
        applyAssetsRef(payload?.data?.assetsRef);
        await rehydrateAssetsFromIdb();
        // w tle dopchnij brakujące media (np. po migracji z nowszej wersji)
        schedulePersistAllAssets();
      }
      return ok;
    }
  } catch (e) {}

  // migration from v6
  try {
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyRaw) return false;
    const legacyPayload = JSON.parse(legacyRaw);
    const ok = applyPayload(legacyPayload, true);
    if (ok) {
      // v6 nie miało assetsRef — i tak trzeba będzie ponownie wgrać media
      saveDraft();
    }
    return ok;
  } catch (e) {
    return false;
  }
}


function resetDraft() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  location.reload();
}

function _getSnapshotList() {
  // migrate legacy single snapshot into list (once)
  try {
    const listRaw = localStorage.getItem(SNAPSHOT_LIST_KEY);
    if (listRaw) {
      const arr = JSON.parse(listRaw);
      return Array.isArray(arr) ? arr : [];
    }
  } catch (e) {}

  const legacy = localStorage.getItem(SNAPSHOT_KEY);
  if (legacy) {
    try {
      const payload = JSON.parse(legacy);
      const nowIso = new Date().toISOString();
      const item = {
        id: `snap_${Date.now()}`,
        name: "Snapshot (legacy)",
        savedAt: payload?.savedAt || nowIso,
        payload,
      };
      const arr = [item];
      try { localStorage.setItem(SNAPSHOT_LIST_KEY, JSON.stringify(arr)); } catch (e) {}
      return arr;
    } catch (e) {
      return [];
    }
  }
  return [];
}

function _setSnapshotList(arr) {
  const safe = Array.isArray(arr) ? arr.slice(0, SNAPSHOT_LIST_LIMIT) : [];
  try {
    localStorage.setItem(SNAPSHOT_LIST_KEY, JSON.stringify(safe));
  } catch (e) {
    // if storage is full, keep the newest few
    try {
      localStorage.setItem(SNAPSHOT_LIST_KEY, JSON.stringify(safe.slice(0, 6)));
    } catch (e2) {}
  }
}

function hasSnapshot() {
  return _getSnapshotList().length > 0;
}

function updateSnapshotPill() {
  const list = _getSnapshotList();
  const btnLoad = $("btnLoadSnapshot");
  if (btnLoad) btnLoad.disabled = !list.length;
  if (!list.length) {
    setSnapshotStatus("Snapshoty: 0");
    return;
  }
  const last = list[0];
  const dt = last?.savedAt ? new Date(last.savedAt) : null;
  const t = dt ? dt.toLocaleTimeString() : "";
  setSnapshotStatus(`Snapshoty: ${list.length}${t ? ` (ostatni ${t})` : ''}`);
}

let _snapModalEl = null;
function ensureSnapshotsModal() {
  if (_snapModalEl) return _snapModalEl;
  const wrap = document.createElement('div');
  wrap.className = 'snapModal';
  wrap.innerHTML = `
    <div class="snapModal__backdrop modalBackdrop" data-snap-close="1"></div>
    <div class="snapModal__card modalCard" role="dialog" aria-modal="true" aria-label="Snapshoty">
      <div class="snapModal__head modalHead">
        <div class="modalTitle"><strong>Snapshoty</strong></div>
        <button type="button" class="iconBtn modalClose" data-snap-close="1" aria-label="Zamknij">✕</button>
      </div>
      <div class="snapModal__body">
        <div class="snapModal__hint">
          Snapshot zapisuje ustawienia i treści. Obrazy i pliki są w IndexedDB — jeśli przeglądarka je wyczyści, snapshot nie odtworzy mediów.
        </div>
        <div class="snapModal__actions">
          <button class="btn btnSmall" id="snapModalSave">Zapisz nowy</button>
          <button class="btn btnSmall btnGhost" id="snapModalClear">Usuń wszystkie</button>
        </div>
        <div id="snapModalList"></div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);
  _snapModalEl = wrap;

  const close = () => { modalA11yClose(wrap); wrap.classList.remove('isOpen'); };
  wrap.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.getAttribute && t.getAttribute('data-snap-close') === '1') close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && wrap.classList.contains('isOpen')) close();
  });

  const saveBtn = wrap.querySelector('#snapModalSave');
  if (saveBtn) saveBtn.addEventListener('click', () => {
    saveSnapshot();
    renderSnapshotsModal();
  });
  const clearBtn = wrap.querySelector('#snapModalClear');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    const ok = confirm('Usunąć wszystkie snapshoty?');
    if (!ok) return;
    _setSnapshotList([]);
    try { localStorage.removeItem(SNAPSHOT_KEY); } catch (e) {}
    renderSnapshotsModal();
    updateSnapshotPill();
  });

  return wrap;
}

function renderSnapshotsModal() {
  const wrap = ensureSnapshotsModal();
  const host = wrap.querySelector('#snapModalList');
  if (!host) return;
  const list = _getSnapshotList();
  if (!list.length) {
    host.innerHTML = `<div class="snapModal__empty">Brak snapshotów.</div>`;
    return;
  }
  const rowsHtml = list.map((s) => {
    const dt = s?.savedAt ? new Date(s.savedAt) : null;
    const when = dt ? dt.toLocaleString() : '';
    const name = escapeHtml(s?.name || 'Snapshot');
    return `
      <div class="snapRow uiCard" data-snap-id="${escapeHtml(s.id)}">
        <div class="snapRow__meta">
          <div class="snapRow__name">${name}</div>
          <div class="snapRow__time">${escapeHtml(when)}</div>
        </div>
        <div class="snapRow__btns">
          <button class="btn btnSmall" data-snap-load="${escapeHtml(s.id)}">Wczytaj</button>
          <button class="btn btnSmall btnGhost" data-snap-del="${escapeHtml(s.id)}">Usuń</button>
        </div>
      </div>
    `;
  }).join('');

  host.innerHTML = `<div class="uiList">${rowsHtml}</div>`;

  host.querySelectorAll('[data-snap-load]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-snap-load');
      await loadSnapshotById(id);
      modalA11yClose(wrap);
      wrap.classList.remove('isOpen');
    });
  });
  host.querySelectorAll('[data-snap-del]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-snap-del');
      const ok = confirm('Usunąć ten snapshot?');
      if (!ok) return;
      const cur = _getSnapshotList();
      _setSnapshotList(cur.filter(x => x && x.id !== id));
      renderSnapshotsModal();
      updateSnapshotPill();
    });
  });
}

function openSnapshotsModal() {
  const wrap = ensureSnapshotsModal();
  renderSnapshotsModal();
  wrap.classList.add('isOpen');
  modalA11yOpen(wrap, '.snapModal__card');
}

function saveSnapshot() {
  const now = new Date();
  const defaultName = `Snapshot ${now.toLocaleDateString()} ${now.toLocaleTimeString().slice(0,5)}`;
  const name = prompt('Nazwa snapshotu (opcjonalnie):', defaultName);
  if (name === null) return;

  const payload = buildPayload();
  const item = {
    id: `snap_${Date.now()}`,
    name: String(name || defaultName).trim() || defaultName,
    savedAt: payload?.savedAt || new Date().toISOString(),
    payload,
  };
  const list = _getSnapshotList();
  list.unshift(item);
  _setSnapshotList(list);

  // keep legacy single snapshot as the newest one
  try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(payload)); } catch (e) {}

  updateSnapshotPill();
  setSnapshotStatus("Snapshoty: zapisano");
  schedulePersistAllAssets();
}

async function loadSnapshotById(id) {
  const list = _getSnapshotList();
  const it = list.find(x => x && String(x.id) === String(id));
  const payload = it?.payload;
  if (!payload) return;
  try {
    applyPayload(payload, false);
    applyAssetsRef(payload?.data?.assetsRef);
    await rehydrateAssetsFromIdb();
    zipPreviewCurrent = "index.html";
    structureChanged(true);
    setSnapshotStatus("Snapshoty: wczytano");
    updateSnapshotPill();
  } catch (e) {
    setSnapshotStatus("Snapshoty: błąd");
  }
}

async function loadSnapshot() {
  // legacy fallback: load newest from list if possible
  const list = _getSnapshotList();
  if (list.length) return loadSnapshotById(list[0].id);
}

function clearSnapshot() {
  _setSnapshotList([]);
  try { localStorage.removeItem(SNAPSHOT_KEY); } catch (e) {}
  updateSnapshotPill();
  setSnapshotStatus("Snapshoty: 0");
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

async function generateSampleData() {
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
          { url: `<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ?controls=1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>` },
          { url: "https://www.youtube.com/watch?v=9pIKakO0nR0" }
        ]
      });
      continue;
    }

    if (ed === "store") {
      setBlock(id, "Merch", {
        items: [
          { name: "Koszulka (czarna)", price: "79 zł", url: "https://example.com", img: "", alt: "Koszulka zespołu", desc: "Klasyczny krój. Rozmiary S–XL." },
          { name: "CD – album", price: "49 zł", url: "https://example.com", img: "", alt: "Okładka płyty", desc: "Limitowana seria. Autograf na życzenie." },
          { name: "Bilet – koncert", price: "59 zł", url: "https://example.com", img: "", alt: "Bilet na koncert", desc: "Wstęp od 18:00. Liczba miejsc ograniczona." }
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
        cta: "Napisz maila",
        showMap: true,
        mapAddress: "ul. Długa 1, 31-146 Kraków",
        mapEmbed: ""
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

  // persist demo assets to IDB (żeby po odświeżeniu nie znikały)
  try {
    await persistAllAssetsNow();
  } catch (e) {}


  const payload = {
    data: {
      exportMode: $("exportMode")?.value || state.exportMode,
      livePreview: true,
      role,
      theme: state.theme,
      template: state.template,
      accent: $("accent")?.value || state.accent,
      sectionHeadersAlign: state.sectionHeadersAlign,
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

function syncPrivacySettingsUi(){
  const cb = document.getElementById('privacyAuto');
  const auto = cb ? !!cb.checked : true;
  const input = document.getElementById('privacyUrl');
  if (input) {
    input.disabled = auto;
    if (auto) {
      input.setAttribute('aria-disabled', 'true');
      if (!String(input.value || '').trim()) input.placeholder = 'Generowane automatycznie';
    } else {
      input.removeAttribute('aria-disabled');
      // Po wyłączeniu auto-polityki zawsze pokazuj wzór linka (na mobile placeholder potrafi zostać stary).
      input.placeholder = 'privacy.html / #privacy / https://...';
    }
  }
}

/* ==========================
   Structure changes vs Content changes (IMPORTANT for focus)
========================== */

function syncStateFromSettingsInputs() {
  state.exportMode = $("exportMode").value;
  state.role = $("role").value;

  // Theme/template są sterowane przez UI (przyciski / siatka szablonów) — bez ukrytych selectów.
  if (!["minimalist","modern"].includes(String(state.theme || ""))) state.theme = "minimalist";
  if (!findStyleEntry(state.template)) {
    const entries = getStyleEntries();
    if (entries && entries[0]) state.template = entries[0].id;
  }

  // style panel controls
  if ($("accentType")) state.accentType = $("accentType").value;
  if ($("motion")) state.motion = $("motion").value;
  if ($("scrollMode")) state.scrollMode = $("scrollMode").value;
  if ($("mediaLayout")) state.mediaLayout = $("mediaLayout").value;
  if ($("headerLayout")) state.headerLayout = $("headerLayout").value;
  if ($("contentWidth")) state.contentWidth = $("contentWidth").value;
  if ($("density")) state.density = $("density").value;
  if ($("heroEdge")) state.heroEdge = $("heroEdge").checked;
  if ($("borders")) state.borders = $("borders").value;
  if ($("radius")) state.radius = $("radius").value;
  if ($("sectionDividers")) state.sectionDividers = $("sectionDividers").value;

  state.accent = $("accent").value;

  // Nagłówki sekcji (jedno źródło prawdy)
  if ($("sectionTitleAlign")) state.sectionHeadersAlign = $("sectionTitleAlign").value;

  state.siteName = $("siteName").value;
  if ($("useLogoInHeader")) state.useLogoInHeader = $("useLogoInHeader").checked;

  if ($("metaTitle")) state.metaTitle = $("metaTitle").value;
  if ($("metaDescription")) state.metaDescription = $("metaDescription").value;
  if ($("metaKeywords")) state.metaKeywords = $("metaKeywords").value;

  if ($("gtmId")) state.gtmId = $("gtmId").value;
  if ($("cookieBanner")) state.cookieBanner = $("cookieBanner").checked;
  if ($("privacyAuto")) state.privacyAuto = $("privacyAuto").checked;
  if ($("privacyUrl")) state.privacyUrl = $("privacyUrl").value;

  syncPrivacySettingsUi();

  // Programmatic value updates in the app should reflect in custom select UI.
  refreshCustomSelects();
  setLiveStatus();
}

function collectIssues() {
  const issues = [];

  // Ustawienia podstawowe
  if (!String(state.siteName || "").trim()) issues.push("Ustawienia: brak nazwy strony (Site name).");

  // SEO (soft warnings)
  if (!String(state.metaTitle || "").trim()) issues.push("SEO: brak tytułu (meta title).");
  if (!String(state.metaDescription || "").trim()) issues.push("SEO: brak opisu (meta description).");

  // Analityka / polityka (soft warnings)
  {
    const gtmId = String(state.gtmId || "").trim();
    const priv = String(state.privacyUrl || "").trim();
    const autoPol = !!state.privacyAuto;

    if (gtmId && !isValidGtmId(gtmId)) issues.push("Analityka: GTM ID wygląda na błędny (np. GTM-XXXXXXX).");
    if (!autoPol && priv && !isProbablyPrivacyHref(priv)) issues.push("Analityka: link do polityki wygląda na błędny (np. privacy.html / #privacy / https://...).");
    if (gtmId && !state.cookieBanner) issues.push("Analityka: GTM ustawione, ale banner cookies wyłączony (ryzyko RODO).");

    if (autoPol) {
      const contactOn = enabledBlocksInOrder().includes("contact");
      const c = state.blocks?.contact?.data || {};
      const email = String(c.email || "").trim();
      if (!contactOn) issues.push("Polityka: dodaj blok Kontakt (email) — w polityce podajemy dane administratora.");
      else if (!email) issues.push("Polityka: uzupełnij email w bloku Kontakt (potrzebny w polityce).");
    }
  }

  // HERO CTA (własny URL)
  {
    const h = state.blocks?.hero?.data || {};
    const t = String(h.primaryCtaTarget || "auto");
    const u = String(h.primaryCtaUrl || "").trim();
    if (t === "custom") {
      if (!u) issues.push("HERO: ustawiono przycisk na 'Własny URL', ale brak linku.");
      else if (!isProbablyHttpUrl(u)) issues.push("HERO: własny URL wygląda na błędny (dodaj https://...).");
    }
  }

  // Media budget (obrazy + pliki EPK)
  const totalMedia = calcMediaTotalBytes();
  if (totalMedia > MEDIA_BUDGET.maxTotalBytes) {
    issues.push(`Zasoby: przekroczony limit projektu (${formatBytes(totalMedia)} / ${formatBytes(MEDIA_BUDGET.maxTotalBytes)}). Usuń część plików.`);
  } else if (totalMedia > MEDIA_BUDGET.warnTotalBytes) {
    issues.push(`Zasoby: dużo danych (${formatBytes(totalMedia)} / ${formatBytes(MEDIA_BUDGET.maxTotalBytes)}). Może lagować na słabszych komputerach.`);
  }

  // Kontakt (email/telefon/mapa)
  for (const id of enabledBlocksInOrder()) {
    if (id === "epk" && !isEpkRenderable()) continue;
    const def = getBlockDef(id);
    if (def.editor !== "contact") continue;
    const c = state.blocks[id]?.data || {};

    const email = String(c.email || "").trim();
    const phone = String(c.phone || "").trim();
    if (!email && !phone) issues.push("Kontakt: brak email i telefonu.");
    if (email && !isValidEmailLoose(email)) issues.push("Kontakt: email wygląda na błędny.");
    if (phone && !isValidPhoneLoose(phone)) issues.push("Kontakt: telefon wygląda na błędny (za mało cyfr?).");

    const showMap = !!c.showMap;
    const addr = String(c.mapAddress || "").trim();
    const emb = String(c.mapEmbed || "").trim();
    if (showMap) {
      if (!addr && !emb) issues.push("Kontakt: włączona mapa, ale brak adresu i brak kodu iframe.");
      if (emb) {
        const src = decodeHtmlEntitiesLoose(emb.includes("<iframe") ? extractIframeSrc(emb) : emb);
        if (!src) issues.push("Kontakt: nie potrafię wyciągnąć 'src' z wklejonego iframe mapy.");
        else if (!isProbablyHttpUrl(src)) issues.push("Kontakt: link mapy (src) wygląda na błędny.");
      }
    }
  }

  // Walidacje pól w blokach (ograniczamy spam)
  const MAX_URL_ISSUES = 10;
  let urlIssues = 0;
  function pushUrlIssue(msg) {
    if (urlIssues >= MAX_URL_ISSUES) return;
    issues.push(msg);
    urlIssues += 1;
  }
  function blockLabel(id) {
    const def = getBlockDef(id);
    const suf = blockSuffix(id);
    return suf ? `${def.label} (${suf})` : def.label;
  }

  for (const id of enabledBlocksInOrder()) {
    if (id === "epk" && !isEpkRenderable()) continue;
    const def = getBlockDef(id);
    const d = state.blocks[id]?.data || {};
    const label = blockLabel(id);

    if (def.editor === "embed_spotify") {
      const items = Array.isArray(d.items) ? d.items : [];
      for (const it of items) {
        const u = String(it.url || "").trim();
        if (u && !normalizeSpotify(u)) pushUrlIssue(`${label}: nie rozpoznaję jednego z linków Spotify (wklej pełny link lub iframe).`);
      }
    }

    if (def.editor === "embed_youtube") {
      const items = Array.isArray(d.items) ? d.items : [];
      for (const it of items) {
        const u = String(it.url || "").trim();
        if (u && !normalizeYouTube(u)) pushUrlIssue(`${label}: nie rozpoznaję jednego z linków YouTube (wklej pełny link lub iframe).`);
      }
    }

    if (def.editor === "social") {
      const items = Array.isArray(d.items) ? d.items : [];
      for (const it of items) {
        const name = String(it.name || "Profil").trim() || "Profil";
        const u = String(it.url || "").trim();
        if (u && !isProbablyHttpUrl(u)) pushUrlIssue(`${label}: link w profilu „${name}” wygląda na błędny.`);
      }
    }

    if (def.editor === "events") {
      const items = Array.isArray(d.items) ? d.items : [];
      for (const it of items) {
        const dateRaw = String(it.date || "").trim();
        if (dateRaw) {
          const iso = toIsoDateLoose(dateRaw);
          if (!iso || !isValidIsoDateStrict(iso)) {
            pushUrlIssue(`${label}: data wydarzenia wygląda na błędną (użyj np. 2026-01-19).`);
          }
        }
        const link = String(it.link || "").trim();
        if (link && !isProbablyHttpUrl(link)) pushUrlIssue(`${label}: link wydarzenia wygląda na błędny.`);
      }
    }

    if (def.editor === "projects") {
      const items = Array.isArray(d.items) ? d.items : [];
      for (const it of items) {
        const link = String(it.link || "").trim();
        if (link && !isProbablyHttpUrl(link)) pushUrlIssue(`${label}: link w projekcie „${String(it.title || "").trim() || "(bez tytułu)"}” wygląda na błędny.`);
      }
    }

    if (def.editor === "store") {
      const items = Array.isArray(d.items) ? d.items : [];
      for (const it of items) {
        const url = String(it.url || "").trim();
        if (url && !isProbablyHttpUrl(url)) pushUrlIssue(`${label}: link „Kup” w produkcie „${String(it.name || "").trim() || "(bez nazwy)"}” wygląda na błędny.`);
        const img = String(it.img || "").trim();
        if (img && !(img.startsWith('data:')) && !isProbablyHttpUrl(img)) pushUrlIssue(`${label}: URL zdjęcia w produkcie „${String(it.name || "").trim() || "(bez nazwy)"}” wygląda na błędny.`);
      }
    }

    if (def.editor === "simpleList") {
      const items = Array.isArray(d.items) ? d.items : [];
      for (const it of items) {
        const link = String(it.link || "").trim();
        if (link && !isProbablyHttpUrl(link)) pushUrlIssue(`${label}: link w wpisie „${String(it.text || "").trim() || "(bez treści)"}” wygląda na błędny.`);
      }
    }

    if (def.editor === "publications") {
      const items = Array.isArray(d.items) ? d.items : [];
      for (const it of items) {
        const year = String(it.year || "").trim();
        if (year && !/^\d{4}$/.test(year)) issues.push(`${label}: rok „${year}” nie wygląda na format RRRR.`);
        const url = String(it.url || "").trim();
        if (url && !isProbablyHttpUrl(url)) pushUrlIssue(`${label}: link w publikacji „${String(it.title || "").trim() || "(bez tytułu)"}” wygląda na błędny.`);
      }
    }

    if (def.editor === "testimonials") {
      const items = Array.isArray(d.items) ? d.items : [];
      for (const it of items) {
        const link = String(it.link || "").trim();
        if (link && !isProbablyHttpUrl(link)) pushUrlIssue(`${label}: link źródła w opinii wygląda na błędny.`);
      }
    }

    if (def.editor === "epk") {
      const press = Array.isArray(d.pressLinks) ? d.pressLinks : [];
      for (const it of press) {
        const u = String(it.url || "").trim();
        if (u && !isProbablyHttpUrl(u)) pushUrlIssue(`${label}: link prasowy „${String(it.name || "").trim() || "Link"}” wygląda na błędny.`);
      }
      const dl = Array.isArray(d.downloadLinks) ? d.downloadLinks : [];
      for (const it of dl) {
        const u = String(it.url || "").trim();
        if (u && !isProbablyHttpUrl(u)) pushUrlIssue(`${label}: link do pobrania „${String(it.name || "").trim() || "Plik"}” wygląda na błędny.`);
      }
    }

    if (def.editor === "newsletter") {
      const u = String(d.url || "").trim();
      if (u && !isProbablyHttpUrl(u)) pushUrlIssue(`${label}: link do zapisu wygląda na błędny.`);
    }
  }

  if (urlIssues >= MAX_URL_ISSUES) issues.push("(…i więcej podobnych ostrzeżeń — popraw kilka linków, a licznik spadnie.)");

  return issues;
}


function classifyIssueLevel(text){
  const t = String(text || "").trim();
  if (!t) return "warn";
  if (t.startsWith("Ustawienia: brak nazwy strony")) return "error";
  if (t.startsWith("Zasoby: przekroczony limit projektu")) return "error";
  if (t.startsWith("HERO:") && (t.includes("brak linku") || t.includes("błędny"))) return "error";
  return "warn";
}

function getIssuesSummary(){
  const raw = collectIssues();
  const errors = [];
  const warns = [];
  for (const it of raw) {
    const lvl = classifyIssueLevel(it);
    if (lvl === "error") errors.push(it);
    else warns.push(it);
  }
  return { errors, warns, all: raw };
}

function inferIssueFocusId(text){
  const t = String(text || "");

  if (t.startsWith("Ustawienia:")) return "siteName";

  if (t.startsWith("SEO:")) {
    if (t.includes("meta title")) return "metaTitle";
    if (t.includes("meta description")) return "metaDescription";
    return "metaTitle";
  }

  if (t.startsWith("Analityka:")) {
    if (t.includes("link do polityki")) return "privacyUrl";
    if (t.includes("banner cookies")) return "cookieBanner";
    return "gtmId";
  }

  if (t.startsWith("Polityka:")) {
    if (t.includes("dodaj blok Kontakt")) return "addBlockSelect";
    if (t.includes("uzupełnij email")) return "ed_contact_email";
    return "privacyAuto";
  }

  if (t.startsWith("HERO:")) return "ed_hero_cta_url";

  if (t.startsWith("Kontakt:")) {
    if (t.includes("email")) return "ed_contact_email";
    if (t.includes("telefon")) return "ed_contact_phone";
    if (t.includes("mapa")) {
      if (t.includes("iframe")) return "ed_contact_mapEmbed";
      return "ed_contact_mapAddress";
    }
    return "ed_contact_email";
  }

  return "";
}

function focusFieldById(id){
  if (!id) return;

  // Jeśli pole jest w edytorze bloku (ed_*), a nie ma go w DOM — spróbuj otworzyć właściwy blok.
  function tryOpenEditorForFieldId(fieldId) {
    const fid = String(fieldId || '');
    if (!fid.startsWith('ed_')) return false;

    let targetBlock = null;

    if (fid.startsWith('ed_hero_')) {
      targetBlock = 'hero';
    } else if (fid.startsWith('ed_contact_')) {
      // Pierwszy włączony blok Kontakt
      for (const bid of enabledBlocksInOrder()) {
        const def = getBlockDef(bid);
        if (def && def.editor === 'contact') { targetBlock = bid; break; }
      }
    }

    if (!targetBlock) return false;

    state.activeBlockId = targetBlock;
    try { renderBlocksList(); } catch (_) {}
    try { renderBlockEditor(); } catch (_) {}
    return true;
  }

  let el = document.getElementById(id);
  if (!el) {
    if (tryOpenEditorForFieldId(id)) {
      el = document.getElementById(id);
    }
  }
  if (!el) return;

  const det = el.closest('details');
  if (det && !det.open) det.open = true;

  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  try { el.focus({ preventScroll: true }); } catch (_) { el.focus(); }

  el.classList.add('fieldFlash');
  window.setTimeout(() => el.classList.remove('fieldFlash'), 1400);
}



// Inline walidacja przy polach (na bieżąco)
function clearInlineIssues(){
  document.querySelectorAll('.fieldMsg[data-inline-issue="1"]').forEach(n => n.remove());
  document.querySelectorAll('.fieldInvalid').forEach(n => n.classList.remove('fieldInvalid'));
  document.querySelectorAll('.fieldWarn').forEach(n => n.classList.remove('fieldWarn'));
  document.querySelectorAll('.toggleRow.invalid').forEach(n => n.classList.remove('invalid'));
  document.querySelectorAll('.toggleRow.warn').forEach(n => n.classList.remove('warn'));
  document.querySelectorAll('.addRow.invalid').forEach(n => n.classList.remove('invalid'));
  document.querySelectorAll('.addRow.warn').forEach(n => n.classList.remove('warn'));
}

function formatInlineIssueMessage(id, text){
  const t = String(text || '').trim();
  if (!t) return '';

  // Ustawienia
  if (id === 'siteName' && t.startsWith('Ustawienia:')) return 'Wpisz nazwę / pseudonim.';

  // SEO (ostrzeżenia)
  if (id === 'metaTitle' && t.startsWith('SEO: brak tytułu')) return 'Dodaj tytuł SEO (warto).';
  if (id === 'metaDescription' && t.startsWith('SEO: brak opisu')) return 'Dodaj opis SEO (warto).';

  // Analityka
  if (id === 'gtmId' && t.includes('GTM ID')) return 'GTM ID ma zły format (np. GTM-XXXXXXX).';
  if (id === 'cookieBanner' && t.includes('banner cookies')) return 'Włącz banner cookies, jeśli używasz GTM.';
  if (id === 'privacyUrl' && t.includes('link do polityki')) return 'Wpisz link: privacy.html / #privacy / https://...';

  // Polityka / kontakt
  if (id === 'addBlockSelect' && t.startsWith('Polityka: dodaj blok Kontakt')) return 'Dodaj blok „Kontakt” i uzupełnij email.';
  if (id === 'ed_contact_email' && (t.startsWith('Kontakt: email') || t.startsWith('Polityka: uzupełnij email'))) return 'Wpisz poprawny email.';

  // HERO CTA
  if (id === 'ed_hero_cta_url' && t.startsWith('HERO:')) return 'Wpisz poprawny URL (z https://...).';

  // Fallback: skróć prefix typu "X: ..."
  const m = t.match(/^([^:]{2,24}):\s*(.+)$/);
  if (m) return m[2];
  return t;
}

function applyInlineIssues(summary){
  try {
    clearInlineIssues();

    const s = summary || getIssuesSummary();
    const items = [
      ...s.errors.map((t) => ({ t, lvl: 'error' })),
      ...s.warns.map((t) => ({ t, lvl: 'warn' })),
    ];

    const map = new Map(); // id -> {lvl, t}
    for (const it of items) {
      const id = inferIssueFocusId(it.t);
      if (!id) continue;
      const prev = map.get(id);
      if (!prev) {
        map.set(id, { lvl: it.lvl, t: it.t });
        continue;
      }
      // error wygrywa z warn
      if (prev.lvl !== 'error' && it.lvl === 'error') {
        map.set(id, { lvl: it.lvl, t: it.t });
      }
    }

    for (const [id, meta] of map.entries()) {
      const el = document.getElementById(id);
      if (!el) continue;

      const lvl = meta.lvl;
      const msg = formatInlineIssueMessage(id, meta.t);
      if (!msg) continue;

      let anchor = el;
      const row = el.closest('.toggleRow');
      const addRow = el.closest('.addRow');

      if (row) {
        row.classList.add(lvl === 'error' ? 'invalid' : 'warn');
        anchor = row;
      } else if (addRow) {
        addRow.classList.add(lvl === 'error' ? 'invalid' : 'warn');
        el.classList.add(lvl === 'error' ? 'fieldInvalid' : 'fieldWarn');
        anchor = addRow;
      } else {
        el.classList.add(lvl === 'error' ? 'fieldInvalid' : 'fieldWarn');
        anchor = el;
      }

      const div = document.createElement('div');
      div.className = `fieldMsg fieldMsg--${lvl}`;
      div.dataset.inlineIssue = '1';
      div.textContent = msg;
      anchor.insertAdjacentElement('afterend', div);
    }
  } catch (err) {
    console.warn('applyInlineIssues failed', err);
  }
}

function updateIssuesPill() {
  const el = $("issuesPill");
  const btn = $("btnDownload");
  if (!el && !btn) return;

  const s = getIssuesSummary();
  const err = s.errors.length;
  const warn = s.warns.length;

  if (el) {
    el.textContent = err ? `Błędy: ${err} • Ostrz.: ${warn}` : `Ostrzeżenia: ${warn}`;
    el.dataset.count = String(err + warn);
    el.classList.toggle("hasErrors", err > 0);
  }

  if (btn) {
    btn.dataset.hasErrors = err > 0 ? "1" : "0";
  }

  // Inline walidacja (czerwone pola + tekst pod polem)
  applyInlineIssues(s);
}


let _issuesModalEl = null;

function ensureIssuesModal() {
  if (_issuesModalEl) return _issuesModalEl;

  const wrap = document.createElement('div');
  wrap.className = 'issuesModal';
  wrap.innerHTML = `
    <div class="issuesModal__backdrop modalBackdrop" data-issues-close="1"></div>
    <div class="issuesModal__card modalCard" role="dialog" aria-modal="true" aria-label="Problemy i ostrzeżenia">
      <div class="issuesModal__head modalHead">
        <div class="modalTitle"><strong>Problemy i ostrzeżenia</strong></div>
        <button type="button" class="iconBtn modalClose" data-issues-close="1" aria-label="Zamknij">✕</button>
      </div>
      <div class="issuesModal__body">
        <div class="issuesModal__hint">Błędy blokują eksport. Ostrzeżenia to podpowiedzi. Kliknij wpis, żeby przejść do pola.</div>
        <ul class="issuesModal__list" id="issuesModalList"></ul>
      </div>
    </div>
  `;

  wrap.addEventListener('click', (e) => {
    const item = e.target.closest('.issueItem[data-focus]');
    if (item) {
      const id = String(item.getAttribute('data-focus') || '');
      closeIssuesModal();
      focusFieldById(id);
      return;
    }
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

  const s = getIssuesSummary();
  const items = [
    ...s.errors.map((t) => ({ t, lvl: "error" })),
    ...s.warns.map((t) => ({ t, lvl: "warn" })),
  ];

  list.innerHTML = items.length
    ? items.map(({ t, lvl }) => {
        const focus = inferIssueFocusId(t);
        const safeFocus = /^[A-Za-z0-9_-]+$/.test(focus) ? focus : "";
        const badge = (lvl === "error") ? "BŁĄD" : "OSTRZ.";
        const focusAttr = safeFocus ? ` data-focus="${safeFocus}"` : "";
        const jump = safeFocus ? `<span class="issueJump" aria-hidden="true">›</span>` : "";
        return `<li class="issueItem issueItem--${lvl}"${focusAttr}><span class="issueBadge">${badge}</span><span class="issueText">${escapeHtml(t)}</span>${jump}</li>`;
      }).join("")
    : `<li class="issueItem issueItem--ok">Brak problemów 🎉</li>`;

  modal.classList.add('isOpen');
  modalA11yOpen(modal, '.issuesModal__card');
}

function closeIssuesModal() {
  if (!_issuesModalEl) return;
  modalA11yClose(_issuesModalEl);
  _issuesModalEl.classList.remove('isOpen');
}

const contentChanged = debounce(() => {
  pushHistoryDebounced();
  saveDraft();
  updateIssuesPill();
  requestPreviewRebuild('content');
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

  requestPreviewRebuild('structure', !!forcePreview);
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
  const m = String(input || "").match(/src\s*=\s*['"](.*?)['"]/i);
  return m ? m[1] : "";
}

function decodeHtmlEntitiesLoose(s) {
  // enough for typical iframe src strings copied from YouTube/Google Maps
  return String(s || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&#38;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#34;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&#39;", "'");
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


function normalizeHttpUrlLoose(input) {
  const u = tryParseUrl(input);
  if (!u) return "";
  const proto = String(u.protocol || "").toLowerCase();
  if (proto !== "http:" && proto !== "https:") return "";
  return u.toString();
}

function sanitizePrivacyHrefLoose(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) return "";

  if (raw.startsWith('#') || raw.startsWith('/') || raw.startsWith('./') || raw.startsWith('../')) return raw;

  const abs = normalizeHttpUrlLoose(raw);
  if (abs) return abs;

  // proste ścieżki względne: np. privacy.html, polityka/prywatnosc.html
  if (/^[a-zA-Z0-9][a-zA-Z0-9\/_\-\.]*$/.test(raw)) return raw;

  return "";
}

function isProbablyPrivacyHref(input) {
  const s = String(input || "").trim();
  if (!s) return true;
  return !!sanitizePrivacyHrefLoose(s);
}

function isValidEmailLoose(input) {
  const s = String(input || "").trim();
  if (!s) return true;
  // Luźna walidacja: ma łapać oczywiste błędy, nie udawać RFC.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

function isValidPhoneLoose(input) {
  const s = String(input || "").trim();
  if (!s) return true;
  const digits = s.replace(/\D+/g, "");
  if (!digits) return false;
  // E.164 to max 15 cyfr; zostawiamy odrobinę marginesu.
  return digits.length >= 7 && digits.length <= 16;
}

function isValidGtmId(input) {
  const s = String(input || "").trim();
  if (!s) return true;
  return /^GTM-[A-Z0-9]+$/i.test(s);
}

function isValidIsoDateStrict(iso) {
  const s = String(iso || "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return false;
  if (mo < 1 || mo > 12) return false;
  if (d < 1 || d > 31) return false;
  const dt = new Date(y, mo - 1, d, 0, 0, 0, 0);
  return dt.getFullYear() === y && (dt.getMonth() + 1) === mo && dt.getDate() === d;
}

function isProbablyHttpUrl(input) {
  const s = String(input || "").trim();
  if (!s) return true;
  return !!normalizeHttpUrlLoose(s);
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
  const s0raw = String(input || "").trim();
  const s0 = decodeHtmlEntitiesLoose(s0raw).trim();
  if (!s0) return { embedUrl: "", openUrl: "", kind: "" };

  // iframe pasted
  if (s0.includes("<iframe")) {
    const src = decodeHtmlEntitiesLoose(extractIframeSrc(s0));
    if (!src) return { embedUrl: "", openUrl: "", kind: "" };
    // if user pasted an embed src, keep it (most reliable)
    const uEmbed = tryParseUrl(src);
    if (uEmbed) {
      const h = (uEmbed.hostname || "").toLowerCase();
      const p = uEmbed.pathname || "";
      if ((h.endsWith("youtube.com") || h.endsWith("youtube-nocookie.com")) && p.startsWith("/embed/")) {
        // derive openUrl when possible
        const id = (p.split("/")[2] || "").trim();
        const safeId = (x) => String(x || "").match(/^[a-zA-Z0-9_-]{6,}$/) ? String(x) : "";
        const vid = safeId(id);
        const openUrl = (vid && vid !== "videoseries") ? `https://www.youtube.com/watch?v=${vid}` : "https://www.youtube.com";
        return { embedUrl: uEmbed.toString(), openUrl, kind: (vid && vid !== "videoseries") ? "video" : "playlist" };
      }
    }
    return parseYouTube(src);
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

  // If user pasted a direct embed URL, keep it as-is (more reliable than rebuilding).
  if ((host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) && path.startsWith("/embed/")) {
    const id = (path.split("/")[2] || "").trim();
    const safeId = (x) => String(x || "").match(/^[a-zA-Z0-9_-]{6,}$/) ? String(x) : "";
    const vid = safeId(id);
    const list = params.get("list") || "";
    const safeList = safeId(list);
    const openUrl = (vid && vid !== "videoseries")
      ? `https://www.youtube.com/watch?v=${vid}`
      : (safeList ? `https://www.youtube.com/playlist?list=${safeList}` : "https://www.youtube.com");
    return { embedUrl: u.toString(), openUrl, kind: (vid && vid !== "videoseries") ? "video" : "playlist" };
  }

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
    let embedUrl = `https://www.youtube.com/embed/videoseries?list=${safeList}`;
    if (start > 0) embedUrl += `&start=${start}`;
    return { embedUrl, openUrl, kind: "playlist" };
  }

  if (videoId) {
    const openUrl = `https://www.youtube.com/watch?v=${videoId}`;
    let embedUrl = `https://www.youtube.com/embed/${videoId}`;
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

const IMAGE_LIMITS = {
  // wejściowy limit na plik (żeby nie zabić pamięci)
  maxInputBytes: 12 * 1024 * 1024,
  // docelowy limit po kompresji (na jeden obraz)
  maxOutputBytes: 1_800_000,
  // maks. rozmiar dłuższego boku
  maxSide: 2560,
  // jakość (dla webp/jpg)
  quality: 0.82,
};

const FILE_LIMITS = {
  maxInputBytes: 25 * 1024 * 1024,
};

// Łączny limit zasobów w projekcie (obrazy + pliki EPK). Chroni RAM i UX.
const MEDIA_BUDGET = {
  maxTotalBytes: 50 * 1024 * 1024,
  warnTotalBytes: Math.floor(0.85 * 50 * 1024 * 1024),
};

function estimateDataUrlBytes(dataUrl) {
  const p = parseDataUrl(dataUrl);
  if (!p || !p.b64) return 0;
  // base64: 4 chars -> 3 bytes (approx)
  return Math.floor((p.b64.length * 3) / 4);
}

function assetBytes(obj) {
  if (!obj) return 0;
  const b = Number(obj.bytes || 0);
  if (b) return b;
  const du = String(obj.dataUrl || obj.url || "");
  return du.startsWith("data:") ? estimateDataUrlBytes(du) : 0;
}

function calcMediaTotalBytes() {
  let total = 0;
  for (const it of (assets.heroImages || [])) total += assetBytes(it);
  for (const it of (assets.heroImagesMobile || [])) total += assetBytes(it);
  for (const it of (assets.galleryImages || [])) total += assetBytes(it);
  for (const it of (assets.epkPressPhotos || [])) total += assetBytes(it);
  for (const it of (assets.epkFiles || [])) total += assetBytes(it);
  total += assetBytes(assets.logo);
  total += assetBytes(assets.favicon);
  total += assetBytes(assets.ogImage);
  return total;
}

function remainingMediaBudgetBytes() {
  return Math.max(0, MEDIA_BUDGET.maxTotalBytes - calcMediaTotalBytes());
}

function enforceMediaBudget(items, kindLabel = "") {
  const arr = Array.isArray(items) ? items : [];
  if (!arr.length) return [];
  let rem = remainingMediaBudgetBytes();
  const kept = [];
  let skipped = 0;
  for (const it of arr) {
    const b = Math.max(0, Number(it?.bytes || 0));
    if (b && b > rem) {
      skipped += 1;
      continue;
    }
    kept.push(it);
    rem -= b;
  }
  if (skipped) {
    const where = kindLabel ? ` (${kindLabel})` : "";
    toast(`⚠ Limit zasobów: pominięto ${skipped} plików${where}. Budżet projektu: ${formatBytes(MEDIA_BUDGET.maxTotalBytes)}.`, 'warn', 5200);
  }
  return kept;
}

function isAllowedEpkFile(file) {
  if (!file) return false;
  const name = String(file.name || '').toLowerCase();
  const t = String(file.type || '').toLowerCase();
  if (name.endsWith('.pdf') || t === 'application/pdf') return true;
  if (name.endsWith('.zip') || t === 'application/zip' || t === 'application/x-zip-compressed') return true;
  if (t.startsWith('image/')) return isAllowedImage(file);
  if (name.match(/\.(jpg|jpeg|png|webp)$/)) return true;
  return false;
}

function safeFilename(name) {
  let n = String(name || '').trim();
  if (!n) return 'file';
  // no directories / traversal, remove control chars
  n = n.replace(/[/\\]+/g, '-');
  n = n.replace(/[\x00-\x1F\x7F]/g, '');
  n = n.replace(/\s+/g, ' ').trim();
  if (n.length > 120) n = n.slice(0, 120);
  if (!n) n = 'file';
  return n;
}


function dedupeZipName(name, usedSet) {
  const base = safeFilename(name);
  const used = usedSet instanceof Set ? usedSet : new Set();
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : '';
  let k = 2;
  while (k < 9999) {
    const cand = `${stem} (${k})${ext}`;
    if (!used.has(cand)) {
      used.add(cand);
      return cand;
    }
    k += 1;
  }
  const fallback = `${stem} (${Date.now()})${ext}`;
  used.add(fallback);
  return fallback;
}

function isLikelyHeic(file) {
  const name = String(file?.name || "").toLowerCase();
  const t = String(file?.type || "").toLowerCase();
  return t.includes("heic") || t.includes("heif") || name.endsWith(".heic") || name.endsWith(".heif");
}

function isSvgFile(file) {
  const name = String(file?.name || "").toLowerCase();
  const t = String(file?.type || "").toLowerCase();
  return t.includes("svg") || name.endsWith(".svg");
}

function isIcoFile(file) {
  const name = String(file?.name || "").toLowerCase();
  const t = String(file?.type || "").toLowerCase();
  return t.includes("x-icon") || t.includes("vnd.microsoft.icon") || name.endsWith(".ico");
}

function isAllowedImage(file) {
  const t = String(file?.type || "").toLowerCase();
  const name = String(file?.name || "").toLowerCase();
  if (isLikelyHeic(file)) return false;
  if (t.startsWith("image/")) {
    return t.includes("jpeg") || t.includes("jpg") || t.includes("png") || t.includes("webp");
  }
  return name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp");
}

function formatBytes(n) {
  const v = Number(n || 0);
  if (v < 1024) return v + " B";
  if (v < 1024 * 1024) return (v / 1024).toFixed(1) + " KB";
  return (v / 1024 / 1024).toFixed(1) + " MB";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) return resolve("");
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => resolve("");
    r.readAsDataURL(file);
  });
}

function dataUrlFromBlob(blob, mimeOverride = "") {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => {
      const out = String(r.result || "");
      if (!mimeOverride) return resolve(out);
      const m = out.match(/^data:(.*?);base64,(.*)$/);
      if (!m) return resolve(out);
      resolve(`data:${mimeOverride};base64,${m[2]}`);
    };
    r.onerror = () => resolve("");
    r.readAsDataURL(blob);
  });
}



function dataUrlToBlob(dataUrl) {
  try {
    const m = String(dataUrl || "").match(/^data:(.*?);base64,(.*)$/);
    if (!m) return null;
    const mime = m[1] || "application/octet-stream";
    const b64 = m[2] || "";
    const bin = atob(b64);
    const len = bin.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  } catch (e) {
    return null;
  }
}

/* ==========================
   IndexedDB: trwałe media (obrazy/pliki)
========================== */

const MEDIA_DB_NAME = "artist_site_generator_v9_media";
const MEDIA_STORE = "media";
let _mediaDbPromise = null;

function openMediaDb() {
  if (_mediaDbPromise) return _mediaDbPromise;
  _mediaDbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(MEDIA_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(MEDIA_STORE)) {
          db.createObjectStore(MEDIA_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
  return _mediaDbPromise;
}

async function mediaPut(id, blob, meta = {}) {
  const db = await openMediaDb();
  if (!db || !id || !blob) return false;
  return await new Promise((resolve) => {
    try {
      const tx = db.transaction(MEDIA_STORE, "readwrite");
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
      tx.objectStore(MEDIA_STORE).put({ id, blob, meta: meta || {}, updatedAt: Date.now() });
    } catch (e) {
      resolve(false);
    }
  });
}

async function mediaGet(id) {
  const db = await openMediaDb();
  if (!db || !id) return null;
  return await new Promise((resolve) => {
    try {
      const tx = db.transaction(MEDIA_STORE, "readonly");
      const req = tx.objectStore(MEDIA_STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

async function mediaDel(id) {
  const db = await openMediaDb();
  if (!db || !id) return false;
  return await new Promise((resolve) => {
    try {
      const tx = db.transaction(MEDIA_STORE, "readwrite");
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
      tx.objectStore(MEDIA_STORE).delete(id);
    } catch (e) {
      resolve(false);
    }
  });
}

function makeMediaId(prefix = "m") {
  try {
    const uuid = (crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
    return `${prefix}_${uuid}`;
  } catch (e) {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
}

async function persistImageItems(items, prefix = "img") {
  if (!Array.isArray(items) || !items.length) return;
  for (const it of items) {
    if (!it) continue;
    if (!it.id) it.id = makeMediaId(prefix);
    const blob = it.blob || dataUrlToBlob(it.dataUrl);
    if (!blob) continue;
    it.mime = it.mime || blob.type || (parseDataUrl(it.dataUrl)?.mime || "");
    it.bytes = Number(it.bytes || blob.size || 0);
    const meta = { kind: "image", prefix, alt: String(it.alt || ""), mime: it.mime, width: Number(it.width || 0), height: Number(it.height || 0), bytes: it.bytes };
    await mediaPut(it.id, blob, meta);
    // zrzucamy blob z pamięci (dataUrl jest wystarczające do podglądu)
    if (it.blob) delete it.blob;
  }
}

async function persistFileItems(items, prefix = "file") {
  if (!Array.isArray(items) || !items.length) return;
  for (const it of items) {
    if (!it) continue;
    if (!it.id) it.id = makeMediaId(prefix);
    let blob = it.blob || null;
    if (!blob && it.dataUrl) blob = dataUrlToBlob(it.dataUrl);
    if (!blob) continue;
    it.mime = it.mime || blob.type || "";
    it.bytes = Number(it.bytes || blob.size || 0);
    const meta = { kind: 'file', prefix, name: String(it.name || ''), zipName: String(it.zipName || it.name || ''), mime: it.mime, bytes: it.bytes };
    await mediaPut(it.id, blob, meta);
    if (!it.url) {
      try { it.url = URL.createObjectURL(blob); } catch (e) {}
    }
    if (it.blob) delete it.blob;
  }
}


async function persistSingleAsset(obj, stableId, meta = {}) {
  if (!obj || !obj.dataUrl) return;
  if (!obj.id) obj.id = stableId;
  const blob = obj.blob || dataUrlToBlob(obj.dataUrl);
  if (!blob) return;
  obj.mime = obj.mime || blob.type || (parseDataUrl(obj.dataUrl)?.mime || "");
  obj.bytes = Number(obj.bytes || blob.size || 0);
  await mediaPut(obj.id, blob, { ...meta, mime: obj.mime, bytes: obj.bytes });
  if (obj.blob) delete obj.blob;
}

async function decodeImageToBitmap(file) {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file);
    } catch (e) {}
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image decode failed"));
    };
    img.src = url;
  });
}

async function canvasEncode(canvas, mime, quality) {
  return await new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob || null), mime, quality);
    } catch (e) {
      resolve(null);
    }
  });
}

function canvasHasAlpha(canvas) {
  try {
    const w = Number(canvas?.width || 0);
    const h = Number(canvas?.height || 0);
    if (!w || !h) return false;
    const s = document.createElement("canvas");
    const sw = 64, sh = 64;
    s.width = sw;
    s.height = sh;
    const c = s.getContext("2d", { alpha: true, willReadFrequently: true });
    c.drawImage(canvas, 0, 0, sw, sh);
    const d = c.getImageData(0, 0, sw, sh).data;
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] < 255) return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function normalizeImageFileToDataUrl(file, opts = {}) {
  if (!file) return { dataUrl: "", mime: "", width: 0, height: 0, bytes: 0, reason: "", resized: false, compressed: false, inBytes: 0 };

  const inBytes = Number(file.size || 0);
  const maxInputBytes = Number(opts.maxInputBytes || IMAGE_LIMITS.maxInputBytes);
  if (inBytes && inBytes > maxInputBytes) {
    flashStatus(`⚠ Plik za duży: ${file.name} (${formatBytes(inBytes)}). Limit: ${formatBytes(maxInputBytes)}.`);
    return { dataUrl: "", mime: "", width: 0, height: 0, bytes: 0, reason: "too_large", resized: false, compressed: false, inBytes };
  }

  if (!isAllowedImage(file)) {
    const msg = isLikelyHeic(file)
      ? `⚠ Format HEIC/HEIF nie jest wspierany: ${file.name}. Zapisz jako JPG/PNG i wgraj ponownie.`
      : `⚠ Nieobsługiwany format obrazu: ${file.name}. Użyj JPG/PNG/WebP.`;
    flashStatus(msg);
    return { dataUrl: "", mime: "", width: 0, height: 0, bytes: 0, reason: isLikelyHeic(file) ? "heic" : "format", resized: false, compressed: false, inBytes };
  }

  const maxSide = Number(opts.maxSide || IMAGE_LIMITS.maxSide);
  const targetMime = String(opts.mime || "image/webp");
  const maxOutputBytes = Number(opts.maxOutputBytes || IMAGE_LIMITS.maxOutputBytes);
  let quality = Number(opts.quality ?? IMAGE_LIMITS.quality);

  let bmp;
  try {
    bmp = await decodeImageToBitmap(file);
  } catch (e) {
    const raw = await readFileAsDataUrl(file);
    return { dataUrl: raw, mime: file.type || (parseDataUrl(raw)?.mime || ""), width: 0, height: 0, bytes: inBytes, reason: "raw", resized: false, compressed: false, inBytes };
  }

  const w0 = Number(bmp.width || 0);
  const h0 = Number(bmp.height || 0);
  if (!w0 || !h0) {
    const raw = await readFileAsDataUrl(file);
    return { dataUrl: raw, mime: file.type || (parseDataUrl(raw)?.mime || ""), width: 0, height: 0, bytes: inBytes, reason: "raw", resized: false, compressed: false, inBytes };
  }

  let w = w0, h = h0;
  const scale = Math.min(1, maxSide / Math.max(w0, h0));
  const resized = scale < 1;
  if (resized) {
    w = Math.max(1, Math.round(w0 * scale));
    h = Math.max(1, Math.round(h0 * scale));
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, w, h);

  let usedMime = String(targetMime || "image/webp");
  let blob = await canvasEncode(canvas, usedMime, usedMime.includes("png") ? undefined : quality);

  // Fallback: jeśli WebP nie jest wspierany przez przeglądarkę, zapisujemy PNG (gdy jest alpha) albo JPG.
  if (!blob && usedMime.includes("webp")) {
    const hasAlpha = canvasHasAlpha(canvas) || String(file.type || "").toLowerCase().includes("png");
    usedMime = hasAlpha ? "image/png" : "image/jpeg";
    blob = await canvasEncode(canvas, usedMime, usedMime.includes("png") ? undefined : quality);
  }

  if (!blob) {
    const raw = await readFileAsDataUrl(file);
    return { dataUrl: raw, mime: file.type || (parseDataUrl(raw)?.mime || ""), width: w0, height: h0, bytes: inBytes, reason: "raw", resized, compressed: false, inBytes };
  }

  if (!usedMime.includes("png")) {
    while (blob.size > maxOutputBytes && quality > 0.52) {
      quality = Math.max(0.52, quality - 0.08);
      const b2 = await canvasEncode(canvas, usedMime, quality);
      if (!b2) break;
      blob = b2;
    }
  }

  const compressed = blob.size < inBytes || (file.type && file.type !== usedMime);
  const dataUrl = await dataUrlFromBlob(blob, usedMime);

  // komunikat tylko dla pojedynczego pliku (przy multi leci podsumowanie w readMultipleImages)
  if (Number(opts._single || 0) === 1) {
    const changed = resized || compressed;
    if (changed) {
      const msg = `✓ Obraz przygotowany: ${file.name} • ${w}×${h} • ${formatBytes(inBytes)} → ${formatBytes(blob.size)}`;
      toast(msg, 'info', 3600);
    }
  }

  return { dataUrl, blob, mime: usedMime, width: w, height: h, bytes: blob.size, reason: "", resized, compressed, inBytes };
}

async function readMultipleImages(fileList, opts = {}) {
  const files = Array.from(fileList || []);
  const out = [];
  let resizedCount = 0;
  let compressedCount = 0;
  let skippedTooLarge = 0;
  let skippedFormat = 0;
  let skippedHeic = 0;

  const single = files.length === 1;

  for (const f of files) {
    const norm = await normalizeImageFileToDataUrl(f, { ...opts, _single: single ? 1 : 0 });
    if (!norm.dataUrl) {
      if (norm.reason === 'too_large') skippedTooLarge++;
      else if (norm.reason === 'heic') skippedHeic++;
      else skippedFormat++;
      continue;
    }
    if (norm.resized) resizedCount++;
    if (norm.compressed) compressedCount++;
    const alt = String(f?.name || "")
      .replace(/\.[^/.]+$/, "")
      .replace(/[\-_]+/g, " ")
      .trim();
    out.push({ id: "", dataUrl: norm.dataUrl, blob: norm.blob, alt, width: norm.width, height: norm.height, bytes: norm.bytes, mime: norm.mime });
  }

  // podsumowanie (żeby user to zobaczył nawet przy live autosave)

  const skipped = skippedTooLarge + skippedFormat + skippedHeic;
  if (files.length && !single) {
    const parts = [];
    parts.push(`Zaimportowano ${out.length}/${files.length} zdjęć.`);
    if (resizedCount) parts.push(`Zmniejszono: ${resizedCount}.`);
    if (compressedCount) parts.push(`Skompresowano: ${compressedCount}.`);
    if (skipped) {
      const k = [];
      if (skippedTooLarge) k.push(`za duże: ${skippedTooLarge}`);
      if (skippedHeic) k.push(`HEIC: ${skippedHeic}`);
      if (skippedFormat) k.push(`inne formaty: ${skippedFormat}`);
      parts.push(`Odrzucono: ${skipped} (${k.join(', ')}).`);
      toast(parts.join(' '), 'warn', 5200);
    } else if (resizedCount || compressedCount) {
      toast(parts.join(' '), 'info', 3800);
    }
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
  if (mime.includes("svg")) return "svg";
  if (mime.includes("x-icon") || mime.includes("vnd.microsoft.icon") || mime.includes("icon")) return "ico";
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
    el.className = `blockItem uiCard ${isActive ? "blockItem--active" : ""}`;

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
      <div class="itemCard uiCard" data-list="${escapeHtml(listKey)}" data-idx="${idx}">
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
             <div class="itemCard uiCard">
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

      ${fieldRow("Zdjęcia HERO (upload, multi)", `<input id="ed_hero_images" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple />`,
        "1 zdjęcie = tło. 2+ zdjęcia = mini-galeria w HERO. JPG/PNG/WebP (HEIC nie). Obrazy są automatycznie zmniejszane i kompresowane."
      )}
      <div class="hint" style="margin-top:-6px;">Mobile: ${assets.heroImagesMobile.length || 0} (opcjonalnie)</div>
      <div class="grid2" style="gap:10px;">
        <input id="ed_hero_images_mobile" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple />
        <button class="btn" type="button" id="ed_hero_images_mobile_clear">Wyczyść mobile</button>
      </div>
      <div class="hint">Jeśli dodasz zdjęcia, telefon użyje pierwszego jako tła HERO.</div>
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
              <div class="itemCard uiCard">
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

      ${fieldRow("Wgraj zdjęcia", `<input id="ed_gallery_upload" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple />`, "JPG/PNG/WebP (HEIC nie). Obrazy są automatycznie zmniejszane i kompresowane.")}
      ${thumbs}
    `;
  }

  if (def.editor === "embed_spotify") {
    cfg.data.items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const sz = clampNum(cfg.data.embedSize ?? 90, 60, 100);
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
    const sz = clampNum(cfg.data.embedSize ?? 90, 60, 100);
    specific =
      fieldRow("Rozmiar okna", `
        <div class="rangeRow">
          <input id="ed_youtube_size" type="range" min="60" max="100" step="5" value="${sz}" data-path="embedSize" />
          <div class="pill"><output id="ed_youtube_size_out">${sz}%</output></div>
        </div>
      `)
      + listEditor(cfg.data.items, "items", "Wpis", [
          { key: "url", label: "Wklej kod iframe lub link", type: "textarea", placeholder: "Wklej iframe z YouTube (Udostępnij → Umieść) albo zwykły link" }
        ])
      + `<div class="hint">Najpewniej działa wklejony <strong>iframe</strong> z YouTube. Link też zadziała, ale jeśli autor zablokował osadzanie — zostanie przycisk „Otwórz”.</div>`;
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

  if (def.editor === "store") {
    cfg.data.items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    specific = listEditor(cfg.data.items, "items", "Produkt", [
      { key: "name", label: "Nazwa", type: "text", placeholder: "Koszulka / płyta / bilet" },
      { key: "price", label: "Cena", type: "text", placeholder: "np. 79 zł" },
      { key: "url", label: "Link 'Kup'", type: "url", placeholder: "https://..." },
      { key: "img", label: "Zdjęcie (URL)", type: "url", placeholder: "https://... (opcjonalnie)" },
      { key: "alt", label: "Alt", type: "text", placeholder: "Opis zdjęcia" },
      { key: "desc", label: "Opis (krótko)", type: "textarea", placeholder: "1–2 zdania" },
    ])
    + `<div class="hint">Najprościej: dodaj produkty i podepnij linki do swojego sklepu (Stage24 / Bandcamp / WooCommerce / Allegro itp.).</div>`;
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
              <div class="itemCard uiCard">
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
             <div class="itemCard uiCard">
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

      ${fieldRow("Zdjęcia prasowe (upload)", `<input id="ed_epk_photos" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple />`, "Do ZIP trafią do assets/press/. JPG/PNG/WebP (HEIC nie). Obrazy są automatycznie zmniejszane i kompresowane.")}
      ${photosInfo}

      ${fieldRow("Pliki presspack (upload)", `<input id="ed_epk_files" type="file" accept=".pdf,.zip,.png,.jpg,.jpeg,.webp" multiple />`, "Do ZIP trafią do assets/press/. JPG/PNG/WebP (HEIC nie). Obrazy są automatycznie zmniejszane i kompresowane.")}
      ${filesInfo}
    `;
  }

  if (def.editor === "contact") {
    cfg.data.email = cfg.data.email ?? "";
    cfg.data.phone = cfg.data.phone ?? "";
    cfg.data.city = cfg.data.city ?? "";
    cfg.data.cta = cfg.data.cta ?? "Napisz do mnie";
    cfg.data.showMap = typeof cfg.data.showMap === "boolean" ? cfg.data.showMap : false;
    cfg.data.mapAddress = cfg.data.mapAddress ?? "";
    cfg.data.mapEmbed = cfg.data.mapEmbed ?? "";
    specific = `
      <div class="grid2">
        ${fieldRow("Email", `<input id="ed_contact_email" type="email" value="${escapeHtml(cfg.data.email)}" placeholder="mail@..." />`)}
        ${fieldRow("Telefon", `<input id="ed_contact_phone" type="text" value="${escapeHtml(cfg.data.phone)}" placeholder="+48 ..." />`)}
      </div>
      <div class="grid2">
        ${fieldRow("Miasto", `<input id="ed_contact_city" type="text" value="${escapeHtml(cfg.data.city)}" placeholder="Kraków" />`)}
        ${fieldRow("Tekst CTA", `<input id="ed_contact_cta" type="text" value="${escapeHtml(cfg.data.cta)}" />`)}
      </div>
      <div class="divider"></div>
      ${fieldRow("Mapa", `<label class="chk"><input id="ed_contact_showMap" type="checkbox" ${cfg.data.showMap?"checked":""}/> <span>Pokaż mapę pod danymi kontaktu</span></label>`, "W praktyce: studio, sala prób, biuro, punkt odbioru merchu.")}
      ${fieldRow("Adres (prosto)", `<input id="ed_contact_mapAddress" type="text" value="${escapeHtml(cfg.data.mapAddress)}" placeholder="np. ul. Długa 1, Kraków" />`, "Jeśli nie wklejasz iframe — generator zrobi mapę po adresie.")}
      ${fieldRow("Kod iframe z Google Maps (opcjonalnie)", `<textarea id="ed_contact_mapEmbed" rows="4" placeholder="Wklej iframe (Udostępnij → Umieść mapę)">${escapeHtml(cfg.data.mapEmbed)}</textarea>`, "Najpewniejsze osadzanie. Jeśli wkleisz iframe — użyjemy jego src.")}
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

  // Block editor can render selects dynamically (list items etc.).
  initCustomSelects(document);
  refreshCustomSelects();

  bindEditorHandlers(host, id);

  // Po renderze edytora: odśwież inline-walidacje dla pól ed_*
  applyInlineIssues();
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
  }

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

// list add/remove (structural inside editor -> rerender OK)
  host.querySelectorAll("[data-add-item]").forEach(btn => {
    btn.addEventListener("click", () => {
      const listKey = btn.getAttribute("data-add-item");
      cfg.data[listKey] = Array.isArray(cfg.data[listKey]) ? cfg.data[listKey] : [];
      cfg.data[listKey].push({});
      renderBlockEditor();
      saveDraft();
      requestPreviewRebuild('structure');
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
      requestPreviewRebuild('structure');
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
    const imgsM = host.querySelector("#ed_hero_images_mobile");
    const clearM = host.querySelector("#ed_hero_images_mobile_clear");

    if (headline) headline.addEventListener("input", () => { h.headline = headline.value; contentChanged(); });
    if (sub) sub.addEventListener("input", () => { h.subheadline = sub.value; contentChanged(); });
    if (ctaText) ctaText.addEventListener("input", () => { h.primaryCtaText = ctaText.value; contentChanged(); });

    if (ctaTarget) {
      ctaTarget.addEventListener("change", () => {
        h.primaryCtaTarget = ctaTarget.value;
        if (customWrap) customWrap.style.display = (ctaTarget.value === "custom") ? "block" : "none";
        saveDraft();
        requestPreviewRebuild('content');
      });
    }

    if (ctaUrl) ctaUrl.addEventListener("input", () => { h.primaryCtaUrl = ctaUrl.value; contentChanged(); });

    if (imgs) {
      imgs.addEventListener("change", async () => {
        const newImgsRaw = await readMultipleImages(imgs.files, { maxSide: 2560, maxOutputBytes: 1600000, mime: "image/webp", quality: 0.82 });
        const newImgs = enforceMediaBudget(newImgsRaw, 'hero');
        if (!newImgs.length) { renderBlockEditor(); return; }
        await persistImageItems(newImgs, "hero");
        assets.heroImages.push(...newImgs);
        renderBlockEditor(); // structural (list)
        saveDraft();
        requestPreviewRebuild('structure');
      });
    }

    if (imgsM) {
      imgsM.addEventListener("change", async () => {
        const newImgsRaw = await readMultipleImages(imgsM.files, { maxSide: 2560, maxOutputBytes: 1600000, mime: "image/webp", quality: 0.82 });
        const newImgs = enforceMediaBudget(newImgsRaw, 'heroM');
        if (!newImgs.length) { renderBlockEditor(); return; }
        // replace (not append) to keep it simple for users
        for (const old of (assets.heroImagesMobile || [])) { if (old?.id) mediaDel(old.id).catch?.(() => {}); }
        assets.heroImagesMobile = [];
        await persistImageItems(newImgs, "heroM");
        assets.heroImagesMobile.push(...newImgs);
        renderBlockEditor();
        saveDraft();
        requestPreviewRebuild('structure');
      });
    }

    if (clearM) {
      clearM.addEventListener("click", () => {
        for (const old of (assets.heroImagesMobile || [])) { if (old?.id) mediaDel(old.id).catch?.(() => {}); }
        assets.heroImagesMobile = [];
        renderBlockEditor();
        saveDraft();
        requestPreviewRebuild('structure');
      });
    }

    host.querySelectorAll("[data-remove-heroimg]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-remove-heroimg"));
        const removed = assets.heroImages.splice(idx, 1)[0];
        if (removed && removed.id) mediaDel(removed.id).catch?.(() => {});
        renderBlockEditor();
        saveDraft();
        requestPreviewRebuild('structure');
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

    if (layout) layout.addEventListener("change", () => { cfg.data.layout = layout.value; saveDraft(); requestPreviewRebuild('content'); });

    const colsR = host.querySelector("#ed_gallery_cols");
    const colsO = host.querySelector("#ed_gallery_cols_out");
    if (colsR) colsR.addEventListener("input", () => {
      cfg.data.cols = Number(colsR.value);
      if (colsO) colsO.textContent = String(colsR.value);
      contentChanged();
    });

    const mcolsR = host.querySelector("#ed_gallery_mcols");
    const mcolsO = host.querySelector("#ed_gallery_mcols_out");
    if (mcolsR) mcolsR.addEventListener("input", () => {
      cfg.data.masonryCols = Number(mcolsR.value);
      if (mcolsO) mcolsO.textContent = String(mcolsR.value);
      contentChanged();
    });

    if (upload) {
      upload.addEventListener("change", async () => {
        const imgsRaw = await readMultipleImages(upload.files, { maxSide: 2560, maxOutputBytes: 1600000, mime: "image/webp", quality: 0.82 });
        const imgs = enforceMediaBudget(imgsRaw, 'gallery');
        if (!imgs.length) { renderBlockEditor(); return; }
        await persistImageItems(imgs, "gal");
        assets.galleryImages.push(...imgs);
        renderBlockEditor();
        saveDraft();
        requestPreviewRebuild('structure');
      });
    }

    if (imgsM) {
      imgsM.addEventListener("change", async () => {
        const newImgsRaw = await readMultipleImages(imgsM.files, { maxSide: 2560, maxOutputBytes: 1600000, mime: "image/webp", quality: 0.82 });
        const newImgs = enforceMediaBudget(newImgsRaw, 'heroM');
        if (!newImgs.length) { renderBlockEditor(); return; }
        // replace (not append) to keep it simple for users
        for (const old of (assets.heroImagesMobile || [])) { if (old?.id) mediaDel(old.id).catch?.(() => {}); }
        assets.heroImagesMobile = [];
        await persistImageItems(newImgs, "heroM");
        assets.heroImagesMobile.push(...newImgs);
        renderBlockEditor();
        saveDraft();
        requestPreviewRebuild('structure');
      });
    }

    if (clearM) {
      clearM.addEventListener("click", () => {
        for (const old of (assets.heroImagesMobile || [])) { if (old?.id) mediaDel(old.id).catch?.(() => {}); }
        assets.heroImagesMobile = [];
        renderBlockEditor();
        saveDraft();
        requestPreviewRebuild('structure');
      });
    }

    host.querySelectorAll("[data-remove-gallery]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-remove-gallery"));
        const removed = assets.galleryImages.splice(idx, 1)[0];
        if (removed && removed.id) mediaDel(removed.id).catch?.(() => {});
        renderBlockEditor();
        saveDraft();
        requestPreviewRebuild('structure');
      });
    });
  }

  if (def.editor === "epk") {
    const bio = host.querySelector("#ed_epk_bio");
    if (bio) bio.addEventListener("input", () => { cfg.data.shortBio = bio.value; contentChanged(); });

    const photos = host.querySelector("#ed_epk_photos");
    if (photos) {
      photos.addEventListener("change", async () => {
        const imgsRaw = await readMultipleImages(photos.files, { maxSide: 2560, maxOutputBytes: 1800000, mime: "image/webp", quality: 0.82 });
        const imgs = enforceMediaBudget(imgsRaw, 'press');
        if (!imgs.length) { renderBlockEditor(); return; }
        await persistImageItems(imgs, "press");
        assets.epkPressPhotos.push(...imgs);
        renderBlockEditor();
        saveDraft();
        requestPreviewRebuild('structure');
      });
    }

    if (imgsM) {
      imgsM.addEventListener("change", async () => {
        const newImgsRaw = await readMultipleImages(imgsM.files, { maxSide: 2560, maxOutputBytes: 1600000, mime: "image/webp", quality: 0.82 });
        const newImgs = enforceMediaBudget(newImgsRaw, 'heroM');
        if (!newImgs.length) { renderBlockEditor(); return; }
        // replace (not append) to keep it simple for users
        for (const old of (assets.heroImagesMobile || [])) { if (old?.id) mediaDel(old.id).catch?.(() => {}); }
        assets.heroImagesMobile = [];
        await persistImageItems(newImgs, "heroM");
        assets.heroImagesMobile.push(...newImgs);
        renderBlockEditor();
        saveDraft();
        requestPreviewRebuild('structure');
      });
    }

    if (clearM) {
      clearM.addEventListener("click", () => {
        for (const old of (assets.heroImagesMobile || [])) { if (old?.id) mediaDel(old.id).catch?.(() => {}); }
        assets.heroImagesMobile = [];
        renderBlockEditor();
        saveDraft();
        requestPreviewRebuild('structure');
      });
    }

    host.querySelectorAll("[data-remove-epkphoto]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-remove-epkphoto"));
        const removed = assets.epkPressPhotos.splice(idx, 1)[0];
        if (removed && removed.id) mediaDel(removed.id).catch?.(() => {});
        renderBlockEditor();
        saveDraft();
        requestPreviewRebuild('structure');
      });
    });

    const files = host.querySelector("#ed_epk_files");
    if (files) {
      files.addEventListener("change", async () => {
        const list = Array.from(files.files || []);
        const used = new Set((assets.epkFiles || []).map(x => String(x?.zipName || x?.name || '').trim()).filter(Boolean));
        let added = 0;
        let skipped = 0;
        for (const f of list) {
          if (!f) continue;
          const inBytes = Number(f.size || 0);
          const remBudget = remainingMediaBudgetBytes();
          if (inBytes && remBudget && inBytes > remBudget) {
            toast(`⚠ Limit zasobów: brak miejsca na ${f.name} (${formatBytes(inBytes)}). Zostało: ${formatBytes(remBudget)}.`, 'warn', 5200);
            skipped += 1;
            continue;
          }
          if (inBytes && inBytes > FILE_LIMITS.maxInputBytes) {
            toast(`⚠ Plik za duży: ${f.name} (${formatBytes(inBytes)}). Limit: ${formatBytes(FILE_LIMITS.maxInputBytes)}.`, 'warn', 5200);
            skipped += 1;
            continue;
          }
          if (!isAllowedEpkFile(f)) {
            toast(`⚠ Nieobsługiwany format: ${f.name}. Dozwolone: PDF/ZIP/JPG/PNG/WebP.`, 'warn', 5200);
            skipped += 1;
            continue;
          }
          const id = makeMediaId('pressfile');
          const zipName = dedupeZipName(f.name, used);
          const mime = String(f.type || '');
          const blob = f;
          const meta = { kind: 'file', prefix: 'pressfile', name: String(f.name || ''), zipName: String(zipName || ''), mime: mime, bytes: inBytes };
          await mediaPut(id, blob, meta);
          let url = '';
          try { url = URL.createObjectURL(blob); } catch (e) {}
          assets.epkFiles.push({ id, name: String(f.name || ''), zipName: String(zipName || ''), mime: mime, bytes: inBytes, url });
          added += 1;
        }
        if (added) toast(`✓ Dodano pliki: ${added}${skipped ? ` (pominięto: ${skipped})` : ''}`, 'ok', 2400);
        renderBlockEditor();
        saveDraft();
        requestPreviewRebuild('structure');
      });
    }

    if (imgsM) {
      imgsM.addEventListener("change", async () => {
        const newImgsRaw = await readMultipleImages(imgsM.files, { maxSide: 2560, maxOutputBytes: 1600000, mime: "image/webp", quality: 0.82 });
        const newImgs = enforceMediaBudget(newImgsRaw, 'heroM');
        if (!newImgs.length) { renderBlockEditor(); return; }
        // replace (not append) to keep it simple for users
        for (const old of (assets.heroImagesMobile || [])) { if (old?.id) mediaDel(old.id).catch?.(() => {}); }
        assets.heroImagesMobile = [];
        await persistImageItems(newImgs, "heroM");
        assets.heroImagesMobile.push(...newImgs);
        renderBlockEditor();
        saveDraft();
        requestPreviewRebuild('structure');
      });
    }

    if (clearM) {
      clearM.addEventListener("click", () => {
        for (const old of (assets.heroImagesMobile || [])) { if (old?.id) mediaDel(old.id).catch?.(() => {}); }
        assets.heroImagesMobile = [];
        renderBlockEditor();
        saveDraft();
        requestPreviewRebuild('structure');
      });
    }

    host.querySelectorAll("[data-remove-epkfile]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-remove-epkfile"));
        const removed = assets.epkFiles.splice(idx, 1)[0];
        if (removed && removed.url) {
          try { URL.revokeObjectURL(removed.url); } catch (e) {}
        }
        if (removed && removed.id) mediaDel(removed.id).catch?.(() => {});
        renderBlockEditor();
        saveDraft();
        requestPreviewRebuild('structure');
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
    const showMap = host.querySelector("#ed_contact_showMap");
    const mapAddress = host.querySelector("#ed_contact_mapAddress");
    const mapEmbed = host.querySelector("#ed_contact_mapEmbed");
    if (email) email.addEventListener("input", () => { cfg.data.email = email.value; contentChanged(); });
    if (phone) phone.addEventListener("input", () => { cfg.data.phone = phone.value; contentChanged(); });
    if (city) city.addEventListener("input", () => { cfg.data.city = city.value; contentChanged(); });
    if (cta) cta.addEventListener("input", () => { cfg.data.cta = cta.value; contentChanged(); });
    if (showMap) showMap.addEventListener("change", () => { cfg.data.showMap = !!showMap.checked; contentChanged(); });
    if (mapAddress) mapAddress.addEventListener("input", () => { cfg.data.mapAddress = mapAddress.value; contentChanged(); });
    if (mapEmbed) mapEmbed.addEventListener("input", () => { cfg.data.mapEmbed = mapEmbed.value; contentChanged(); });
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

function buildSiteCss() {
  const accent = state.accent || "#6d28d9";
  const headersAlign = state.sectionHeadersAlign === "center" ? "center" : "left";

  return `
:root{
  --accent:${accent};
  --max: 1160px;
  --radius: 18px;
  --border-w: 1px;
  --pad-y: 26px;
  --pad-x: 18px;
  --section-gap: 26px;
  --shadow: none;
  --motion-dur: 160ms;
  --motion-ease: cubic-bezier(.2,.8,.2,1);
}

@media (prefers-reduced-motion: reduce){
  :root{ --motion-dur: 0ms; }
}

/* theme tokens */
/* Nie wymuszaj stałego scrollbara w wygenerowanej stronie – ma się pojawiać tylko gdy jest potrzebny. */
html{ overflow-x:hidden; }
body{ margin:0; overflow-x:hidden; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color: var(--fg, #0b1020); background: var(--bg, #f7f7fb); }
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
/* global style switches */
body.width-wide{ --max: 1320px !important; }

body.density-comfortable{ --pad-y: 30px !important; --section-gap: 30px !important; }
body.density-normal{ --pad-y: 26px !important; --section-gap: 26px !important; }
body.density-compact{ --pad-y: 18px !important; --section-gap: 18px !important; }

body.borders-none{ --border-w: 0px !important; }
body.borders-thin{ --border-w: 1px !important; }
body.borders-thick{ --border-w: 2px !important; }

body.radius-0{ --radius: 0px !important; }
body.radius-md{ --radius: 18px !important; }
body.radius-lg{ --radius: 28px !important; }

body.motion-off{ --motion-dur: 0ms !important; }
body.motion-subtle{ --motion-dur: 160ms !important; }
body.motion-strong{ --motion-dur: 260ms !important; --motion-ease: cubic-bezier(.16,.84,.33,1) !important; }

.container{ max-width: var(--max); margin: 0 auto; padding: var(--pad-y) var(--pad-x) 70px; }
main.container{ padding-top: calc(var(--pad-y) + var(--header-h, 72px)); }
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
.sectionTitle{ text-align:${headersAlign}; margin:0 0 14px 0; font-size: 22px; letter-spacing:.2px; }
.muted{ opacity:.78; line-height:1.65; }

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
.headerInner{
  max-width: var(--max);
  margin:0 auto;
  padding: 14px var(--pad-x);
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:18px;
  position:relative;
  min-width: 0;
  /* Pozwól menu (dropdown) wyjść w dół, ale nie pozwalaj rozpychać szerokości. */
  overflow: visible;
}
.brand{
  display:flex; align-items:center; gap:10px;
  font-weight: 900;
  letter-spacing:.2px;
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
.nav a{
  text-decoration:none;
  color: inherit;
  opacity:.75;
  font-weight: 800;
  font-size: 13px;
  padding: 8px 10px;
  border-radius: 12px;
  transition: background var(--motion-dur) var(--motion-ease), opacity var(--motion-dur) var(--motion-ease), transform var(--motion-dur) var(--motion-ease), border-color var(--motion-dur) var(--motion-ease);
}
.nav a:hover{ opacity:1; }
.nav a.active{ opacity:1; }

/* accent types */
body.accent-underline .nav a.active{ text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 6px; }
body.accent-pill .nav a.active{ background: color-mix(in oklab, var(--accent), transparent 86%); }
body.accent-outline .nav a.active{ border: var(--border-w) solid var(--accent); }
body.accent-gradient .nav a.active{
  background: linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent), white 22%));
  color:#fff;
  box-shadow: 0 8px 30px color-mix(in oklab, var(--accent), transparent 72%);
}

/* header layout: center */
body.header-center .brand{ position:absolute; left: var(--pad-x); }
body.header-center .nav{ justify-content:center; margin: 0 auto; }
body.header-center .navToggle{ position:absolute; right: var(--pad-x); }

.btn{
  display:inline-flex; align-items:center; justify-content:center;
  border: var(--border-w) solid var(--line);
  padding: 10px 14px;
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
  box-shadow: 0 10px 40px color-mix(in oklab, var(--accent), transparent 74%);
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
  pointer-events:none;
}

@media (max-width: 820px){
  .hero::before{ background-image: var(--hero-bg-mobile, var(--hero-bg)); }
}

@supports (height: 100svh){
  .hero{ min-height: min(520px, calc(100svh - var(--header-h, 72px))); }
}

body.hero-edge #hero.hero{
  margin-left: calc(-1 * var(--pad-x));
  margin-right: calc(-1 * var(--pad-x));
  margin-top: calc(-1 * var(--pad-y));
  border-radius: 0;
}
body.hero-edge #hero.hero .heroInner{
  padding-left: var(--pad-x);
  padding-right: var(--pad-x);
}
.hero::after{
  content:"";
  position:absolute; inset:0;
  background: linear-gradient(180deg, rgba(0,0,0,.25), rgba(0,0,0,.72));
  pointer-events:none;
}
.heroInner{ position:relative; max-width: 70ch; z-index:1; }
.hero .kicker{ display:inline-flex; align-items:center; gap:10px; font-weight:900; opacity:.95; }
.kdot{ width:10px; height:10px; background: var(--accent); }
.hero h1{ margin: 10px 0 10px 0; font-size: 52px; letter-spacing:-.6px; }
.hero p{ margin: 0 0 18px 0; font-size: 16px; opacity:.88; }
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
  padding: 8px 10px;
  line-height: 1;
  cursor: pointer;
  user-select: none;
}
.heroArrow:hover{ background: rgba(0,0,0,.58); }
.heroCounter{
  font-weight: 900;
  font-size: 13px;
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

.embed{ width:100%; aspect-ratio: 16/9; border:0; }
.embed.tall{ width:100%; height: 352px; border:0; aspect-ratio: auto; }
.embedGrid{ --embed-max: 100%; justify-items:center; }
.embedWrap{ width: min(var(--embed-max), 920px); max-width: 100%; margin-inline:auto; }
.mediaSplitRow{ display:grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items:start; }
.mediaSplitRow .embedWrap{ width: 100%; max-width: 100%; }
/* wyrównanie wysokości embedów w układzie obok siebie */
.mediaSplitRow .embed{ height: 352px; aspect-ratio: auto; }
.mediaSplitRow .embed.tall{ height: 352px; }
@media (max-width: 900px){ .mediaSplitRow .embed{ height:auto; aspect-ratio: 16/9; } .mediaSplitRow .embed.tall{ height: 352px; } }
@media (max-width: 900px){ .mediaSplitRow{ grid-template-columns: 1fr; } }
.embedMeta{ display:flex; justify-content:flex-end; margin-top:8px; }
.embedMeta .btn{ padding: 8px 12px; font-size: 12px; }
.embedNote{ font-size: 12px; opacity: .70; margin-top: 6px; line-height: 1.5; }
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
.mapWrap{ margin-top: 16px; }
.mapEmbed{ width: 100%; height: 320px; border:0; border-radius: var(--radius); }
.mapMeta{ display:flex; justify-content:flex-end; margin-top: 8px; }
.mapMeta .btn{ padding: 8px 12px; font-size: 12px; }
.mapNote{ font-size: 12px; opacity: .70; margin-top: 6px; line-height: 1.5; }

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
.storeDesc{ opacity:.78; line-height:1.55; font-size: 13px; }
.storeActions{ margin-top: 4px; }

.footer{ margin-top: 36px; opacity:.7; font-size: 12px; text-align:center; }
.footer a{ color: inherit; text-decoration: underline; text-underline-offset:2px; }
.footer a:hover{ opacity:1; }
.footerSep{ margin: 0 6px; }
.privacyPolicy{ line-height:1.55; font-size: 14px; }
.privacyPolicy h3{ margin: 16px 0 8px; font-size: 14px; }
.privacyPolicy ul{ margin: 8px 0 0 18px; }


/* privacy modal (single-page) */
.privacyModal{ position:fixed; inset:0; z-index: 9999; display:none; padding: 18px; }
.privacyModal:target, .privacyModal.isOpen{ display:block; }
.privacyModal__backdrop{ position:absolute; inset:0; background: rgba(0,0,0,.62); }
.privacyModal__dialog{ position:relative; width: min(980px, 94vw); max-height: 90vh; margin: 4vh auto; overflow:auto;
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
.lbBtn{ border:1px solid rgba(255,255,255,.22); background: rgba(0,0,0,.35); color:#fff; padding: 8px 10px; border-radius: 12px; font-weight: 900; cursor:pointer; }
.lbBtn:hover{ background: rgba(255,255,255,.08); }

/* templates (existing) */
body.tpl-square{ --radius: 0px; }
body.tpl-square main.container{ padding-top: calc(18px + var(--header-h, 72px)); }
body.tpl-square .btn{ border-radius: 0; }
body.tpl-square .hero{ border-radius: 0; }

body.tpl-colorwash{ background: linear-gradient(0deg, color-mix(in oklab, var(--accent), white 85%), color-mix(in oklab, var(--accent), white 85%)); }
body.theme-modern.tpl-colorwash{ background: linear-gradient(0deg, color-mix(in oklab, var(--accent), black 75%), color-mix(in oklab, var(--accent), black 75%)); }
body.tpl-colorwash .siteHeader{ background: color-mix(in oklab, var(--header-bg), transparent 12%); }
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


/* templates (expanded)
   Each template gets some distinct layout/typography so the catalog feels real. */

body.tpl-cinematic .hero{ min-height: 72vh; }
body.tpl-cinematic .hero::before{ filter: saturate(1.0) contrast(1.08); }
body.tpl-cinematic .hero::after{ background: radial-gradient(900px 460px at 18% 12%, rgba(20,184,166,.18), transparent 60%), linear-gradient(180deg, rgba(0,0,0,.25), rgba(0,0,0,.80)); }
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

body.tpl-collage .section{ background: var(--card-bg); padding: 18px; border-radius: var(--radius); border: var(--border-w) solid var(--line-soft); box-shadow: 0 18px 60px rgba(0,0,0,.08); }
body.theme-modern.tpl-collage .section{ box-shadow: 0 22px 70px rgba(0,0,0,.50); }
body.tpl-collage .galleryGrid a:nth-child(odd){ transform: rotate(-.6deg); }
body.tpl-collage .galleryGrid a:nth-child(even){ transform: rotate(.6deg); }
body.tpl-collage .storeCard{ box-shadow: 0 14px 50px rgba(0,0,0,.08); }
body.theme-modern.tpl-collage .storeCard{ box-shadow: 0 18px 60px rgba(0,0,0,.45); }

body.tpl-photofirst .hero{ min-height: 78vh; padding: 34px; }
body.tpl-photofirst .heroInner{ max-width: 86ch; }
body.tpl-photofirst .heroGallery{ grid-template-columns: repeat(8, 1fr); }
@media (max-width: 900px){ body.tpl-photofirst .heroGallery{ grid-template-columns: repeat(4,1fr);} }

/* split layout: hero as a sticky left panel on desktop */
@media (min-width: 980px){
  body.tpl-split main.container{ display:grid; grid-template-columns: 380px 1fr; gap: 22px; align-items:start; }
  body.tpl-split main.container > .hero{ grid-column: 1; grid-row: 1 / span 999; position: sticky; top: calc(var(--header-h, 72px) + 20px); min-height: calc(100vh - (var(--header-h, 72px) + 48px)); border-radius: var(--radius); }
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
  padding: 8px 10px;
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

/* auto-hamburger, gdy header nie miesci sie na desktop */
.siteHeader.forceHamburger .navToggle{ display:block; }
.siteHeader.forceHamburger .headerInner{ position:relative; }
.siteHeader.forceHamburger .nav{
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
body.theme-modern .siteHeader.forceHamburger .nav{
  background: var(--nav-bg-open);
  border-bottom-color: rgba(255,255,255,.10);
}
.siteHeader.forceHamburger.menuOpen .nav{
  max-height: 70vh;
  opacity: 1;
  transform: translateY(0);
  pointer-events:auto;
}

/* po otwarciu menu header ma byc czytelny */
.siteHeader.menuOpen{ background: var(--nav-bg-open); backdrop-filter: none; }

/* cookie consent banner */
.cookieBanner{ position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 9999; }
.cookieBanner__inner{ max-width: var(--max); margin: 0 auto; }
.cookieBanner__box{ background: var(--header-bg); border: var(--border-w) solid var(--line); border-radius: calc(var(--radius) + 2px); padding: 12px 14px; backdrop-filter: blur(10px); box-shadow: 0 18px 60px rgba(0,0,0,.22); }
body.theme-minimalist .cookieBanner__box{ box-shadow: 0 18px 60px rgba(0,0,0,.12); }
.cookieBanner__row{ display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.cookieBanner__text{ font-size: 13px; line-height: 1.35; opacity: .92; max-width: 720px; }
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
    if(!id) return;

    const consent = getConsent();
    if(consent === 'accept'){
      loadGtm(id);
      return;
    }
    if(consent === 'reject'){
      return;
    }

    if(ANALYTICS.cookieBanner) showCookieBanner();
    else loadGtm(id);
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

function setupHamburger(){
    const header = document.querySelector('.siteHeader');
    if(!header) return;
    const btn = header.querySelector('.navToggle');
    const nav = header.querySelector('.nav');
    const inner = header.querySelector('.headerInner');
    const brand = header.querySelector('.brand');
    if(!btn || !nav) return;

    let isCollapsed = false;

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

    function needsHamburger(){
      // Mobile: hamburger zawsze.
      if(window.matchMedia('(max-width: 760px)').matches) return true;
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
      let natural = 0;
      for(const a of links){
        natural += a.getBoundingClientRect().width;
      }
      natural += gap * Math.max(0, links.length - 1);

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

      return wrapsLine || clipped || innerOverflows;
    }

    function applyCollapse(){
      const should = needsHamburger();
      if(should === isCollapsed) return;
      isCollapsed = should;
      header.classList.toggle('forceHamburger', should);
      if(!should) close();
    }

    // Start
    applyCollapse();
    setBtn(false);

    window.addEventListener('resize', ()=>{ applyCollapse(); }, { passive:true });
    window.addEventListener('orientationchange', ()=>{ applyCollapse(); });
    // Po załadowaniu fontów układ może się zmienić
    window.addEventListener('load', ()=>{ applyCollapse(); });
    try{
      if(document.fonts && document.fonts.ready){
        document.fonts.ready.then(()=>{ applyCollapse(); });
      }
    }catch(e){}

    // Reaguj tez na zmiany w nawigacji (np. dodanie wielu sekcji bez zmiany szerokosci okna).
    try{
      if('ResizeObserver' in window){
        const ro = new ResizeObserver(()=>{ applyCollapse(); });
        ro.observe(header);
        if(inner) ro.observe(inner);
        ro.observe(nav);
        ro.observe(brand);
      }
    }catch(e){}
    try{
      const mo = new MutationObserver(()=>{ applyCollapse(); });
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

    function clearHash(){
      try{
        history.pushState('', document.title, window.location.pathname + window.location.search);
      }catch(e){
        try{ location.hash = ''; }catch(ex){}
      }
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
      if(location.hash === '#privacy') clearHash();
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
  const heroImgsMobile = assets.heroImagesMobile || [];

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
  <div class="heroInner">
    <h1>${headline}</h1>
    <p>${sub}</p>
    <div class="heroActions">
      <a class="btn primary" href="${ctaHref}">${btnText}</a>
      <a class="btn" href="${mode==="single" ? "#contact" : "contact.html"}">Kontakt</a>
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
    const sz = clampNum(cfg.data.embedSize ?? 90, 60, 100);
    const parts = items.map(it => {
      const p = parseSpotify(it.url || "");
      if (p.embedUrl) {
        const open = escapeHtml(p.openUrl || it.url || "");
        return `
<div class="embedWrap">
  <iframe class="embed tall" src="${escapeHtml(p.embedUrl)}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
  ${open ? `<div class=\"embedMeta\"><a class=\"btn\" href=\"${open}\" target=\"_blank\" rel=\"noopener\">Otwórz</a></div><div class=\"embedNote\">Jeśli odtwarzacz jest zablokowany przez przeglądarkę, użyj „Otwórz”.</div>` : ``}
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
    const sz = clampNum(cfg.data.embedSize ?? 90, 60, 100);
    const parts = items.map(it => {
      const p = parseYouTube(it.url || "");
      if (p.embedUrl) {
        const open = escapeHtml(p.openUrl || it.url || "");
        return `
<div class="embedWrap">
  <iframe class="embed" width="560" height="315" src="${escapeHtml(p.embedUrl)}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe>
  ${open ? `<div class=\"embedMeta\"><a class=\"btn\" href=\"${open}\" target=\"_blank\" rel=\"noopener\">Otwórz</a></div><div class=\"embedNote\">Jeśli player nie działa (blokady prywatności/adblock), użyj „Otwórz”.</div>` : ``}
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
      const desc = escapeHtml(it.desc || "").replaceAll("\n","<br/>");
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
  <div class="muted" style="margin-top:8px;">${escapeHtml(it.desc || "").replaceAll("\n","<br/>")}</div>
</div>`).join("");

    return `
<section id="${id}" class="section">
  ${headingHtml}
  <div>${rows || `<div class="muted">Dodaj usługi w generatorze.</div>`}</div>
</section>`;
  }



  if (editor === "newsletter") {
    const title = escapeHtml(cfg.data.title || "Zapisz się");
    const desc = escapeHtml(cfg.data.desc || "").replaceAll("\n","<br/>");
    const btn = escapeHtml(cfg.data.btn || "Dołącz");
    const url = normalizeHttpUrlLoose(cfg.data.url || "");

    return `
<section id="${id}" class="section">
  ${headingHtml}
  <div class="embedWrap">
    <div class="embedCard">
      <div style="font-weight:900;">${title}</div>
      ${desc ? `<div class="muted" style="margin-top:8px;">${desc}</div>` : ``}
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
      const desc = escapeHtml(it.desc || "").replaceAll("\n","<br/>");
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
      return `
<div style="padding:12px 0; border-bottom:1px solid rgba(127,127,127,.18);">
  <div style="font-weight:900;">„${escapeHtml(it.quote || "—").replaceAll("\n"," ")}”</div>
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
    const bioRaw = String(d.shortBio || "").trim();
    const bio = escapeHtml(bioRaw).replaceAll("\n","<br/>");

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
      <div class="muted">${bio}</div>
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
      ${mapOpen ? `<div class=\"mapMeta\"><a class=\"btn\" href=\"${escapeHtml(mapOpen)}\" target=\"_blank\" rel=\"noopener\">Otwórz mapę</a></div><div class=\"mapNote\">Jeśli mapa jest zablokowana przez przeglądarkę, użyj „Otwórz mapę”.</div>` : ``}
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

  if (state.accentType) cls.push(`accent-${state.accentType}`);
  if (state.headerLayout) cls.push(`header-${state.headerLayout}`);
  if (state.contentWidth) cls.push(`width-${state.contentWidth}`);
  if (state.density) cls.push(`density-${state.density}`);
  if (state.borders) cls.push(`borders-${state.borders}`);
  if (state.radius) cls.push(`radius-${state.radius}`);
  if (state.sectionDividers) cls.push(`sep-${state.sectionDividers}`);
  if (state.motion) cls.push(`motion-${state.motion}`);
  if (state.scrollMode) cls.push(`scroll-${state.scrollMode}`);
  if (state.heroEdge) cls.push(`hero-edge`);

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
      <div class="embedMeta"><a class="btn" href="#">Otwórz</a></div>
    </div>
    <div class="embedCard">
      <strong>YouTube</strong>
      <div style="margin-top:10px;" class="fakeEmbed">Embed (16:9)</div>
      <div class="embedMeta"><a class="btn" href="#">Otwórz</a></div>
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
    <div class="mapMeta"><a class="btn" href="#">Otwórz mapę</a></div>
  </div>
</section>`;

  return `
<!doctype html>
<html lang="pl"${previewAttr}>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="referrer" content="strict-origin-when-cross-origin"/>
<title>${escapeHtml(pageTitle)}</title>
${headCss}
</head>
<body class="${escapeHtml(buildBodyClass())}">
  ${buildHeader(nav, '#hero', inlineAssets)}
  <main class="container">
    ${heroHtml}
    ${aboutHtml}
    ${cardsHtml}
    ${galleryHtml}
    ${mediaHtml}
    ${storeHtml}
    ${contactHtml}
    <div class="footer">© ${escapeHtml(state.siteName || 'Artysta')}</div>
  </main>
${footJs}
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
<body class="${escapeHtml(buildBodyClass())}">
  ${buildHeader(nav, nav[0]?.href || "#hero", inlineAssets)}
  <main class="container">
    ${bodySections}
    ${privacySection}
    ${buildFooterHtml("single")}
  </main>
${footJs}
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
  const enabled = enabledBlocksInOrder().filter(id => id !== "hero");

  // Home in ZIP behaves like "sekcje": HERO + wszystkie sekcje (w tym duplikaty)
  const indexBody = buildSectionsHtml(["hero", ...enabled], "single");

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
<body class="${escapeHtml(buildBodyClass())}">
  ${buildHeader(nav, "index.html", inlineAssets)}
  <main class="container">
    ${indexBody}
    ${buildFooterHtml("zip")}
  </main>
${footJs}
</body>
</html>`.trim();

  // pages per block (one page per base id)
  const baseFirst = new Map();
  const basePage = new Map();

  enabled.forEach((id) => {
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
<title>${escapeHtml(pageTitle)}</title>
${buildHeadMetaTags(pageTitle, inlineAssets)}
${headCss}
</head>
<body class="${escapeHtml(buildBodyClass())}">
  ${buildHeader(nav, file, inlineAssets)}
  <main class="container">
    ${renderBlockSection(id, "zip")}
    ${buildFooterHtml("zip")}
  </main>
${footJs}
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
<title>${escapeHtml(pageTitle)}</title>
${buildHeadMetaTags(pageTitle, inlineAssets)}
${headCss}
</head>
<body class="${escapeHtml(buildBodyClass())}">
  ${buildHeader(nav, file, inlineAssets)}
  <main class="container">
    ${main}
    ${buildFooterHtml("zip")}
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

let __previewBlobUrl = "";

function previewSetHtml(html, label){
  const iframe = $("previewFrame");
  if(!iframe) return;

  try {
    if(__previewBlobUrl) URL.revokeObjectURL(__previewBlobUrl);
  } catch(e){}

  const text = String(html || "");
  if(!text){
    __previewBlobUrl = "";
    iframe.src = "about:blank";
    setPreviewPageLabel(label || "");
    return;
  }

  const blob = new Blob([text], { type: "text/html;charset=utf-8" });
  __previewBlobUrl = URL.createObjectURL(blob);
  iframe.src = __previewBlobUrl;
  setPreviewPageLabel(label || "");
}

function rebuildPreview(force=false) {
  syncStateFromSettingsInputs();

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

/* ==========================
   Init + bindings
========================== */


function installLivePreviewFallback() {
  const panel = document.querySelector("aside.panel");
  if (!panel) return;

  const kick = debounce(() => {
    if (typeof getLiveMode === "function" && getLiveMode() === "off") return;
    requestPreviewRebuild("content");
  }, 160);

  panel.addEventListener("input", (e) => {
    if (!e || !e.target) return;
    kick();
  }, true);

  panel.addEventListener("change", (e) => {
    if (!e || !e.target) return;
    kick();
  }, true);
}

function bindSettings() {
  $("exportMode").addEventListener("change", () => {
    state.exportMode = $("exportMode").value;
    if (state.exportMode === "zip") zipPreviewCurrent = "index.html";
    structureChanged(true);
  });

  // LIVE toggle (only in top status row)
  const liveBtn = $("liveStatus");
  if (liveBtn) liveBtn.addEventListener("click", () => {
    const cur = getLiveMode();
    const next = (cur === 'on') ? 'eco' : (cur === 'eco' ? 'off' : 'on');
    setLiveMode(next);
    saveDraft();
    requestPreviewRebuild('structure', next !== 'off');
  });

  $("role").addEventListener("change", () => {
    const next = String($("role").value || "musician");
    const prev = String(state.role || "musician");
    if (next === prev) return;
    const ok = confirm(
      "Zmiana kategorii artysty przełączy zestaw bloków i układ strony na preset branżowy.\n\n" +
      "Jeśli masz już rozbudowany szkic, zrób snapshot przed zmianą.\n\n" +
      "Kontynuować?"
    );
    if (!ok) {
      $("role").value = prev;
      return;
    }
    applyRolePreset(next);
    structureChanged(true);
  });

  // settings that should NOT rerender UI on each key
  ["accent","siteName","metaTitle","metaDescription","metaKeywords","gtmId","privacyUrl"].forEach(id => {
    $(id).addEventListener("input", () => {
      syncStateFromSettingsInputs();
      contentChanged();
    });
    $(id).addEventListener("change", () => {
      syncStateFromSettingsInputs();
      saveDraft();
      requestPreviewRebuild('content');
    });
  });

  if ($("cookieBanner")) $("cookieBanner").addEventListener("change", () => {
    syncStateFromSettingsInputs();
    saveDraft();
    requestPreviewRebuild('content');
  });

  if ($("privacyAuto")) $("privacyAuto").addEventListener("change", () => {
    syncStateFromSettingsInputs();
    saveDraft();
    requestPreviewRebuild('content');
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


  // Preview mode: Strona / Styl
  if ($("btnPreviewPage")) $("btnPreviewPage").addEventListener("click", () => setPreviewMode("page"));
  if ($("btnPreviewStyle")) $("btnPreviewStyle").addEventListener("click", () => setPreviewMode("style"));

  // Style collection (Flagowe / Basic)
  const btnFlag = $("btnCollectionFlagship");
  const btnBasic = $("btnCollectionBasic");
  if (btnFlag) btnFlag.addEventListener("click", () => {
    state.styleCollection = "flagship";
    syncStyleCollectionButtons();
    const entries = getStyleEntries();
    if (!entries.some(e => e.id === state.template) && entries[0]) {
      selectStyleTemplate(entries[0].id);
      return;
    }
    renderStyleUi();
  if ($("heroEdge")) $("heroEdge").checked = !!state.heroEdge;
    saveDraft();
    requestPreviewRebuild('content');
  });
  if (btnBasic) btnBasic.addEventListener("click", () => {
    state.styleCollection = "basic";
    syncStyleCollectionButtons();
    const entries = getStyleEntries();
    if (!entries.some(e => e.id === state.template) && entries[0]) {
      selectStyleTemplate(entries[0].id);
      return;
    }
    renderStyleUi();
  if ($("heroEdge")) $("heroEdge").checked = !!state.heroEdge;
    saveDraft();
    requestPreviewRebuild('content');
  });

  // Template grid + variant chips
  const tplGrid = $("templateGrid");
  if (tplGrid) tplGrid.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-template-id]');
    if (!btn) return;
    const id = btn.getAttribute('data-template-id');
    if (id) selectStyleTemplate(id);
  });

  const varChips = $("variantChips");
  if (varChips) varChips.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-variant-id]');
    if (!btn) return;
    const id = btn.getAttribute('data-variant-id');
    if (id) selectTemplateVariant(id);
  });

  // Theme buttons (Jasny/Ciemny)
  const bLight = $("btnThemeLight");
  const bDark = $("btnThemeDark");
  if (bLight) bLight.addEventListener("click", () => {
    state.theme = "minimalist";
    syncThemeButtons();
    contentChanged();
    // contentChanged will schedule preview rebuild depending on LIVE mode
  });
  if (bDark) bDark.addEventListener("click", () => {
    state.theme = "modern";
    syncThemeButtons();
    contentChanged();
    // contentChanged will schedule preview rebuild depending on LIVE mode
  });

  // (Elegant removed)

  // Accent quick colors
  document.querySelectorAll('.colorDot[data-accent]').forEach((dot) => {
    // Polish: pokaż realny kolor w kropkach
    const c0 = dot.getAttribute('data-accent');
    if (c0) { dot.style.background = c0; }

    dot.addEventListener('click', () => {
      const c = dot.getAttribute('data-accent');
      if (!c) return;
      state.accent = c;
      if ($("accent")) $("accent").value = c;
      contentChanged();
      // contentChanged will schedule preview rebuild depending on LIVE mode
    });
  });

  // Style selects (bind here so they trigger preview rebuild)
  ["accentType","motion","scrollMode","mediaLayout","headerLayout","contentWidth","density","borders","radius","sectionDividers","sectionTitleAlign"].forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('change', () => {
      syncStateFromSettingsInputs();
      saveDraft();
      requestPreviewRebuild('content');
    });
  });


  // Logo upload + header option
  const logoUp = $("logoUpload");
  if (logoUp) logoUp.addEventListener("change", async () => {
    const file = logoUp.files && logoUp.files[0];
    if (!file) return;

    const rem = remainingMediaBudgetBytes() + assetBytes(assets.logo);
    const inBytes = Number(file.size || 0);
    if (inBytes && rem && inBytes > rem) {
      toast(`⚠ Limit zasobów: brak miejsca na logo (${formatBytes(inBytes)}). Zostało: ${formatBytes(rem)}.`, 'warn', 5200);
      return;
    }

    if (isLikelyHeic(file)) {
      toast(`⚠ Format HEIC/HEIF nie jest wspierany: ${file.name}. Zapisz jako JPG/PNG/SVG i wgraj ponownie.`, 'warn', 5200);
      return;
    }

    // SVG trzymamy w oryginale (bez re-encode)
    if (isSvgFile(file)) {
      if (inBytes && inBytes > 2 * 1024 * 1024) {
        toast(`⚠ Logo SVG jest spore (${formatBytes(inBytes)}). Rozważ uproszczenie pliku.`, 'warn', 5200);
      }
      const dataUrl = await readFileAsDataUrl(file);
      if (!dataUrl) return;
      const mime = file.type || (parseDataUrl(dataUrl)?.mime || 'image/svg+xml');
      assets.logo = { id: "single_logo", dataUrl, mime, bytes: inBytes };
      await persistSingleAsset(assets.logo, "single_logo", { kind: "logo" });
      contentChanged();
      logoUp.value = '';
      return;
    }

    // Raster: normalizacja (max bok 1200, WEBP z fallbackiem)
    const norm = await normalizeImageFileToDataUrl(file, {
      maxSide: 1200,
      maxOutputBytes: 800_000,
      mime: "image/webp",
      quality: 0.86,
      _single: 1,
    });
    if (!norm.dataUrl) return;
    assets.logo = { id: "single_logo", dataUrl: norm.dataUrl, mime: norm.mime, bytes: norm.bytes, width: norm.width, height: norm.height };
    await persistSingleAsset(assets.logo, "single_logo", { kind: "logo" });
    contentChanged();
    logoUp.value = '';
  });

  const useLogo = $("useLogoInHeader");
  if (useLogo) useLogo.addEventListener("change", () => {
    state.useLogoInHeader = !!useLogo.checked;
    contentChanged();
    // contentChanged will schedule preview rebuild depending on LIVE mode
  });


  const fav = $("faviconUpload");
  if (fav) fav.addEventListener("change", async () => {
    const file = fav.files && fav.files[0];
    if (!file) return;

    const rem = remainingMediaBudgetBytes() + assetBytes(assets.favicon);
    const inBytes = Number(file.size || 0);
    if (inBytes && rem && inBytes > rem) {
      toast(`⚠ Limit zasobów: brak miejsca na faviconę (${formatBytes(inBytes)}). Zostało: ${formatBytes(rem)}.`, 'warn', 5200);
      return;
    }

    if (isLikelyHeic(file)) {
      toast(`⚠ HEIC/HEIF nie jest wspierany jako favicona: ${file.name}. Użyj PNG/ICO/SVG.`, 'warn', 5200);
      return;
    }

    // ICO/SVG trzymamy w oryginale
    if (isIcoFile(file) || isSvgFile(file)) {
      const dataUrl = await readFileAsDataUrl(file);
      if (!dataUrl) return;
      const mime = file.type || (parseDataUrl(dataUrl)?.mime || (isIcoFile(file) ? 'image/x-icon' : 'image/svg+xml'));
      assets.favicon = { id: "single_favicon", dataUrl, mime, bytes: inBytes };
      await persistSingleAsset(assets.favicon, "single_favicon", { kind: "favicon" });
      contentChanged();
      fav.value = '';
      return;
    }

    // Raster: do PNG (favicony najlepiej w PNG/ICO)
    const norm = await normalizeImageFileToDataUrl(file, {
      maxSide: 512,
      maxOutputBytes: 350_000,
      mime: "image/png",
      _single: 1,
    });
    if (!norm.dataUrl) return;
    assets.favicon = { id: "single_favicon", dataUrl: norm.dataUrl, mime: norm.mime, bytes: norm.bytes, width: norm.width, height: norm.height };
    await persistSingleAsset(assets.favicon, "single_favicon", { kind: "favicon" });
    contentChanged();
    fav.value = '';
  });

  const og = $("ogImageUpload");
  if (og) og.addEventListener("change", async () => {
    const file = og.files && og.files[0];
    if (!file) return;

    const rem = remainingMediaBudgetBytes() + assetBytes(assets.ogImage);
    const inBytes = Number(file.size || 0);
    if (inBytes && rem && inBytes > rem) {
      toast(`⚠ Limit zasobów: brak miejsca na OG image (${formatBytes(inBytes)}). Zostało: ${formatBytes(rem)}.`, 'warn', 5200);
      return;
    }

    if (isLikelyHeic(file)) {
      toast(`⚠ HEIC/HEIF nie jest wspierany jako OG image: ${file.name}. Użyj JPG/PNG.`, 'warn', 5200);
      return;
    }

    if (isSvgFile(file) || isIcoFile(file)) {
      toast(`⚠ OG image powinien być rastrowy (JPG/PNG).`, 'warn', 4200);
      return;
    }

    // OG: najlepiej JPG (social media pewniej to łykają)
    const norm = await normalizeImageFileToDataUrl(file, {
      maxSide: 2000,
      maxOutputBytes: 1_000_000,
      mime: "image/jpeg",
      quality: 0.86,
      _single: 1,
    });
    if (!norm.dataUrl) return;
    assets.ogImage = { id: "single_og", dataUrl: norm.dataUrl, mime: norm.mime, bytes: norm.bytes, width: norm.width, height: norm.height };
    await persistSingleAsset(assets.ogImage, "single_og", { kind: "og" });
    contentChanged();
    og.value = '';
  });


  $("btnDownload").addEventListener("click", async () => {
    syncStateFromSettingsInputs();
    const s = getIssuesSummary();
    if (s.errors.length) {
      openIssuesModal();
      toast(`⚠ Masz ${s.errors.length} błędów — popraw je przed eksportem.`, "warn", 5200);
      return;
    }
    if (state.exportMode === "single") {
      // export: separate files? -> simplest: one index.html with inline CSS/JS
      downloadText("index.html", buildSingleHtml({ inlineAssets: true, preview: false }));
      return;
    }
    const files = buildZipFiles({ inlineAssets: false, preview: false }); // export = external style.css + site.js
    await downloadZip(files);
  });

  $("btnReset").addEventListener("click", () => {
    const ok = confirm(
      "Reset szkicu usunie: układ bloków, treści i ustawienia stylu zapisane lokalnie.\n\n" +
      "Snapshoty zostają. Kontynuować?"
    );
    if (ok) resetDraft();
  });
  $("btnSaveSnapshot").addEventListener("click", () => saveSnapshot());
  $("btnLoadSnapshot").addEventListener("click", () => {
    openSnapshotsModal();
  });
  $("btnSampleData").addEventListener("click", () => generateSampleData());

  // Styl → Zaawansowane: domyślnie zwinięte. Jeśli ktoś rozwinie „Zaawansowane”,
  // a potem zwinie całą sekcję „Styl”, to „Zaawansowane” ma wrócić do zwiniętego stanu.
  const secStyle = document.getElementById("secStyle");
  const adv = document.getElementById("styleAdvanced");
  if (adv) adv.open = false;
  if (secStyle && adv) {
    secStyle.addEventListener("toggle", () => {
      if (!secStyle.open) adv.open = false;
    });
  }
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

// -------------------------------
// Custom selects (spójne dropdowny)
// -------------------------------
let __openCustomSelect = null;
const __customSelectSync = new Map(); // selectEl -> syncFn

function refreshCustomSelects(){
  for (const sync of __customSelectSync.values()) {
    try { sync(); } catch {}
  }
}

function initCustomSelects(scope=document){
  const root = scope.querySelector ? scope : document;
  const selects = Array.from(root.querySelectorAll('.panel select'));
  for (const sel of selects) {
    if (!sel || sel.dataset.customSelect === '1') continue;
    // Skip selects that are explicitly opted out.
    if (sel.dataset.native === '1') continue;
    enhanceSelect(sel);
  }

  // One-time document bindings
  if (!document.__customSelectBound) {
    document.__customSelectBound = true;
    document.addEventListener('click', (e) => {
      if (!__openCustomSelect) return;
      if (__openCustomSelect.contains(e.target)) return;
      closeCustomSelect(__openCustomSelect);
    }, true);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && __openCustomSelect) {
        e.preventDefault();
        closeCustomSelect(__openCustomSelect);
      }
    }, true);
  }
}

function enhanceSelect(selectEl){
  if (!selectEl || selectEl.dataset.customSelect === '1') return;
  selectEl.dataset.customSelect = '1';

  const wrap = document.createElement('div');
  wrap.className = 'customSelect';

  // Insert wrapper in place of the select.
  const parent = selectEl.parentNode;
  parent.insertBefore(wrap, selectEl);
  wrap.appendChild(selectEl);
  selectEl.classList.add('customSelect__native');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'customSelect__btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');

  const val = document.createElement('span');
  val.className = 'customSelect__value';
  const chev = document.createElement('span');
  chev.className = 'customSelect__chev';
  chev.textContent = '▾';
  btn.appendChild(val);
  btn.appendChild(chev);

  const list = document.createElement('div');
  list.className = 'customSelect__list';
  list.setAttribute('role', 'listbox');
  list.hidden = true;

  wrap.insertBefore(btn, selectEl);
  wrap.insertBefore(list, selectEl);

  function buildOptions(){
    list.innerHTML = '';
    for (let i=0; i<selectEl.options.length; i++) {
      const o = selectEl.options[i];
      if (!o) continue;
      const opt = document.createElement('div');
      opt.className = 'customSelect__opt';
      opt.dataset.value = o.value;
      opt.setAttribute('role', 'option');
      opt.textContent = o.textContent;
      if (o.disabled) {
        opt.style.opacity = '0.45';
        opt.style.pointerEvents = 'none';
      }

      // Mobile: click bywa kapryśny (scroll/list overlay). Bierz pointer i click,
      // ale wykonaj wybór tylko raz i zawsze zamknij listę po wyborze.
      let _picked = false;
      const pick = () => {
        if (_picked) return;
        _picked = true;
        selectEl.value = o.value;
        selectEl.dispatchEvent(new Event('change', { bubbles:true }));
        syncFromSelect();
        closeCustomSelect(wrap);
        try{ btn.focus({ preventScroll: true }); }catch(e){ try{ btn.focus(); }catch(e2){} }
        // allow next pick
        setTimeout(()=>{ _picked = false; }, 0);
      };
      opt.addEventListener('pointerup', pick);
      opt.addEventListener('click', pick);
      list.appendChild(opt);
    }
  }

  function syncFromSelect(){
    const si = selectEl.selectedIndex;
    const txt = (si >= 0 && selectEl.options[si]) ? selectEl.options[si].textContent : '';
    val.textContent = txt;
    btn.setAttribute('aria-expanded', String(!list.hidden));
    for (const node of list.children) {
      const isSel = node.dataset.value === selectEl.value;
      node.classList.toggle('isSelected', isSel);
      node.setAttribute('aria-selected', String(isSel));
    }
  }

  function open(){
    if (__openCustomSelect && __openCustomSelect !== wrap) closeCustomSelect(__openCustomSelect);
    __openCustomSelect = wrap;
    wrap.classList.add('isOpen');
    list.hidden = false;
    // iOS bywa kapryśny z `hidden` w połączeniu z absolutnym overlay – dopnij display.
    list.style.display = 'block';
    btn.setAttribute('aria-expanded', 'true');
    syncFromSelect();

    // Scroll selected option into view
    const sel = list.querySelector('.customSelect__opt.isSelected');
    if (sel) {
      const top = sel.offsetTop - 90;
      list.scrollTop = Math.max(0, top);
    }
  }

  // Delegacja wyboru (bardziej niezawodne na mobile, zwłaszcza wewnątrz <label>)
  let __pickLockTs = 0;
  function pickValue(v){
    if (v == null) return;
    const now = Date.now();
    if (now - __pickLockTs < 250) return; // ochronka przed podwójnym fire (pointer + click)
    __pickLockTs = now;
    // Nawet jeśli wartość jest taka sama – i tak zamykamy listę.
    selectEl.value = v;
    selectEl.dispatchEvent(new Event('change', { bubbles:true }));
    syncFromSelect();
    closeCustomSelect(wrap);
    try{ btn.focus({ preventScroll: true }); }catch(e){ try{ btn.focus(); }catch(e2){} }
  }

  function onListActivate(e){
    const optEl = e.target && e.target.closest ? e.target.closest('.customSelect__opt') : null;
    if (!optEl) return;
    // Ważne: w <label> klik potrafi „przeklikać” kontrolkę i zostawić overlay.
    // Blokujemy domyślne zachowanie i zatrzymujemy propagację.
    try{ e.preventDefault(); }catch(_){ }
    try{ e.stopImmediatePropagation(); }catch(_){ try{ e.stopPropagation(); }catch(__){} }
    pickValue(optEl.dataset.value);
  }

  list.addEventListener('click', onListActivate, true);
  list.addEventListener('pointerup', onListActivate, true);
  list.addEventListener('touchend', onListActivate, true);

  btn.addEventListener('click', () => {
    if (list.hidden) open();
    else closeCustomSelect(wrap);
  });

  btn.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      if (list.hidden) open();
      else closeCustomSelect(wrap);
      return;
    }
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      e.preventDefault();
      if (list.hidden) open();

      const dir = (k === 'ArrowDown') ? 1 : -1;
      const opts = Array.from(selectEl.options).filter(o => o && !o.disabled);
      const curIndex = opts.findIndex(o => o.value === selectEl.value);
      const next = opts[Math.max(0, Math.min(opts.length-1, curIndex + dir))];
      if (next) {
        selectEl.value = next.value;
        selectEl.dispatchEvent(new Event('change', { bubbles:true }));
        syncFromSelect();
      }
      return;
    }
  });

  selectEl.addEventListener('change', () => {
    // Options could change (rare) — rebuild if lengths differ.
    if (list.children.length !== selectEl.options.length) buildOptions();
    syncFromSelect();

    // Wymuszenie: po dokonaniu wyboru lista ma znikać.
    // Na mobile zdarza się, że klik w opcję zmienia wartość,
    // ale zamknięcie listy nie odpala się z handlera opcji.
    if (!list.hidden) closeCustomSelect(wrap);
  });

  // Initial
  buildOptions();
  syncFromSelect();
  __customSelectSync.set(selectEl, syncFromSelect);
}

function closeCustomSelect(wrap){
  if (!wrap) return;
  const list = wrap.querySelector('.customSelect__list');
  const btn = wrap.querySelector('.customSelect__btn');
  if (list) {
    list.hidden = true;
    list.style.display = 'none';
  }
  if (btn) btn.setAttribute('aria-expanded', 'false');
  wrap.classList.remove('isOpen');
  if (__openCustomSelect === wrap) __openCustomSelect = null;
}

async function init() {
  bindPanelToggle();
  applyRolePreset(state.role);

  const loaded = await loadDraft();
  if (!loaded) {
    $("exportMode").value = state.exportMode;
    $("role").value = state.role;
    $("accent").value = state.accent;
    $("siteName").value = state.siteName;
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
    if ($("sectionTitleAlign")) $("sectionTitleAlign").value = state.sectionHeadersAlign;
    setPreviewMode(state.previewMode, false);
    syncStyleCollectionButtons();
    syncThemeButtons();
    renderStyleUi();
  if ($("heroEdge")) $("heroEdge").checked = !!state.heroEdge;
  } else {
    hardLockHeroFirst();
  }

  updateSnapshotPill();
  setLiveStatus();
  bindSettings();
  installLivePreviewFallback();
  initCustomSelects(document);
  refreshCustomSelects();
  bindKeyboardShortcuts();

  setPreviewDevice(state.previewDevice || "desktop");

  syncStyleCollectionButtons();
  syncThemeButtons();
  renderStyleUi();
  if ($("heroEdge")) $("heroEdge").checked = !!state.heroEdge;

  // first render
  syncStateFromSettingsInputs();
  renderBlocksList();
  renderAddBlockSelect();
  renderBlockEditor();
  rebuildPreview(true);
}

init();
