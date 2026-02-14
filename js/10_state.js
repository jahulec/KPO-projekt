/* Auto-split from scripts.js | 10_state.js */

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
  headerBg: "solid",          // solid | pill | transparent (nakładka)
  contentWidth: "normal",     // normal | wide
  headerWidth: "normal",      // normal | wide | full
  heroWidth: "normal",        // normal | wide | full
  fontPreset: "inter",       // system | inter | space | plex | editorial
  density: "normal",          // comfortable | normal | compact
  borders: "thin",            // none | thin | thick
  radius: "md",               // 0 | md | lg
  sectionDividers: "none",    // none | line | block
  motion: "subtle",           // off | subtle | strong
  scrollMode: "normal",       // normal | focus
  heroEdge: false,           // legacy (v9.0) – replaced by heroWidth
  mediaLayout: "stack",       // stack | split  (dotyczy kolejnych embedów YouTube/Spotify)

  role: "musician",
  theme: "minimalist",
  // Domyślnie: styl flagowy, uniwersalny dla profilu artysty.
  template: "editorial",
  accent: "#9f1239",
  // używane głównie w szablonie Colorwash (kolor tła strony / canvas)
  bgColor: "#fef3c7",

  sectionHeadersAlign: "left",
  siteName: "Nazwa artysty / zespołu",
  useLogoInHeader: false,

  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  siteBaseUrl: "",

  /* Analityka */
  gtmId: "",
  cookieBanner: true,
  privacyMode: "auto",
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
    headerBg: state.headerBg,
    contentWidth: state.contentWidth,
    headerWidth: state.headerWidth,
    heroWidth: state.heroWidth,
    fontPreset: state.fontPreset,
    density: state.density,
    borders: state.borders,
    radius: state.radius,
    sectionDividers: state.sectionDividers,
    motion: state.motion,
    scrollMode: state.scrollMode,
    heroEdge: (state.heroWidth === "full") || !!state.heroEdge,
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
    siteBaseUrl: state.siteBaseUrl,

    gtmId: state.gtmId,
    cookieBanner: !!state.cookieBanner,
    privacyMode: String(state.privacyMode || (state.privacyAuto ? "auto" : "custom")),
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
  state.headerBg = d.headerBg ?? state.headerBg;
  // contentWidth: usuwamy opcję "full" (pozostaje normal | wide)
  const cw = (d.contentWidth === "full") ? "wide" : d.contentWidth;
  state.contentWidth = cw ?? state.contentWidth;
  // New: independent widths (migrate from older drafts)
  state.headerWidth = d.headerWidth ?? (cw ?? state.headerWidth);
  state.heroWidth = d.heroWidth ?? (d.heroEdge ? "full" : (cw ?? state.heroWidth));
  state.fontPreset = d.fontPreset ?? state.fontPreset;
  state.density = d.density ?? state.density;
  state.borders = d.borders ?? state.borders;
  state.radius = d.radius ?? state.radius;
  state.sectionDividers = d.sectionDividers ?? state.sectionDividers;
  state.motion = d.motion ?? state.motion;
  state.scrollMode = d.scrollMode ?? state.scrollMode;
  state.heroEdge = d.heroEdge ?? state.heroEdge; // legacy
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
  state.siteBaseUrl = d.siteBaseUrl ?? state.siteBaseUrl;

  state.gtmId = d.gtmId ?? state.gtmId;
  state.cookieBanner = (typeof d.cookieBanner === 'boolean') ? d.cookieBanner : state.cookieBanner;

  // Privacy mode (new): auto | custom (migrate from legacy privacyAuto + privacyUrl)
  if (typeof d.privacyMode !== 'undefined') {
    state.privacyMode = String(d.privacyMode || 'auto');
  } else {
    const legacyAuto = (typeof d.privacyAuto === 'boolean') ? d.privacyAuto : (typeof state.privacyAuto === 'boolean' ? state.privacyAuto : true);
    const legacyUrl = String(d.privacyUrl ?? state.privacyUrl ?? '').trim();
    state.privacyMode = legacyAuto ? 'auto' : (legacyUrl ? 'custom' : 'custom');
  }
  state.privacyAuto = (state.privacyMode !== 'custom'); // keep legacy field in sync
  state.privacyUrl = d.privacyUrl ?? state.privacyUrl;

  state.previewDevice = d.previewDevice ?? state.previewDevice;

  state.order = Array.isArray(d.order) ? d.order : state.order;
  state.blocks = d.blocks ?? state.blocks;

  // Migration fix: older buggy hero editor used paths like hero.subheadline* (nested object).
  try {
    const blocks = state.blocks || {};
    Object.keys(blocks).forEach(k => {
      const blk = blocks[k];
      if (!blk || blk.type !== 'hero' || !blk.data) return;
      const h = blk.data;
      const nested = h && h.hero && typeof h.hero === 'object' ? h.hero : null;
      if (!nested) return;
      if ((h.subheadline == null || h.subheadline === '') && typeof nested.subheadline === 'string') h.subheadline = nested.subheadline;
      if ((h.subheadlineRich == null || h.subheadlineRich === '') && typeof nested.subheadlineRich === 'string') h.subheadlineRich = nested.subheadlineRich;
    });
  } catch (e) {}

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
  if ($("headerBg")) $("headerBg").value = state.headerBg;
  if ($("contentWidth")) $("contentWidth").value = state.contentWidth;
  if ($("headerWidth")) $("headerWidth").value = state.headerWidth;
  if ($("heroWidth")) $("heroWidth").value = state.heroWidth;
  if ($("fontPreset")) $("fontPreset").value = state.fontPreset;
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

  if ($("metaTitle")) $("metaTitle").value = state.metaTitle;
  if ($("metaDescription")) $("metaDescription").value = state.metaDescription;
  if ($("metaKeywords")) $("metaKeywords").value = state.metaKeywords || "";
  if ($("siteBaseUrl")) $("siteBaseUrl").value = state.siteBaseUrl || "";

  if ($("gtmId")) $("gtmId").value = state.gtmId;
  if ($("cookieBanner")) $("cookieBanner").checked = !!state.cookieBanner;
  if ($("privacyMode")) $("privacyMode").value = (state.privacyMode === "custom" ? "custom" : "auto");
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
  <text x="70" y="170" fill="rgba(255,255,255,0.82)" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="22" font-weight="700">Obraz poglądowy</text>
