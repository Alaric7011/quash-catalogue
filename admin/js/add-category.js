/* =========================================================================
   Quash Admin — Add Category
   -------------------------------------------------------------------------
   - Auto-generates slug from the name (server is the authority on dedup).
   - Optional image upload (same flow as products).
   ========================================================================= */

(function () {
  "use strict";

  if (!Auth.requireAuth()) return;

  const { $, toast, setBusy } = AdminUI;
  let chosenFile = null;

  // ---------- Slug preview ------------------------------------------------
  function slugify(s) {
    return String(s || "")
      .toLowerCase().trim()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  const nameInput = $("#cat-name");
  const slugPreview = $("#slug-preview");
  nameInput.addEventListener("input", () => {
    const s = slugify(nameInput.value);
    slugPreview.textContent = s || "—";
  });

  // ---------- Image slot --------------------------------------------------
  const dropEl = $("#cat-drop");
  function wireImage() {
    const input = $("#cat-file");
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) {
        toast("Please choose an image file.", "error");
        input.value = "";
        return;
      }
      chosenFile = file;
      showPreview(file);
    });
  }
  function showPreview(file) {
    const url = URL.createObjectURL(file);
    dropEl.innerHTML = `
      <div class="image-preview">
        <img src="${url}" alt="">
        <button type="button" class="image-preview__remove" aria-label="Remove image" id="cat-remove">&times;</button>
      </div>`;
    $("#cat-remove").addEventListener("click", (e) => {
      e.preventDefault();
      chosenFile = null;
      resetDrop();
    });
  }
  function resetDrop() {
    dropEl.innerHTML = `
      <input type="file" accept="image/*" id="cat-file" />
      <div class="image-drop__hint">
        <strong>Tap to upload</strong><br>
        <span class="muted">portrait 4:5 recommended</span>
      </div>`;
    wireImage();
  }
  wireImage();

  // ---------- Submit ------------------------------------------------------
  $("#add-cat-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submit = $("#save-cat");

    const name = nameInput.value.trim();
    if (!name) { toast("Category name is required.", "error"); nameInput.focus(); return; }
    const previewSlug = slugify(name);
    if (!previewSlug) { toast("Name must contain at least one letter or number.", "error"); return; }

    setBusy(submit, true, "Saving…");
    try {
      let imageUrl = "";
      if (chosenFile) {
        toast("Uploading image…");
        const up = await AdminAPI.uploadImage(chosenFile, "cat-" + previewSlug);
        imageUrl = up.url;
      }

      const res = await AdminAPI.addCategory({ name, image: imageUrl });

      if (res.error === "duplicate_slug") {
        toast("A category with that name already exists.", "error");
        setBusy(submit, false);
        return;
      }

      toast("Saved " + (res.name || name), "success");
      setTimeout(() => { window.location.href = "index.html"; }, 1000);
    } catch (err) {
      console.error(err);
      toast(err.message || "Save failed.", "error");
      setBusy(submit, false);
    }
  });

  // ---------- Logout ------------------------------------------------------
  $("#logout-btn").addEventListener("click", () => Auth.logout());
})();
