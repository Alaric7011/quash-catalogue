/* =========================================================================
   Quash Admin — Delete Category
   -------------------------------------------------------------------------
   Flow:
     1. List all categories with product counts.
     2. Pick one → confirmation screen.
        - 0 products: simple "I understand" + Delete (permanent).
        - >0 products: "Deactivate (recommended)" is foregrounded; the
          permanent delete is blocked (server would also reject without force).
   ========================================================================= */

(function () {
  "use strict";

  if (!Auth.requireAuth()) return;

  const { $, $$, escapeHTML, escapeAttr, toast, setBusy } = AdminUI;

  const state = {
    categories: [],
    counts: {},     // slug -> count
    current: null   // category being considered for delete
  };

  /* --------------------------- Views ---------------------------------- */
  const viewList    = $("#view-list");
  const viewConfirm = $("#view-confirm");

  function showList() {
    viewConfirm.classList.add("is-hidden");
    viewList.classList.remove("is-hidden");
    window.scrollTo({ top: 0 });
  }
  function showConfirm() {
    viewList.classList.add("is-hidden");
    viewConfirm.classList.remove("is-hidden");
    window.scrollTo({ top: 0 });
  }

  /* --------------------------- Render list ----------------------------- */
  function rowHTML(c) {
    const thumb = c.image
      ? `<div class="result-row__thumb"><img src="${c.image}" alt="" loading="lazy"></div>`
      : `<div class="result-row__thumb result-row__thumb--placeholder">${escapeHTML((c.name || c.slug).charAt(0))}</div>`;
    const metaClass = c.active ? "" : "result-row__meta--inactive";
    const count = state.counts[c.slug];
    const countLabel = count == null ? "" : ` · ${count} product${count === 1 ? "" : "s"}`;
    return `
      <button type="button" class="result-row" data-slug="${escapeAttr(c.slug)}">
        ${thumb}
        <div class="result-row__body">
          <div class="result-row__name">${escapeHTML(c.name) || "<em>Unnamed</em>"}</div>
          <div class="result-row__meta ${metaClass}">${escapeHTML(c.slug)}${countLabel}</div>
        </div>
        <span class="result-row__arrow">→</span>
      </button>`;
  }

  function renderList() {
    const list = $("#cat-list");
    const status = $("#list-status");
    if (!state.categories.length) {
      list.innerHTML = `<div class="result-empty">No categories to delete.</div>`;
      status.textContent = "";
      return;
    }
    status.textContent = state.categories.length + " categor" + (state.categories.length === 1 ? "y" : "ies");
    list.innerHTML = state.categories.map(rowHTML).join("");
    $$(".result-row", list).forEach(row => {
      row.addEventListener("click", () => beginConfirm(row.dataset.slug));
    });
  }

  /* --------------------------- Confirm view ---------------------------- */
  function beginConfirm(slug) {
    const c = state.categories.find(x => x.slug === slug);
    if (!c) return;
    state.current = c;

    $("#confirm-title").textContent = "Delete “" + (c.name || c.slug) + "”?";
    $("#confirm-subtitle").textContent = "Slug: " + c.slug;

    const count = state.counts[slug] || 0;
    $("#count-value").textContent = count === 0 ? "None" : count;

    const hasProducts = count > 0;
    $("#count-hint").textContent = hasProducts
      ? "These products would be orphaned if the category is deleted. The server will refuse a permanent delete while products exist."
      : "Safe to delete permanently.";

    $("#action-deactivate").classList.toggle("is-hidden", !hasProducts);

    // Delete UI
    $("#confirm-check").checked = false;
    $("#btn-delete").disabled = true;
    $("#confirm-check-detail").textContent = hasProducts
      ? "Permanent delete is blocked — use Deactivate above."
      : "The category row will be removed from the Sheet.";
    $("#confirm-checkbox-row").classList.toggle("is-hidden", hasProducts);
    $("#btn-delete").classList.toggle("is-hidden", hasProducts);

    showConfirm();
  }

  $("#confirm-check").addEventListener("change", (e) => {
    $("#btn-delete").disabled = !e.target.checked;
  });

  /* --------------------------- Deactivate ------------------------------ */
  $("#btn-deactivate").addEventListener("click", async () => {
    if (!state.current) return;
    const btn = $("#btn-deactivate");
    setBusy(btn, true, "Deactivating…");
    try {
      await AdminAPI.updateCategory({ slug: state.current.slug, active: false });
      toast("Deactivated " + state.current.slug, "success");
      // Reflect in local state
      const idx = state.categories.findIndex(x => x.slug === state.current.slug);
      if (idx >= 0) state.categories[idx].active = false;
      setBusy(btn, false);
      setTimeout(() => { renderList(); showList(); }, 700);
    } catch (err) {
      console.error(err);
      toast(err.message || "Action failed.", "error");
      setBusy(btn, false);
    }
  });

  /* --------------------------- Delete ---------------------------------- */
  $("#btn-delete").addEventListener("click", async () => {
    if (!state.current) return;
    const btn = $("#btn-delete");
    setBusy(btn, true, "Deleting…");
    try {
      const res = await AdminAPI.deleteCategory({ slug: state.current.slug });
      if (res.error === "has_products") {
        toast(res.count + " product(s) still tagged. Deactivate instead.", "error");
        setBusy(btn, false);
        return;
      }
      toast("Deleted " + state.current.slug, "success");
      // Remove from local state
      state.categories = state.categories.filter(x => x.slug !== state.current.slug);
      delete state.counts[state.current.slug];
      setBusy(btn, false);
      setTimeout(() => { renderList(); showList(); }, 700);
    } catch (err) {
      console.error(err);
      toast(err.message || "Delete failed.", "error");
      setBusy(btn, false);
    }
  });

  $("#cancel-delete").addEventListener("click", showList);
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

      // Get product counts for each in parallel
      const counts = await Promise.all(
        state.categories.map(c => AdminAPI.countCategoryProducts(c.slug)
          .then(r => [c.slug, r.count || 0])
          .catch(() => [c.slug, null])
        )
      );
      counts.forEach(([slug, n]) => { state.counts[slug] = n; });

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
