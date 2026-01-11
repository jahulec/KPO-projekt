// ================== STORAGE ==================
const STORAGE_KEY = "artist_site_generator_v3";

const PERSIST_IDS = [
  "exportMode","livePreview",
  "role","theme","template","accent",
  "sectionHeadersAlign","siteName",
];

// ================== BLOCK CATALOG ==================
const BLOCKS = {
  hero:         { label: "HERO (start)", editor: "hero", locked: true },

  about:        { label: "O mnie", editor: "text" },
  gallery:      { label: "Galeria", editor: "gallery" },

  spotify:      { label: "Spotify", editor: "spotify" },
  youtube:      { label: "YouTube", editor: "youtube" },

  events:       { label: "Wydarzenia", editor: "events" },
  exhibitions:  { label: "Wystawy / występy", editor: "events" },

  projects:     { label: "Projekty", editor: "projects" },
  caseStudies:  { label: "Case studies", editor: "projects" },

  services:     { label: "Usługi", editor: "services" },
  clients:      { label: "Klienci", editor: "simpleList" },
  awards:       { label: "Nagrody / wyróżnienia", editor: "simpleList" },

  publications: { label: "Publikacje", editor: "publications" },
  testimonials: { label: "Opinie", editor: "testimonials" },
  shop:         { label: "Sklep / merch", editor: "products" },
  newsletter:   { label: "Newsletter / mailing list", editor: "newsletter" },

  epk:          { label: "EPK / Press kit", editor: "epk" },
  contact:      { label: "Kontakt", editor: "contact" },
  social:       { label: "Social media", editor: "social" },
};

const OPTIONAL_BLOCKS = Object.keys(BLOCKS).filter(id => id !== "hero");

// ================== ROLE PRESETS (branżowo sensowne) ==================
const ROLE_PRESETS = {
  musician: [
    "hero","about","spotify","youtube","events","epk","contact","social"
  ],
  dj: [
    "hero","about","spotify","youtube","events","epk","contact","social"
  ],
  photographer: [
    "hero","about","gallery","exhibitions","services","clients","contact","social"
  ],
  visual: [
    "hero","about","gallery","exhibitions","awards","contact","social"
  ],
  designer: [
    "hero","about","caseStudies","services","testimonials","clients","contact","social"
  ],
  filmmaker: [
    "hero","about","youtube","projects","services","clients","contact","social"
  ],
  writer: [
    "hero","about","publications","events","epk","newsletter","contact","social"
  ],
  performer: [
    "hero","about","youtube","events","epk","contact","social"
  ],
};

// ================== TEMPLATES (szablony) ==================
const TEMPLATES = {
  rounded: {
    name: "Rounded",
    vars: {
      "--rad-card": "22px",
      "--rad-btn": "14px",
      "--rad-media": "22px",
      "--pad-card": "16px",
      "--stroke-w": "1px",
      "--card-glow": "none",
    }
  },
  sharp: {
    name: "Sharp",
    vars: {
      "--rad-card": "8px",
      "--rad-btn": "8px",
      "--rad-media": "8px",
      "--pad-card": "14px",
      "--stroke-w": "1px",
      "--card-glow": "none",
    }
  },
  editorial: {
    name: "Editorial",
    vars: {
      "--rad-card": "14px",
      "--rad-btn": "12px",
      "--rad-media": "14px",
      "--pad-card": "20px",
      "--stroke-w": "1px",
      "--card-glow": "none",
      "--h1-weight": "900",
      "--h2-weight": "900",
      "--body-size": "16px",
    }
  },
  neon: {
    name: "Neon",
    vars: {
      "--rad-card": "18px",
      "--rad-btn": "14px",
      "--rad-media": "18px",
      "--pad-card": "16px",
      "--stroke-w": "1px",
      "--card-glow": "0 0 0 4px color-mix(in oklab, var(--accent) 18%, transparent), 0 18px 55px rgba(0,0,0,.55)",
    }
  },
  soft: {
    name: "Soft",
    vars: {
      "--rad-card": "28px",
      "--rad-btn": "18px",
      "--rad-media": "28px",
      "--pad-card": "18px",
      "--stroke-w": "1px",
      "--card-glow": "none",
    }
  }
};

// ================== STATE ==================
const state = {
  exportMode: "single",        // single | zip
  livePreview: true,           // true | false

  role: "musician",
  theme: "minimalist",
  template: "rounded",
  accent: "#6d28d9",

  sectionHeadersAlign: "left", // left | center
  siteName: "Moje Portfolio",

  order: [],
  blocks: {},
  activeBlockId: null,
};

// Upload assets in RAM (not persisted)
const assets = {
  heroDataUrl: "",
  galleryImages: [],   // dataURL[]
  epkImages: [],       // dataURL[]
  epkFiles: [],        // {name, url, type}
};

// ================== DOM ==================
const $ = (id) => document.getElementById(id);

// ================== HELPERS ==================
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

function setSaveStatus(msg) {
  $("saveStatus").textContent = msg;
}

function setLiveStatus() {
  const on = !!state.livePreview;
  $("liveStatus").textContent = `LIVE: ${on ? "ON" : "OFF"}`;
  $("previewSubtitle").textContent = on ? "LIVE" : "PAUSED";
  $("previewPaused").style.display = on ? "none" : "grid";
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

async function readMultipleImages(fileList) {
  const files = Array.from(fileList || []);
  const urls = [];
  for (const f of files) {
    const u = await readFileAsDataUrl(f);
    if (u) urls.push(u);
  }
  return urls;
}

// ================== EMBED NORMALIZATION (link → iframe src) ==================
function extractIframeSrc(input) {
  const m = String(input || "").match(/src\s*=\s*"(.*?)"/i);
  return m ? m[1] : "";
}

function normalizeSpotifyUrl(input) {
  const s = String(input || "").trim();
  if (!s) return "";
  if (s.includes("<iframe")) {
    const src = extractIframeSrc(s);
    return src ? normalizeSpotifyUrl(src) : "";
  }
  if (s.includes("open.spotify.com/")) {
    // open.spotify.com/track/ID -> open.spotify.com/embed/track/ID
    return s.replace("open.spotify.com/", "open.spotify.com/embed/");
  }
  if (s.includes("spotify.com/embed/")) return s;
  return s; // best effort
}

function normalizeYouTubeUrl(input) {
  const s = String(input || "").trim();
  if (!s) return "";
  if (s.includes("<iframe")) {
    const src = extractIframeSrc(s);
    return src ? normalizeYouTubeUrl(src) : "";
  }

  // playlist
  const listMatch = s.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (listMatch) return `https://www.youtube.com/embed/videoseries?list=${listMatch[1]}`;

  // youtu.be/ID
  const short = s.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (short) return `https://www.youtube.com/embed/${short[1]}`;

  // watch?v=ID
  const watch = s.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watch) return `https://www.youtube.com/embed/${watch[1]}`;

  // already embed
  if (s.includes("youtube.com/embed/")) return s;

  return s;
}

// ================== DEFAULT BLOCK CONFIG ==================
function ensureBlock(blockId) {
  if (!state.blocks[blockId]) {
    state.blocks[blockId] = {
      enabled: true,
      title: BLOCKS[blockId]?.label || blockId,
      data: {}
    };
  }
  return state.blocks[blockId];
}

function hardLockHeroFirst() {
  // hero always exists, enabled, first
  ensureBlock("hero").enabled = true;
  state.order = state.order.filter(id => id !== "hero");
  state.order.unshift("hero");
}

function applyRolePreset(role) {
  const preset = ROLE_PRESETS[role] || ROLE_PRESETS.musician;

  // enable + create preset blocks
  preset.forEach(id => ensureBlock(id).enabled = true);

  // disable blocks not in preset (but keep data for later)
  Object.keys(state.blocks).forEach((id) => {
    if (!preset.includes(id)) state.blocks[id].enabled = false;
  });

  state.role = role;
  state.order = [...preset];
  hardLockHeroFirst();

  state.activeBlockId = state.order.find(id => state.blocks[id]?.enabled) || "hero";

  // defaults for hero if empty
  const hero = ensureBlock("hero");
  hero.data.headline = hero.data.headline ?? "Nowa strona artysty";
  hero.data.subheadline = hero.data.subheadline ?? "Pokaż prace, materiały i kontakt. Estetycznie i bez korpo.";
  hero.data.primaryCtaText = hero.data.primaryCtaText ?? "Zobacz";
  hero.data.primaryCtaTarget = hero.data.primaryCtaTarget ?? "auto"; // auto | contact | custom
  hero.data.primaryCtaUrl = hero.data.primaryCtaUrl ?? "";
}

// ================== AUTOSAVE ==================
function saveDraft() {
  const data = {};
  for (const id of PERSIST_IDS) {
    const el = $(id);
    if (!el) continue;
    if (el.type === "checkbox") data[id] = el.checked;
    else data[id] = el.value ?? "";
  }

  const blocksPersist = {};
  for (const [id, cfg] of Object.entries(state.blocks)) {
    blocksPersist[id] = {
      enabled: !!cfg.enabled,
      title: cfg.title ?? "",
      data: cfg.data ?? {}
    };
  }

  const payload = {
    data,
    state: {
      exportMode: state.exportMode,
      livePreview: state.livePreview,
      role: state.role,
      theme: state.theme,
      template: state.template,
      accent: state.accent,
      sectionHeadersAlign: state.sectionHeadersAlign,
      siteName: state.siteName,
      order: state.order,
      blocks: blocksPersist,
      activeBlockId: state.activeBlockId,
    },
    savedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setSaveStatus(`Zapis: ${new Date().toLocaleTimeString()}`);
  } catch {
    setSaveStatus("Zapis: błąd (brak miejsca?)");
  }
}

