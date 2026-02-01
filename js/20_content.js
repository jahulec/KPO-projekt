/* Auto-split from scripts.js | 20_content.js */

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

