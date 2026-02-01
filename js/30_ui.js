/* Auto-split from scripts.js | 30_ui.js */

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
    const clearM = host.querySelector("#ed_hero_images_mobile_clear");

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
    if (t) bindTextCommit(t, () => { cfg.data.text = t.value; });
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
    if (bio) bindTextCommit(bio, () => { cfg.data.shortBio = bio.value; });

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
}