function loadDraft() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const payload = JSON.parse(raw);
    const s = payload?.state;
    if (!s) return false;

    Object.assign(state, {
      exportMode: s.exportMode ?? state.exportMode,
      livePreview: s.livePreview ?? state.livePreview,
      role: s.role ?? state.role,
      theme: s.theme ?? state.theme,
      template: s.template ?? state.template,
      accent: s.accent ?? state.accent,
      sectionHeadersAlign: s.sectionHeadersAlign ?? state.sectionHeadersAlign,
      siteName: s.siteName ?? state.siteName,
      order: Array.isArray(s.order) ? s.order : state.order,
      blocks: s.blocks ?? state.blocks,
      activeBlockId: s.activeBlockId ?? state.activeBlockId,
    });

    // restore form
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

    const savedAt = payload?.savedAt ? new Date(payload.savedAt) : null;
    setSaveStatus(savedAt ? `Zapis: wczytano (${savedAt.toLocaleTimeString()})` : "Zapis: wczytano");
    return true;
  } catch {
    return false;
  }
}

function resetDraft() {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

// ================== UI: BLOCK LIST ==================
function moveBlock(blockId, dir) {
  if (BLOCKS[blockId]?.locked) return; // hero locked
  const idx = state.order.indexOf(blockId);
  if (idx < 0) return;
  const newIdx = idx + dir;
  if (newIdx < 1) return; // keep hero at index 0
  if (newIdx >= state.order.length) return;
  const arr = [...state.order];
  const [item] = arr.splice(idx, 1);
  arr.splice(newIdx, 0, item);
  state.order = arr;
  hardLockHeroFirst();
}

function toggleBlock(blockId, enabled) {
  if (BLOCKS[blockId]?.locked) return; // hero always enabled
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
          <small>${escapeHtml(cfg.title || "")}</small>
        </div>
      </div>

      <div class="blockActions">
        <button class="iconBtn" data-up="${id}" ${locked || idx === 0 || idx === 1 ? "disabled" : ""} title="Góra">↑</button>
        <button class="iconBtn" data-down="${id}" ${locked || idx === state.order.length - 1 ? "disabled" : ""} title="Dół">↓</button>
        <button class="iconBtn" data-remove="${id}" ${locked ? "disabled" : ""} title="Usuń z układu">✕</button>
      </div>
    `;
    host.appendChild(el);
  });

  host.querySelectorAll("[data-select]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.activeBlockId = btn.getAttribute("data-select");
      renderAll(true);
    });
  });

  host.querySelectorAll("[data-toggle]").forEach(chk => {
    chk.addEventListener("change", () => {
      const id = chk.getAttribute("data-toggle");
      toggleBlock(id, chk.checked);
      renderAll(true);
    });
  });

  host.querySelectorAll("[data-up]").forEach(b => {
    b.addEventListener("click", () => {
      moveBlock(b.getAttribute("data-up"), -1);
      renderAll(true);
    });
  });

  host.querySelectorAll("[data-down]").forEach(b => {
    b.addEventListener("click", () => {
      moveBlock(b.getAttribute("data-down"), +1);
      renderAll(true);
    });
  });

  host.querySelectorAll("[data-remove]").forEach(b => {
    b.addEventListener("click", () => {
      removeBlockFromPage(b.getAttribute("data-remove"));
      renderAll(true);
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

// ================== UI: BLOCK EDITOR ==================
function fieldRow(label, inputHtml, hint = "") {
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      ${inputHtml}
      ${hint ? `<div class="hint" style="margin-top:6px;">${hint}</div>` : ""}
    </label>
  `;
}

function itemInput(label, id, value, type="text", placeholder="") {
  return `
    <label class="field" style="margin:0;">
      <span>${escapeHtml(label)}</span>
      <input data-field="${escapeHtml(id)}" type="${type}" value="${escapeHtml(value || "")}" placeholder="${escapeHtml(placeholder)}"/>
    </label>
  `;
}

function itemTextarea(label, id, value, placeholder="") {
  return `
    <label class="field" style="margin:0;">
      <span>${escapeHtml(label)}</span>
      <textarea data-field="${escapeHtml(id)}" rows="3" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value || "")}</textarea>
    </label>
  `;
}

function renderListItemsUI(items, schema, blockId, listKey, itemLabel="Pozycja") {
  const cards = items.map((it, idx) => {
    const fieldsHtml = schema.map(f => {
      if (f.type === "textarea") {
        return itemTextarea(f.label, `${listKey}.${idx}.${f.key}`, it[f.key] || "", f.placeholder || "");
      }
      return itemInput(f.label, `${listKey}.${idx}.${f.key}`, it[f.key] || "", f.type || "text", f.placeholder || "");
    }).join("");

    return `
      <div class="itemCard" data-list="${listKey}" data-index="${idx}">
        <div class="itemCardTop">
          <strong>${escapeHtml(itemLabel)} #${idx+1}</strong>
          <button class="btnSmall" type="button" data-remove-item="${listKey}" data-index="${idx}">Usuń</button>
        </div>
        <div class="itemGrid2">${fieldsHtml}</div>
      </div>
    `;
  }).join("");

  return `
    <div class="itemList">
      ${cards || `<div class="hint">Brak pozycji. Dodaj pierwszą.</div>`}
      <div class="itemActions">
        <button class="btnSmall" type="button" data-add-item="${listKey}">+ Dodaj</button>
      </div>
    </div>
  `;
}

function renderUrlListUI(urls, listKey, hintText) {
  const rows = urls.map((u, idx) => `
    <div class="itemCard" data-list="${listKey}" data-index="${idx}">
      <div class="itemCardTop">
        <strong>Link #${idx+1}</strong>
        <button class="btnSmall" type="button" data-remove-item="${listKey}" data-index="${idx}">Usuń</button>
      </div>
      <div style="display:grid; gap:10px;">
        <input data-field="${listKey}.${idx}.url" type="url" value="${escapeHtml(u || "")}" placeholder="Wklej link…"/>
      </div>
    </div>
  `).join("");

  return `
    <div class="itemList">
      ${rows || `<div class="hint">Wklej pierwszy link i dodaj kolejne.</div>`}
      <div class="itemActions">
        <button class="btnSmall" type="button" data-add-item="${listKey}">+ Dodaj link</button>
      </div>
      ${hintText ? `<div class="hint">${hintText}</div>` : ""}
    </div>
  `;
}

function renderBlockEditor() {
  const host = $("blockEditor");
  const id = state.activeBlockId;

  if (!id || !state.blocks[id]) {
    host.innerHTML = `<div class="emptyEditor">Wybierz blok z listy powyżej.</div>`;
    return;
  }

  const cfg = ensureBlock(id);
  const def = BLOCKS[id];

  // common title (dla hero zostaje, ale to bardziej etykieta; w podglądzie hero i tak ma własny layout)
  const commonTitle = `
    ${fieldRow("Tytuł sekcji", `<input id="ed_title" type="text" value="${escapeHtml(cfg.title || "")}"/>`,
      def.locked ? "HERO jest stały i zawsze na górze." : "Tytuł wyświetlany w menu/sekcji.")}
  `;

  let specific = "";

  if (def.editor === "hero") {
    const h = cfg.data;
    const headline = h.headline ?? "";
    const subheadline = h.subheadline ?? "";
    const ctaText = h.primaryCtaText ?? "Zobacz";
    const ctaTarget = h.primaryCtaTarget ?? "auto";
    const ctaUrl = h.primaryCtaUrl ?? "";

    specific = `
      ${fieldRow("Nagłówek (H1)", `<input id="ed_hero_headline" type="text" value="${escapeHtml(headline)}" placeholder="np. Muzyka. Obraz. Emocje."/>`)}
      ${fieldRow("Opis (1–2 zdania)", `<textarea id="ed_hero_sub" rows="4" placeholder="Krótko i konkretnie…">${escapeHtml(subheadline)}</textarea>`)}
      <div class="grid2">
        ${fieldRow("Tekst przycisku", `<input id="ed_hero_cta_text" type="text" value="${escapeHtml(ctaText)}"/>`)}
        ${fieldRow("Cel przycisku", `
          <select id="ed_hero_cta_target">
            <option value="auto" ${ctaTarget==="auto"?"selected":""}>Automatycznie (pierwsza sekcja)</option>
            <option value="contact" ${ctaTarget==="contact"?"selected":""}>Kontakt</option>
            <option value="custom" ${ctaTarget==="custom"?"selected":""}>Własny link (URL)</option>
          </select>
        `)}
      </div>
      <div id="heroCustomUrlWrap" style="display:${ctaTarget==="custom"?"block":"none"};">
        ${fieldRow("Własny URL", `<input id="ed_hero_cta_url" type="url" value="${escapeHtml(ctaUrl)}" placeholder="https://..."/>`)}
      </div>
      ${fieldRow("Okładka / zdjęcie (upload)", `<input id="ed_hero_image" type="file" accept="image/*"/>`,
        "Upload działa w podglądzie. Do eksportu ZIP będziemy dokładać assets w kolejnej iteracji, jeśli chcesz.")}
      <div class="hint">
        HERO to Twój start. Tu ma być najważniejsze: kim jesteś i dokąd kliknąć.
      </div>
    `;
  }

  if (def.editor === "text") {
    const text = cfg.data.text ?? "";
    specific = fieldRow("Treść", `<textarea id="ed_text" rows="7" placeholder="Napisz krótko: co robisz, styl, w czym jesteś najlepszy…">${escapeHtml(text)}</textarea>`);
  }

  if (def.editor === "gallery") {
    const layout = cfg.data.layout ?? "grid";
    const thumbs = assets.galleryImages.length
      ? `<div class="hint">Wgrane zdjęcia: ${assets.galleryImages.length} (kliknij usuń w razie czego)</div>
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

  if (def.editor === "spotify") {
    cfg.data.urls = Array.isArray(cfg.data.urls) ? cfg.data.urls : [];
    specific = renderUrlListUI(
      cfg.data.urls,
      "urls",
      "Wklej link do open.spotify.com (track/album/artist/playlist). Generator sam zrobi iframe."
    );
  }

  if (def.editor === "youtube") {
    cfg.data.urls = Array.isArray(cfg.data.urls) ? cfg.data.urls : [];
    specific = renderUrlListUI(
      cfg.data.urls,
      "urls",
      "Wklej link YouTube (watch?v=…, youtu.be/…, playlist z list=…). Generator sam zrobi iframe."
    );
  }

  if (def.editor === "events") {
    cfg.data.items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const schema = [
      { key: "date", label: "Data", type: "date", placeholder: "YYYY-MM-DD" },
      { key: "city", label: "Miasto", type: "text", placeholder: "Kraków" },
      { key: "place", label: "Miejsce", type: "text", placeholder: "Klub / galeria" },
      { key: "link", label: "Link", type: "url", placeholder: "https://..." },
    ];
    specific = renderListItemsUI(cfg.data.items, schema, id, "items", "Wydarzenie");
  }

  if (def.editor === "projects") {
    cfg.data.items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const schema = [
      { key: "title", label: "Tytuł", type: "text", placeholder: "Projekt / realizacja" },
      { key: "link", label: "Link", type: "url", placeholder: "https://..." },
      { key: "desc", label: "Opis", type: "textarea", placeholder: "1–3 zdania: co i dla kogo." },
      { key: "tags", label: "Tagi", type: "text", placeholder: "np. okładki, identyfikacja, live" },
    ];
    specific = renderListItemsUI(cfg.data.items, schema, id, "items", "Projekt");
  }

  if (def.editor === "services") {
    cfg.data.items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const schema = [
      { key: "name", label: "Usługa", type: "text", placeholder: "np. Sesja zdjęciowa / okładka / klip" },
      { key: "price", label: "Cena (opcjonalnie)", type: "text", placeholder: "od 500 zł" },
      { key: "desc", label: "Opis", type: "textarea", placeholder: "Konkretnie: co zawiera i jak wygląda proces." },
    ];
    specific = renderListItemsUI(cfg.data.items, schema, id, "items", "Usługa");
  }

  if (def.editor === "simpleList") {
    cfg.data.items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const schema = [
      { key: "text", label: "Wpis", type: "text", placeholder: "np. Nike / Vogue / Wyróżnienie..." },
      { key: "link", label: "Link (opcjonalnie)", type: "url", placeholder: "https://..." },
    ];
    specific = renderListItemsUI(cfg.data.items, schema, id, "items", "Wpis");
  }

  if (def.editor === "publications") {
    cfg.data.items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const schema = [
      { key: "title", label: "Tytuł", type: "text", placeholder: "Tytuł książki / tekstu" },
      { key: "year", label: "Rok", type: "text", placeholder: "2025" },
      { key: "url", label: "Link", type: "url", placeholder: "https://..." },
      { key: "where", label: "Gdzie opublikowano", type: "text", placeholder: "Wydawnictwo / magazyn" },
    ];
    specific = renderListItemsUI(cfg.data.items, schema, id, "items", "Publikacja");
  }

  if (def.editor === "testimonials") {
    cfg.data.items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const schema = [
      { key: "quote", label: "Cytat", type: "textarea", placeholder: "Krótko. Mocno. Bez lania wody." },
      { key: "who", label: "Autor / źródło", type: "text", placeholder: "Imię / firma / media" },
      { key: "link", label: "Link (opcjonalnie)", type: "url", placeholder: "https://..." },
    ];
    specific = renderListItemsUI(cfg.data.items, schema, id, "items", "Opinia");
  }

  if (def.editor === "products") {
    cfg.data.items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const schema = [
      { key: "name", label: "Produkt", type: "text", placeholder: "Koszulka / print / płyta" },
      { key: "price", label: "Cena", type: "text", placeholder: "99 zł" },
      { key: "url", label: "Link", type: "url", placeholder: "https://..." },
      { key: "note", label: "Opis (opcjonalnie)", type: "textarea", placeholder: "Warianty, rozmiary, itp." },
    ];
    specific = renderListItemsUI(cfg.data.items, schema, id, "items", "Produkt");
  }

  if (def.editor === "newsletter") {
    cfg.data.title = cfg.data.title ?? "Zapisz się";
    cfg.data.desc = cfg.data.desc ?? "Dostaniesz nowe prace / premiery / terminy jako pierwszy.";
    cfg.data.btn = cfg.data.btn ?? "Dołącz";
    cfg.data.url = cfg.data.url ?? "";
    specific = `
      ${fieldRow("Tytuł", `<input id="ed_news_title" type="text" value="${escapeHtml(cfg.data.title)}"/>`)}
      ${fieldRow("Opis", `<textarea id="ed_news_desc" rows="4">${escapeHtml(cfg.data.desc)}</textarea>`)}
      <div class="grid2">
        ${fieldRow("Tekst przycisku", `<input id="ed_news_btn" type="text" value="${escapeHtml(cfg.data.btn)}"/>`)}
        ${fieldRow("Link do zapisu", `<input id="ed_news_url" type="url" value="${escapeHtml(cfg.data.url)}" placeholder="np. link do MailerLite/Substack/Google Form…"/>`)}
      </div>
      <div class="hint">Bez backendu najprościej: link do zewnętrznego formularza.</div>
    `;
  }

  if (def.editor === "epk") {
    cfg.data.shortBio = cfg.data.shortBio ?? "";
    cfg.data.longBio = cfg.data.longBio ?? "";
    cfg.data.pressLinks = Array.isArray(cfg.data.pressLinks) ? cfg.data.pressLinks : [];
    cfg.data.downloadLinks = Array.isArray(cfg.data.downloadLinks) ? cfg.data.downloadLinks : [];

    const pressSchema = [
      { key: "name", label: "Nazwa", type: "text", placeholder: "Wywiad / recenzja / artykuł" },
      { key: "url", label: "Link", type: "url", placeholder: "https://..." },
    ];
    const downSchema = [
      { key: "name", label: "Nazwa pliku", type: "text", placeholder: "Presspack PDF / Logo pack" },
      { key: "url", label: "Link do pobrania", type: "url", placeholder: "https://..." },
    ];

    const epkThumbs = assets.epkImages.length
      ? `<div class="hint">Zdjęcia prasowe: ${assets.epkImages.length}</div>
         <div class="itemList">
            ${assets.epkImages.map((_, i) => `
              <div class="itemCard">
                <div class="itemCardTop">
                  <strong>Press photo #${i+1}</strong>
                  <button class="btnSmall" type="button" data-remove-epkphoto="${i}">Usuń</button>
                </div>
              </div>
            `).join("")}
         </div>`
      : `<div class="hint">Brak zdjęć prasowych. Wgraj poniżej.</div>`;

    const epkFiles = assets.epkFiles.length
      ? `<div class="hint">Pliki upload (podgląd):</div>
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
      : `<div class="hint">Możesz wrzucić PDF presspack itd. (to jest podgląd w generatorze).</div>`;

    specific = `
      ${fieldRow("Bio krótkie", `<textarea id="ed_epk_short" rows="4" placeholder="2–4 zdania">${escapeHtml(cfg.data.shortBio)}</textarea>`)}
      ${fieldRow("Bio długie", `<textarea id="ed_epk_long" rows="7" placeholder="Konkretnie: styl, osiągnięcia, gdzie grane/publikowane…">${escapeHtml(cfg.data.longBio)}</textarea>`)}
      <div class="hint">Press linki</div>
      ${renderListItemsUI(cfg.data.pressLinks, pressSchema, id, "pressLinks", "Link")}
      <div class="hint">Pliki do pobrania (linki)</div>
      ${renderListItemsUI(cfg.data.downloadLinks, downSchema, id, "downloadLinks", "Plik")}

      ${fieldRow("Zdjęcia prasowe (upload)", `<input id="ed_epk_images" type="file" accept="image/*" multiple />`)}
      ${epkThumbs}

      ${fieldRow("Pliki (upload)", `<input id="ed_epk_files" type="file" multiple />`,
        "Upload nie wchodzi do HTML-a automatycznie. Jeśli chcesz pełny eksport z assetami, dorobimy ZIP z folderem /assets.")}
      ${epkFiles}
    `;
  }

  if (def.editor === "contact") {
    cfg.data.email = cfg.data.email ?? "";
    cfg.data.phone = cfg.data.phone ?? "";
    cfg.data.booking = cfg.data.booking ?? "";
    cfg.data.city = cfg.data.city ?? "";
    specific = `
      <div class="grid2">
        ${fieldRow("Email", `<input id="ed_ct_email" type="email" value="${escapeHtml(cfg.data.email)}" placeholder="kontakt@..."/>`)}
        ${fieldRow("Telefon", `<input id="ed_ct_phone" type="tel" value="${escapeHtml(cfg.data.phone)}" placeholder="+48..."/>`)}
      </div>
      <div class="grid2">
        ${fieldRow("Booking/management", `<input id="ed_ct_booking" type="email" value="${escapeHtml(cfg.data.booking)}" placeholder="booking@..."/>`)}
        ${fieldRow("Miasto", `<input id="ed_ct_city" type="text" value="${escapeHtml(cfg.data.city)}" placeholder="Kraków"/>`)}
      </div>
      <div class="hint">
        Prosto i klasycznie: mail/telefon. Formularze bez backendu robią więcej problemów niż pożytku.
      </div>
    `;
  }

  if (def.editor === "social") {
    cfg.data.instagram = cfg.data.instagram ?? "";
    cfg.data.facebook = cfg.data.facebook ?? "";
    cfg.data.youtube = cfg.data.youtube ?? "";
    cfg.data.spotify = cfg.data.spotify ?? "";
    cfg.data.tiktok = cfg.data.tiktok ?? "";
    cfg.data.portfolio = cfg.data.portfolio ?? "";

    specific = `
      <div class="grid2">
        ${fieldRow("Instagram", `<input id="ed_soc_instagram" type="url" value="${escapeHtml(cfg.data.instagram)}" placeholder="https://instagram.com/..."/>`)}
        ${fieldRow("YouTube", `<input id="ed_soc_youtube" type="url" value="${escapeHtml(cfg.data.youtube)}" placeholder="https://youtube.com/..."/>`)}
      </div>
      <div class="grid2">
        ${fieldRow("Facebook", `<input id="ed_soc_facebook" type="url" value="${escapeHtml(cfg.data.facebook)}" placeholder="https://facebook.com/..."/>`)}
        ${fieldRow("Spotify/Bandcamp", `<input id="ed_soc_spotify" type="url" value="${escapeHtml(cfg.data.spotify)}" placeholder="https://open.spotify.com/..."/>`)}
      </div>
      <div class="grid2">
        ${fieldRow("TikTok", `<input id="ed_soc_tiktok" type="url" value="${escapeHtml(cfg.data.tiktok)}" placeholder="https://tiktok.com/@..."/>`)}
        ${fieldRow("Portfolio (Behance / własna)", `<input id="ed_soc_portfolio" type="url" value="${escapeHtml(cfg.data.portfolio)}" placeholder="https://..."/>`)}
      </div>
    `;
  }

  host.innerHTML = commonTitle + specific;

  // bind common title
  $("ed_title")?.addEventListener("input", () => {
    cfg.title = $("ed_title").value;
    renderAll(true);
  });

  // bind per editor
  bindBlockEditorEvents(id);
}

function bindBlockEditorEvents(blockId) {
  const cfg = ensureBlock(blockId);
  const def = BLOCKS[blockId];

  // HERO
  if (def.editor === "hero") {
    $("ed_hero_headline")?.addEventListener("input", () => { cfg.data.headline = $("ed_hero_headline").value; renderAll(true); });
    $("ed_hero_sub")?.addEventListener("input", () => { cfg.data.subheadline = $("ed_hero_sub").value; renderAll(true); });
    $("ed_hero_cta_text")?.addEventListener("input", () => { cfg.data.primaryCtaText = $("ed_hero_cta_text").value; renderAll(true); });
    $("ed_hero_cta_target")?.addEventListener("change", () => {
      cfg.data.primaryCtaTarget = $("ed_hero_cta_target").value;
      const show = cfg.data.primaryCtaTarget === "custom";
      const wrap = document.getElementById("heroCustomUrlWrap");
      if (wrap) wrap.style.display = show ? "block" : "none";
      renderAll(true);
    });
    $("ed_hero_cta_url")?.addEventListener("input", () => { cfg.data.primaryCtaUrl = $("ed_hero_cta_url").value; renderAll(true); });

    $("ed_hero_image")?.addEventListener("change", async () => {
      assets.heroDataUrl = await readFileAsDataUrl($("ed_hero_image").files[0]);
      renderAll(false);
    });
  }

  // TEXT
  if (def.editor === "text") {
    $("ed_text")?.addEventListener("input", () => { cfg.data.text = $("ed_text").value; renderAll(true); });
  }

  // GALLERY
  if (def.editor === "gallery") {
    $("ed_gallery_layout")?.addEventListener("change", () => { cfg.data.layout = $("ed_gallery_layout").value; renderAll(true); });
    $("ed_gallery_upload")?.addEventListener("change", async () => {
      const added = await readMultipleImages($("ed_gallery_upload").files);
      assets.galleryImages = [...assets.galleryImages, ...added];
      renderAll(false);
    });

    document.querySelectorAll("[data-remove-gallery]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-remove-gallery"));
        assets.galleryImages.splice(idx, 1);
        renderAll(false);
      });
    });
  }

  // EPK uploads remove
  if (def.editor === "epk") {
    $("ed_epk_short")?.addEventListener("input", () => { cfg.data.shortBio = $("ed_epk_short").value; renderAll(true); });
    $("ed_epk_long")?.addEventListener("input", () => { cfg.data.longBio = $("ed_epk_long").value; renderAll(true); });

    $("ed_epk_images")?.addEventListener("change", async () => {
      const added = await readMultipleImages($("ed_epk_images").files);
      assets.epkImages = [...assets.epkImages, ...added];
      renderAll(false);
    });

    $("ed_epk_files")?.addEventListener("change", () => {
      const files = Array.from($("ed_epk_files").files || []);
      assets.epkFiles.forEach(f => { try { URL.revokeObjectURL(f.url); } catch {} });
      assets.epkFiles = files.map(f => ({ name: f.name, type: f.type || "", url: URL.createObjectURL(f) }));
      renderAll(false);
    });

    document.querySelectorAll("[data-remove-epkphoto]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-remove-epkphoto"));
        assets.epkImages.splice(idx, 1);
        renderAll(false);
      });
    });

    document.querySelectorAll("[data-remove-epkfile]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-remove-epkfile"));
        const f = assets.epkFiles[idx];
        if (f?.url) { try { URL.revokeObjectURL(f.url); } catch {} }
        assets.epkFiles.splice(idx, 1);
        renderAll(false);
      });
    });
  }

  // Contact
  if (def.editor === "contact") {
    $("ed_ct_email")?.addEventListener("input", () => { cfg.data.email = $("ed_ct_email").value; renderAll(true); });
    $("ed_ct_phone")?.addEventListener("input", () => { cfg.data.phone = $("ed_ct_phone").value; renderAll(true); });
    $("ed_ct_booking")?.addEventListener("input", () => { cfg.data.booking = $("ed_ct_booking").value; renderAll(true); });
    $("ed_ct_city")?.addEventListener("input", () => { cfg.data.city = $("ed_ct_city").value; renderAll(true); });
  }

  // Social
  if (def.editor === "social") {
    $("ed_soc_instagram")?.addEventListener("input", () => { cfg.data.instagram = $("ed_soc_instagram").value; renderAll(true); });
    $("ed_soc_youtube")?.addEventListener("input", () => { cfg.data.youtube = $("ed_soc_youtube").value; renderAll(true); });
    $("ed_soc_facebook")?.addEventListener("input", () => { cfg.data.facebook = $("ed_soc_facebook").value; renderAll(true); });
    $("ed_soc_spotify")?.addEventListener("input", () => { cfg.data.spotify = $("ed_soc_spotify").value; renderAll(true); });
    $("ed_soc_tiktok")?.addEventListener("input", () => { cfg.data.tiktok = $("ed_soc_tiktok").value; renderAll(true); });
    $("ed_soc_portfolio")?.addEventListener("input", () => { cfg.data.portfolio = $("ed_soc_portfolio").value; renderAll(true); });
  }

  // Newsletter
  if (def.editor === "newsletter") {
    $("ed_news_title")?.addEventListener("input", () => { cfg.data.title = $("ed_news_title").value; renderAll(true); });
    $("ed_news_desc")?.addEventListener("input", () => { cfg.data.desc = $("ed_news_desc").value; renderAll(true); });
    $("ed_news_btn")?.addEventListener("input", () => { cfg.data.btn = $("ed_news_btn").value; renderAll(true); });
    $("ed_news_url")?.addEventListener("input", () => { cfg.data.url = $("ed_news_url").value; renderAll(true); });
  }

  // Generic list editor events (add/remove + input)
  const editor = $("blockEditor");
  editor.querySelectorAll("[data-add-item]").forEach(btn => {
    btn.addEventListener("click", () => {
      const listKey = btn.getAttribute("data-add-item");
      cfg.data[listKey] = Array.isArray(cfg.data[listKey]) ? cfg.data[listKey] : [];
      cfg.data[listKey].push({});
      renderAll(true);
    });
  });

  editor.querySelectorAll("[data-remove-item]").forEach(btn => {
    btn.addEventListener("click", () => {
      const listKey = btn.getAttribute("data-remove-item");
      const idx = Number(btn.getAttribute("data-index"));
      cfg.data[listKey] = Array.isArray(cfg.data[listKey]) ? cfg.data[listKey] : [];
      cfg.data[listKey].splice(idx, 1);
      renderAll(true);
    });
  });

  // inputs inside list cards
  editor.querySelectorAll("[data-field]").forEach(input => {
    input.addEventListener("input", () => {
      const path = input.getAttribute("data-field"); // e.g. items.0.date OR urls.1.url
      if (!path) return;

      const parts = path.split(".");
      const listKey = parts[0];
      const idx = Number(parts[1]);
      const key = parts[2];

      cfg.data[listKey] = Array.isArray(cfg.data[listKey]) ? cfg.data[listKey] : [];

      // url list special
      if (listKey === "urls" && key === "url") {
        cfg.data.urls[idx] = input.value;
        renderAll(true);
        return;
      }

      cfg.data[listKey][idx] = cfg.data[listKey][idx] || {};
      cfg.data[listKey][idx][key] = input.value;
      renderAll(true);
    });
  });
}

