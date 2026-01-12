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
  $("liveStatus").textContent = `LIVE: ${state.livePreview ? "ON" : "OFF"}`;
  $("previewSubtitle").textContent = state.livePreview ? "LIVE" : "PAUSED";
}
function setPreviewPageLabel(label) { $("previewPageLabel").textContent = label; }

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

  order: [],
  blocks: {},
  activeBlockId: null,
};

/* assets (not stored in localStorage) */
const assets = {
  heroImages: [],          // dataURL[]
  galleryImages: [],       // dataURL[]
  epkPressPhotos: [],      // dataURL[]
  epkFiles: [],            // {name, dataUrl, mime}
};

/* preview (zip) cache */
let zipPreviewFiles = null;     // preview pages (inline css/js)
let zipPreviewCurrent = "index.html";

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

  state.order = Array.isArray(d.order) ? d.order : state.order;
  state.blocks = d.blocks ?? state.blocks;
  state.activeBlockId = d.activeBlockId ?? state.activeBlockId;

  $("exportMode").value = state.exportMode;
  $("livePreview").checked = !!state.livePreview;
  $("role").value = state.role;
  $("theme").value = state.theme;
  $("template").value = state.template;
  $("accent").value = state.accent;
  $("sectionHeadersAlign").value = state.sectionHeadersAlign;
  $("siteName").value = state.siteName;

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
  $("btnLoadSnapshot").disabled = !hasSnapshot();
  $("btnClearSnapshot").disabled = !hasSnapshot();
  setSnapshotStatus(hasSnapshot() ? "Snapshot: jest" : "Snapshot: brak");
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

/* ==========================
   Defaults + role switching
========================== */

