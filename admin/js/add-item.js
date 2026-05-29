/* =========================================================================
   Quash Admin — Add Item
   -------------------------------------------------------------------------
   - Requires auth (redirects to login if not).
   - Populates category dropdown from public CONFIG.CATEGORIES.
   - Previews the next product code via API (server is source of truth).
   - Handles two image uploads (compressed client-side).
   - Submits add request; on success, redirects back to dashboard.
   ========================================================================= */

(function () {
  "use strict";

  if (!Auth.requireAuth()) return;

  const { $, toast, setBusy } = AdminUI;

  // Local state — chosen File objects per slot.
  const files = { 1: null, 2: null };

  // ---------- Populate categories -----------------------------------------
  const select = $("#category");
  (CONFIG.CATEGORIES || []).forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.slug;
    opt.textContent = c.name;
    select.appendChild(opt);
  });

  // ---------- Preview next code -------------------------------------------
  (async () => {
    try {
      const res = await AdminAPI.nextCode();
      $("#code-preview").textContent = res.code;
    } catch (err) {
      $("#code-preview").textContent = "Will be assigned on save";
      console.warn(err);
    }
  })();

  // ---------- Image upload UI ---------------------------------------------
  function wireImageSlot(slot) {
    const dropEl = $("#drop-" + slot);
    const input  = $("#file-" + slot);

    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) {
        toast("Please choose an image file.", "error");
        input.value = "";
        return;
      }
      files[slot] = file;
      showPreview(slot, file);
    });
  }
  function showPreview(slot, file) {
    const drop = $("#drop-" + slot);
    const url = URL.createObjectURL(file);
    drop.innerHTML = `
      <div class="image-preview">
        <img src="${url}" alt="">
        <button type="button" class="image-preview__remove" aria-label="Remove image" data-remove="${slot}">&times;</button>
      </div>`;
    drop.querySelector("[data-remove]").addEventListener("click", (e) => {
      e.preventDefault();
      removeImage(slot);
    });
  }
  function removeImage(slot) {
    files[slot] = null;
    const drop = $("#drop-" + slot);
    const isFirst = slot === 1;
    drop.innerHTML = `
      <input type="file" accept="image/*" id="file-${slot}" />
      <div class="image-drop__hint">
        <strong>${isFirst ? "Tap to upload" : "Optional second image"}</strong><br>
        ${isFirst ? "from your gallery or camera" : '<span class="muted">tap to upload</span>'}
      </div>`;
    wireImageSlot(slot);
  }
  wireImageSlot(1);
  wireImageSlot(2);

  // ---------- Submit -------------------------------------------------------
  $("#add-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submit = $("#save-btn");

    // Validate
    const name = $("#name").value.trim();
    const category = select.value;
    const description = $("#description").value.trim();
    const featured = $("#featured").checked;

    if (!name) { toast("Item name is required.", "error"); $("#name").focus(); return; }
    if (!category) { toast("Choose a category.", "error"); select.focus(); return; }
    if (!files[1]) { toast("Image 1 is required.", "error"); return; }

    setBusy(submit, true, "Saving…");
    try {
      // Get the code first so we can use it in image filenames
      const codeRes = await AdminAPI.nextCode();
      const previewedCode = codeRes.code;

      // Upload images sequentially (keeps Apps Script quotas friendly).
      toast("Uploading image…");
      const up1 = await AdminAPI.uploadImage(files[1], previewedCode + "-1");
      let image1 = up1.url;
      let image2 = "";
      if (files[2]) {
        const up2 = await AdminAPI.uploadImage(files[2], previewedCode + "-2");
        image2 = up2.url;
      }

      // Save row (server re-checks code atomically; may differ if concurrent)
      const saved = await AdminAPI.addProduct({
        name, category, description, image1, image2, featured
      });

      const finalCode = saved.code || previewedCode;
      toast("Saved as " + finalCode, "success");

      // Brief delay so the user reads the toast, then home.
      setTimeout(() => { window.location.href = "index.html"; }, 1200);
    } catch (err) {
      console.error(err);
      toast(err.message || "Save failed.", "error");
      setBusy(submit, false);
    }
  });

  // Logout
  $("#logout-btn").addEventListener("click", () => Auth.logout());
})();