// ================== THEME + TEMPLATE (preview vars) ==================
function themeVars(theme, accent) {
  const a = accent || "#6d28d9";
  if (theme === "modern") {
    return {
      "--bg": "#070A0F",
      "--text": "#EAF0FF",
      "--muted": "rgba(234,240,255,.72)",
      "--card": "rgba(255,255,255,.06)",
      "--stroke": "rgba(255,255,255,.10)",
      "--accent": a,
      "--shadow": "0 20px 60px rgba(0,0,0,.55)"
    };
  }
  if (theme === "elegant") {
    return {
      "--bg": "#0f0f12",
      "--text": "#f3f0ea",
      "--muted": "rgba(243,240,234,.72)",
      "--card": "rgba(255,255,255,.05)",
      "--stroke": "rgba(255,255,255,.12)",
      "--accent": a,
      "--shadow": "0 18px 55px rgba(0,0,0,.55)"
    };
  }
  return {
    "--bg": "#f7f7fb",
    "--text": "#101322",
    "--muted": "rgba(16,19,34,.70)",
    "--card": "#ffffff",
    "--stroke": "rgba(16,19,34,.10)",
    "--accent": a,
    "--shadow": "0 14px 40px rgba(16,19,34,.12)"
  };
}

function templateVars(templateKey) {
  const t = TEMPLATES[templateKey] || TEMPLATES.rounded;
  return t.vars || {};
}

