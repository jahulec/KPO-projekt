/* Auto-split from scripts.js | 00_core.js */

/* ==========================
   Generator stron dla artystów
   v9 (panel Styl + katalog szablonów + Styl preview + focus scroll)
========================== */

const STORAGE_KEY = "artist_site_generator_v9_draft";
const SNAPSHOT_KEY = "artist_site_generator_v9_snapshot"; // legacy single snapshot (backwards compatibility)
const SNAPSHOT_LIST_KEY = "artist_site_generator_v9_snapshots";
const SNAPSHOT_LIST_LIMIT = 20;
const ZIP_ROOT_FOLDER = "strona";
const PANEL_COLLAPSED_KEY = "artist_site_generator_v9_panel_collapsed";
const PANEL_SCROLLTOP_KEY = "artist_site_generator_v9_panel_scrolltop";
const PANEL_DETAILS_KEY = "artist_site_generator_v9_panel_details";
const UI_PREFS_KEY = "artist_site_generator_v9_ui_prefs";
const MOBILE_VIEW_KEY = "artist_site_generator_v9_mobile_view";
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
  el.textContent = `Podgląd na żywo: ${label}`;
  el.setAttribute("aria-pressed", String(mode !== 'off'));
  el.classList.toggle("isOff", mode === 'off');
  el.classList.toggle("isEco", mode === 'eco');
  el.title = "Zmień tryb LIVE (ON / ECO / OFF)";

  // Sync collapsed quick dock LIVE indicator.
  const q = document.getElementById("btnQuickLive");
  if (q) {
    q.classList.toggle("isOff", mode === 'off');
    q.classList.toggle("isEco", mode === 'eco');
    q.title = `Podgląd na żywo: ${label}`;
    q.setAttribute("aria-label", `Podgląd na żywo: ${label}`);
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
  try { closeUiSettingsMenu(); } catch (e) {}


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
   UI settings (generator UI theme + scale)
   Stored locally; affects only the generator interface.

   Wymagania:
   - Skala dotyczy wyłącznie UI generatora.
   - Podgląd (iframe) nie jest skalowany.
   - Zakres skali: 60%–100%.
   - Domyślnie: 80%.
========================== */

const __uiDefaults = { uiTheme: "dark", uiScale: 0.8 };
const __uiScaleVars = [
  "--uiBaseFs",
  "--uiLabelFs",
  "--uiTextFs",
  "--uiTitleFs",
  "--uiSmallFs",
  "--uiFieldGap",
  "--uiFieldMarginY",
  "--uiInputPadY",
  "--uiInputPadX",
  "--uiSegMinH",
  "--uiSegPadY",
  "--uiSegPadX",
  "--uiTopBarPadY",
  "--uiTopBarPadX",
  "--uiTopBarGap",
  "--uiTopBarCtlGap",
  "--uiRangeGap",
  "--uiMenuLabelW",
  "--uiBtnH",
  "--uiBtnHSmall",
  "--uiBtnPadY",
  "--uiBtnPadX",
  "--uiBtnPadYSmall",
  "--uiBtnPadXSmall",
  "--uiPanelHeadPadY",
  "--uiPanelHeadPadX",
  "--uiCardPad",
  "--uiListGap",
  "--uiTplIcon",
  "--uiTplIconSm",
  "--uiTplCardMinH",
  // Zwinięty panel (lewy pasek)
  "--uiCollapsedW",
  "--uiCollapsedPadY",
  "--uiCollapsedGap",
  "--uiCollapsedBtn",
  "--uiCollapsedRadius",
  "--uiCollapsedIcon",
];

let __uiScaleBase = null;
let __uiScaleBasePanelW = null;

function __normUiScale(v){
  const n = (typeof v === "string") ? parseFloat(v) : Number(v);
  if (!Number.isFinite(n)) return __uiDefaults.uiScale;
  const clamped = Math.max(0.6, Math.min(1, n));
  // Stabilne zapisy (np. 0.85), bez pływającego śmietnika.
  return Math.round(clamped * 100) / 100;
}

function getUiPrefs(){
  let p = {};
  try{
    p = JSON.parse(localStorage.getItem(UI_PREFS_KEY) || "{}");
  }catch(e){ p = {}; }
  p = p || {};

  const uiTheme = (p.uiTheme === "light") ? "light" : "dark";

  // Nowy zapis: uiScale
  let uiScale = __normUiScale(p.uiScale);

  // Migracja: stary "compact" -> 0.9
  if (!p.uiScale && p.uiSize === "compact") uiScale = 0.9;

  return { uiTheme, uiScale };
}

function saveUiPrefs(p){
  try{ localStorage.setItem(UI_PREFS_KEY, JSON.stringify(p || __uiDefaults)); }catch(e){}
}

function __captureUiScaleBase(){
  if (__uiScaleBase) return;
  const cs = getComputedStyle(document.documentElement);
  __uiScaleBase = {};
  for (const v of __uiScaleVars) {
    const raw = (cs.getPropertyValue(v) || "").trim();
    const num = parseFloat(raw);
    __uiScaleBase[v] = Number.isFinite(num) ? num : null;
  }

  const app = document.getElementById('appRoot') || document.querySelector('.app');
  if (app) {
    const acs = getComputedStyle(app);
    const rawW = (acs.getPropertyValue('--uiPanelW') || "").trim();
    const numW = parseFloat(rawW);
    // Historycznie (v1.3.x) "standard" był 400px (JS ustawiało inline),
    // mimo że :root miało 420px. Trzymamy się 400px jako bazy na desktop.
    if (Number.isFinite(numW)) {
      __uiScaleBasePanelW = (numW >= 410 && numW <= 430) ? 400 : numW;
    } else {
      __uiScaleBasePanelW = 400;
    }
  }
}

function applyUiScale(scale){
  const uiScale = __normUiScale(scale);
  __captureUiScaleBase();

  const html = document.documentElement;
  html.setAttribute('data-ui-scale', String(uiScale));

  // Skala: przelicz zmienne rozmiarowe (px) w samym UI generatora.
  if (__uiScaleBase) {
    for (const v of __uiScaleVars) {
      const base = __uiScaleBase[v];
      if (!Number.isFinite(base)) continue;
      const scaled = Math.round(base * uiScale * 10) / 10;
      html.style.setProperty(v, `${scaled}px`);
    }
  }

  // Panel: realnie zwężamy siatkę, żeby było więcej miejsca na podgląd.
  const app = document.getElementById('appRoot') || document.querySelector('.app');
  if (app && Number.isFinite(__uiScaleBasePanelW)) {
    const minW = 260;
    const maxW = 520;
    const scaledW = Math.max(minW, Math.min(maxW, Math.round(__uiScaleBasePanelW * uiScale)));
    app.style.setProperty('--uiPanelW', `${scaledW}px`);
  }
}

function applyUiPrefs(p, persist=false){
  const prefs = p || getUiPrefs();
  const uiTheme = prefs.uiTheme || __uiDefaults.uiTheme;
  const uiScale = __normUiScale(prefs.uiScale || __uiDefaults.uiScale);

  // Theme on <html>
  const html = document.documentElement;
  html.setAttribute('data-ui-theme', uiTheme);
  html.classList.toggle('uiThemeLight', uiTheme === 'light');
  html.classList.toggle('uiThemeDark', uiTheme !== 'light');

  // Wyczyść stare tryby (rozmiar/panel) – nie używamy.
  html.removeAttribute('data-ui-size');
  html.classList.remove('uiSizeCompact','uiSizeLarge');
  const app = document.getElementById('appRoot') || document.querySelector('.app');
  if (app) {
    app.removeAttribute('data-panel-w');
    app.classList.remove('panelW_s','panelW_m','panelW_l');
  }

  applyUiScale(uiScale);

  if (persist) saveUiPrefs({ uiTheme, uiScale });
  syncUiSettingsUi();
}

/* ==========================
   Mobile view toggle (panel / preview)
========================== */

function _getMobileViewPref(){
  try{
    const v = String(localStorage.getItem(MOBILE_VIEW_KEY) || "").toLowerCase();
    return (v === "preview") ? "preview" : "panel";
  }catch(e){ return "panel"; }
}

function _setMobileViewPref(v){
  try{ localStorage.setItem(MOBILE_VIEW_KEY, v); }catch(e){}
}

function _isMobileLayout(){
  return !!(window.matchMedia && window.matchMedia("(max-width: 980px)").matches);
}

function _syncMobileViewButtons(view){
  const v = (view === "preview") ? "preview" : "panel";
  const bPanel = document.getElementById("btnMobilePanel");
  const bPrev = document.getElementById("btnMobilePreview");
  if (bPanel) bPanel.classList.toggle("isActive", v === "panel");
  if (bPrev) bPrev.classList.toggle("isActive", v === "preview");
}

function applyMobileView(view, persist=true){
  const v = (view === "preview") ? "preview" : "panel";
  if (persist) _setMobileViewPref(v);
  const body = document.body;
  if (!body) return;
  if (_isMobileLayout()) body.setAttribute("data-mobile-view", v);
  else body.removeAttribute("data-mobile-view");
  _syncMobileViewButtons(v);
}

function bindMobileViewToggle(){
  const bPanel = document.getElementById("btnMobilePanel");
  const bPrev = document.getElementById("btnMobilePreview");
  if (!bPanel || !bPrev) return;

  bPanel.addEventListener("click", () => applyMobileView("panel", true));
  bPrev.addEventListener("click", () => applyMobileView("preview", true));

  const applyFromResize = debounce(() => {
    if (_isMobileLayout()) applyMobileView(_getMobileViewPref(), false);
    else {
      const body = document.body;
      if (body) body.removeAttribute("data-mobile-view");
    }
  }, 120);

  window.addEventListener("resize", applyFromResize, { passive: true });
  applyFromResize();
}

function syncUiSettingsUi(){
  const menu = document.getElementById("uiSettingsMenu");
  if (!menu) return;
  const prefs = getUiPrefs();

  menu.querySelectorAll('[data-ui-theme]').forEach((b)=>{
    const v = b.getAttribute('data-ui-theme');
    b.classList.toggle('isActive', v === prefs.uiTheme);
    b.setAttribute('aria-pressed', v === prefs.uiTheme ? 'true' : 'false');
  });

  // Skala UI: suwak 60–100 (zapis jako 0.6–1.0)
  const r = menu.querySelector('#uiScaleRange');
  const out = menu.querySelector('#uiScaleValue');
  if (r) {
    const pctRaw = Math.round(__normUiScale(prefs.uiScale) * 100);
    const pct = Math.max(60, Math.min(100, pctRaw));
    r.value = String(pct);
    r.setAttribute('aria-valuenow', String(pct));
    r.setAttribute('aria-valuemin', '60');
    r.setAttribute('aria-valuemax', '100');
    r.setAttribute('aria-valuetext', `${pct}%`);
    if (out) out.textContent = `${pct}%`;
  } else if (out) {
    const pctRaw = Math.round(__normUiScale(prefs.uiScale) * 100);
    const pct = Math.max(60, Math.min(100, pctRaw));
    out.textContent = `${pct}%`;
  }
}

let __uiSettingsOpen = false;

function closeUiSettingsMenu(){
  const menu = document.getElementById("uiSettingsMenu");
  const btn = document.getElementById("btnUiSettings");
  if (menu) {
    menu.hidden = true;
    menu.style.left = "";
    menu.style.top = "";
  }
  if (btn) btn.setAttribute('aria-expanded','false');
  __uiSettingsOpen = false;
  document.removeEventListener('click', __uiSettingsOutsideClick, true);
  document.removeEventListener('keydown', __uiSettingsKeydown, true);
  window.removeEventListener('resize', __uiSettingsReposition, true);
}

function __uiSettingsOutsideClick(e){
  const menu = document.getElementById("uiSettingsMenu");
  const btn = document.getElementById("btnUiSettings");
  if (!__uiSettingsOpen) return;
  if (menu && menu.contains(e.target)) return;
  if (btn && btn.contains(e.target)) return;
  closeUiSettingsMenu();
}

function __uiSettingsKeydown(e){
  if (!__uiSettingsOpen) return;
  if (e && (e.key === 'Escape' || e.key === 'Esc')) {
    e.preventDefault();
    closeUiSettingsMenu();
  }
}

function __uiSettingsReposition(){
  if (!__uiSettingsOpen) return;
  positionUiSettingsMenu();
}

function positionUiSettingsMenu(){
  const menu = document.getElementById("uiSettingsMenu");
  const btn = document.getElementById("btnUiSettings");
  if (!menu || !btn) return;
  if (menu.hidden) return;

  const rect = btn.getBoundingClientRect();
  const margin = 12;

  // ensure measurable
  menu.style.left = '0px';
  menu.style.top = '0px';
  const m = menu.getBoundingClientRect();

  let left = rect.right - m.width;
  let top = rect.bottom + 8;

  if (left + m.width > window.innerWidth - margin) left = window.innerWidth - margin - m.width;
  if (left < margin) left = margin;

  if (top + m.height > window.innerHeight - margin) {
    top = rect.top - 8 - m.height;
  }
  if (top < margin) top = margin;

  menu.style.left = `${Math.round(left)}px`;
  menu.style.top = `${Math.round(top)}px`;
}

function openUiSettingsMenu(){
  const menu = document.getElementById("uiSettingsMenu");
  const btn = document.getElementById("btnUiSettings");
  if (!menu || !btn) return;

  menu.hidden = false;
  __uiSettingsOpen = true;
  btn.setAttribute('aria-expanded','true');

  syncUiSettingsUi();
  positionUiSettingsMenu();

  document.addEventListener('click', __uiSettingsOutsideClick, true);
  document.addEventListener('keydown', __uiSettingsKeydown, true);
  window.addEventListener('resize', __uiSettingsReposition, true);
}

function toggleUiSettingsMenu(){
  if (__uiSettingsOpen) closeUiSettingsMenu();
  else openUiSettingsMenu();
}

function bindUiSettingsMenu(){
  const btn = document.getElementById("btnUiSettings");
  const menu = document.getElementById("uiSettingsMenu");

  if (btn) {
    btn.addEventListener('click', (e)=>{ e.preventDefault(); toggleUiSettingsMenu(); });
    btn.setAttribute('aria-expanded','false');
  }

  if (!menu) return;

  // Zamiast delegacji "klik na całe menu" (różne edge-case'y w przeglądarkach)
  // przypinamy bezpośrednie listenery do przycisków w menu.
  menu.querySelectorAll('[data-ui-theme]').forEach((b)=>{
    b.addEventListener('click', (e)=>{
      e.preventDefault();
      const v = b.getAttribute('data-ui-theme');
      const prefs = getUiPrefs();
      prefs.uiTheme = (v === 'light') ? 'light' : 'dark';
      applyUiPrefs(prefs, true);
      syncUiSettingsUi();
    });
  });

  // Skala UI: suwak 60–100
  const r = menu.querySelector('#uiScaleRange');
  if (r) {
    let _raf = 0;
    const applyFromRange = ()=>{
      _raf = 0;
      const pct = Math.max(60, Math.min(100, Number(r.value) || 80));
      const v = __normUiScale(pct / 100);
      const prefs = getUiPrefs();
      prefs.uiScale = v;
      applyUiPrefs(prefs, true);
      // UI skala potrafi zmienić szerokość panelu -> zabezpiecz animacje w podglądzie.
      try{ freezePreviewAnimations(800); }catch(_){ }
      try{ positionUiSettingsMenu(); }catch(_){ }
    };

    const scheduleApply = (e)=>{
      if (e) e.preventDefault();
      if (_raf) return;
      _raf = requestAnimationFrame(applyFromRange);
    };

    r.addEventListener('input', scheduleApply);
    r.addEventListener('change', (e)=>{
      if (e) e.preventDefault();
      if (_raf) cancelAnimationFrame(_raf);
      applyFromRange();
    });
  }
}


/* ==========================
   Blocks + presets
========================== */

const BLOCKS = {
  hero:         { label: "Sekcja startowa (HERO)", editor: "hero", locked: true },

  about:        { label: "O artyście / zespole", editor: "text" },
  gallery:      { label: "Galeria", editor: "gallery" },

  spotify:      { label: "Spotify", editor: "embed_spotify" },
  youtube:      { label: "YouTube", editor: "embed_youtube" },
  bandcamp:     { label: "Bandcamp (opcjonalnie)", editor: "embed_bandcamp" },

  events:       { label: "Wydarzenia", editor: "events" },
  exhibitions:  { label: "Wydarzenia (wariant)", editor: "events" },

  projects:     { label: "Projekty", editor: "projects" },
  caseStudies:  { label: "Realizacje", editor: "projects" },

  services:     { label: "Oferta", editor: "services" },
  store:        { label: "Sklep", editor: "store" },
  clients:      { label: "Partnerzy", editor: "simpleList" },
  awards:       { label: "Wyróżnienia", editor: "simpleList" },

  publications: { label: "Publikacje", editor: "publications" },
  testimonials: { label: "Opinie", editor: "testimonials" },

  epk:          { label: "Materiały prasowe", editor: "epk" },
  newsletter:   { label: "Subskrypcja", editor: "newsletter" },

  contact:      { label: "Kontakt", editor: "contact" },
  social:       { label: "Linki zewnętrzne", editor: "social" },
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
  { id: "underline", label: "Podkreślenie", preset: { accentType: "underline" } },
  { id: "pills", label: "Pigułki", preset: { accentType: "pill", radius: "lg" } },
  { id: "outline", label: "Obrys", preset: { accentType: "outline" } },
  { id: "glow", label: "Poświata", preset: { accentType: "gradient" } },
];

const STYLE_CATALOG = {
  flagship: [
    // 1) Editorial — premium, czytelny, dobry jako HUB + podstrony
    {
      id: "editorial",
      name: "Editorial",
      desc: "Typografia szeryfowa, spokojny rytm, EPK/portfolio",
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
        { id: "classic", label: "Klasyczny", preset: {} },
        { id: "wide", label: "Szeroki", preset: { contentWidth: "wide" } },
        { id: "compact", label: "Kompaktowy", preset: { density: "compact" } },
      ],
    },

    // 2) Swiss Grid — rygor, siatka, profesjonalny charakter
    {
      id: "swiss",
      name: "Swiss Grid",
      desc: "Rygor siatki, mocne nagłówki, portfolio i projekty",
      thumb: "linear-gradient(135deg, #ffffff, #0f172a)",
      preset: {
        theme: "minimalist",
        fontPreset: "system",
        accent: "#dc2626",
        accentType: "underline",

        headerLayout: "left",
        headerBg: "solid",
        headerWidth: "full",

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
        { id: "grid", label: "Siatka", preset: {} },
        { id: "wide", label: "Szeroki", preset: { contentWidth: "wide" } },
        { id: "compact", label: "Kompaktowy", preset: { density: "compact" } },
      ],
    },

    // 3) Cinematic — video-first, elegancki ciemny klimat
    {
      id: "cinematic",
      name: "Cinematic",
      desc: "Ciemny, filmowy, pod wideo i duże wizualizacje",
      thumb: "linear-gradient(135deg, #0b1020, #111827)",
      preset: {
        theme: "modern",
        fontPreset: "space",
        accent: "#c08457",
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
        { id: "tight", label: "Kompaktowy", preset: { density: "compact" } },
        { id: "contrast", label: "Kontrast", preset: { motion: "subtle" } },
      ],
    },

    // 4) Photo First — wizualny, hero + siatka
    {
      id: "photofirst",
      name: "Photo First",
      desc: "Maksimum miejsca na zdjęcia: hero + siatka",
      thumb: "linear-gradient(135deg, #0f172a, #ffffff)",
      preset: {
        theme: "minimalist",
        fontPreset: "inter",
        accent: "#1d4ed8",
        accentType: "underline",

        headerLayout: "left",
        headerBg: "solid",
        headerWidth: "wide",

        heroWidth: "full",
        contentWidth: "wide",

        density: "comfortable",
        borders: "thin",
        radius: "md",
        sectionDividers: "none",
        motion: "subtle",
        scrollMode: "normal",
        sectionHeadersAlign: "left",
        mediaLayout: "stack",
      },
      blockPreset: {
        gallery: { layout: "masonry", cols: 4, masonryCols: 4 },
        spotify: { embedSize: 55 },
        youtube: { embedSize: 55 },
      },
      variants: [
        { id: "gallery", label: "Galeria", preset: {} },
        { id: "tight", label: "Kompakt", preset: { density: "normal" } },
      ],
    },

    // 5) Artbook — collage/card look, premium eksperyment
    {
      id: "collage",
      name: "Artbook",
      desc: "Artbook: sekcje jako karty, lekko „drukowany” klimat",
      thumb: "linear-gradient(135deg, #f8fafc, #0b1020)",
      preset: {
        theme: "minimalist",
        fontPreset: "editorial",
        accent: "#4338ca",
        accentType: "underline",

        headerLayout: "left",
        headerBg: "solid",
        headerWidth: "normal",

        heroWidth: "wide",
        contentWidth: "normal",

        density: "comfortable",
        borders: "thin",
        radius: "md",
        sectionDividers: "block",
        motion: "subtle",
        scrollMode: "normal",
        sectionHeadersAlign: "left",
        mediaLayout: "stack",
      },
      blockPreset: {
        gallery: { layout: "grid", cols: 3, masonryCols: 3 },
        spotify: { embedSize: 60 },
        youtube: { embedSize: 60 },
      },
      variants: [
        { id: "cards", label: "Karty", preset: {} },
        { id: "wide", label: "Szeroki", preset: { contentWidth: "wide" } },
      ],
    },

    // 6) Spotlight — focus scroll (desktop), mobile automatycznie łagodniej
    {
      id: "spotlight",
      name: "Spotlight",
      desc: "Prowadzenie wzroku (desktop). Na mobile: standardowy scroll",
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
        { id: "focus", label: "Fokus", preset: { scrollMode: "focus" } },
        { id: "normal", label: "Standard", preset: { scrollMode: "normal" } },
      ],
    },

    // 7) Neon — klubowy, kontrolowany glow
    {
      id: "neon",
      name: "Neon",
      desc: "Klubowy: kontrast + poświata, dla elektroniki/DJ",
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
        { id: "club", label: "Klub", preset: {} },
        { id: "soft", label: "Stonowany", preset: { motion: "subtle" } },
        { id: "outline", label: "Obrys", preset: { accentType: "outline" } },
      ],
    },

    // 8) Brutalist — statement
    {
      id: "brutalist",
      name: "Brutalist",
      desc: "Plakatowy statement, kontrolowany minimalizm",
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
        { id: "poster", label: "Plakat", preset: {} },
        { id: "clean", label: "Czysty", preset: { borders: "thin" } },
        { id: "compact", label: "Kompaktowy", preset: { density: "compact" } },
      ],
    },
  ],
  basic: [

    {
      id: "basic-clean",
      name: "Neutralny",
      desc: "Najbezpieczniejszy układ dla większości profili",
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
      id: "basic-cards",
      name: "Karty",
      desc: "Sekcje jako karty, nowoczesny i czytelny",
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
      id: "basic-classic",
      name: "Klasyczny",
      desc: "Tradycyjny układ: linie, porządek, spokój",
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
    {
      id: "basic-dark",
      name: "Ciemny",
      desc: "Ciemny wariant pod zdjęcia, wideo i scenę",
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
      id: "square",
      name: "Monochromatyczny",
      desc: "Czerń i biel: nacisk na typografię i kontrast",
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
        { id: "compact", label: "Kompaktowy", preset: { density: "compact" } },
        { id: "wide", label: "Szeroki", preset: { contentWidth: "wide" } },
      ],
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

  // allow per-collection styling (flagship vs basic)
  grid.dataset.collection = String(state.styleCollection || 'flagship');

  const entries = getStyleEntries();
  grid.innerHTML = entries.map((e) => {
    const active = e.id === state.template ? " isActive" : "";
    const icon = styleIconSvg(e.id);
    return `
      <button type="button" class="tplCard${active}" data-template-id="${escapeHtml(e.id)}" aria-pressed="${e.id === state.template}">
        <div class="tplIcon" aria-hidden="true">${icon}</div>
        <div class="tplMeta">
          <div class="tplName">${escapeHtml(e.name)}</div>
          <div class="tplDesc">${escapeHtml(e.desc)}</div>
        </div>
      </button>
    `;
  }).join("");
}

// Minimal, monochrome icons for style cards (no color blocks).
function styleIconSvg(styleId) {
  const id = String(styleId || "").toLowerCase();
  const common = 'class="tplIconSvg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  switch (id) {
    case 'editorial':
      return `<svg ${common}><path d="M6 18V6"/><path d="M10 18V6"/><path d="M14 10h4"/><path d="M14 14h4"/></svg>`; // columns + text
    case 'swiss':
      return `<svg ${common}><path d="M5 7h14"/><path d="M5 12h14"/><path d="M5 17h14"/><path d="M9 5v14"/></svg>`; // grid
    case 'cinematic':
      return `<svg ${common}><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M9 10l6 3-6 3z" fill="currentColor" stroke="none"/></svg>`;
    case 'photofirst':
      return `<svg ${common}><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M8 10l2-2h4l2 2"/><circle cx="12" cy="12" r="2"/></svg>`;
    case 'collage':
      return `<svg ${common}><rect x="5" y="5" width="6" height="6" rx="1"/><rect x="13" y="5" width="6" height="9" rx="1"/><rect x="5" y="13" width="6" height="6" rx="1"/><rect x="13" y="16" width="6" height="3" rx="1"/></svg>`;
    case 'spotlight':
      return `<svg ${common}><path d="M7 3h10"/><path d="M8 3l1 4"/><path d="M16 3l-1 4"/><path d="M12 7v14"/><path d="M8 21h8"/><path d="M9 12c1.6-1.6 4.4-1.6 6 0"/></svg>`;
    case 'neon':
      return `<svg ${common}><path d="M13 2L6 14h7l-1 8 7-12h-7z"/></svg>`;
    case 'brutalist':
      return `<svg ${common}><path d="M7 6h6a3 3 0 0 1 0 6H7z"/><path d="M7 12h7a3 3 0 0 1 0 6H7z"/></svg>`;

    case 'basic-clean':
      return `<svg ${common}><rect x="6" y="4" width="12" height="16" rx="2"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h5"/></svg>`;
    case 'basic-cards':
      return `<svg ${common}><rect x="6" y="6" width="12" height="6" rx="2"/><rect x="6" y="13" width="12" height="5" rx="2"/></svg>`;
    case 'basic-classic':
      return `<svg ${common}><path d="M6 7h12"/><path d="M6 12h12"/><path d="M6 17h12"/><path d="M6 5v14"/></svg>`;
    case 'basic-dark':
      return `<svg ${common}><path d="M21 12.8A7.5 7.5 0 1 1 11.2 3a6 6 0 1 0 9.8 9.8z"/></svg>`;
    case 'square':
      return `<svg ${common}><rect x="5" y="5" width="14" height="14" rx="2"/><path d="M12 5v14"/></svg>`;
    default:
      return `<svg ${common}><circle cx="12" cy="12" r="8"/></svg>`;
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
