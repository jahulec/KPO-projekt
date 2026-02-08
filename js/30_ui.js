/* Auto-split from scripts.js | 30_ui.js */

/* ==========================
   UI rendering
========================== */


function bindDropZone(zoneEl, onFiles) {
  if (!zoneEl) return;
  zoneEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    zoneEl.classList.add("dropZone--over");
  });
  zoneEl.addEventListener("dragleave", () => zoneEl.classList.remove("dropZone--over"));
  zoneEl.addEventListener("drop", async (e) => {
    e.preventDefault();
    zoneEl.classList.remove("dropZone--over");
    const files = Array.from(e.dataTransfer?.files || []);
    if (!files.length) return;
    await onFiles(files);
  });
}

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
    const disabled = !cfg.enabled;
    el.className = `blockItem uiCard ${isActive ? "blockItem--active" : ""} ${disabled ? "blockItem--disabled" : ""}`;

    // In the list: remove the green checkbox ticks; use a drag handle in that spot.
    // Quick enable/disable is provided in the action buttons (right side).
    const leftWidgetHtml = locked
      ? `<span class="pill" style="padding:4px 10px; font-size:11px;">STAŁE</span>`
      : `<button class="iconBtn dragHandle dragHandle--left" data-drag="${id}" draggable="false" title="Przeciągnij aby zmienić kolejność">⋮⋮</button>`;

    const enableIcon = cfg.enabled ? "◉" : "○";
    const enableTitle = cfg.enabled ? "Ukryj blok" : "Pokaż blok";

    el.innerHTML = `
      <div class="blockLabel" data-select="${id}">
        ${leftWidgetHtml}
        <div>
          <strong>${escapeHtml(label)}</strong><br/>
          <small data-small="${id}">${escapeHtml(cfg.title || "")}</small>
        </div>
      </div>

      <div class="blockActions">
        <button class="iconBtn" data-togglebtn="${id}" ${locked ? "disabled" : ""} title="${enableTitle}">${enableIcon}</button>
        <button class="iconBtn" data-dup="${id}" ${!canDup ? "disabled" : ""} title="Duplikuj">⧉</button>
        <button class="iconBtn" data-remove="${id}" ${locked ? "disabled" : ""} title="Usuń z układu">✕</button>
      </div>
    `;


    // Drag reorder (no arrows)
    el.setAttribute("data-blockid", id);
    host.appendChild(el);
  });

  host.querySelectorAll("[data-select]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.activeBlockId = btn.getAttribute("data-select");
      renderBlocksList();
      renderBlockEditor();
    });
  });

  // Enable/disable button (replaces the old checkbox ticks)
  host.querySelectorAll("[data-togglebtn]").forEach(b => {
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = b.getAttribute("data-togglebtn");
      if (!id) return;
      toggleBlock(id, !state.blocks[id]?.enabled);
      structureChanged();
    });
  });

  // Prevent accidental selection click when interacting with drag handles
  host.querySelectorAll("[data-drag]").forEach(h => {
    h.addEventListener("click", (e) => e.stopPropagation());
  });

      
  

// Drag & drop reorder (stable): placeholder while dragging, reorder only on drop.
// Prevents oscillation/jitter that happens with per-item hover classes.
// Works with native HTML5 DnD (desktop/trackpad).
if (!host.__blocksDnd) host.__blocksDnd = { dragId: null, draggingEl: null, placeholder: null, phHeight: 0, raf: 0, lastY: 0 };
const dnd = host.__blocksDnd;

function ensurePlaceholder(h) {
  if (!dnd.placeholder) {
    const ph = document.createElement('div');
    ph.className = 'blockPlaceholder';
    ph.setAttribute('aria-hidden', 'true');
    dnd.placeholder = ph;
  }
  if (typeof h === 'number' && isFinite(h) && h > 0) {
    dnd.phHeight = Math.max(12, Math.round(h));
    dnd.placeholder.style.height = `${dnd.phHeight}px`;
  } else if (!dnd.placeholder.style.height) {
    dnd.phHeight = dnd.phHeight || 12;
    dnd.placeholder.style.height = `${dnd.phHeight}px`;
  }
  return dnd.placeholder;
}

function cleanupDnD() {
  try { if (dnd.raf) cancelAnimationFrame(dnd.raf); } catch (_) {}
  dnd.raf = 0;
  dnd.lastY = 0;
  try { dnd.placeholder && dnd.placeholder.remove(); } catch (_) {}
  if (dnd.draggingEl) dnd.draggingEl.classList.remove('is-dragging');
  dnd.dragId = null;
  dnd.draggingEl = null;
  host.dataset.dragging = '0';
}