function varsToCss(varsObj) {
  return Object.entries(varsObj).map(([k,v]) => `${k}:${v};`).join("");
}

// ================== PREVIEW RENDERERS ==================
function sectionHeaderClass() {
  return state.sectionHeadersAlign === "center" ? "card__head card__head--center" : "card__head";
}

function toEmbedList(blockId, urls) {
  const list = (urls || [])
    .map(u => String(u || "").trim())
    .filter(Boolean);

  if (blockId === "spotify") {
    return list.map(normalizeSpotifyUrl).filter(Boolean);
  }
  if (blockId === "youtube") {
    return list.map(normalizeYouTubeUrl).filter(Boolean);
  }
  return list;
}

function iconSvg(name) {
  const common = `fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
  if (name === "instagram") return `<svg viewBox="0 0 24 24" ${common}><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>`;
  if (name === "facebook") return `<svg viewBox="0 0 24 24" ${common}><path d="M14 8h3V5h-3c-2.2 0-4 1.8-4 4v3H7v3h3v6h3v-6h3l1-3h-4V9c0-.6.4-1 1-1z"/></svg>`;
  if (name === "youtube") return `<svg viewBox="0 0 24 24" ${common}><path d="M21 8s-.2-1.4-.8-2c-.8-.8-1.7-.8-2.1-.9C15.2 5 12 5 12 5h0s-3.2 0-6.1.1c-.4.1-1.3.1-2.1.9C3.2 6.6 3 8 3 8S2.8 9.6 2.8 11.2v1.5C2.8 14.4 3 16 3 16s.2 1.4.8 2c.8.8 1.9.8 2.4.9C7.9 19 12 19 12 19s3.2 0 6.1-.1c.4-.1 1.3-.1 2.1-.9.6-.6.8-2 .8-2s.2-1.6.2-3.3v-1.5C21.2 9.6 21 8 21 8z"/><path d="M10 15V9l6 3-6 3z"/></svg>`;
  if (name === "spotify") return `<svg viewBox="0 0 24 24" ${common}><circle cx="12" cy="12" r="9"/><path d="M8 11.5c2.9-1 5.9-.8 8.5.4"/><path d="M8.5 14c2.4-.7 4.9-.5 7 .3"/><path d="M9 16.3c1.9-.5 3.6-.4 5.2.2"/></svg>`;
  if (name === "tiktok") return `<svg viewBox="0 0 24 24" ${common}><path d="M14 3v10.2a4.8 4.8 0 1 1-3-4.5V5.2c.8 2.6 2.8 4.6 5.5 5.3"/></svg>`;
  return "";
}

function sectionCard(id, label, inner) {
  return `
    <section class="card" id="${id}">
      <div class="${sectionHeaderClass()}"><h2>${escapeHtml(label)}</h2></div>
      <div class="card__body">${inner}</div>
    </section>
  `;
}

// ================== HTML GENERATORS ==================
function baseCss(varsCss) {
  return `
  :root{${varsCss}}
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{
    margin:0;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
    background: var(--bg);
    color: var(--text);
    line-height:1.55;
    font-size: var(--body-size, 15px);
  }
  a{color:inherit}
  .wrap{max-width:1080px;margin:0 auto;padding:0 18px}
  .topbar{
    position: sticky; top:0; z-index:50;
    backdrop-filter: blur(10px);
    background: color-mix(in oklab, var(--bg) 78%, transparent);
    border-bottom: var(--stroke-w, 1px) solid var(--stroke);
  }
  .topbar__in{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0}
  .brand{display:flex;align-items:center;gap:10px;text-decoration:none}
  .mark{
    width:34px;height:34px;border-radius: 14px;
    background: radial-gradient(18px 18px at 30% 30%, color-mix(in oklab, var(--accent) 70%, white), var(--accent));
    box-shadow: var(--shadow);
  }
  nav{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}
  nav a{
    text-decoration:none;
    font-size:13px;
    color: var(--muted);
    padding:8px 10px;
    border-radius:999px;
    border: var(--stroke-w, 1px) solid transparent;
  }
  nav a:hover{
    color: var(--text);
    border-color: var(--stroke);
    background: color-mix(in oklab, var(--card) 65%, transparent);
  }

  .hero{padding:34px 0 18px}
  .hero__grid{display:grid;grid-template-columns: 1.2fr .8fr;gap:18px;align-items:stretch}
  .hero__copy{
    background: var(--card);
    border: var(--stroke-w, 1px) solid var(--stroke);
    border-radius: var(--rad-media, 22px);
    padding: var(--pad-card, 16px);
    box-shadow: var(--card-glow, var(--shadow));
  }
  .kicker{display:inline-flex;gap:8px;align-items:center;font-size:12px;color:var(--muted)}
  .dot{width:8px;height:8px;border-radius:50%;background: var(--accent)}
  h1{
    margin:10px 0 8px;
    font-size: clamp(26px, 3.2vw, 44px);
    line-height:1.1;
    font-weight: var(--h1-weight, 900);
  }
  h2{font-weight: var(--h2-weight, 900);}
  .sub{margin:0;color:var(--muted)}
  .hero__actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
  .btn{
    display:inline-flex;align-items:center;justify-content:center;gap:10px;
    border-radius: var(--rad-btn, 14px);
    padding: 10px 14px;
    border: var(--stroke-w, 1px) solid var(--stroke);
    background: color-mix(in oklab, var(--card) 70%, transparent);
    text-decoration:none;
    font-weight:900;
    font-size:14px;
  }
  .btn--primary{
    border-color: color-mix(in oklab, var(--accent) 55%, var(--stroke));
    background: linear-gradient(180deg, color-mix(in oklab, var(--accent) 70%, white), var(--accent));
    color: #fff;
  }
  .btn--ghost{opacity:.95}
  .btn[disabled], button[disabled]{opacity:.45;cursor:not-allowed}

  .hero__media{
    border-radius: var(--rad-media, 22px);
    border: var(--stroke-w, 1px) solid var(--stroke);
    background: color-mix(in oklab, var(--card) 70%, transparent);
    box-shadow: var(--card-glow, var(--shadow));
    overflow:hidden;
    display:flex;align-items:center;justify-content:center;
    position:relative;
    min-height: 240px;
  }
  .hero__media img{width:100%;height:100%;object-fit:cover;display:block}
  .hero__media--placeholder{flex-direction:column;gap:10px;color:var(--muted);font-size:13px}
  .ph{display:flex;gap:8px}
  .ph__dot{
    width:10px;height:10px;border-radius:50%;
    background: color-mix(in oklab, var(--accent) 55%, transparent);
    box-shadow: 0 0 0 6px color-mix(in oklab, var(--accent) 20%, transparent);
  }

  .main{padding: 6px 0 40px}
  .stack{display:grid;gap:14px}
  .card{
    background: var(--card);
    border: var(--stroke-w, 1px) solid var(--stroke);
    border-radius: var(--rad-card, 22px);
    box-shadow: var(--card-glow, var(--shadow));
    overflow:hidden;
  }
  .card__head{padding: 14px 16px;border-bottom: var(--stroke-w, 1px) solid var(--stroke)}
  .card__head--center{display:flex;justify-content:center;text-align:center}
  .card__head h2{margin:0;font-size:16px;letter-spacing:.2px}
  .card__body{padding: var(--pad-card, 16px)}
  .lead{margin:0}

  .muted{color: var(--muted)}
  .small{font-size:12px}
  .mini{margin:0 0 10px 0; font-size: 14px}

  .two{display:grid;grid-template-columns: 1fr 1.2fr;gap:14px;align-items:start}

  .gallery{display:grid;grid-template-columns: repeat(3, 1fr);gap:10px}
  .gallery--masonry{grid-auto-flow:dense}
  .shot{margin:0;border-radius: calc(var(--rad-card, 22px) - 6px);overflow:hidden;border: var(--stroke-w, 1px) solid var(--stroke);background: color-mix(in oklab, var(--card) 65%, transparent)}
  .shot img{width:100%;height:140px;object-fit:cover;display:block;transition:transform .25s ease}
  .shot:hover img{transform: scale(1.04)}
  .empty{border: var(--stroke-w, 1px) dashed var(--stroke);border-radius: calc(var(--rad-card, 22px) - 6px);padding: 14px;color: var(--muted);background: color-mix(in oklab, var(--card) 55%, transparent)}

  .embeds{display:grid;gap:10px}
  .embed{border: var(--stroke-w, 1px) solid var(--stroke);border-radius: calc(var(--rad-card, 22px) - 6px);overflow:hidden;background: color-mix(in oklab, var(--card) 55%, transparent)}
  .embed--video{position:relative;padding-top:56.25%}
  .embed--video iframe{position:absolute;inset:0;width:100%;height:100%}

  .cards{display:grid;grid-template-columns: repeat(2, 1fr);gap:10px}
  .xCard{border: var(--stroke-w, 1px) solid var(--stroke);border-radius: calc(var(--rad-card, 22px) - 4px);padding:12px;background: color-mix(in oklab, var(--card) 60%, transparent);display:grid;gap:8px}
  .xCard__top{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
  .link{color: color-mix(in oklab, var(--accent) 75%, var(--text)); text-decoration:none; font-weight: 900}
  .link:hover{text-decoration:underline}

  .social{display:grid;grid-template-columns: repeat(3, 1fr);gap:10px}
  .sBtn{display:flex;align-items:center;gap:10px;border: var(--stroke-w, 1px) solid var(--stroke);background: color-mix(in oklab, var(--card) 60%, transparent);border-radius: calc(var(--rad-card, 22px) - 6px);padding: 12px;text-decoration:none;font-weight:900;font-size:13px}
  .sBtn:hover{border-color: color-mix(in oklab, var(--accent) 45%, var(--stroke))}
  .sBtn__ic{width:34px;height:34px;border-radius:14px;display:grid;place-items:center;background: radial-gradient(16px 16px at 30% 30%, color-mix(in oklab, var(--accent) 60%, white), var(--accent));color:#fff}
  .sBtn__ic--plain{background: rgba(255,255,255,.08); color: var(--text)}
  .sBtn__ic svg{width:18px;height:18px}

  .footer{border-top: var(--stroke-w, 1px) solid var(--stroke);padding: 18px 0;color: var(--muted);font-size: 12px}

  @media (max-width: 920px){
    .hero__grid{grid-template-columns: 1fr}
    .two{grid-template-columns: 1fr}
    .gallery{grid-template-columns: 1fr 1fr}
    .cards{grid-template-columns: 1fr}
    .social{grid-template-columns: 1fr 1fr}
  }
  `;
}

function buildHeroHtml() {
  const hero = ensureBlock("hero").data;
  const siteName = escapeHtml(state.siteName);
  const headline = escapeHtml(hero.headline || state.siteName || "Portfolio");
  const subheadline = escapeHtml(hero.subheadline || "").replaceAll("\n","<br/>");
  const ctaText = escapeHtml(hero.primaryCtaText || "Zobacz");

  const enabledSections = state.order.filter(id => state.blocks[id]?.enabled && id !== "hero");
  const first = enabledSections[0] || "about";
  let ctaHref = `#${first}`;

  if (hero.primaryCtaTarget === "contact") ctaHref = "#contact";
  if (hero.primaryCtaTarget === "custom" && hero.primaryCtaUrl) ctaHref = hero.primaryCtaUrl;

  const heroVisual = assets.heroDataUrl
    ? `<div class="hero__media"><img src="${assets.heroDataUrl}" alt="Okładka" /></div>`
    : `<div class="hero__media hero__media--placeholder"><div class="ph"><div class="ph__dot"></div><div class="ph__dot"></div><div class="ph__dot"></div></div><span>Dodaj okładkę</span></div>`;

  return `
    <header class="hero" id="top">
      <div class="wrap hero__grid">
        <div class="hero__copy">
          <div class="kicker"><span class="dot"></span><span>Oficjalna strona</span></div>
          <h1>${headline}</h1>
          <p class="sub">${subheadline}</p>
          <div class="hero__actions">
            <a class="btn btn--primary" href="${ctaHref}">${ctaText}</a>
            <a class="btn btn--ghost" href="#contact">Kontakt</a>
          </div>
        </div>
        ${heroVisual}
      </div>
    </header>
  `;
}

function renderBlockToHtml(blockId) {
  const cfg = ensureBlock(blockId);
  const title = cfg.title || BLOCKS[blockId].label;

  if (blockId === "about") {
    const txt = escapeHtml(cfg.data.text || "Napisz krótko kim jesteś i co tworzysz.").replaceAll("\n","<br/>");
    return sectionCard(blockId, title, `<p class="lead">${txt}</p>`);
  }

  if (blockId === "gallery") {
    const layout = cfg.data.layout || "grid";
    const imgs = assets.galleryImages;
    const html = imgs.length
      ? `<div class="gallery ${layout === "masonry" ? "gallery--masonry" : ""}">
          ${imgs.map((u, i) => `<figure class="shot"><img src="${u}" alt="Praca ${i+1}"></figure>`).join("")}
         </div>`
      : `<div class="empty">Wgraj zdjęcia w bloku Galeria.</div>`;
    return sectionCard(blockId, title, html);
  }

  if (blockId === "spotify") {
    const srcs = toEmbedList("spotify", cfg.data.urls || []);
    const html = srcs.length
      ? `<div class="embeds">
          ${srcs.map(src => `
            <div class="embed">
              <iframe style="border-radius:16px" src="${escapeHtml(src)}" width="100%" height="152" frameborder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
            </div>
          `).join("")}
         </div>`
      : `<div class="empty">Dodaj link Spotify.</div>`;
    return sectionCard(blockId, title, html);
  }

  if (blockId === "youtube") {
    const srcs = toEmbedList("youtube", cfg.data.urls || []);
    const html = srcs.length
      ? `<div class="embeds">
          ${srcs.map(src => `
            <div class="embed embed--video">
              <iframe src="${escapeHtml(src)}" title="YouTube" frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen loading="lazy"></iframe>
            </div>
          `).join("")}
         </div>`
      : `<div class="empty">Dodaj link YouTube.</div>`;
    return sectionCard(blockId, title, html);
  }

  if (blockId === "events" || blockId === "exhibitions") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const cards = items.length
      ? `<div class="cards">
          ${items.map(e => `
            <div class="xCard">
              <div class="xCard__top">
                <strong>${escapeHtml(e.date || "—")} • ${escapeHtml(e.city || "")}</strong>
                ${e.link ? `<a class="link" href="${escapeHtml(e.link)}" target="_blank" rel="noopener">Info</a>` : `<span class="muted small">—</span>`}
              </div>
              <div class="muted">${escapeHtml(e.place || "")}</div>
            </div>
          `).join("")}
        </div>`
      : `<div class="empty">Dodaj wydarzenia.</div>`;
    return sectionCard(blockId, title, cards);
  }

  if (blockId === "projects" || blockId === "caseStudies") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const cards = items.length
      ? `<div class="cards">
          ${items.map(p => `
            <div class="xCard">
              <div class="xCard__top">
                <strong>${escapeHtml(p.title || "Projekt")}</strong>
                ${p.link ? `<a class="link" href="${escapeHtml(p.link)}" target="_blank" rel="noopener">Link</a>` : `<span class="muted small">—</span>`}
              </div>
              ${p.desc ? `<div class="muted">${escapeHtml(p.desc)}</div>` : ""}
              ${p.tags ? `<div class="muted small">${escapeHtml(p.tags)}</div>` : ""}
            </div>
          `).join("")}
        </div>`
      : `<div class="empty">Dodaj projekty.</div>`;
    return sectionCard(blockId, title, cards);
  }

  if (blockId === "services") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const cards = items.length
      ? `<div class="cards">
          ${items.map(s => `
            <div class="xCard">
              <div class="xCard__top">
                <strong>${escapeHtml(s.name || "Usługa")}</strong>
                <span class="muted small">${escapeHtml(s.price || "")}</span>
              </div>
              ${s.desc ? `<div class="muted">${escapeHtml(s.desc)}</div>` : ""}
            </div>
          `).join("")}
        </div>`
      : `<div class="empty">Dodaj usługi.</div>`;
    return sectionCard(blockId, title, cards);
  }

  if (blockId === "clients" || blockId === "awards") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const html = items.length
      ? `<div class="cards">
          ${items.map(it => `
            <div class="xCard">
              <div class="xCard__top">
                <strong>${escapeHtml(it.text || "—")}</strong>
                ${it.link ? `<a class="link" href="${escapeHtml(it.link)}" target="_blank" rel="noopener">Link</a>` : `<span class="muted small"> </span>`}
              </div>
            </div>
          `).join("")}
        </div>`
      : `<div class="empty">Dodaj wpisy.</div>`;
    return sectionCard(blockId, title, html);
  }

  if (blockId === "publications") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const html = items.length
      ? `<div class="cards">
          ${items.map(p => `
            <div class="xCard">
              <div class="xCard__top">
                <strong>${escapeHtml(p.title || "Publikacja")}</strong>
                ${p.url ? `<a class="link" href="${escapeHtml(p.url)}" target="_blank" rel="noopener">Czytaj</a>` : `<span class="muted small">—</span>`}
              </div>
              <div class="muted small">${escapeHtml([p.where, p.year].filter(Boolean).join(" • "))}</div>
            </div>
          `).join("")}
        </div>`
      : `<div class="empty">Dodaj publikacje.</div>`;
    return sectionCard(blockId, title, html);
  }

  if (blockId === "testimonials") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const html = items.length
      ? `<div class="cards">
          ${items.map(t => `
            <div class="xCard">
              <div class="muted">„${escapeHtml(t.quote || "")}”</div>
              <div class="xCard__top" style="margin-top:10px;">
                <strong>${escapeHtml(t.who || "—")}</strong>
                ${t.link ? `<a class="link" href="${escapeHtml(t.link)}" target="_blank" rel="noopener">Źródło</a>` : `<span class="muted small"> </span>`}
              </div>
            </div>
          `).join("")}
        </div>`
      : `<div class="empty">Dodaj opinie.</div>`;
    return sectionCard(blockId, title, html);
  }

  if (blockId === "shop") {
    const items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    const html = items.length
      ? `<div class="cards">
          ${items.map(p => `
            <div class="xCard">
              <div class="xCard__top">
                <strong>${escapeHtml(p.name || "Produkt")}</strong>
                <span class="muted small">${escapeHtml(p.price || "")}</span>
              </div>
              ${p.note ? `<div class="muted">${escapeHtml(p.note)}</div>` : ""}
              ${p.url ? `<div style="margin-top:10px;"><a class="btn btn--primary" href="${escapeHtml(p.url)}" target="_blank" rel="noopener">Kup</a></div>` : ""}
            </div>
          `).join("")}
        </div>`
      : `<div class="empty">Dodaj produkty.</div>`;
    return sectionCard(blockId, title, html);
  }

  if (blockId === "newsletter") {
    const t = escapeHtml(cfg.data.title || "Zapisz się");
    const d = escapeHtml(cfg.data.desc || "").replaceAll("\n","<br/>");
    const b = escapeHtml(cfg.data.btn || "Dołącz");
    const u = cfg.data.url ? escapeHtml(cfg.data.url) : "";
    const btn = u ? `<a class="btn btn--primary" href="${u}" target="_blank" rel="noopener">${b}</a>` : `<a class="btn btn--ghost" href="#contact">Kontakt</a>`;
    const html = `
      <div class="xCard">
        <div class="xCard__top"><strong>${t}</strong></div>
        <div class="muted">${d}</div>
        <div style="margin-top:12px;">${btn}</div>
      </div>
    `;
    return sectionCard(blockId, title, html);
  }

  if (blockId === "epk") {
    const shortBio = escapeHtml(cfg.data.shortBio || "").replaceAll("\n","<br/>");
    const longBio = escapeHtml(cfg.data.longBio || "").replaceAll("\n","<br/>");

    const press = Array.isArray(cfg.data.pressLinks) ? cfg.data.pressLinks : [];
    const down = Array.isArray(cfg.data.downloadLinks) ? cfg.data.downloadLinks : [];

    const pressHtml = press.length
      ? press.map(p => `<a class="link" href="${escapeHtml(p.url||"#")}" target="_blank" rel="noopener">${escapeHtml(p.name||"Link")}</a>`).join("<br/>")
      : `<span class="muted">Brak linków.</span>`;

    const downHtml = down.length
      ? down.map(d => `<a class="link" href="${escapeHtml(d.url||"#")}" target="_blank" rel="noopener">${escapeHtml(d.name||"Plik")}</a>`).join("<br/>")
      : `<span class="muted">Brak plików.</span>`;

    const photosHtml = assets.epkImages.length
      ? `<div class="gallery">${assets.epkImages.map((u,i)=>`<figure class="shot"><img src="${u}" alt="Press ${i+1}"></figure>`).join("")}</div>`
      : `<div class="empty">Wgraj zdjęcia prasowe w EPK.</div>`;

    const html = `
      <div class="two">
        <div>
          <div class="xCard">
            <div class="xCard__top"><strong>Bio krótkie</strong></div>
            <div class="muted">${shortBio || "—"}</div>
          </div>
          <div class="xCard" style="margin-top:10px;">
            <div class="xCard__top"><strong>Bio długie</strong></div>
            <div class="muted">${longBio || "—"}</div>
          </div>
          <div class="xCard" style="margin-top:10px;">
            <div class="xCard__top"><strong>Press</strong></div>
            <div class="muted">${pressHtml}</div>
          </div>
          <div class="xCard" style="margin-top:10px;">
            <div class="xCard__top"><strong>Pliki</strong></div>
            <div class="muted">${downHtml}</div>
          </div>
        </div>
        <div>
          <div class="xCard">
            <div class="xCard__top"><strong>Zdjęcia prasowe</strong></div>
            ${photosHtml}
          </div>
        </div>
      </div>
    `;
    return sectionCard(blockId, title, html);
  }

  if (blockId === "contact") {
    const email = cfg.data.email || "";
    const phone = cfg.data.phone || "";
    const booking = cfg.data.booking || "";
    const city = cfg.data.city || "";

    const mailto = email ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent("Kontakt / współpraca")}` : "";
    const bookingMailto = booking ? `mailto:${encodeURIComponent(booking)}?subject=${encodeURIComponent("Booking / współpraca")}` : "";

    const html = `
      <div class="cards">
        <div class="xCard">
          <div class="xCard__top"><strong>Email</strong><span class="muted small">${escapeHtml(email || "—")}</span></div>
          <div style="margin-top:10px;">
            ${email ? `<a class="btn btn--primary" href="${mailto}">Napisz</a>` : `<span class="muted">Dodaj email w edytorze.</span>`}
          </div>
        </div>
        <div class="xCard">
          <div class="xCard__top"><strong>Booking</strong><span class="muted small">${escapeHtml(booking || "—")}</span></div>
          <div style="margin-top:10px;">
            ${booking ? `<a class="btn btn--ghost" href="${bookingMailto}">Booking</a>` : `<span class="muted">Opcjonalnie.</span>`}
          </div>
        </div>
        <div class="xCard">
          <div class="xCard__top"><strong>Telefon</strong><span class="muted small">${escapeHtml(phone || "—")}</span></div>
          ${city ? `<div class="muted small" style="margin-top:8px;">${escapeHtml(city)}</div>` : ""}
        </div>
      </div>
    `;
    return sectionCard(blockId, title, html);
  }

  if (blockId === "social") {
    const d = cfg.data || {};
    const links = [
      d.instagram ? { name:"Instagram", href:d.instagram, icon:"instagram" } : null,
      d.facebook ? { name:"Facebook", href:d.facebook, icon:"facebook" } : null,
      d.youtube ? { name:"YouTube", href:d.youtube, icon:"youtube" } : null,
      d.spotify ? { name:"Spotify/Bandcamp", href:d.spotify, icon:"spotify" } : null,
      d.tiktok ? { name:"TikTok", href:d.tiktok, icon:"tiktok" } : null,
      d.portfolio ? { name:"Portfolio", href:d.portfolio, icon:"" } : null,
    ].filter(Boolean);

    const html = links.length
      ? `<div class="social">
          ${links.map(l => `
            <a class="sBtn" href="${escapeHtml(l.href)}" target="_blank" rel="noopener">
              ${l.icon ? `<span class="sBtn__ic">${iconSvg(l.icon)}</span>` : `<span class="sBtn__ic sBtn__ic--plain">↗</span>`}
              <span>${escapeHtml(l.name)}</span>
            </a>
          `).join("")}
         </div>`
      : `<div class="empty">Dodaj linki social.</div>`;

    return sectionCard(blockId, title, html);
  }

  return sectionCard(blockId, title, `<div class="empty">Ten blok nie ma jeszcze renderera.</div>`);
}

function generateSinglePageHtml() {
  const vars = { ...themeVars(state.theme, state.accent), ...templateVars(state.template) };
  const varsCss = varsToCss(vars);

  const siteName = escapeHtml(state.siteName || "Artysta");
  const enabled = state.order.filter(id => state.blocks[id]?.enabled);

  // nav anchors exclude hero
  const navItems = enabled
    .filter(id => id !== "hero")
    .map(id => `<a href="#${id}">${escapeHtml(state.blocks[id].title || BLOCKS[id].label)}</a>`)
    .join("");

  const blocksHtml = enabled
    .filter(id => id !== "hero")
    .map(id => renderBlockToHtml(id))
    .join("");

  const heroHtml = buildHeroHtml();

  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${siteName}</title>
<style>${baseCss(varsCss)}</style>
</head>
<body>
  <div class="topbar">
    <div class="wrap">
      <div class="topbar__in">
        <a class="brand" href="#top"><span class="mark" aria-hidden="true"></span><div><b>${siteName}</b></div></a>
        <nav aria-label="Nawigacja">${navItems}</nav>
      </div>
    </div>
  </div>

  ${heroHtml}

  <main class="main">
    <div class="wrap">
      <div class="stack">
        ${blocksHtml || `<div class="card"><div class="card__body"><p class="muted">Włącz bloki i dodaj treści.</p></div></div>`}
      </div>
    </div>
  </main>

  <footer class="footer">
    <div class="wrap" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <span>© ${new Date().getFullYear()} ${siteName}</span>
      <span>HTML/CSS • GitHub Pages friendly</span>
    </div>
  </footer>
</body>
</html>`;
}

