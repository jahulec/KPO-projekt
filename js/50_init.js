/* Auto-split from scripts.js | 50_init.js */

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

  const isTextLike = (el)=>{
    if(!el) return false;
    const tag = (el.tagName||'').toLowerCase();
    if(tag==='textarea') return true;
    if(tag!=='input') return false;
    const t = String(el.type||'text').toLowerCase();
    return ['text','search','url','email','tel','password','number'].includes(t);
  };


  panel.addEventListener("input", (e) => {
    if (!e || !e.target) return;
    // Nie odświeżaj podglądu przy każdym znaku w polach tekstowych
    if (isTextLike(e.target) || e.target.isContentEditable) return;
    kick();
  }, true);

  panel.addEventListener("change", (e) => {
    if (!e || !e.target) return;
    // Change na inputach tekstowych odpala się zwykle na blur — nie chcemy drugiego odświeżenia.
    if (isTextLike(e.target) || e.target.isContentEditable) return;
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
      "Zmiana profilu strony zmieni domyślny zestaw bloków oraz ich kolejność.\n\n" +
      "Jeśli masz już rozbudowany szkic, zapisz snapshot przed zmianą.\n\n" +
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
  ["accent","bgColor","siteName","metaTitle","metaDescription","metaKeywords","gtmId","privacyUrl"].forEach(id => {
    $(id).addEventListener("input", () => {
      syncStateFromSettingsInputs();
      contentDraftChanged();
    });
    $(id).addEventListener("keydown", (e) => {
      if(!e) return;
      if(e.key !== 'Enter') return;
      // Enter ma zatwierdzać, ale bez podwójnego odświeżenia (keydown + change po blur)
      try{ if(e.target && e.target.dataset) e.target.dataset.skipNextChangeCommit = '1'; }catch(_){ }
      try{ e.preventDefault(); }catch(_){ }
      try{ e.stopPropagation(); }catch(_){ }
      try{ e.target && e.target.blur && e.target.blur(); }catch(_){ }
      syncStateFromSettingsInputs();
      saveDraft();
      requestPreviewRebuild('content');
    });
    $(id).addEventListener("change", () => {
      try{
        const t = document.getElementById(id);
        if (t && t.dataset && t.dataset.skipNextChangeCommit === '1') {
          delete t.dataset.skipNextChangeCommit;
          return;
        }
      }catch(_){ }
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

  if ($("privacyMode")) $("privacyMode").addEventListener("change", () => {
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
      // kropki mają działać jak picker: zapis + odświeżenie podglądu
      contentChanged();
    });
  });

  // Colorwash background quick colors (only shown in Colorwash)
  document.querySelectorAll('.colorDot[data-bg]').forEach((dot) => {
    const c0 = dot.getAttribute('data-bg');
    if (c0) { dot.style.background = c0; }
    dot.addEventListener('click', () => {
      const c = dot.getAttribute('data-bg');
      if (!c) return;
      state.bgColor = c;
      if ($("bgColor")) $("bgColor").value = c;
      // kropki mają działać jak picker: zapis + odświeżenie podglądu
      contentChanged();
    });
  });

  // Style selects (bind here so they trigger preview rebuild)
  ["accentType","motion","scrollMode","mediaLayout","headerLayout","headerBg","contentWidth","headerWidth","heroWidth","fontPreset","density","borders","radius","sectionDividers","sectionTitleAlign"].forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('change', () => {
      syncStateFromSettingsInputs();
      saveDraft();
      requestPreviewRebuild('content');
    });
  });


  // Logo (nagłówek): checkbox + drop-zone jak w SEO
  async function handleLogoFile(file) {
    const f = file;
    if (!f) return;

    const rem = remainingMediaBudgetBytes() + assetBytes(assets.logo);
    const inBytes = Number(f.size || 0);
    if (inBytes && rem && inBytes > rem) {
      toast(`⚠ Limit zasobów: brak miejsca na logo (${formatBytes(inBytes)}). Zostało: ${formatBytes(rem)}.`, 'warn', 5200);
      return;
    }

    if (isLikelyHeic(f)) {
      toast(`⚠ Format HEIC/HEIF nie jest wspierany: ${f.name}. Zapisz jako JPG/PNG/SVG i wgraj ponownie.`, 'warn', 5200);
      return;
    }

    // SVG trzymamy w oryginale (bez re-encode)
    if (isSvgFile(f)) {
      if (inBytes && inBytes > 2 * 1024 * 1024) {
        toast(`⚠ Logo SVG jest spore (${formatBytes(inBytes)}). Rozważ uproszczenie pliku.`, 'warn', 5200);
      }
      const dataUrl = await readFileAsDataUrl(f);
      if (!dataUrl) return;
      const mime = f.type || (parseDataUrl(dataUrl)?.mime || 'image/svg+xml');
      assets.logo = { id: "single_logo", name: f.name || "logo", dataUrl, mime, bytes: inBytes };
      await persistSingleAsset(assets.logo, "single_logo", { kind: "logo" });
      contentDraftChanged();
      refreshLogoSingleUI();
      return;
    }

    // Raster: normalizacja (max bok 1200, WEBP)
    const norm = await normalizeImageFileToDataUrl(f, {
      maxSide: 1200,
      maxOutputBytes: 800_000,
      mime: "image/webp",
      quality: 0.86,
      _single: 1,
    });
    if (!norm.dataUrl) return;
    assets.logo = { id: "single_logo", name: f.name || "logo", dataUrl: norm.dataUrl, mime: norm.mime, bytes: norm.bytes, width: norm.width, height: norm.height };
    await persistSingleAsset(assets.logo, "single_logo", { kind: "logo" });
    contentChanged();
    refreshLogoSingleUI();
  }

  function syncLogoUploadVisibility() {
    const wrap = $("logoUploadWrap");
    if (!wrap) return;
    const on = !!state.useLogoInHeader;
    wrap.classList.toggle("isHiddenControl", !on);
  }

  const logoUp = $("logoUpload");
  if (logoUp) logoUp.addEventListener("change", async () => {
    const file = logoUp.files && logoUp.files[0];
    if (!file) return;
    await handleLogoFile(file);
    try{ logoUp.value = ""; }catch(_){ }
  });

  const logoDZ = document.querySelector('[data-drop="logoUpload"]');
  if (logoDZ && typeof bindDropZone === 'function') {
    bindDropZone(logoDZ, async (files) => {
      const f = (files && files[0]) ? files[0] : null;
      if (!f) return;
      await handleLogoFile(f);
      try{ if (logoUp) logoUp.value = ""; }catch(_){ }
    });
  }

  const useLogo = $("useLogoInHeader");
  if (useLogo) {
    // Restore checkbox from saved state
    useLogo.checked = !!state.useLogoInHeader;
    useLogo.addEventListener("change", () => {
      state.useLogoInHeader = !!useLogo.checked;
      syncLogoUploadVisibility();
      contentChanged();
    });
  }

  // Remove logo button
  const logoRem = $("logoRemove");
  if (logoRem) logoRem.addEventListener("click", async (e) => {
    try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
    await removeLogoSingle();
  });

  // Initial visibility (after draft load, we also run it again)
  syncLogoUploadVisibility();


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
      assets.favicon = { id: "single_favicon", name: file.name || "favicon", dataUrl, mime, bytes: inBytes };
      await persistSingleAsset(assets.favicon, "single_favicon", { kind: "favicon" });
      contentDraftChanged();
      refreshSeoSinglesUI();
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
    assets.favicon = { id: "single_favicon", name: file.name || "favicon", dataUrl: norm.dataUrl, mime: norm.mime, bytes: norm.bytes, width: norm.width, height: norm.height };
    await persistSingleAsset(assets.favicon, "single_favicon", { kind: "favicon" });
    contentChanged();
    refreshSeoSinglesUI();
    fav.value = '';
  });

  // SEO: drop-zone (favicon)
  const favDZ = document.querySelector('[data-drop="faviconUpload"]');
  if (fav && favDZ && typeof bindDropZone === 'function') {
    bindDropZone(favDZ, async (files) => {
      const f = (files && files[0]) ? files[0] : null;
      if (!f) return;
      // emulate input selection
      // we re-run the same handler by assigning a FileList is not reliable; call logic directly instead
      // Trigger change handler path by temporarily setting a manual property is not worth it.
      // So: call the same code as in the change handler (inline below).

      const rem = remainingMediaBudgetBytes() + assetBytes(assets.favicon);
      const inBytes = Number(f.size || 0);
      if (inBytes && rem && inBytes > rem) {
        toast(`⚠ Limit zasobów: brak miejsca na faviconę (${formatBytes(inBytes)}). Zostało: ${formatBytes(rem)}.`, 'warn', 5200);
        return;
      }

      if (isLikelyHeic(f)) {
        toast(`⚠ HEIC/HEIF nie jest wspierany jako favicona: ${f.name}. Użyj PNG/ICO/SVG.`, 'warn', 5200);
        return;
      }

      if (isIcoFile(f) || isSvgFile(f)) {
        const dataUrl = await readFileAsDataUrl(f);
        if (!dataUrl) return;
        const mime = f.type || (parseDataUrl(dataUrl)?.mime || (isIcoFile(f) ? 'image/x-icon' : 'image/svg+xml'));
        assets.favicon = { id: "single_favicon", name: f.name || "favicon", dataUrl, mime, bytes: inBytes };
        await persistSingleAsset(assets.favicon, "single_favicon", { kind: "favicon" });
        contentDraftChanged();
        refreshSeoSinglesUI();
        fav.value = '';
        return;
      }

      const norm = await normalizeImageFileToDataUrl(f, {
        maxSide: 512,
        maxOutputBytes: 350_000,
        mime: "image/png",
        _single: 1,
      });
      if (!norm.dataUrl) return;
      assets.favicon = { id: "single_favicon", name: f.name || "favicon", dataUrl: norm.dataUrl, mime: norm.mime, bytes: norm.bytes, width: norm.width, height: norm.height };
      await persistSingleAsset(assets.favicon, "single_favicon", { kind: "favicon" });
      contentChanged();
      refreshSeoSinglesUI();
      fav.value = '';
    });
  }

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
    assets.ogImage = { id: "single_og", name: file.name || "og-image", dataUrl: norm.dataUrl, mime: norm.mime, bytes: norm.bytes, width: norm.width, height: norm.height };
    await persistSingleAsset(assets.ogImage, "single_og", { kind: "og" });
    contentChanged();
    refreshSeoSinglesUI();
    og.value = '';
  });

  // SEO: drop-zone (OG image)
  const ogDZone = document.querySelector('[data-drop="ogImageUpload"]');
  if (og && ogDZone && typeof bindDropZone === 'function') {
    bindDropZone(ogDZone, async (files) => {
      const f = (files && files[0]) ? files[0] : null;
      if (!f) return;

      const rem = remainingMediaBudgetBytes() + assetBytes(assets.ogImage);
      const inBytes = Number(f.size || 0);
      if (inBytes && rem && inBytes > rem) {
        toast(`⚠ Limit zasobów: brak miejsca na OG image (${formatBytes(inBytes)}). Zostało: ${formatBytes(rem)}.`, 'warn', 5200);
        return;
      }

      if (isLikelyHeic(f)) {
        toast(`⚠ HEIC/HEIF nie jest wspierany jako OG image: ${f.name}. Użyj JPG/PNG.`, 'warn', 5200);
        return;
      }
      if (isSvgFile(f) || isIcoFile(f)) {
        toast(`⚠ OG image powinien być rastrowy (JPG/PNG).`, 'warn', 4200);
        return;
      }

      const norm = await normalizeImageFileToDataUrl(f, {
        maxSide: 2000,
        maxOutputBytes: 1_000_000,
        mime: "image/jpeg",
        quality: 0.86,
        _single: 1,
      });
      if (!norm.dataUrl) return;
      assets.ogImage = { id: "single_og", name: f.name || "og-image", dataUrl: norm.dataUrl, mime: norm.mime, bytes: norm.bytes, width: norm.width, height: norm.height };
      await persistSingleAsset(assets.ogImage, "single_og", { kind: "og" });
      contentChanged();
      refreshSeoSinglesUI();
      og.value = '';
    });
  }

  // SEO single file remove buttons
  const favRem = $("faviconRemove");
  if (favRem) favRem.addEventListener("click", async (e) => {
    try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
    await removeSeoSingle("favicon");
  });
  const ogRem = $("ogImageRemove");
  if (ogRem) ogRem.addEventListener("click", async (e) => {
    try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
    await removeSeoSingle("og");
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

/* ==========================
   SEO singles UI (favicon / OG)
========================== */

function refreshSeoSinglesUI() {
  const favEmpty = $("faviconEmpty");
  const favRow = $("faviconRow");
  const favName = $("faviconName");

  const ogEmpty = $("ogImageEmpty");
  const ogRow = $("ogImageRow");
  const ogName = $("ogImageName");

  const favOn = !!(assets && assets.favicon && assets.favicon.dataUrl);
  if (favEmpty) {
    favEmpty.hidden = favOn;
    favEmpty.style.display = favOn ? "none" : "block";
  }
  if (favRow) {
    favRow.hidden = !favOn;
    favRow.style.display = favOn ? "flex" : "none";
  }
  if (favName) favName.textContent = favOn ? (assets.favicon.name || "favicon") : "";

  const ogOn = !!(assets && assets.ogImage && assets.ogImage.dataUrl);
  if (ogEmpty) {
    ogEmpty.hidden = ogOn;
    ogEmpty.style.display = ogOn ? "none" : "block";
  }
  if (ogRow) {
    ogRow.hidden = !ogOn;
    ogRow.style.display = ogOn ? "flex" : "none";
  }
  if (ogName) ogName.textContent = ogOn ? (assets.ogImage.name || "og-image") : "";
}

function refreshLogoSingleUI() {
  const empty = $("logoEmpty");
  const row = $("logoRow");
  const name = $("logoName");
  const on = !!(assets && assets.logo && assets.logo.dataUrl);
  if (empty) {
    empty.hidden = on;
    empty.style.display = on ? "none" : "block";
  }
  if (row) {
    row.hidden = !on;
    row.style.display = on ? "flex" : "none";
  }
  if (name) name.textContent = on ? (assets.logo.name || "logo") : "";
}

async function removeLogoSingle() {
  try {
    if (assets && assets.logo) {
      try { await mediaDel(assets.logo.id || "single_logo"); } catch(_) {}
      assets.logo = null;
      contentChanged();
      refreshLogoSingleUI();
    }
  } catch (e) {
    // keep app stable
  }
}

async function removeSeoSingle(kind) {
  try {
    if (kind === "favicon" && assets && assets.favicon) {
      try { await mediaDel(assets.favicon.id || "single_favicon"); } catch(_) {}
      assets.favicon = null;
      contentChanged();
      refreshSeoSinglesUI();
      return;
    }
    if (kind === "og" && assets && assets.ogImage) {
      try { await mediaDel(assets.ogImage.id || "single_og"); } catch(_) {}
      assets.ogImage = null;
      contentChanged();
      refreshSeoSinglesUI();
      return;
    }
  } catch (e) {
    // keep app stable
  }
}

async function init() {
  // Apply generator UI preferences (theme/size/panel width)
  try{ applyUiPrefs(getUiPrefs(), false); }catch(e){}

  bindPanelToggle();
  bindPanelDetailsPersistence();
  bindQuickDock();
  try{ bindUiSettingsMenu(); }catch(e){}
  applyRolePreset(state.role);

  const loaded = await loadDraft();
  if (!loaded) {
    $("exportMode").value = state.exportMode;
    $("role").value = state.role;
    $("accent").value = state.accent;
    if ($("bgColor")) $("bgColor").value = state.bgColor || "#fef3c7";
    $("siteName").value = state.siteName;
    if ($("accentType")) $("accentType").value = state.accentType;
    if ($("motion")) $("motion").value = state.motion;
    if ($("scrollMode")) $("scrollMode").value = state.scrollMode;
    if ($("mediaLayout")) $("mediaLayout").value = state.mediaLayout;
    if ($("headerLayout")) $("headerLayout").value = state.headerLayout;
    if ($("contentWidth")) $("contentWidth").value = state.contentWidth;
    if ($("headerWidth")) $("headerWidth").value = state.headerWidth;
    if ($("heroWidth")) $("heroWidth").value = state.heroWidth;
    if ($("density")) $("density").value = state.density;
    if ($("borders")) $("borders").value = state.borders;
    if ($("radius")) $("radius").value = state.radius;
    if ($("sectionDividers")) $("sectionDividers").value = state.sectionDividers;
    if ($("sectionTitleAlign")) $("sectionTitleAlign").value = state.sectionHeadersAlign;
    setPreviewMode(state.previewMode, false);
    syncStyleCollectionButtons();
    syncThemeButtons();
    renderStyleUi();
    // kontrolki zależne od szablonu (np. Colorwash: kolor tła)
    try{ syncTemplateDependentStyleControls(); }catch(_){ }
  } else {
    hardLockHeroFirst();
  }

  updateSnapshotPill();
  setLiveStatus();
  bindSettings();
  refreshLogoSingleUI();
  refreshSeoSinglesUI();
  installLivePreviewFallback();
  initCustomSelects(document);
  refreshCustomSelects();
  bindKeyboardShortcuts();

  setPreviewDevice(state.previewDevice || "desktop");

  syncStyleCollectionButtons();
  syncThemeButtons();
  renderStyleUi();
  try{ syncTemplateDependentStyleControls(); }catch(_){ }
  // first render
  syncStateFromSettingsInputs();
  renderBlocksList();
  renderAddBlockSelect();
  renderBlockEditor();
  rebuildPreview(true);
}

init();