</svg>`;

  // base64 (so ZIP export can pack it to /assets)
  const utf8 = encodeURIComponent(svg).replace(/%([0-9A-F]{2})/g, (_, p) => String.fromCharCode(parseInt(p, 16)));
  return `data:image/svg+xml;base64,${btoa(utf8)}`;
}

async function generateSampleData() {
  const ok = confirm("Wczytać dane przykładowe? Bieżący szkic zostanie nadpisany (snapshoty bez zmian).");
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

  const siteName = "Nazwa artysty / zespołu";

  const blocks = {};
  const setBlock = (id, title, data = {}) => {
    blocks[id] = { enabled: true, title: title || (BLOCKS[id]?.label || id), data };
  };

  // HERO
  setBlock("hero", BLOCKS.hero.label, {
    headline: siteName,
    subheadline: "Oficjalny profil artystyczny. Informacje, multimedia i wydarzenia.",
    primaryCtaText: "Kontakt",
    primaryCtaTarget: "contact",
    primaryCtaUrl: "",
  });

  // CONTENT
  for (const id of finalOrder) {
    if (id === "hero") continue;

    const ed = BLOCKS[id]?.editor;

    if (ed === "text") {
      setBlock(id, id === "about" ? (BLOCKS.about?.label || "O artyście / zespole") : (BLOCKS[id]?.label || id), {
        text: "Tekst poglądowy. Krótka biografia oraz opis twórczości."
      });
      continue;
    }

    if (ed === "gallery") {
      setBlock(id, "Galeria", { layout: "grid" });
      continue;
    }

    if (ed === "embed_spotify") {
      setBlock(id, "Spotify", {
        items: [
          { url: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT" }
        ]
      });
      continue;
    }

    if (ed === "embed_youtube") {
      setBlock(id, "YouTube", {
        items: [
          { url: `<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ?controls=1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>` }
        ]
      });
      continue;
    }

    if (ed === "embed_bandcamp") {
      setBlock(id, "Bandcamp", {
        items: [
          { url: "https://bandcamp.com/EmbeddedPlayer/album=0/size=large/bgcol=ffffff/linkcol=333333/tracklist=false/transparent=true/" }
        ]
      });
      continue;
    }

    if (ed === "store") {
      setBlock(id, "Sklep", {
        items: [
          { name: "Płyta (CD)", price: "49 zł", url: "https://example.com", img: "", alt: "Płyta (CD)", desc: "Opis poglądowy." },
          { name: "Koszulka", price: "89 zł", url: "https://example.com", img: "", alt: "Koszulka", desc: "Opis poglądowy." },
          { name: "Plakat", price: "39 zł", url: "https://example.com", img: "", alt: "Plakat", desc: "Opis poglądowy." }
        ]
      });
      continue;
    }

    if (ed === "events") {
      setBlock(id, "Wydarzenia", {
        items: [
          { date: "14.03.2026", city: "Warszawa", place: "Miejsce (przykład)", link: "https://example.com" },
          { date: "28.03.2026", city: "Kraków", place: "Miejsce (przykład)", link: "https://example.com" },
          { date: "11.04.2026", city: "Gdańsk", place: "Miejsce (przykład)", link: "https://example.com" }
        ]
      });
      continue;
    }

    if (ed === "projects") {
      setBlock(id, id === "caseStudies" ? (BLOCKS.caseStudies?.label || "Realizacje") : "Projekty", {
        items: [
          { title: "Realizacja 1", desc: "Opis poglądowy.", tags: "2025", link: "https://example.com" },
          { title: "Realizacja 2", desc: "Opis poglądowy.", tags: "2026", link: "https://example.com" },
          { title: "Realizacja 3", desc: "Opis poglądowy.", tags: "2026", link: "https://example.com" }
        ]
      });
      continue;
    }

    if (ed === "services") {
      setBlock(id, "Oferta", {
        items: [
          { name: "Występ / koncert", price: "do ustalenia", desc: "Opis poglądowy." },
          { name: "Współpraca", price: "do ustalenia", desc: "Opis poglądowy." },
          { name: "Warsztaty", price: "do ustalenia", desc: "Opis poglądowy." }
        ]
      });
      continue;
    }

    if (ed === "simpleList") {
      const title = id === "clients" ? "Partnerzy" : (id === "awards" ? "Wyróżnienia" : (BLOCKS[id]?.label || id));
      setBlock(id, title, {
        items: [
          { text: "Pozycja 1 (przykład)", link: "https://example.com" },
          { text: "Pozycja 2 (przykład)", link: "https://example.com" },
          { text: "Pozycja 3 (przykład)", link: "https://example.com" }
        ]
      });
      continue;
    }

    if (ed === "publications") {
      setBlock(id, "Publikacje", {
        items: [
          { title: "Publikacja 1", where: "Źródło", year: "2026", url: "https://example.com" },
          { title: "Publikacja 2", where: "Źródło", year: "2026", url: "https://example.com" }
        ]
      });
      continue;
    }

    if (ed === "testimonials") {
      setBlock(id, "Opinie", {
        items: [
          { quote: "Opinia poglądowa.", who: "Osoba / instytucja", link: "https://example.com" },
          { quote: "Opinia poglądowa.", who: "Osoba / instytucja", link: "https://example.com" }
        ]
      });
      continue;
    }

    if (ed === "epk") {
      setBlock(id, "Materiały prasowe", {
        shortBio: "Krótki opis dla mediów. Tekst poglądowy.",
        pressLinks: [
          { name: "Informacja prasowa", url: "https://example.com" },
          { name: "Wywiad / artykuł", url: "https://example.com" }
        ],
        downloadLinks: [
          { name: "EPK (PDF)", url: "https://example.com" },
          { name: "Zdjęcia prasowe (ZIP)", url: "https://example.com" }
        ]
      });
      continue;
    }

    if (ed === "newsletter") {
      setBlock(id, "Newsletter", {
        title: "Newsletter",
        desc: "Informacje o nowych materiałach i wydarzeniach.",
        btn: "Zapisz",
        url: "https://example.com"
      });
      continue;
    }

    if (ed === "contact") {
      setBlock(id, "Kontakt", {
        email: "kontakt@example.pl",
        phone: "+48 000 000 000",
        city: "Warszawa",
        cta: "Kontakt",
        showMap: true,
        mapAddress: "Tamka 3, 00-349 Warszawa",
        mapEmbed: ""
      });
      continue;
    }

    if (ed === "social") {
      setBlock(id, "Linki zewnętrzne", {
        items: [
          { name: "YouTube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
          { name: "Spotify", url: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT" },
          { name: "Instagram", url: "https://instagram.com/profil" },
          { name: "Facebook", url: "https://facebook.com/profil" },
          { name: "Strona", url: "https://example.com" }
        ]
      });
      continue;
    }

    // fallback
    setBlock(id, BLOCKS[id]?.label || id, {});
  }

  // assets (demo)
  assets.heroImages = [
    { dataUrl: _svgPlaceholderDataUrl("Zdjęcie promocyjne 01", 1600, 1000), alt: "Zdjęcie promocyjne 01" },
    { dataUrl: _svgPlaceholderDataUrl("Zdjęcie promocyjne 02", 900, 900), alt: "Zdjęcie promocyjne 02" },
    { dataUrl: _svgPlaceholderDataUrl("Zdjęcie promocyjne 03", 900, 900), alt: "Zdjęcie promocyjne 03" },
  ];

  assets.galleryImages = preset.includes('gallery') ? [
    { dataUrl: _svgPlaceholderDataUrl("Portfolio 01", 900, 900), alt: "Portfolio 01" },
    { dataUrl: _svgPlaceholderDataUrl("Portfolio 02", 900, 900), alt: "Portfolio 02" },
    { dataUrl: _svgPlaceholderDataUrl("Portfolio 03", 900, 900), alt: "Portfolio 03" },
    { dataUrl: _svgPlaceholderDataUrl("Portfolio 04", 900, 900), alt: "Portfolio 04" },
    { dataUrl: _svgPlaceholderDataUrl("Portfolio 05", 900, 900), alt: "Portfolio 05" },
    { dataUrl: _svgPlaceholderDataUrl("Portfolio 06", 900, 900), alt: "Portfolio 06" },
    { dataUrl: _svgPlaceholderDataUrl("Portfolio 07", 900, 900), alt: "Portfolio 07" },
    { dataUrl: _svgPlaceholderDataUrl("Portfolio 08", 900, 900), alt: "Portfolio 08" },
  ] : [];

  assets.epkPressPhotos = preset.includes('epk') ? [
    { dataUrl: _svgPlaceholderDataUrl("Zdjęcie prasowe 01", 1200, 800), alt: "Zdjęcie prasowe 01" },
    { dataUrl: _svgPlaceholderDataUrl("Zdjęcie prasowe 02", 1200, 800), alt: "Zdjęcie prasowe 02" },
    { dataUrl: _svgPlaceholderDataUrl("Zdjęcie prasowe 03", 1200, 800), alt: "Zdjęcie prasowe 03" },
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
      showHeading: (!isHero),
      // ZIP: include this block on index.html
      showOnHomeZip: true
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
  hero.data.headline = hero.data.headline ?? "Nazwa artysty / zespołu";
  hero.data.subheadline = hero.data.subheadline ?? "Oficjalny profil artystyczny. Informacje, multimedia i wydarzenia.";
  hero.data.primaryCtaText = hero.data.primaryCtaText ?? "Kontakt";
  hero.data.primaryCtaTarget = hero.data.primaryCtaTarget ?? "contact"; // auto | contact | custom
  hero.data.primaryCtaUrl = hero.data.primaryCtaUrl ?? "";
}

function syncPrivacySettingsUi(){
  const sel = document.getElementById('privacyMode');
  const mode = sel ? String(sel.value || 'auto') : (state.privacyAuto ? 'auto' : 'custom');

  const wrap = document.getElementById('privacyUrlWrap');
  const input = document.getElementById('privacyUrl');

  const isCustom = (mode === 'custom');

  if (wrap) wrap.style.display = isCustom ? '' : 'none';
  if (input) {
    input.disabled = !isCustom;
    if (!isCustom) input.setAttribute('aria-disabled', 'true');
    else input.removeAttribute('aria-disabled');
    if (isCustom && !String(input.placeholder || '').trim()) input.placeholder = 'Wprowadź URL';
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
  if ($("headerBg")) state.headerBg = $("headerBg").value;
  if ($("contentWidth")) state.contentWidth = $("contentWidth").value;
  if ($("headerWidth")) state.headerWidth = $("headerWidth").value;
  if ($("heroWidth")) state.heroWidth = $("heroWidth").value;
  if ($("fontPreset")) state.fontPreset = $("fontPreset").value;
  if ($("density")) state.density = $("density").value;
  if ($("borders")) state.borders = $("borders").value;
  if ($("radius")) state.radius = $("radius").value;
  if ($("sectionDividers")) state.sectionDividers = $("sectionDividers").value;

  state.accent = $("accent").value;

  // Colorwash background color (widoczne tylko w szablonie Colorwash)
  if ($("bgColor")) state.bgColor = $("bgColor").value;

  // Nagłówki sekcji (jedno źródło prawdy)
  if ($("sectionTitleAlign")) state.sectionHeadersAlign = $("sectionTitleAlign").value;

  state.siteName = $("siteName").value;
  if ($("useLogoInHeader")) state.useLogoInHeader = $("useLogoInHeader").checked;

  if ($("metaTitle")) state.metaTitle = $("metaTitle").value;
  if ($("metaDescription")) state.metaDescription = $("metaDescription").value;
  if ($("metaKeywords")) state.metaKeywords = $("metaKeywords").value;
  if ($("siteBaseUrl")) state.siteBaseUrl = $("siteBaseUrl").value;

  if ($("gtmId")) state.gtmId = $("gtmId").value;
  if ($("cookieBanner")) state.cookieBanner = $("cookieBanner").checked;
  if ($("privacyMode")) state.privacyMode = $("privacyMode").value;
  state.privacyAuto = (String(state.privacyMode || 'auto') !== 'custom');
  if ($("privacyUrl")) state.privacyUrl = $("privacyUrl").value;

  syncPrivacySettingsUi();

  // Programmatic value updates in the app should reflect in custom select UI.
  refreshCustomSelects();
  setLiveStatus();
}

function collectIssues() {
  const issues = [];

  // Ustawienia podstawowe
  if (!String(state.siteName || "").trim()) issues.push("Ustawienia: brak nazwy strony.");

  // SEO (soft warnings)
  if (!String(state.metaTitle || "").trim()) issues.push("SEO: brak tytułu.");
  if (!String(state.metaDescription || "").trim()) issues.push("SEO: brak opisu.");

  // Analityka / polityka (soft warnings)
  {
    const gtmId = String(state.gtmId || "").trim();
    const priv = String(state.privacyUrl || "").trim();
    const autoPol = !!state.privacyAuto;

    const mode = String(state.privacyMode || (autoPol ? "auto" : "custom"));
    const isCustom = (mode === "custom");

    if (gtmId && !isValidGtmId(gtmId)) issues.push("Analityka: GTM ID ma zły format.");
    if (isCustom && !priv) issues.push("Analityka: brak linku do polityki.");
    if (isCustom && priv && !isProbablyPrivacyHref(priv)) issues.push("Analityka: link do polityki ma zły format.");
    if (gtmId && !state.cookieBanner) issues.push("Analityka: GTM włączone, ale banner cookies wyłączony.");

    if (!isCustom) {
      const contactOn = enabledBlocksInOrder().includes("contact");
      const c = state.blocks?.contact?.data || {};
      const email = String(c.email || "").trim();
      if (!contactOn) issues.push("Polityka: dodaj blok Kontakt i podaj email.");
      else if (!email) issues.push("Polityka: uzupełnij email w bloku Kontakt.");
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

    if (def.editor === "embed_bandcamp") {
      const items = Array.isArray(d.items) ? d.items : [];
      for (const it of items) {
        const u = String(it.url || "").trim();
        if (u && !normalizeBandcamp(u)) pushUrlIssue(`${label}: nie rozpoznaję jednego z linków Bandcamp (wklej pełny link lub iframe).`);
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
            pushUrlIssue(`${label}: data wydarzenia wygląda na błędną (format: YYYY-MM-DD, przykładowo 2026-01-19).`);
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
    if (t.includes("brak tytułu")) return "metaTitle";
    if (t.includes("brak opisu")) return "metaDescription";
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
    return "privacyMode";
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
  if (id === 'siteName' && t.startsWith('Ustawienia:')) return 'Wprowadź nazwę serwisu.';

  // SEO (ostrzeżenia)
  if (id === 'metaTitle' && t.startsWith('SEO: brak tytułu')) return 'Dodaj tytuł SEO.';
  if (id === 'metaDescription' && t.startsWith('SEO: brak opisu')) return 'Dodaj opis SEO.';

  // Analityka
  if (id === 'gtmId' && t.includes('GTM ID')) return 'GTM ID ma zły format.';
  if (id === 'cookieBanner' && t.includes('banner cookies')) return 'Włącz banner cookies, jeśli używasz GTM.';
  if (id === 'privacyUrl' && t.includes('link do polityki')) return 'Wprowadź poprawny URL.';

  // Polityka / kontakt
  if (id === 'addBlockSelect' && t.startsWith('Polityka: dodaj blok Kontakt')) return 'Dodaj blok „Kontakt” i uzupełnij adres e‑mail.';
  if (id === 'ed_contact_email' && (t.startsWith('Kontakt: email') || t.startsWith('Polityka: uzupełnij email'))) return 'Wprowadź poprawny adres e‑mail.';

  // HERO CTA
  if (id === 'ed_hero_cta_url' && t.startsWith('HERO:')) return 'Wprowadź poprawny URL (https://...).';

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
        <div class="issuesModal__hint">Błędy blokują eksport. Ostrzeżenia nie blokują eksportu.</div>
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

const contentDraftChanged = debounce(() => {
  pushHistoryDebounced();
  saveDraft();
  updateIssuesPill();
  try{ if (typeof refreshSeoSinglesUI === 'function') refreshSeoSinglesUI(); }catch(_){ }
  // bez odświeżania podglądu — commit jest na blur/Enter
}, 180);

const contentChanged = debounce(() => {
  pushHistoryDebounced();
  saveDraft();
  updateIssuesPill();
  try{ if (typeof refreshSeoSinglesUI === 'function') refreshSeoSinglesUI(); }catch(_){ }
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
  try{ if (typeof refreshSeoSinglesUI === 'function') refreshSeoSinglesUI(); }catch(_){ }

  requestPreviewRebuild('structure', !!forcePreview);
}

    if (typeof state.blocks[blockId].showOnHomeZip === "undefined") state.blocks[blockId].showOnHomeZip = true;