// ZIP mode: proste, sensowne grupowanie na podstrony
function getZipPages() {
  const enabled = state.order.filter(id => state.blocks[id]?.enabled);

  const has = (id) => enabled.includes(id);

  const pages = {};

  // index: hero + about (i ewentualnie contact jeśli ktoś ma tylko basics)
  pages["index.html"] = ["hero", ...(has("about") ? ["about"] : [])];

  // media
  const media = ["spotify","youtube"].filter(has);
  if (media.length) pages["media.html"] = media;

  // gallery
  const gal = ["gallery"].filter(has);
  if (gal.length) pages["gallery.html"] = gal;

  // work
  const work = ["projects","caseStudies"].filter(has);
  if (work.length) pages["work.html"] = work;

  // events
  const ev = ["events","exhibitions"].filter(has);
  if (ev.length) pages["events.html"] = ev;

  // publications
  const pub = ["publications"].filter(has);
  if (pub.length) pages["publications.html"] = pub;

  // info (services/clients/awards/testimonials/shop/newsletter)
  const info = ["services","clients","awards","testimonials","shop","newsletter"].filter(has);
  if (info.length) pages["info.html"] = info;

  // epk
  const epk = ["epk"].filter(has);
  if (epk.length) pages["epk.html"] = epk;

  // contact
  const contact = ["contact","social"].filter(has);
  if (contact.length) pages["contact.html"] = contact;

  return pages;
}