if (!host.__blocksDndBound) {
  host.__blocksDndBound = true;

  // Pointer-based reordering (more stable than native HTML5 DnD; works on touch too).
  function findScrollable(el){
    let cur = el;
    while (cur && cur !== document.body) {
      try {
        const cs = getComputedStyle(cur);
        const oy = cs.overflowY;
        if ((oy === 'auto' || oy === 'scroll') && (cur.scrollHeight > cur.clientHeight + 2)) return cur;
      } catch (_) {}
      cur = cur.parentElement;
    }
    return null;
  }
  const scroller = findScrollable(host) || host.closest('aside.panel') || host;

  const pd = host.__blocksPointerDnD || (host.__blocksPointerDnD = {
    active: false,
    started: false,
    startX: 0,
    startY: 0,
    dragId: null,
    draggingEl: null,
    ghostEl: null,
    pointerId: null,
    offsetX: 0,
    offsetY: 0,
    raf: 0,
    pendingY: 0,
    lastAfter: null,
    hiddenDisplay: ''
  });

  function cleanupPointerDnD() {
    try { if (pd.raf) cancelAnimationFrame(pd.raf); } catch (_) {}
    pd.raf = 0;

    // Remove global listeners (safe to call even if they are not attached).
    try { window.removeEventListener('pointermove', onPointerMove, true); } catch (_) {}
    try { window.removeEventListener('pointerup', onPointerUp, true); } catch (_) {}
    try { window.removeEventListener('pointercancel', onPointerUp, true); } catch (_) {}
    try { window.removeEventListener('wheel', onWheelDrag, { capture: true }); } catch (_) {}

    try { pd.ghostEl && pd.ghostEl.remove(); } catch (_) {}
    pd.ghostEl = null;

    try { dnd.placeholder && dnd.placeholder.remove(); } catch (_) {}
    if (pd.draggingEl) {
      pd.draggingEl.classList.remove('is-dragging');
      try { pd.draggingEl.style.display = pd.hiddenDisplay || ''; } catch (_) {}
    }
    pd.hiddenDisplay = '';

    pd.active = false;
    pd.started = false;
    pd.startX = 0;
    pd.startY = 0;
    pd.dragId = null;
    pd.draggingEl = null;
    pd.pointerId = null;
    pd.lastAfter = null;

    host.dataset.dragging = '0';
    document.body.classList.remove('is-reordering');
  }

  function positionGhost(clientX, clientY) {
    if (!pd.ghostEl) return;
    const x = clientX - pd.offsetX;
    const y = clientY - pd.offsetY;
    pd.ghostEl.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  function getAfterElement(clientY) {
    const candidates = Array.from(host.querySelectorAll('.blockItem[data-blockid]'))
      .filter(el => !el.classList.contains('is-dragging'));

    let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
    for (const el of candidates) {
      const r = el.getBoundingClientRect();
      const offset = clientY - (r.top + r.height / 2);
      if (offset < 0 && offset > closest.offset) {
        closest = { offset, element: el };
      }
    }
    let after = closest.element;

    // HERO lock: do not allow placeholder before the first block (usually HERO).
    const firstId = state.order && state.order[0];
    if (firstId && firstId !== pd.dragId) {
      const firstEl = host.querySelector(`.blockItem[data-blockid="${firstId}"]:not(.is-dragging)`);
      if (firstEl && after === firstEl) {
        after = firstEl.nextElementSibling;
      }
    }
    return after;
  }

  
  function onWheelDrag(e) {
    if (!pd.active || !pd.started) return;
    // Allow scrolling the panel while dragging (mouse wheel / trackpad).
    if (scroller && (scroller.scrollHeight > scroller.clientHeight + 2)) {
      scroller.scrollTop += e.deltaY;
      e.preventDefault();
    }
  }

function maybeAutoScroll(clientY) {
    // Auto-scroll the left panel when dragging near top/bottom.
    if (!scroller || !(scroller.scrollHeight > scroller.clientHeight + 2)) return;
    const r = scroller.getBoundingClientRect();
    const margin = 56;
    const maxSpeed = 28;
    if (clientY < r.top + margin) {
      const t = Math.min(1, (r.top + margin - clientY) / margin);
      scroller.scrollTop -= Math.ceil(maxSpeed * t);
    } else if (clientY > r.bottom - margin) {
      const t = Math.min(1, (clientY - (r.bottom - margin)) / margin);
      scroller.scrollTop += Math.ceil(maxSpeed * t);
    }
  }

  function applyPlaceholderMove() {
    pd.raf = 0;
    if (!pd.active || !pd.dragId) return;

    const ph = ensurePlaceholder();
    if (!ph.isConnected) host.appendChild(ph);

    const after = getAfterElement(pd.pendingY);
    if (after !== pd.lastAfter) {
      pd.lastAfter = after;
      if (after == null) host.appendChild(ph);
      else host.insertBefore(ph, after);
    }
  }

  
  function startPointerDrag(e) {
    if (!pd.active || pd.started) return;
    const itemEl = pd.draggingEl;
    if (!itemEl) return;

    const rect = itemEl.getBoundingClientRect();

    // Placeholder occupies the original spot.
    ensurePlaceholder(rect.height || 48);
    host.insertBefore(dnd.placeholder, itemEl);

    // Create ghost BEFORE hiding the original element.
    const ghost = itemEl.cloneNode(true);
    ghost.classList.add('dragGhost');
    ghost.style.display = 'block';
    // Ghost should be a clean preview: no action icons (duplicate/remove/toggles) and no drag handle.
    // This avoids visual clutter and prevents confusing the placeholder with interactive controls.
    ghost.querySelectorAll('.blockActions').forEach(n => n.remove());
    ghost.querySelectorAll('.dragHandle').forEach(n => n.remove());
    ghost.querySelectorAll('button').forEach(b => b.setAttribute('tabindex', '-1'));
    ghost.style.width = `${Math.round(rect.width)}px`;
    ghost.style.height = `${Math.round(rect.height)}px`;
    ghost.style.left = `0px`;
    ghost.style.top = `0px`;
    ghost.style.transform = `translate(${Math.round(rect.left)}px, ${Math.round(rect.top)}px)`;
    document.body.appendChild(ghost);
    pd.ghostEl = ghost;

    pd.offsetX = e.clientX - rect.left;
    pd.offsetY = e.clientY - rect.top;

    // Hide the original element from the grid to avoid gaps/oscillation.
    pd.hiddenDisplay = itemEl.style.display || '';
    itemEl.style.display = 'none';

    pd.started = true;

    positionGhost(e.clientX, e.clientY);
    pd.pendingY = e.clientY;
    pd.lastAfter = null;
    applyPlaceholderMove();
  }

function onPointerMove(e) {
    if (!pd.active || e.pointerId !== pd.pointerId) return;

    // Don't start reordering until the pointer actually moves a bit (prevents accidental clicks).
    if (!pd.started) {
      const dx = e.clientX - pd.startX;
      const dy = e.clientY - pd.startY;
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      startPointerDrag(e);
      // If something failed, abort gracefully.
      if (!pd.started) return;
    }

    e.preventDefault();
    positionGhost(e.clientX, e.clientY);
    pd.pendingY = e.clientY;
    maybeAutoScroll(e.clientY);

    if (!pd.raf) pd.raf = requestAnimationFrame(applyPlaceholderMove);
  }

  function onPointerUp(e) {
    if (!pd.active || e.pointerId !== pd.pointerId) return;
    e.preventDefault();

    // If user only clicked the handle (no movement), just clean up.
    if (!pd.started) {
      cleanupPointerDnD();
      return;
    }

    const movedId = pd.dragId;
    const ph = dnd.placeholder;

    // Compute insertion index from placeholder position.
    let insertAt = 0;
    if (ph && ph.isConnected) {
      for (const child of Array.from(host.children)) {
        if (child === ph) break;
        if (child.classList && child.classList.contains('blockItem')) {
          const bid = child.getAttribute('data-blockid');
          if (bid && bid !== movedId) insertAt++;
        }
      }
    }

    cleanupPointerDnD();

    if (movedId) {
      reorderBlockToIndex(movedId, insertAt);
      structureChanged();
    }
  }

  host.addEventListener('pointerdown', (e) => {
    const handle = e.target?.closest ? e.target.closest('.dragHandle[data-drag]') : null;
    if (!handle) return;

    const id = handle.getAttribute('data-drag');
    if (!id) return;
    if (isLockedBlock(id)) return;

    const itemEl = handle.closest('.blockItem[data-blockid]');
    if (!itemEl) return;

    e.preventDefault();
    e.stopPropagation();

    pd.active = true;
    pd.started = false;
    pd.startX = e.clientX;
    pd.startY = e.clientY;

    pd.dragId = id;
    pd.draggingEl = itemEl;
    pd.pointerId = e.pointerId;

    host.dataset.dragging = '1';
    document.body.classList.add('is-reordering');

    // capture + global listeners
    try { handle.setPointerCapture(e.pointerId); } catch (_) {}
    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('pointercancel', onPointerUp, true);
    window.addEventListener('wheel', onWheelDrag, { passive: false, capture: true });
  }, true);
}

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

  // CustomSelect: select w HTML startuje pusty, a opcje są dodawane dynamicznie.
  // Wymuś przebudowę listy i odśwież etykietę.
  try {
    if (options && sel.selectedIndex < 0) sel.selectedIndex = 0;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    if (typeof refreshCustomSelects === 'function') refreshCustomSelects();
  } catch (_) {}
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

function getByPath(rootObj, path) {
  const parts = String(path || "").split(".").filter(Boolean);
  let obj = rootObj;
  for (const k of parts) {
    if (obj == null) return undefined;
    if (/^\d+$/.test(k)) obj = obj[Number(k)];
    else obj = obj[k];
  }
  return obj;
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
            <textarea data-path="${escapeHtml(path)}" data-rich-path="${escapeHtml((/iframe/i.test(String(f.label||''))||/iframe/i.test(String(f.placeholder||''))||/embed/i.test(String(f.label||''))||/embed/i.test(String(f.placeholder||'')))?'':(path+'Rich'))}" rows="3" placeholder="${escapeHtml(f.placeholder || "")}">${escapeHtml(it[f.key] || "")}</textarea>
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
      
      ${state.exportMode === "zip" ? `
      <div style="margin-top:8px;">
        <label class="toggleRow"><input id="ed_showOnHomeZip" type="checkbox" ${cfg.showOnHomeZip === false ? "" : "checked"} /> <span class="toggleText">Pokaż na stronie głównej (ZIP)</span></label>
      </div>
      ` : ``}
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


    const heroInfoMobile = assets.heroImagesMobile.length
      ? `<div class="hint">HERO mobile zdjęcia: ${assets.heroImagesMobile.length} (pierwsze = tło)</div>
         <div class="itemList">
           ${assets.heroImagesMobile.map((img, i) => `
             <div class="itemCard uiCard">
               <div class="itemCardTop">
                 <strong>Mobile zdjęcie #${i+1}</strong>
                 <button class="btnSmall" type="button" data-remove-heroimg-mobile="${i}">Usuń</button>
               </div>
               <label class="field" style="margin:10px 0 0 0;">
                 <span>Alt</span>
                 <input type="text" data-hero-alt-mobile="${i}" value="${escapeHtml(imgObj(img).alt || "")}" placeholder="Opis zdjęcia (alt)" />
               </label>
             </div>
           `).join("")}
         </div>`
      : `<div class="hint">Brak zdjęć mobile. Jeśli nie dodasz, telefon użyje wersji desktop.</div>`;

    specific = `
      ${fieldRow("Nagłówek (H1)", `<input id="ed_hero_headline" type="text" value="${escapeHtml(h.headline || "")}" />`)}
      ${fieldRow("Opis", `<textarea id="ed_hero_sub" data-path="subheadline" data-rich-path="subheadlineRich" rows="4">${escapeHtml(h.subheadline || "")}</textarea>`)}
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

      ${fieldRow("Zdjęcia HERO (upload, multi)", `<div class="dropZone" data-drop="ed_hero_images">
  <div class="dropZone__title">Upuść zdjęcia HERO (desktop)</div>
  <div class="dropZone__sub">…albo kliknij, aby wybrać pliki</div>
  <input id="ed_hero_images" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple />
</div>`,
        "1 zdjęcie = tło. 2+ zdjęcia = mini-galeria w HERO. JPG/PNG/WebP (HEIC nie). Obrazy są automatycznie zmniejszane i kompresowane."
      )}
      <div class="hint" style="margin-top:-6px;">Mobile: ${assets.heroImagesMobile.length || 0} (opcjonalnie)</div>
      <div style="display:grid; gap:10px;">
        <div class="dropZone" data-drop="ed_hero_images_mobile">
  <div class="dropZone__title">Upuść zdjęcia HERO (mobile)</div>
  <div class="dropZone__sub">…albo kliknij, aby wybrać pliki</div>
  <input id="ed_hero_images_mobile" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple />
</div>
      </div>
      <div class="hint">Jeśli dodasz zdjęcia, telefon użyje pierwszego jako tła HERO.</div>
      ${heroInfoMobile}
      ${heroInfo}
    `;
  }

  if (def.editor === "text") {
    // cfg is the block config and does NOT include the block id.
    // Use the actual block id from renderBlockEditor scope: `id`.
    const baseIdOf = (bid) => String(bid || "").split("__")[0];
    const hasRich = String(cfg.data.richHtml || "").trim().length > 0;
    const hint = hasRich ? "Aktywne formatowanie. Kliknij przycisk w rogu pola. Edycja tekstu wyłączy formatowanie." : "";
    specific = fieldRow("Treść", `<textarea id="ed_text" data-path="text" data-rich-path="richHtml" rows="7">${escapeHtml(cfg.data.text || "")}</textarea>`, hint);
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
        <div id="row_gallery_cols" style="${layout === 'grid' ? '' : 'display:none;'}">
          ${fieldRow("Kolumny (siatka)", `
            <div class="rangeRow">
              <input id="ed_gallery_cols" type="range" min="2" max="6" step="1" value="${cfg.data.cols}" />
              <div class="pill"><output id="ed_gallery_cols_out">${cfg.data.cols}</output></div>
            </div>
          `, "Działa w układzie: Siatka.")}
        </div>

        <div id="row_gallery_mcols" style="${layout === 'masonry' ? '' : 'display:none;'}">
          ${fieldRow("Kolumny (masonry)", `
            <div class="rangeRow">
              <input id="ed_gallery_mcols" type="range" min="2" max="6" step="1" value="${cfg.data.masonryCols}" />
              <div class="pill"><output id="ed_gallery_mcols_out">${cfg.data.masonryCols}</output></div>
            </div>
          `, "Działa w układzie: Masonry.")}
        </div>
      </div>

      ${fieldRow("Wgraj zdjęcia", `<div class="dropZone" data-drop="ed_gallery_upload">
  <div class="dropZone__title">Upuść zdjęcia do galerii</div>
  <div class="dropZone__sub">…albo kliknij, aby wybrać pliki</div>
  <input id="ed_gallery_upload" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple />
</div>`, "JPG/PNG/WebP (HEIC nie). Obrazy są automatycznie zmniejszane i kompresowane.")}
      ${thumbs}
    `;
  }

  if (def.editor === "embed_spotify") {
    cfg.data.items = Array.isArray(cfg.data.items) ? cfg.data.items : [];
    // Embed size controls the *visual window* width when stacked.
    // 60% is the default sweet spot; avoid overly wide 100%.
    const sz = clampNum(cfg.data.embedSize ?? 60, 45, 85);
    specific =
      fieldRow("Rozmiar okna", `
        <div class="rangeRow">
          <input id="ed_spotify_size" type="range" min="45" max="85" step="5" value="${sz}" data-path="embedSize" />
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
    // 60% looks the most natural for stacked embeds; allow small-to-large range.
    const sz = clampNum(cfg.data.embedSize ?? 60, 45, 85);
    specific =
      fieldRow("Rozmiar okna", `
        <div class="rangeRow">
          <input id="ed_youtube_size" type="range" min="45" max="85" step="5" value="${sz}" data-path="embedSize" />
          <div class="pill"><output id="ed_youtube_size_out">${sz}%</output></div>
        </div>
      `)
      + listEditor(cfg.data.items, "items", "Wpis", [
          { key: "url", label: "Wklej kod iframe lub link", type: "textarea", placeholder: "Wklej iframe z YouTube (Udostępnij → Umieść) albo zwykły link" }
        ])
      + `<div class="hint">Najpewniej działa wklejony <strong>iframe</strong> z YouTube. Link też zadziała, ale jeśli autor zablokował osadzanie — player się nie wyświetli.</div>`;
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
      ${fieldRow("Opis", `<textarea id="ed_news_desc" data-path="desc" data-rich-path="descRich" rows="4">${escapeHtml(cfg.data.desc)}</textarea>`)}
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
      ${fieldRow("Krótki opis (bio)", `<textarea id="ed_epk_bio" data-path="shortBio" data-rich-path="shortBioRich" rows="6">${escapeHtml(cfg.data.shortBio)}</textarea>`)}
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

      ${fieldRow("Zdjęcia prasowe (upload)", `<div class="dropZone" data-drop="ed_epk_photos">
  <div class="dropZone__title">Upuść zdjęcia prasowe (EPK)</div>
  <div class="dropZone__sub">…albo kliknij, aby wybrać pliki</div>
  <input id="ed_epk_photos" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple />
</div>`, "Do ZIP trafią do assets/press/. JPG/PNG/WebP (HEIC nie). Obrazy są automatycznie zmniejszane i kompresowane.")}
      ${photosInfo}

      ${fieldRow("Pliki presspack (upload)", `<div class="dropZone" data-drop="ed_epk_files">
  <div class="dropZone__title">Upuść pliki presspack (PDF/ZIP)</div>
  <div class="dropZone__sub">…albo kliknij, aby wybrać pliki</div>
  <input id="ed_epk_files" type="file" accept=".pdf,.zip,.png,.jpg,.jpeg,.webp" multiple />
</div>`, "Do ZIP trafią do assets/press/. JPG/PNG/WebP (HEIC nie). Obrazy są automatycznie zmniejszane i kompresowane.")}
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

  function bindTextCommit(el, onSet){
    if(!el) return;
    const tag = (el.tagName||'').toLowerCase();
    const isTextarea = tag === 'textarea';
    el.addEventListener('input', () => {
      onSet();
      if (typeof contentDraftChanged === 'function') contentDraftChanged();
    });
    el.addEventListener('blur', () => {
      // Jeśli Enter wywołał blur, commit robimy w keydown i tutaj pomijamy.
      if (el && el.dataset && el.dataset.skipNextBlurCommit === '1') {
        try{ delete el.dataset.skipNextBlurCommit; }catch(_){ el.dataset.skipNextBlurCommit = ''; }
        return;
      }
      onSet();
      if (typeof contentChanged === 'function') contentChanged();
    });
    el.addEventListener('keydown', (e) => {
      if(!e) return;
      if(e.key !== 'Enter') return;
      // Enter ma zatwierdzać i odświeżyć podgląd (bez spamowania na każdej literze)
      if(!isTextarea){
        // Zablokuj podwójny commit (keydown + blur)
        try{ el.dataset.skipNextBlurCommit = '1'; }catch(_){ }
        onSet();
        if (typeof contentChanged === 'function') contentChanged();
        try{ e.preventDefault(); }catch(_){ }
        try{ e.stopPropagation(); }catch(_){ }
        try{ el.blur(); }catch(_){ }
        return;
      }
      // textarea: Enter jest normalnym znakiem, commit robi się na blur
    });
  }


    // title (update small label without rerender)
  const titleEl = host.querySelector("#ed_title");
  if (titleEl) {
    bindTextCommit(titleEl, () => {
      cfg.title = titleEl.value;
      updateBlockSmallTitle(blockId, cfg.title);
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

  // ZIP: show on home (index.html)
  const homeZipEl = host.querySelector("#ed_showOnHomeZip");
  if (homeZipEl) {
    homeZipEl.addEventListener("change", () => {
      cfg.showOnHomeZip = !!homeZipEl.checked;
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
    const tag = (el.tagName||'').toLowerCase();
    const type = String(el.type||'').toLowerCase();
    const isTextLike = (tag==='textarea') || (tag==='input' && ['text','search','url','email','tel','password','number'].includes(type||'text'));
    if (isTextLike) {
      bindTextCommit(el, () => {
        const path = el.getAttribute("data-path");
        setByPath(cfg.data, path, el.value);
      });
    } else {
      el.addEventListener("input", () => {
        const path = el.getAttribute("data-path");
        setByPath(cfg.data, path, el.value);
        contentChanged();
      });
    }
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

    if (headline) bindTextCommit(headline, () => { h.headline = headline.value; });
    if (sub) bindTextCommit(sub, () => { h.subheadline = sub.value; });
    if (ctaText) bindTextCommit(ctaText, () => { h.primaryCtaText = ctaText.value; });

    if (ctaTarget) {
      ctaTarget.addEventListener("change", () => {
        h.primaryCtaTarget = ctaTarget.value;
        if (customWrap) customWrap.style.display = (ctaTarget.value === "custom") ? "block" : "none";
        saveDraft();
        requestPreviewRebuild('content');
      });
    }

    if (ctaUrl) bindTextCommit(ctaUrl, () => { h.primaryCtaUrl = ctaUrl.value; });

    if (imgs) {
      const handleHeroDesktopFiles = async (files) => {
        const newImgsRaw = await readMultipleImages(files, { maxSide: 2560, maxOutputBytes: 1600000, mime: "image/webp", quality: 0.82 });
        const newImgs = enforceMediaBudget(newImgsRaw, 'hero');
        if (!newImgs.length) { renderBlockEditor(); return; }
        await persistImageItems(newImgs, "hero");
        assets.heroImages.push(...newImgs);
        renderBlockEditor(); // structural (list)
        saveDraft();
        requestPreviewRebuild('structure');
      };

      imgs.addEventListener("change", async () => {
        await handleHeroDesktopFiles(imgs.files);
      });

      const dz = host.querySelector('[data-drop="ed_hero_images"]');
      bindDropZone(dz, handleHeroDesktopFiles);
    }

    if (imgsM) {
      const handleHeroMobileFiles = async (files) => {
        const newImgsRaw = await readMultipleImages(files, { maxSide: 2560, maxOutputBytes: 1600000, mime: "image/webp", quality: 0.82 });
        const newImgs = enforceMediaBudget(newImgsRaw, 'heroM');
        if (!newImgs.length) { renderBlockEditor(); return; }
        await persistImageItems(newImgs, "heroM");
        assets.heroImagesMobile.push(...newImgs);
        renderBlockEditor();
        saveDraft();
        requestPreviewRebuild('structure');
      };

      imgsM.addEventListener("change", async () => {
        await handleHeroMobileFiles(imgsM.files);
      });

      const dzm = host.querySelector('[data-drop="ed_hero_images_mobile"]');
      bindDropZone(dzm, handleHeroMobileFiles);
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

    host.querySelectorAll("[data-remove-heroimg-mobile]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-remove-heroimg-mobile"));
        const removed = assets.heroImagesMobile.splice(idx, 1)[0];
        if (removed && removed.id) mediaDel(removed.id).catch?.(() => {});
        renderBlockEditor();
        saveDraft();
        requestPreviewRebuild('structure');
      });
    });

    // Alt (opcjonalnie)
    host.querySelectorAll("[data-hero-alt]").forEach(inp => {
      bindTextCommit(inp, () => {
        const idx = Number(inp.getAttribute("data-hero-alt"));
        const cur = assets.heroImages[idx];
        if (!cur) return;
        if (typeof cur !== 'object') assets.heroImages[idx] = imgObj(cur);
        assets.heroImages[idx].alt = inp.value;
      });
    });

    host.querySelectorAll("[data-hero-alt-mobile]").forEach(inp => {
      bindTextCommit(inp, () => {
        const idx = Number(inp.getAttribute("data-hero-alt-mobile"));
        const cur = assets.heroImagesMobile[idx];
        if (!cur) return;
        if (typeof cur !== 'object') assets.heroImagesMobile[idx] = imgObj(cur);
        assets.heroImagesMobile[idx].alt = inp.value;
      });
    });

  }

  if (def.editor === "text") {
    const t = host.querySelector("#ed_text");

    if (t) bindTextCommit(t, () => {
      cfg.data.text = t.value;
      // Manualna edycja plain-text wyłącza rich HTML (żeby nie było rozjazdu).
      if (!(t.dataset && t.dataset.rtSetting === '1')) {
        if (cfg.data.richHtml) cfg.data.richHtml = "";
      }
    });
  }

  if (def.editor === "gallery") {
    const layout = host.querySelector("#ed_gallery_layout");
    const upload = host.querySelector("#ed_gallery_upload");

    if (layout) layout.addEventListener("change", () => {
      cfg.data.layout = layout.value;
      // Przerysuj edytor, żeby pokazać tylko właściwy suwak (grid vs masonry)
      renderBlockEditor();
      saveDraft();
      requestPreviewRebuild('content');
    });

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
      const handleGalleryFiles = async (files) => {
        const imgsRaw = await readMultipleImages(files, { maxSide: 2560, maxOutputBytes: 1600000, mime: "image/webp", quality: 0.82 });
        const imgs = enforceMediaBudget(imgsRaw, 'gallery');
        if (!imgs.length) { renderBlockEditor(); return; }
        await persistImageItems(imgs, "gal");
        // W projekcie źródłową kolekcją jest assets.galleryImages
        assets.galleryImages.push(...imgs);
        renderBlockEditor();
        saveDraft();
        requestPreviewRebuild('structure');
      };

      upload.addEventListener("change", async () => {
        await handleGalleryFiles(upload.files);
      });

      const dzg = host.querySelector('[data-drop="ed_gallery_upload"]');
      bindDropZone(dzg, handleGalleryFiles);
    }

    host.querySelectorAll("[data-remove-gallery]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
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
    if (bio) bindTextCommit(bio, () => { cfg.data.shortBio = bio.value; });

    const photos = host.querySelector("#ed_epk_photos");
    if (photos) {
      const handlePressPhotos = async (files) => {
        const imgsRaw = await readMultipleImages(files, { maxSide: 2560, maxOutputBytes: 1800000, mime: "image/webp", quality: 0.82 });
        const imgs = enforceMediaBudget(imgsRaw, 'press');
        if (!imgs.length) { renderBlockEditor(); return; }
        await persistImageItems(imgs, "press");
        assets.pressPhotos.push(...imgs);
        renderBlockEditor();
        saveDraft();
        requestPreviewRebuild('structure');
      };

      photos.addEventListener("change", async () => {
        await handlePressPhotos(photos.files);
      });

      const dzp = host.querySelector('[data-drop="ed_epk_photos"]');
      bindDropZone(dzp, handlePressPhotos);
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
      const handlePressPackFiles = async (filesArg) => {
        const list = Array.from(filesArg || []);
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
      };

      files.addEventListener("change", async () => {
        await handlePressPackFiles(files.files);
      });

      const dzf = host.querySelector('[data-drop="ed_epk_files"]');
      bindDropZone(dzf, handlePressPackFiles);
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
    if (a) bindTextCommit(a, () => { cfg.data.title = a.value; });
    if (b) bindTextCommit(b, () => { cfg.data.desc = b.value; });
    if (c) bindTextCommit(c, () => { cfg.data.btn = c.value; });
    if (d) bindTextCommit(d, () => { cfg.data.url = d.value; });
  }

  if (def.editor === "contact") {
    const email = host.querySelector("#ed_contact_email");
    const phone = host.querySelector("#ed_contact_phone");
    const city = host.querySelector("#ed_contact_city");
    const cta = host.querySelector("#ed_contact_cta");
    const showMap = host.querySelector("#ed_contact_showMap");
    const mapAddress = host.querySelector("#ed_contact_mapAddress");
    const mapEmbed = host.querySelector("#ed_contact_mapEmbed");
    if (email) bindTextCommit(email, () => { cfg.data.email = email.value; });
    if (phone) bindTextCommit(phone, () => { cfg.data.phone = phone.value; });
    if (city) bindTextCommit(city, () => { cfg.data.city = city.value; });
    if (cta) bindTextCommit(cta, () => { cfg.data.cta = cta.value; });
    if (showMap) showMap.addEventListener("change", () => { cfg.data.showMap = !!showMap.checked; contentChanged(); });
    if (mapAddress) bindTextCommit(mapAddress, () => { cfg.data.mapAddress = mapAddress.value; });
    if (mapEmbed) bindTextCommit(mapEmbed, () => { cfg.data.mapEmbed = mapEmbed.value; });
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


  // Rich-text buttons for textarea fields (block editor only)
  installRichTextButtonsInEditor(host, cfg, blockId);
}


/* ==========================
   Rich text editor (WYSIWYG) for textarea fields (block editor only)
   - no libs
   - sanitized HTML saved to *Rich fields (or explicit data-rich-path)
========================== */

let __rtDialog = null;
let __rtOnSave = null;
let __rtEditor = null;
let __rtTitleEl = null;
let __rtSavedRange = null;
let __rtLastCmdAt = 0;

function textToBasicHtml(txt){
  const t = String(txt || '').replace(/\r\n/g,'\n').trim();
  if (!t) return '<p></p>';
  const paras = t.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  return paras.map(p => '<p>' + escapeHtml(p).replace(/\n/g,'<br/>') + '</p>').join('');
}

function htmlToPlain(html){
  const s = String(html || '').trim();
  if (!s) return '';
  try {
    const doc = new DOMParser().parseFromString('<div>' + s + '</div>', 'text/html');
    const root = doc.body.firstChild;
    if (!root) return '';
    root.querySelectorAll('p,h2,h3,li').forEach(el => {
      el.insertAdjacentText('afterend', '\n');
    });
    let out = root.textContent || '';
    out = out.replace(/\n{3,}/g,'\n\n').trim();
    return out;
  } catch(_) {
    return '';
  }
}

function sanitizeRichText(html){
  const input = String(html || '').trim();
  if (!input) return '';

  const ALLOWED = new Set(['P','BR','STRONG','B','EM','I','U','H2','H3','UL','OL','LI','A']);

  try {
    const doc = new DOMParser().parseFromString('<div>' + input + '</div>', 'text/html');
    const root = doc.body.firstChild || doc.body;

    const walk = (node) => {
      const children = Array.from(node.childNodes || []);
      for (const ch of children) {
        if (ch.nodeType === 3) continue; // text
        if (ch.nodeType !== 1) { try { ch.remove(); } catch(_) {} continue; }

        const tag = String(ch.tagName || '').toUpperCase();
        if (!ALLOWED.has(tag)) {
          const frag = doc.createDocumentFragment();
          while (ch.firstChild) frag.appendChild(ch.firstChild);
          try { ch.replaceWith(frag); } catch(_) {}
          continue;
        }

        for (const a of Array.from(ch.attributes || [])) {
          const name = String(a.name || '').toLowerCase();
          if (tag === 'A' && name === 'href') continue;
          ch.removeAttribute(a.name);
        }

        if (tag === 'A') {
          let href = String(ch.getAttribute('href') || '').trim();
          if (!href || /^javascript:/i.test(href)) {
            const frag = doc.createDocumentFragment();
            while (ch.firstChild) frag.appendChild(ch.firstChild);
            try { ch.replaceWith(frag); } catch(_) {}
            continue;
          }
          if (!/^(https?:|mailto:|tel:|#)/i.test(href)) {
            const frag = doc.createDocumentFragment();
            while (ch.firstChild) frag.appendChild(ch.firstChild);
            try { ch.replaceWith(frag); } catch(_) {}
            continue;
          }
          ch.setAttribute('href', href);
          ch.setAttribute('rel', 'noopener noreferrer');
          ch.setAttribute('target', '_blank');
        }

        walk(ch);
      }
    };

    walk(root);

    let out = root.innerHTML || '';
    out = out.replace(/<b>/g,'<strong>').replace(/<\/b>/g,'</strong>');
    out = out.replace(/<i>/g,'<em>').replace(/<\/i>/g,'</em>');
    out = out.replace(/<p>\s*<\/p>/g,'');
    out = out.replace(/\s+$/,'').trim();
    return out;
  } catch(_) {
    return '';
  }
}

function ensureRichTextDialog(){
  if (__rtDialog) return __rtDialog;

  const dlg = document.createElement('dialog');
  dlg.className = 'rtDialog';
  dlg.id = 'rtDialog';

  dlg.innerHTML = `
  <form method="dialog" class="rtDialog__form">
    <div class="rtDialog__header">
      <strong id="rtDialogTitle">Formatowanie</strong>
      <button class="rtDialog__x" value="cancel" aria-label="Zamknij" type="submit">×</button>
    </div>

    <div class="rtToolbar" role="toolbar" aria-label="Formatowanie">
      <button class="rtBtn" type="button" data-cmd="bold" title="Pogrubienie"><b>B</b></button>
      <button class="rtBtn" type="button" data-cmd="italic" title="Kursywa"><i>I</i></button>
      <button class="rtBtn" type="button" data-cmd="underline" title="Podkreślenie"><u>U</u></button>
      <span class="rtSep"></span>
      <button class="rtBtn" type="button" data-cmd="h2" title="Nagłówek H2">H2</button>
      <button class="rtBtn" type="button" data-cmd="h3" title="Nagłówek H3">H3</button>
      <button class="rtBtn" type="button" data-cmd="p" title="Akapit">P</button>
      <span class="rtSep"></span>
      <button class="rtBtn rtBtn--list" type="button" data-cmd="ul" title="Lista punktowana"><span class="rtIcon">•</span><span class="rtLbl">Lista</span></button>
      <button class="rtBtn rtBtn--list" type="button" data-cmd="ol" title="Lista numerowana"><span class="rtIcon">1.</span><span class="rtLbl">Lista</span></button>
      <span class="rtSep"></span>
      <button class="rtBtn" type="button" data-cmd="link" title="Link">Link</button>
      <button class="rtBtn" type="button" data-cmd="clear" title="Wyczyść format">Wyczyść</button>
    </div>

    <div class="rtDialog__body">
      <div id="rtEditor" class="rtEditor" contenteditable="true" spellcheck="true"></div>
    </div>

    <div class="rtDialog__footer">
      <button class="btn" value="cancel" type="submit">Anuluj</button>
      <button class="btn btn--primary" id="rtSave" type="button">Zapisz</button>
    </div>
  </form>`;

  document.body.appendChild(dlg);

  __rtTitleEl = dlg.querySelector('#rtDialogTitle');
  __rtEditor = dlg.querySelector('#rtEditor');
  const saveBtn = dlg.querySelector('#rtSave');
  const toolbar = dlg.querySelector('.rtToolbar');

  function saveRange(){
    try {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      __rtSavedRange = sel.getRangeAt(0);
    } catch(_) {}
  }

  function restoreRange(){
    try {
      if (!__rtSavedRange) return;
      const sel = window.getSelection();
      if (!sel) return;
      sel.removeAllRanges();
      sel.addRange(__rtSavedRange);
    } catch(_) {}
  }

  ['mouseup','keyup','touchend'].forEach(ev => {
    __rtEditor.addEventListener(ev, saveRange);
  });

  function exec(cmd){
    try { __rtEditor.focus({ preventScroll:true }); } catch(_) { try{ __rtEditor.focus(); }catch(__){} }
    restoreRange();

    try {
      if (cmd === 'h2') document.execCommand('formatBlock', false, 'h2');
      else if (cmd === 'h3') document.execCommand('formatBlock', false, 'h3');
      else if (cmd === 'p') document.execCommand('formatBlock', false, 'p');
      else if (cmd === 'ul') document.execCommand('insertUnorderedList');
      else if (cmd === 'ol') document.execCommand('insertOrderedList');
      else if (cmd === 'link') {
        const url = prompt('Wklej URL (https://...)');
        if (url && String(url).trim()) document.execCommand('createLink', false, String(url).trim());
      }
      else if (cmd === 'clear') {
        document.execCommand('removeFormat');
        document.execCommand('unlink');
      }
      else document.execCommand(cmd);
    } catch(_) {}

    saveRange();
    try { __rtEditor.focus({ preventScroll:true }); } catch(_) { try{ __rtEditor.focus(); }catch(__){} }
  }

  let __rtLastCmdAt = 0;

  toolbar.addEventListener('pointerdown', (e) => {
    const b = e.target && e.target.closest ? e.target.closest('[data-cmd]') : null;
    if (!b) return;
    try { e.preventDefault(); e.stopPropagation(); } catch(_) {}
    __rtLastCmdAt = Date.now();
    exec(b.getAttribute('data-cmd'));
  });

  // Fallback: część przeglądarek/trybów w dialogu bywa kapryśna z pointerdown
  toolbar.addEventListener('click', (e) => {
    const b = e.target && e.target.closest ? e.target.closest('[data-cmd]') : null;
    if (!b) return;
    const now = Date.now();
    if (__rtLastCmdAt && (now - __rtLastCmdAt) < 200) return; // nie duplikuj
    try { e.preventDefault(); e.stopPropagation(); } catch(_) {}
    exec(b.getAttribute('data-cmd'));
  });

saveBtn.addEventListener('click', () => {
    if (typeof __rtOnSave === 'function') {
      try { __rtOnSave(String(__rtEditor.innerHTML || '')); } catch(_) {}
    }
    try { dlg.close(); } catch(_) {}
  });

  dlg.addEventListener('close', () => {
    __rtOnSave = null;
  });

  __rtDialog = dlg;
  return dlg;
}

function guessTextareaLabel(ta){
  if (!ta) return 'Formatowanie';
  // nearest label.field span
  try {
    const lab = ta.closest && ta.closest('label.field');
    const sp = lab ? lab.querySelector('span') : null;
    const t = sp ? String(sp.textContent || '').trim() : '';
    if (t) return t;
  } catch(_) {}
  return 'Formatowanie';
}

function openRichTextModal(opts){
  const o = opts || {};
  const title = String(o.title || 'Formatowanie');
  const initialPlain = String(o.initialPlain || '');
  const initialRich = String(o.initialRich || '').trim();
  const onSave = o.onSave;

  const dlg = ensureRichTextDialog();
  if (__rtTitleEl) __rtTitleEl.textContent = title;

  const html = initialRich ? initialRich : textToBasicHtml(initialPlain);
  __rtEditor.innerHTML = sanitizeRichText(html);

  // Cursor at end
  setTimeout(() => {
    try { __rtEditor.focus(); } catch(_) {}
    try {
      const sel = window.getSelection();
      const r = document.createRange();
      r.selectNodeContents(__rtEditor);
      r.collapse(false);
      sel.removeAllRanges();
      sel.addRange(r);
      __rtSavedRange = r;
    } catch(_) {}
  }, 0);

  __rtOnSave = (rawHtml) => {
    const clean = sanitizeRichText(rawHtml);
    const plain = htmlToPlain(clean);
    if (typeof onSave === 'function') {
      try { onSave(clean, plain); } catch(_) {}
    }
  };

  try { dlg.showModal(); } catch(_) { dlg.setAttribute('open',''); }
}

function installRichTextButtonsInEditor(host, cfg, blockId){
  if (!host || !cfg || !cfg.data) return;

  const textareas = Array.from(host.querySelectorAll('textarea[data-rich-path]:not([data-rich-path=""])'));

  textareas.forEach((ta) => {
    const plainPath = String(ta.getAttribute('data-path') || '').trim();
    const richPath = String(ta.getAttribute('data-rich-path') || '').trim();
    if (!richPath) return;

    // wrap textarea so the button can live "inside" it
    let wrap = ta.parentElement;
    if (!wrap || !wrap.classList || !wrap.classList.contains('rtTextWrap')) {
      wrap = document.createElement('div');
      wrap.className = 'rtTextWrap';
      ta.parentNode.insertBefore(wrap, ta);
      wrap.appendChild(ta);
    }

    let btn = wrap.querySelector('.rtEditBtn');
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'rtEditBtn';
      btn.type = 'button';
      btn.title = 'Formatowanie';
      btn.setAttribute('aria-label', 'Formatowanie');
      btn.textContent = 'Aa';
      wrap.appendChild(btn);
    }

    // Prevent focus bounce
    if (!btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('pointerdown', (e) => {
        try { e.preventDefault(); e.stopPropagation(); } catch(_) {}
      });
      btn.addEventListener('click', (e) => {
        try { e.preventDefault(); e.stopPropagation(); } catch(_) {}

        const title = guessTextareaLabel(ta);
        const currentPlain = String(ta.value || '');
        const currentRich = String(getByPath(cfg.data, richPath) || '').trim();

        openRichTextModal({
          title,
          initialPlain: currentPlain,
          initialRich: currentRich,
          onSave: (cleanHtml, plainOut) => {
            // Save both versions
            try { setByPath(cfg.data, richPath, cleanHtml); } catch(_) {}
            if (plainPath) {
              try { setByPath(cfg.data, plainPath, plainOut || ''); } catch(_) {}
            }

            // Update textarea without clearing rich on input
            try { ta.dataset.rtSetting = '1'; } catch(_) {}
            try { ta.value = plainOut || ''; } catch(_) {}
            setTimeout(() => {
              try { delete ta.dataset.rtSetting; } catch(_) { ta.dataset.rtSetting = ''; }
            }, 0);

            if (typeof saveDraft === 'function') saveDraft();
            if (typeof requestPreviewRebuild === 'function') requestPreviewRebuild('content');
            // Refresh editor so hint + value are consistent
            if (typeof renderBlockEditor === 'function') renderBlockEditor();
          }
        });
      });
    }

    // manual typing in textarea => disable rich for this field
    if (!ta.dataset.rtBound) {
      ta.dataset.rtBound = '1';
      ta.addEventListener('input', () => {
        if (ta.dataset && ta.dataset.rtSetting === '1') return;
        try { setByPath(cfg.data, richPath, ''); } catch(_) {}
      });
    }
  });
}
