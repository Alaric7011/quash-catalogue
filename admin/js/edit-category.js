/* =========================================================================
   Quash Admin — Edit Category
   -------------------------------------------------------------------------
   - Loads all categories (active + inactive) via API.
   - List → click → form preloaded.
   - Slug is read-only. Name + image + active are editable.
   ========================================================================= */

(function () {
  "use strict";

  if (!Auth.requireAuth()) return;

  const { $, $$, escapeHTML, escapeAttr, toast, setBusy } = AdminUI;

  const state = {
    categories: [],
    current: null,
    newFile: null
  };

  /* --------------------------- Views ---------------------------------- */
  const viewList = $("#view-list");
  const viewEdit = $("#view-edit");
  function showList() {
    viewEdit.classList.add("is-hidden");
    viewList.classList.remove("is-hidden");
    window.scrollTo({ top: 0 });
  }
  function showEdit() {
    viewList.classList.add("is-hidden");
    viewEdit.classList.remove("is-hidden");
    window.scrollTo({ top: 0 });
  }

  /* --------------------------- Render list ----------------------------- */
  function rowHTML(c) {
    const thumb = c.image
      ? `<div class="result-row__thumb"><img src="${c.image}" alt="" loading="lazy"></div>`
      : `<div class="result-row__thumb result-row__thumb--placeholder">${escapeHTML((c.name || c.slug).charAt(0))}</div>`;
    const metaClass = c.active ? "" : "result-row__meta--inactive";
    return `
      <button type="button" class="result-row" data-slug="${escapeAttr(c.slug)}">
        ${thumb}
        <div class="result-row__body">
          <div class="result-row__name">${escapeHTML(c.name) || "<em>Unnamed</em>"}</div>
          <div class="result-row__meta ${metaClass}">${escapeHTML(c.slug)}</div>
        </div>
        <span class="result-row__arrow">→</span>
      </button>`;
  }

  function renderList() {
    const list = $("#cat-list");
    const status = $("#list-status");
    if (!state.categories.length) {
      list.innerHTML = `<div class="result-empty">No categories yet. Add one first.</div>`;
      status.textContent = "";
      return;
    }
    status.textContent = state.categories.length + " categor" + (state.categories.length === 1 ? "y" : "ies");
    list.innerHTML = state.categories.map(rowHTML).join("");
    $$(".result-row", list).forEach(row => {
      row.addEventListener("click", () => beginEdit(row.dataset.slug));
    });
  }

  /* --------------------------- Edit form ------------------------------- */
  function rebindFile() {
    const input = $("#edit-cat-file");
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) { toast("Please choose an image file.", "error"); input.value = ""; return; }
      state.newFile = file;
      showNewImage(file);
    });
  }
  function showNewImage(file) {
    const drop = $("#edit-cat-drop");
    const url = URL.createObjectURL(file);
    drop.innerHTML = `
      <div class="image-preview">
        <img src="${url}" alt="">
        <button type="button" class="image-preview__remove" aria-label="Cancel new image" id="revert-img">&times;</button>
      </div>`;
    $("#revert-img").addEventListener("click", (e) => {
      e.preventDefault();
      state.newFile = null;
      renderCurrentImage();
    });
  }
  function renderCurrentImage() {
    const drop = $("#edit-cat-drop");
    const existing = state.current.image;
    if (existing) {
      drop.innerHTML = `
        <div class="image-preview">
          <img src="${existing}" alt="">
        </div>
        <div class="image-drop__hint" style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,.92);padding:4px 12px;border-radius:999px;font-size:.75rem;">
          <input type="file" accept="image/*" id="edit-cat-file" />
          Tap to replace
        </div>`;
    } else {
      drop.innerHTML = `
        <input type="file" accept="image/*" id="edit-cat-file" />
        <div class="image-drop__hint">
          <strong>Tap to upload</strong><br>
          <span class="muted">portrait 4:5 recommended</span>
        </div>`;
    }
    rebindFile();
  }

  function beginEdit(slug) {
    const c = state.categories.find(x => x.slug === slug);
    if (!c) { toast("Category not found.", "error"); return; }
    state.current = JSON.parse(JSON.stringify(c));
    state.newFile = null;

    $("#edit-title").textContent = c.name || c.slug;
    $("#edit-slug").textContent = c.slug;
    $("#edit-cat-name").value = c.name;
    $("#edit-cat-active").checked = !!c.active;
    renderCurrentImage();
    showEdit();
  }

  /* --------------------------- Submit ---------------------------------- */
  $("#edit-cat-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.current) return;
    const submit = $("#save-edit");

    const name = $("#edit-cat-name").value.trim();
    const active = $("#edit-cat-active").checked;
    if (!name) { toast("Name is required.", "error"); $("#edit-cat-name").focus(); return; }

    setBusy(submit, true, "Saving…");
    try {
      let image = state.current.image;
      if (state.newFile) {
        toast("Uploading new image…");
        const up = await AdminAPI.uploadImage(state.newFile, "cat-" + state.current.slug);
        image = up.url;
      }

      await AdminAPI.updateCategory({
        slug: state.current.slug,
        name, image, active
      });

      toast("Saved " + state.current.slug, "success");
      const idx = state.categories.findIndex(x => x.slug === state.current.slug);
      if (idx >= 0) state.categories[idx] = { ...state.current, name, image, active };
      setBusy(submit, false);
      setTimeout(() => showList(), 700);
    } catch (err) {
      console.error(err);
      toast(err.message || "Save failed.", "error");
      setBusy(submit, false);
    }
  });

  $("#cancel-edit").addEventListener("click", showList);
  $("#back-to-list").addEventListener("click", showList);
  $("#logout-btn").addEventListener("click", () => Auth.logout());

  /* --------------------------- Init ------------------------------------ */
  (async () => {
    const spinner = $("#loading-spinner");
    spinner.classList.remove("is-hidden");
    $("#list-status").textContent = "Loading categories…";
    try {
      const res = await AdminAPI.listCategories();
      state.categories = (res.categories || []).sort((a, b) => a.order - b.order);
      renderList();
    } catch (err) {
      console.error(err);
      $("#list-status").textContent = "Could not load categories. Try refreshing.";
      toast(err.message || "Load failed.", "error");
    } finally {
      spinner.classList.add("is-hidden");
    }
  })();
})();