function buildMultiPageNav(currentFile, pages) {
  const entries = Object.keys(pages);
  const niceName = (file) => {
    const map = {
      "index.html": "Home",
      "media.html": "Media",
      "gallery.html": "Galeria",
      "work.html": "Prace",
      "events.html": "Wydarzenia",
      "publications.html": "Publikacje",
      "info.html": "Info",
      "epk.html": "EPK",
      "contact.html": "Kontakt",
    };
    return map[file] || file;
  };

  return entries.map(file => {
    const label = niceName(file);
    const href = file;
    return `<a href="${href}" ${file===currentFile ? 'style="color:var(--text);border-color:var(--stroke);"' : ""}>${escapeHtml(label)}</a>`;
  }).join("");
}

function generateZipFiles() {
  const vars = { ...themeVars(state.theme, state.accent), ...templateVars(state.template) };
  const varsCss = varsToCss(vars);
  const siteName = escapeHtml(state.siteName || "Artysta");

  const pages = getZipPages();

  const files = {};
  for (const [file, blockIds] of Object.entries(pages)) {
    const nav = buildMultiPageNav(file, pages);

    const isIndex = file === "index.html";
    const heroHtml = isIndex ? buildHeroHtml() : `
      <header class="hero" id="top">
        <div class="wrap">
          <div class="hero__copy">
            <div class="kicker"><span class="dot"></span><span>${siteName}</span></div>
            <h1>${escapeHtml(file.replace(".html","").toUpperCase())}</h1>
            <p class="sub">Podstrona wygenerowana z Twoich bloków.</p>
          </div>
        </div>
      </header>
    `;

    const contentBlocks = blockIds
      .filter(id => id !== "hero")
      .map(id => renderBlockToHtml(id))
      .join("") || `<div class="card"><div class="card__body"><p class="muted">Brak treści.</p></div></div>`;

    const html = `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${siteName}</title>
<style>${baseCss(varsCss)}</style>
</head>
<body>
  <div class="topbar">
    <div class="wrap">
      <div class="topbar__in">
        <a class="brand" href="index.html"><span class="mark" aria-hidden="true"></span><div><b>${siteName}</b></div></a>
        <nav aria-label="Nawigacja">${nav}</nav>
      </div>
    </div>
  </div>

  ${heroHtml}

  <main class="main">
    <div class="wrap">
      <div class="stack">${contentBlocks}</div>
    </div>
  </main>

  <footer class="footer">
    <div class="wrap" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <span>© ${new Date().getFullYear()} ${siteName}</span>
      <span>Multi-page ZIP • GitHub Pages friendly</span>
    </div>
  </footer>
</body>
</html>`;

    files[file] = html;
  }

  return files;
}

