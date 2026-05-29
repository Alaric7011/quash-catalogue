/* =========================================================================
   Quash Admin — Edit Item
   -------------------------------------------------------------------------
   Two views in one page:
     1. FIND  — Search (name/code) OR Browse (category → list)
     2. EDIT  — Preloaded form with current values

   Fetches the published Products CSV directly so it can see INACTIVE
   products (the public data layer filters those out). Images are only
   re-uploaded if the admin chooses a new file.
   ========================================================================= */

(function () {
  "use strict";

  if (!Auth.requireAuth()) return;

  const { $, $$, escapeHTML, escapeAttr, toast, setBusy, categoryName } = AdminUI;

  // ---------- State -------------------------------------------------------
  const state = {
    products: [],       // all products including inactive
    current: null,      // product currently being edited
    newFiles: { 1: null, 2: null }
  };

  // ---------- Tiny CSV parser (admin-local; sees inactive rows too) -------
  function parseCSV(text) {
    const rows = []; let field = ""; let row = []; let inQuotes = false; let i = 0;
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    while (i < text.length) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i+1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += ch; i++; continue;
      }
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === ",") { row.push(field); field = ""; i++; continue; }
      if (ch === "\r") { i++; continue; }
      if (ch === "\n") { row.push(field); rows.push(row); field=""; row=[]; i++; continue; }
      field += ch; i++;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    if (!rows.length) return [];
    const headers = rows[0].map(h => h.trim().toLowerCase());
    return rows.slice(1)
      .filter(r => r.some(c => (c || "").trim() !== ""))
      .map(r => {
        const o = {}; headers.forEach((h, idx) => { o[h] = (r[idx] || "").trim(); }); return o;
      });
  }
  function truthy(v) { return ["true","yes","1","y"].includes(String(v||"").toLowerCase()); }

  async function fetchAllProducts() {
    const res = await fetch(CONFIG.SHEETS.PRODUCTS_CSV, { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load products from the sheet.");
    const text = await res.text();
    return parseCSV(text)
      .filter(r => r.code)
      .map(r => ({
        code:        String(r.code).toUpperCase(),
        name:        r.name || "",
        category:    (r.category || "").toLowerCase().trim(),
        description: r.description || "",
        image1:      r.image1 || "",
        image2:      r.image2 || "",
        featured:    truthy(r.featured),
        active:      truthy(r.active)
      }));
  }

  // ---------- View routing -----------------------------------------------
  const viewFind = $("#view-find");
  const viewEdit = $("#view-edit");
  function showFind() {
    viewEdit.classList.add("is-hidden");
    viewFind.classList.remove("is-hidden");
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }
  function showEdit() {
    viewFind.classList.add("is-hidden");
    viewEdit.classList.remove("is-hidden");
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  // ---------- Tabs --------------------------------------------------------
  const tabSearch  = $("#tab-search");
  const tabBrowse  = $("#tab-browse");
  const panelSearch = $("#panel-search");
  const panelBrowse = $("#panel-browse");
  let mode = "search";

  function setMode(m) {
    mode = m;
    tabSearch.classList.toggle("is-active", m === "search");
    tabBrowse.classList.toggle("is-active", m === "browse");
    panelSearch.classList.toggle("is-hidden", m !== "search");
    panelBrowse.classList.toggle("is-hidden", m !== "browse");
    renderResults();
  }
  tabSearch.addEventListener("click", () => setMode("search"));
  tabBrowse.addEventListener("click", () => setMode("browse"));

  // ---------- Render: results list ---------------------------------------
  function rowHTML(p) {
    const thumb = p.image1
      ? `<div class="result-row__thumb"><img src="${p.image1}" alt="" loading="lazy"></div>`
      : `<div class="result-row__thumb result-row__thumb--placeholder">${escapeHTML((p.name || p.code).charAt(0))}</div>`;
    const metaClass = p.active ? "" : "result-row__meta--inactive";
    return `
      <button type="button" class="result-row" data-code="${escapeAttr(p.code)}">
        ${thumb}
        <div class="result-row__body">
          <div class="result-row__name">${escapeHTML(p.name) || "<em>Unnamed</em>"}</div>
          <div class="result-row__meta ${metaClass}">${escapeHTML(p.code)} · ${escapeHTML(categoryName(p.category))}</div>
        </div>
        <span class="result-row__arrow">→</span>
      </button>`;
  }

  function renderResults() {
    const list = $("#result-list");
    const status = $("#results-status");
    let matches = [];

    if (mode === "search") {
      const q = $("#search-input").value.trim().toLowerCase();
      if (!q) { list.innerHTML = ""; status.textContent = "Start typing to search."; return; }
      matches = state.products.filter(p =>
        p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
      );
    } else {
      const slug = $("#browse-category").value;
      if (!slug) { list.innerHTML = ""; status.textContent = "Pick a category to see its products."; return; }
      matches = state.products.filter(p => p.category === slug);
    }

    if (!matches.length) {
      list.innerHTML = `<div class="result-empty">No products match.</div>`;
      status.textContent = "";
      return;
    }
    status.textContent = matches.length + " product" + (matches.length === 1 ? "" : "s");
    list.innerHTML = matches.map(rowHTML).join("");
    $$(".result-row", list).forEach(row => {
      row.addEventListener("click", () => beginEdit(row.dataset.code));
    });
  }

  // Search input — live filter
  $("#search-input").addEventListener("input", renderResults);

  // ---------- Populate category dropdowns --------------------------------
  function populateCategoryOptions(select, withBlank, blankText) {
    if (withBlank) {
      const o = document.createElement("option");
      o.value = ""; o.disabled = true; o.selected = true; o.textContent = blankText || "Choose…";
      select.appendChild(o);
    }
    (CONFIG.CATEGORIES || []).forEach(c => {
      const o = document.createElement("option");
      o.value = c.slug; o.textContent = c.name;
      select.appendChild(o);
    });
  }
  populateCategoryOptions($("#browse-category"), true, "Select a category…");
  populateCategoryOptions($("#edit-category"), false);
  $("#browse-category").addEventListener("change", renderResults);

  // ---------- Image slot wiring (edit form) ------------------------------
  function rebindFile(slot) {
    const input = $("#edit-file-" + slot);
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) { toast("Please choose an image file.", "error"); input.value = ""; return; }
      state.newFiles[slot] = file;
      showNewImage(slot, file);
    });
  }
  function showNewImage(slot, file) {
    const drop = $("#edit-drop-" + slot);
    const url = URL.createObjectURL(file);
    drop.innerHTML = `
      <div class="image-preview">
        <img src="${url}" alt="">
        <button type="button" class="image-preview__remove" aria-label="Cancel new image" data-revert="${slot}">&times;</button>
      </div>`;
    drop.querySelector("[data-revert]").addEventListener("click", (e) => {
      e.preventDefault();
      state.newFiles[slot] = null;
      renderCurrentImage(slot);
    });
  }
  function renderCurrentImage(slot) {
    const drop = $("#edit-drop-" + slot);
    const existing = slot === 1 ? state.current.image1 : state.current.image2;
    const isFirst = slot === 1;
    if (existing) {
      drop.innerHTML = `
        <div class="image-preview">
          <img src="${existing}" alt="">
        </div>
        <div class="image-drop__hint" style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,.92);padding:4px 12px;border-radius:999px;font-size:.75rem;">
          <input type="file" accept="image/*" id="edit-file-${slot}" />
          Tap to replace
        </div>`;
    } else {
      drop.innerHTML = `
        <input type="file" accept="image/*" id="edit-file-${slot}" />
        <div class="image-drop__hint">
          <strong>${isFirst ? "Tap to upload" : "Optional second image"}</strong><br>
          <span class="muted">tap to upload</span>
        </div>`;
    }
    rebindFile(slot);
  }

  // ---------- Begin edit --------------------------------------------------
  function beginEdit(code) {
    const p = state.products.find(x => x.code === code);
    if (!p) { toast("Product not found.", "error"); return; }
    state.current = JSON.parse(JSON.stringify(p));
    state.newFiles = { 1: null, 2: null };

    $("#edit-title").textContent = p.name || p.code;
    $("#edit-subtitle").textContent = "Last loaded · " + categoryName(p.category);
    $("#edit-code").textContent = p.code;
    $("#edit-name").value = p.name;
    $("#edit-category").value = p.category;
    $("#edit-description").value = p.description;
    $("#edit-featured").checked = p.featured;
    $("#edit-active").checked = p.active;

    renderCurrentImage(1);
    renderCurrentImage(2);

    showEdit();
  }

  // ---------- Save edits --------------------------------------------------
  $("#edit-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submit = $("#save-edit");
    if (!state.current) return;

    const name = $("#edit-name").value.trim();
    const category = $("#edit-category").value;
    const description = $("#edit-description").value.trim();
    const featured = $("#edit-featured").checked;
    const active = $("#edit-active").checked;

    if (!name) { toast("Item name is required.", "error"); $("#edit-name").focus(); return; }
    if (!category) { toast("Choose a category.", "error"); return; }

    setBusy(submit, true, "Saving…");
    try {
      let image1 = state.current.image1;
      let image2 = state.current.image2;

      if (state.newFiles[1]) {
        toast("Uploading new image…");
        const up = await AdminAPI.uploadImage(state.newFiles[1], state.current.code + "-1");
        image1 = up.url;
      }
      if (state.newFiles[2]) {
        toast("Uploading second image…");
        const up = await AdminAPI.uploadImage(state.newFiles[2], state.current.code + "-2");
        image2 = up.url;
      }

      await AdminAPI.updateProduct({
        code: state.current.code,
        name, category, description, image1, image2, featured, active
      });

      toast("Saved " + state.current.code, "success");
      // Refresh local product list so subsequent edits use new data.
      const idx = state.products.findIndex(p => p.code === state.current.code);
      if (idx >= 0) {
        state.products[idx] = { ...state.current, name, category, description, image1, image2, featured, active };
      }
      setBusy(submit, false);
      setTimeout(() => showFind(), 800);
    } catch (err) {
      console.error(err);
      toast(err.message || "Save failed.", "error");
      setBusy(submit, false);
    }
  });

  $("#cancel-edit").addEventListener("click", showFind);
  $("#back-to-find").addEventListener("click", showFind);

  // ---------- Logout ------------------------------------------------------
  $("#logout-btn").addEventListener("click", () => Auth.logout());

  // ---------- Init: load products from public sheet ----------------------
  (async () => {
    const spinner = $("#loading-spinner");
    spinner.classList.remove("is-hidden");
    $("#results-status").textContent = "Loading products…";
    try {
      state.products = await fetchAllProducts();
      $("#results-status").textContent = "Start typing to search.";
    } catch (err) {
      console.error(err);
      $("#results-status").textContent = "Could not load products. Try refreshing.";
      toast(err.message || "Load failed.", "error");
    } finally {
      spinner.classList.add("is-hidden");
    }
  })();
})();
