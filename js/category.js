/* =========================================================================
   Quash — Category Page Script
   -------------------------------------------------------------------------
   - Reads ?cat= from the URL
   - Fetches products and filters by category slug
   - Renders 20 cards initially; "Load More" reveals next 20
   - Hydrates settings into CTAs / contact fields
   ========================================================================= */

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);

  // ---- State ------------------------------------------------------------
  const state = {
    slug: null,
    all: [],          // products for this category
    rendered: 0,
    pageSize: CONFIG.PRODUCTS_PER_PAGE
  };

  /* --------------------------- Render ---------------------------------- */
  function productCardHTML(p) {
    const imgHTML = p.image1
      ? `<img class="product-card__img" src="${p.image1}" alt="${escapeAttr(p.name)}" loading="lazy" decoding="async">`
      : `<div class="product-card__img product-card__img--placeholder">${escapeHTML(initial(p.name))}</div>`;
    return `
      <a href="product.html?id=${encodeURIComponent(p.code)}" class="product-card fade-in" aria-label="${escapeAttr(p.name)}">
        <div class="product-card__media">${imgHTML}</div>
        <div class="product-card__body">
          <div class="product-card__name">${escapeHTML(p.name)}</div>
          <div class="product-card__code">${escapeHTML(p.code)}</div>
        </div>
      </a>`;
  }

  function skeletonGridHTML(n) {
    let h = "";
    for (let i = 0; i < n; i++) {
      h += `
        <div class="product-card">
          <div class="product-card__media skeleton"></div>
          <div class="product-card__body">
            <div class="skeleton" style="height:1rem;width:70%;margin-bottom:6px;"></div>
            <div class="skeleton" style="height:0.75rem;width:40%;"></div>
          </div>
        </div>`;
    }
    return h;
  }

  function renderHeader(slug) {
    const cat = CONFIG.CATEGORIES.find(c => c.slug === slug);
    const name = cat ? cat.name : "Collection";

    const title = $("#cat-title");
    const crumb = $("#crumb-current");
    const docTitle = $("#page-title");

    if (title) title.textContent = name;
    if (crumb) crumb.textContent = name;
    if (docTitle) docTitle.textContent = `${name} — Quash`;
  }

  function renderNextPage() {
    const grid = $("#product-grid");
    const button = $("#load-more");
    const status = $("#loadmore-status");
    if (!grid) return;

    const start = state.rendered;
    const end = Math.min(start + state.pageSize, state.all.length);
    const slice = state.all.slice(start, end);

    // Append to existing grid (preserves already-loaded cards)
    grid.insertAdjacentHTML("beforeend", slice.map(productCardHTML).join(""));
    state.rendered = end;

    // Toggle controls
    const remaining = state.all.length - state.rendered;
    if (remaining <= 0) {
      button.classList.add("is-hidden");
      status.textContent = `Showing all ${state.all.length} products`;
    } else {
      button.classList.remove("is-hidden");
      status.textContent = `${state.rendered} of ${state.all.length} shown`;
    }
  }

  function renderEmpty() {
    const target = $("#empty-target");
    if (!target) return;
    target.innerHTML = `
      <div class="empty-state">
        <h3>This collection is being updated</h3>
        <p>New pieces will be added here soon. In the meantime, message us — we'll share what's available.</p>
      </div>`;
    $("#load-more").classList.add("is-hidden");
    $("#loadmore-status").textContent = "";
  }

  /* --------------------------- Settings hydration ---------------------- */
  async function hydrateSettings() {
    const s = await Data.getSettings();

    const waHref = Data.whatsappLink(s.whatsapp_number);
    const telHref = Data.telLink(s.phone_number);

    [
      "#nav-whatsapp",
      "#strip-whatsapp",
      "#footer-whatsapp",
      "#fab-whatsapp"
    ].forEach(id => {
      const el = $(id);
      if (el) { el.href = waHref; el.target = "_blank"; el.rel = "noopener noreferrer"; }
    });

    ["#strip-tel", "#footer-tel"].forEach(id => {
      const el = $(id);
      if (el) el.href = telHref;
    });

    if (s.phone_number) {
      const fp = $("#footer-phone"); if (fp) fp.textContent = s.phone_number;
      const dp = $("#drawer-phone"); if (dp) dp.textContent = s.phone_number;
    }
    if (s.business_hours) {
      const dh = $("#drawer-hours"); if (dh) dh.textContent = s.business_hours;
    }
    if (s.address) {
      const fa = $("#footer-address"); if (fa) fa.textContent = s.address;
    }
    const yearEl = $("#footer-year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  /* --------------------------- Mobile drawer --------------------------- */
  function wireDrawer() {
    const toggle = $("#nav-toggle");
    const close  = $("#nav-close");
    const drawer = $("#nav-drawer");
    if (!toggle || !drawer) return;

    const open = () => {
      drawer.classList.add("is-open");
      drawer.setAttribute("aria-hidden", "false");
      toggle.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    };
    const shut = () => {
      drawer.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    };
    toggle.addEventListener("click", open);
    if (close) close.addEventListener("click", shut);
    document.addEventListener("keydown", e => { if (e.key === "Escape") shut(); });
  }

  /* --------------------------- Utils ----------------------------------- */
  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }
  function escapeHTML(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function escapeAttr(s) { return escapeHTML(s); }
  function initial(s) { return (String(s || "Q").trim().charAt(0) || "Q").toUpperCase(); }

  /* --------------------------- Init ------------------------------------ */
  async function init() {
    wireDrawer();
    hydrateSettings();

    const slug = (getParam("cat") || "").toLowerCase().trim();
    if (!slug || !CONFIG.CATEGORIES.find(c => c.slug === slug)) {
      // Unknown category — redirect home
      window.location.replace("index.html#collections");
      return;
    }
    state.slug = slug;
    renderHeader(slug);

    // Show skeletons while fetching
    const grid = $("#product-grid");
    if (grid) grid.innerHTML = skeletonGridHTML(8);

    try {
      const list = await Data.getProductsByCategory(slug);
      state.all = list;

      // Clear skeletons before rendering
      if (grid) grid.innerHTML = "";

      if (!list.length) { renderEmpty(); return; }

      renderNextPage();

      const loadBtn = $("#load-more");
      if (loadBtn) loadBtn.addEventListener("click", renderNextPage);
    } catch (err) {
      console.error("[Quash] category render failed:", err);
      if (grid) grid.innerHTML = "";
      renderEmpty();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