// ================== RENDER PIPELINE ==================
function syncFromFormToState() {
  state.exportMode = $("exportMode").value;
  state.livePreview = !!$("livePreview").checked;

  state.role = $("role").value;
  state.theme = $("theme").value;
  state.template = $("template").value;
  state.accent = $("accent").value;

  state.sectionHeadersAlign = $("sectionHeadersAlign").value;
  state.siteName = $("siteName").value;
}

let lastGeneratedHtml = "";

function renderPreview(force=false) {
  // if live disabled and not forced, do nothing
  if (!state.livePreview && !force) return;

  if (state.exportMode === "single") {
    lastGeneratedHtml = generateSinglePageHtml();
    $("previewFrame").srcdoc = lastGeneratedHtml;
  } else {
    // preview index.html of ZIP build
    const files = generateZipFiles();
    lastGeneratedHtml = files["index.html"] || Object.values(files)[0] || "";
    $("previewFrame").srcdoc = lastGeneratedHtml;
  }
}

function renderAll(shouldAutosave=true, forcePreview=false) {
  syncFromFormToState();
  setLiveStatus();

  renderAddBlockSelect();
  renderBlocksList();
  renderBlockEditor();

  renderPreview(forcePreview);

  if (shouldAutosave) saveDraft();
}

const renderAllDebounced = debounce(() => renderAll(true, false), 150);