function ensureBlock(blockId) {
  if (!state.blocks[blockId]) {
    state.blocks[blockId] = { enabled: true, title: BLOCKS[blockId]?.label || blockId, data: {} };
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

  preset.forEach(id => ensureBlock(id).enabled = true);

  Object.keys(state.blocks).forEach((id) => {
    if (!preset.includes(id)) state.blocks[id].enabled = false;
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
  state.livePreview = $("livePreview").checked;
  state.role = $("role").value;
  state.theme = $("theme").value;
  state.template = $("template").value;
  state.accent = $("accent").value;
  state.sectionHeadersAlign = $("sectionHeadersAlign").value;
  state.siteName = $("siteName").value;

  setLiveStatus();
}

const contentChanged = debounce(() => {
  saveDraft();
  if (state.livePreview) rebuildPreview(true);
}, 120);

function structureChanged(forcePreview = false) {
  syncStateFromSettingsInputs();
  hardLockHeroFirst();
  renderBlocksList();
  renderAddBlockSelect();
  renderBlockEditor();
  saveDraft();

  if (state.livePreview || forcePreview) rebuildPreview(true);
}

/* ==========================
   Reorder / enable / add
========================== */

function moveBlock(blockId, dir) {
  if (BLOCKS[blockId]?.locked) return;
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

function normalizeSpotify(input) {
  const s = String(input || "").trim();
  if (!s) return "";
  if (s.includes("<iframe")) {
    const src = extractIframeSrc(s);
    return src ? normalizeSpotify(src) : "";
  }
  if (s.includes("open.spotify.com/")) return s.replace("open.spotify.com/", "open.spotify.com/embed/");
  if (s.includes("spotify.com/embed/")) return s;
  return s;
}

function normalizeYouTube(input) {
  const s = String(input || "").trim();
  if (!s) return "";
  if (s.includes("<iframe")) {
    const src = extractIframeSrc(s);
    return src ? normalizeYouTube(src) : "";
  }

  const listMatch = s.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (listMatch) return `https://www.youtube.com/embed/videoseries?list=${listMatch[1]}`;

  const short = s.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (short) return `https://www.youtube.com/embed/${short[1]}`;

  const watch = s.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watch) return `https://www.youtube.com/embed/${watch[1]}`;

  if (s.includes("youtube.com/embed/")) return s;
  return s;
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
  const urls = [];
  for (const f of files) {
    const u = await readFileAsDataUrl(f);
    if (u) urls.push(u);
  }
  return urls;
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
    const locked = !!BLOCKS[id]?.locked;

    const el = document.createElement("div");
    el.className = `blockItem ${isActive ? "blockItem--active" : ""}`;

    const checkboxHtml = locked
      ? `<span class="pill" style="padding:4px 10px; font-size:11px;">STAŁE</span>`
      : `<div class="tog"><input type="checkbox" data-toggle="${id}" ${cfg.enabled ? "checked" : ""} /></div>`;

    el.innerHTML = `
      <div class="blockLabel" data-select="${id}">
        ${checkboxHtml}
        <div>
          <strong>${escapeHtml(BLOCKS[id]?.label || id)}</strong><br/>
          <small data-small="${id}">${escapeHtml(cfg.title || "")}</small>
        </div>
      </div>

      <div class="blockActions">
        <button class="iconBtn" data-up="${id}" ${locked || idx <= 1 ? "disabled" : ""} title="Góra">↑</button>
        <button class="iconBtn" data-down="${id}" ${locked || idx === state.order.length - 1 ? "disabled" : ""} title="Dół">↓</button>
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
  const def = BLOCKS[id];

  const common = fieldRow(
    "Tytuł sekcji",
    `<input id="ed_title" type="text" value="${escapeHtml(cfg.title || "")}" />`,
    def.locked ? "HERO jest stały i zawsze na górze." : "Tytuł w menu i nagłówku sekcji."
  );

  let specific = "";

  if (def.editor === "hero") {
    const h = cfg.data;
    const heroInfo = assets.heroImages.length
      ? `<div class="hint">HERO zdjęcia: ${assets.heroImages.length} (pierwsze = tło)</div>
         <div class="itemList">
           ${assets.heroImages.map((_, i) => `
             <div class="itemCard">
               <div class="itemCardTop">
                 <strong>Zdjęcie #${i+1}</strong>
                 <button class="btnSmall" type="button" data-remove-heroimg="${i}">Usuń</button>
               </div>
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
    const thumbs = assets.galleryImages.length
      ? `<div class="hint">Wgrane zdjęcia: ${assets.galleryImages.length}</div>
         <div class="itemList">
            ${assets.galleryImages.map((_, i) => `
              <div class="itemCard">
                <div class="itemCardTop">
                  <strong>Zdjęcie #${i+1}</strong>
                  <button class="btnSmall" type="button" data-remove-gallery="${i}">Usuń</button>
                </div>
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
      ${fieldRow("Wgraj zdjęcia", `<input id="ed_gallery_upload" type="file" accept="image/*" multiple />`)}
      ${thumbs}
    `;
  }

  if (def.editor === "embed_spotify") {
    cfg.data.items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    specific = listEditor(cfg.data.items, "items", "Link", [
      { key: "url", label: "Link Spotify", type: "url", placeholder: "https://open.spotify.com/..." }
    ]) + `<div class="hint">Wklej link (lub iframe) → generator zrobi embed automatycznie.</div>`;
  }

  if (def.editor === "embed_youtube") {
    cfg.data.items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    specific = listEditor(cfg.data.items, "items", "Link", [
      { key: "url", label: "Link YouTube", type: "url", placeholder: "https://youtube.com/watch?v=... lub playlist" }
    ]) + `<div class="hint">Wklej link (lub iframe) → generator zrobi embed automatycznie.</div>`;
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
            ${assets.epkPressPhotos.map((_, i) => `
              <div class="itemCard">
                <div class="itemCardTop">
                  <strong>Press photo #${i+1}</strong>
                  <button class="btnSmall" type="button" data-remove-epkphoto="${i}">Usuń</button>
                </div>
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
  const def = BLOCKS[blockId];

  // title (update small label without rerender)
  const titleEl = host.querySelector("#ed_title");
  if (titleEl) {
    titleEl.addEventListener("input", () => {
      cfg.title = titleEl.value;
      updateBlockSmallTitle(blockId, cfg.title);
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
}

/* ==========================
   Site HTML/CSS/JS generation
========================== */

function blockToFile(id) { return `${id}.html`; }

function getNavItemsZip() {
  const items = [{ label: "Home", href: "index.html", id: "home" }];
  for (const id of enabledBlocksInOrder()) {
    if (id === "hero") continue;
    items.push({ label: state.blocks[id].title || BLOCKS[id].label, href: blockToFile(id), id });
  }
  return items;
}

function getNavItemsSingle() {
  return enabledBlocksInOrder().map(id => ({ label: state.blocks[id].title || BLOCKS[id].label, href: `#${id}`, id }));
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
.brandDot{
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
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
@media (max-width: 900px){ .galleryGrid{ grid-template-columns: repeat(2,1fr); } }
.galleryGrid img{ width:100%; height:auto; display:block; }

.masonry{
  column-count: 3;
  column-gap: 14px;
}
@media (max-width: 900px){ .masonry{ column-count: 2; } }
.masonryItem{ break-inside: avoid; margin:0 0 14px 0; }
.masonryItem img{ width:100%; height:auto; display:block; }

.embed{ width:100%; aspect-ratio: 16/9; border:0; }
.embed.tall{ aspect-ratio: 16/10; }

.footer{ margin-top: 36px; opacity:.7; font-size: 12px; text-align:center; }

/* TEMPLATE: Square Grid (minimal like your ref #2) */
body.tpl-square{
  --radius: 0px;
}
body.tpl-square .container{ padding-top: 18px; }
body.tpl-square .brandDot{ box-shadow:none; }
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
body.tpl-colorwash .brandDot{ background:#111; }
body.theme-modern.tpl-colorwash .brandDot{ background:#fff; }

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
`;
}

function buildSiteScript() {
  // Works in srcdoc preview: intercept .html links -> parent postMessage
  return `
(function(){
  // This flag is injected only for iframe srcdoc preview (never for exported files)
  const IN_PREVIEW = !!(document.documentElement && document.documentElement.hasAttribute("data-kpo-preview"));
  function send(msg){ try{ parent.postMessage(msg, "*"); }catch(e){} }

  document.addEventListener("click", function(e){
    const a = e.target.closest("a");
    if(!a) return;
    const href = a.getAttribute("href") || "";
    if(!href) return;

    if(href.startsWith("#")){
      if(href.length <= 1) return; // allow bare "#" to behave normally
      e.preventDefault();
      const el = document.getElementById(href.slice(1)) || document.querySelector(href);
      if(el) el.scrollIntoView({behavior:"smooth", block:"start"});
      return;
    }

    if(IN_PREVIEW){
      // ZIP preview: switch between inlined pages instead of real navigation
      const raw = String(href || "").trim();
      const lower = raw.toLowerCase();
      // don't hijack external/protocol links
      if(
        lower.startsWith("http:") ||
        lower.startsWith("https:") ||
        lower.startsWith("mailto:") ||
        lower.startsWith("tel:") ||
        lower.startsWith("sms:") ||
        lower.startsWith("data:") ||
        lower.startsWith("blob:")
      ) return;

      let clean = raw;
      if(clean.startsWith("./")) clean = clean.slice(2);
      if(clean.startsWith("/")) clean = clean.slice(1);
      clean = clean.split("#")[0].split("?")[0];

      if(clean.endsWith(".html")){
        e.preventDefault();
        send({type:"NAVIGATE", page: clean});
      }
    }
  });
})();
`;
}

function buildHeader(navItems, activeHref) {
  const brand = escapeHtml(state.siteName || "Portfolio");
  const links = navItems.map(it => {
    const isActive = it.href === activeHref;
    return `<a href="${it.href}" class="${isActive ? "active" : ""}">${escapeHtml(it.label)}</a>`;
  }).join("");

  return `
<header class="siteHeader">
  <div class="headerInner">
    <div class="brand"><span class="brandDot"></span> ${brand}</div>
    <nav class="nav">${links}</nav>
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

  const bg = assets.heroImages[0] ? `url('${cssUrl(assets.heroImages[0])}')` : `linear-gradient(135deg, var(--accent), #111)`;

  const heroGallery = assets.heroImages.length > 1
    ? `<div class="heroGallery">
        ${assets.heroImages.map((u, i) => `
          <a href="${u}" target="_blank" rel="noopener" title="HERO #${i+1}">
            <img src="${u}" alt="HERO ${i+1}"/>
          </a>
        `).join("")}
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
  const cfg = ensureBlock(id);
  const title = escapeHtml(cfg.title || BLOCKS[id].label);
  const editor = BLOCKS[id].editor;

  if (id === "hero") return renderHeroSection(mode);

  if (editor === "text") {
    const text = escapeHtml(cfg.data.text || "").replaceAll("\n", "<br/>");
    return `
<section id="${id}" class="section">
  <h2 class="sectionTitle">${title}</h2>
  <div class="muted">${text || "—"}</div>
</section>`;
  }

  if (editor === "gallery") {
    const layout = cfg.data.layout || "grid";
    const items = assets.galleryImages.length ? assets.galleryImages : [];

    if (!items.length) {
      return `
<section id="${id}" class="section">
  <h2 class="sectionTitle">${title}</h2>
  <div class="muted">Brak zdjęć — wgraj w generatorze.</div>
</section>`;
    }

    const body = layout === "masonry"
      ? `<div class="masonry">
          ${items.map(u => `<div class="masonryItem"><img src="${u}" alt=""/></div>`).join("")}
        </div>`
      : `<div class="galleryGrid">
          ${items.map(u => `<img src="${u}" alt=""/>`).join("")}
        </div>`;

    return `
<section id="${id}" class="section">
  <h2 class="sectionTitle">${title}</h2>
  ${body}
</section>`;
  }

  if (editor === "embed_spotify") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const iframes = items
      .map(it => normalizeSpotify(it.url || ""))
      .filter(Boolean)
      .map(src => `<iframe class="embed tall" src="${src}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`)
      .join("");

    return `
<section id="${id}" class="section">
  <h2 class="sectionTitle">${title}</h2>
  <div class="grid">${iframes || `<div class="muted">Wklej linki Spotify w generatorze.</div>`}</div>
</section>`;
  }

  if (editor === "embed_youtube") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const iframes = items
      .map(it => normalizeYouTube(it.url || ""))
      .filter(Boolean)
      .map(src => `<iframe class="embed" src="${src}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`)
      .join("");

    return `
<section id="${id}" class="section">
  <h2 class="sectionTitle">${title}</h2>
  <div class="grid">${iframes || `<div class="muted">Wklej linki YouTube w generatorze.</div>`}</div>
</section>`;
  }

  if (editor === "events") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const rows = items.map(it => {
      const date = escapeHtml(it.date || "");
      const city = escapeHtml(it.city || "");
      const place = escapeHtml(it.place || "");
      const link = (it.link || "").trim();
      return `
<div style="display:flex; justify-content:space-between; gap:12px; padding:10px 0; border-bottom:1px solid rgba(127,127,127,.18);">
  <div><strong>${date || "—"}</strong> • ${city || "—"}<div class="muted">${place || ""}</div></div>
  ${link ? `<a class="btn" href="${escapeHtml(link)}" target="_blank" rel="noopener">Szczegóły</a>` : ``}
</div>`;
    }).join("");

    return `
<section id="${id}" class="section">
  <h2 class="sectionTitle">${title}</h2>
  <div>${rows || `<div class="muted">Dodaj wydarzenia w generatorze.</div>`}</div>
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
  <h2 class="sectionTitle">${title}</h2>
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
  <h2 class="sectionTitle">${title}</h2>
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
  <h2 class="sectionTitle">${title}</h2>
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
  <h2 class="sectionTitle">${title}</h2>
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
  <h2 class="sectionTitle">${title}</h2>
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
      ? `<div class="galleryGrid">${assets.epkPressPhotos.map(u => `<img src="${u}" alt=""/>`).join("")}</div>`
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
  <h2 class="sectionTitle">${title}</h2>

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
  <h2 class="sectionTitle">${title}</h2>
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
  <h2 class="sectionTitle">${title}</h2>
  <div>${rows || `<div class="muted">Dodaj profile w generatorze.</div>`}</div>
</section>`;
  }

  return `
<section id="${id}" class="section">
  <h2 class="sectionTitle">${title}</h2>
  <div class="muted">Sekcja.</div>
</section>`;
}

function buildSingleHtml(forPreviewInline = true) {
  const nav = getNavItemsSingle();
  const css = buildSiteCss();
  const js = buildSiteScript();
  const bodySections = enabledBlocksInOrder().map(id => renderBlockSection(id, "single")).join("");

  const previewAttr = forPreviewInline ? ` data-kpo-preview="1"` : ``;

  const headCss = forPreviewInline ? `<style>${css}</style>` : `<link rel="stylesheet" href="style.css"/>`;
  const footJs = forPreviewInline ? `<script>${js}</script>` : `<script src="site.js"></script>`;

  return `
<!doctype html>
<html lang="pl"${previewAttr}>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(state.siteName || "Portfolio")}</title>
${headCss}
</head>
<body class="theme-${escapeHtml(state.theme)} tpl-${escapeHtml(state.template)}">
  ${buildHeader(nav, nav[0]?.href || "#hero")}
  <main class="container">
    ${bodySections}
    <div class="footer">© ${escapeHtml(state.siteName || "Artysta")}</div>
  </main>
${footJs}
</body>
</html>`.trim();
}

function buildZipFiles(forPreviewInline) {
  const css = buildSiteCss();
  const js = buildSiteScript();
  const nav = getNavItemsZip();
  const files = {};

  const previewAttr = forPreviewInline ? ` data-kpo-preview="1"` : ``;

  // export version: separate files + html links
  if (!forPreviewInline) {
    files["style.css"] = css;
    files["site.js"] = js;
  }

  const headCss = forPreviewInline ? `<style>${css}</style>` : `<link rel="stylesheet" href="style.css"/>`;
  const footJs = forPreviewInline ? `<script>${js}</script>` : `<script src="site.js"></script>`;

  // index.html
  const enabled = enabledBlocksInOrder().filter(id => id !== "hero");
  const quick = enabled.slice(0, 6).map(id => {
    const t = escapeHtml(state.blocks[id].title || BLOCKS[id].label);
    const href = blockToFile(id);
    return `<a class="btn" href="${href}">${t}</a>`;
  }).join(" ");

  const indexBody = `
    ${renderBlockSection("hero", "zip")}
    ${quick ? `<section class="section">
      <h2 class="sectionTitle">Skróty</h2>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">${quick}</div>
    </section>` : ``}
  `;

  files["index.html"] = `
<!doctype html>
<html lang="pl"${previewAttr}>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(state.siteName || "Portfolio")}</title>
${headCss}
</head>
<body class="theme-${escapeHtml(state.theme)} tpl-${escapeHtml(state.template)}">
  ${buildHeader(nav, "index.html")}
  <main class="container">
    ${indexBody}
    <div class="footer">© ${escapeHtml(state.siteName || "Artysta")}</div>
  </main>
${footJs}
</body>
</html>`.trim();

  // pages per block
  for (const id of enabled) {
    const file = blockToFile(id);
    files[file] = `
<!doctype html>
<html lang="pl"${previewAttr}>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(state.siteName || "Portfolio")} • ${escapeHtml(state.blocks[id].title || BLOCKS[id].label)}</title>
${headCss}
</head>
<body class="theme-${escapeHtml(state.theme)} tpl-${escapeHtml(state.template)}">
  ${buildHeader(nav, file)}
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
    iframe.srcdoc = buildSingleHtml(true);
    setPreviewPageLabel("index.html");
    return;
  }

  // ZIP preview: build inline pages (fixes your broken preview)
  zipPreviewFiles = buildZipFiles(true);

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

  if (!zipPreviewFiles) zipPreviewFiles = buildZipFiles(true);

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
    assets.heroImages.forEach((u, i) => {
      const parsed = parseDataUrl(u);
      if (!parsed) return;
      const ext = guessExtFromMime(parsed.mime);
      h.file(`hero-${String(i+1).padStart(2,"0")}.${ext}`, parsed.b64, { base64: true });
    });
  }

  if (assets.galleryImages.length) {
    const g = assetsFolder.folder("gallery");
    assets.galleryImages.forEach((u, i) => {
      const parsed = parseDataUrl(u);
      if (!parsed) return;
      const ext = guessExtFromMime(parsed.mime);
      g.file(`img-${String(i+1).padStart(2,"0")}.${ext}`, parsed.b64, { base64: true });
    });
  }

  if (assets.epkPressPhotos.length || assets.epkFiles.length) {
    const p = assetsFolder.folder("press");

    assets.epkPressPhotos.forEach((u, i) => {
      const parsed = parseDataUrl(u);
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

  $("livePreview").addEventListener("change", () => {
    state.livePreview = $("livePreview").checked;
    setLiveStatus();
    saveDraft();
    if (state.livePreview) rebuildPreview(true);
  });

  $("role").addEventListener("change", () => {
    applyRolePreset($("role").value);
    structureChanged(true);
  });

  // settings that should NOT rerender UI on each key
  ["theme","template","accent","sectionHeadersAlign","siteName"].forEach(id => {
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

  $("btnDownload").addEventListener("click", async () => {
    syncStateFromSettingsInputs();
    if (state.exportMode === "single") {
      // export: separate files? -> simplest: one index.html with inline CSS/JS
      downloadText("index.html", buildSingleHtml(true));
      return;
    }
    const files = buildZipFiles(false); // export = external style.css + site.js
    await downloadZip(files);
  });

  $("btnReset").addEventListener("click", () => resetDraft());
  $("btnSaveSnapshot").addEventListener("click", () => saveSnapshot());
  $("btnLoadSnapshot").addEventListener("click", () => loadSnapshot());
  $("btnClearSnapshot").addEventListener("click", () => clearSnapshot());
}

function init() {
  bindPanelToggle();
  applyRolePreset(state.role);

  const loaded = loadDraft();
  if (!loaded) {
    $("exportMode").value = state.exportMode;
    $("livePreview").checked = state.livePreview;
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

  // first render
  syncStateFromSettingsInputs();
  renderBlocksList();
  renderAddBlockSelect();
  renderBlockEditor();
  rebuildPreview(true);
}

init();