// ================== ADD BLOCK ==================
function addBlock(blockId) {
  if (!blockId) return;
  ensureBlock(blockId).enabled = true;
  if (!state.order.includes(blockId)) state.order.push(blockId);
  hardLockHeroFirst();
  state.activeBlockId = blockId;
  renderAll(true, true);
}

// ================== DOWNLOAD ==================
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 600);
}

function downloadSingle() {
  const html = generateSinglePageHtml();
  downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), "index.html");
}

async function downloadZip() {
  if (typeof JSZip === "undefined") {
    alert("Brak JSZip. Podłącz CDN lub dodaj lokalny plik jszip.min.js.");
    return;
  }
  const zip = new JSZip();
  const files = generateZipFiles();
  Object.entries(files).forEach(([name, html]) => zip.file(name, html));

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, "site.zip");
}

// ================== INIT ==================
function bindGlobalInputs() {
  // export mode / live
  $("exportMode").addEventListener("change", () => renderAll(true, true));
  $("livePreview").addEventListener("change", () => {
    renderAll(true, true);
  });

  // role changes MUST auto-apply preset (Twoje wymaganie)
  $("role").addEventListener("change", () => {
    applyRolePreset($("role").value);
    renderAll(true, true);
  });

  ["theme","template","accent","sectionHeadersAlign","siteName"].forEach(id => {
    $(id).addEventListener(id === "theme" || id === "template" || id === "sectionHeadersAlign" ? "change" : "input", () => {
      renderAllDebounced();
    });
  });

  $("addBlockBtn").addEventListener("click", () => addBlock($("addBlockSelect").value));

  $("btnReset").addEventListener("click", resetDraft);
  $("btnManualRefresh").addEventListener("click", () => renderAll(true, true));

  $("btnOpenExportHint").addEventListener("click", () => {
    const el = $("exportHint");
    el.style.display = (el.style.display === "none" || !el.style.display) ? "block" : "none";
  });

  $("btnDownload").addEventListener("click", async () => {
    if (state.exportMode === "single") downloadSingle();
    else await downloadZip();
  });
}

function initDefaults() {
  applyRolePreset(state.role);
  // default some titles
  ensureBlock("about").title = ensureBlock("about").title || "O mnie";
  ensureBlock("contact").title = ensureBlock("contact").title || "Kontakt";
  ensureBlock("social").title = ensureBlock("social").title || "Social media";
  ensureBlock("epk").title = ensureBlock("epk").title || "EPK / Press kit";
}

function init() {
  const loaded = loadDraft();
  if (!loaded) initDefaults();

  // ensure all blocks in order exist
  state.order.forEach(ensureBlock);
  hardLockHeroFirst();

  if (!state.activeBlockId) state.activeBlockId = "hero";

  bindGlobalInputs();
  renderAll(false, true);
}
init();
