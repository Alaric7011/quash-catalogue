/* =========================================================================
   Quash — Product Page Script
   -------------------------------------------------------------------------
   - Reads ?id= from the URL
   - Loads the product, renders gallery + info
   - WhatsApp button auto-fills: "Hi Quash, I'm interested in product [CODE]."
   - Renders Related (same category)
   ========================================================================= */

(function () {
  "use strict";

  const $  = (sel, root = document) => root.querySelector(sel);

  /* --------------------------- Render helpers -------------------------- */
  function imageBlock(src, alt) {
    if (!src) {
      return `<div class="product-detail__image product-detail__image--placeholder">${escapeHTML(initial(alt))}</div>`;
    }
    return `
      <div class="product-detail__image">
        <img src="${src}" alt="${escapeAttr(alt)}" loading="eager" decoding="async">
      </div>`;
  }

  function detailHTML(p) {
    const hasTwo = !!p.image2;
    const galleryClass = hasTwo ? "product-detail__gallery product-detail__gallery--double" : "product-detail__gallery";

    return `
      <div class="${galleryClass}">
        ${imageBlock(p.image1, p.name)}
        ${hasTwo ? imageBlock(p.image2, p.name + " — alternate view") : ""}
      </div>

      <div class="product-detail__info">
        <a href="category.html?cat=${encodeURIComponent(p.category)}" class="product-detail__category">${escapeHTML(p.categoryLabel)}</a>
        <h1 class="product-detail__name">${escapeHTML(p.name)}</h1>
        <div class="product-detail__code">Product Code · ${escapeHTML(p.code)}</div>
        <div class="product-detail__description">${escapeHTML(p.description) || "Hand-finished detail and premium materials. Reach out for full specifications and availability."}</div>

        <div class="product-detail__actions">
          <a href="#" class="btn btn--whatsapp" id="product-whatsapp">Inquire on WhatsApp</a>
          <a href="#" class="btn btn--ghost" id="product-tel">Call to Order</a>
        </div>

        <p class="product-detail__note">
          <strong>Wholesale only.</strong> Pricing and minimum order quantity shared on inquiry.
        </p>
      </div>
    `;
  }

  function relatedCardHTML(p) {
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

  function renderNotFound() {
    const section = $("#product-detail");
    if (!section) return;
    section.innerHTML = `
      <div class="product-notfound" style="grid-column: 1 / -1;">
        <h2>We couldn't find this product</h2>
        <p>It may have been retired from the catalogue, or the link is incorrect.</p>
        <a href="index.html#collections" class="btn btn--primary">Browse Collections</a>
      </div>`;
    const crumb = $("#crumb-current");
    if (crumb) crumb.textContent = "Not found";
  }

  /* --------------------------- Hydration ------------------------------- */
  async function wireWhatsAppAndTel(product, settings) {
    const waHref = Data.whatsappLink(settings.whatsapp_number, product ? product.code : null);
    const telHref = Data.telLink(settings.phone_number);

    [
      "#nav-whatsapp",
      "#product-whatsapp",
      "#sticky-whatsapp",
      "#footer-whatsapp",
      "#fab-whatsapp"
    ].forEach(id => {
      const el = $(id);
      if (el) { el.href = waHref; el.target = "_blank"; el.rel = "noopener noreferrer"; }
    });

    ["#product-tel", "#sticky-tel", "#footer-tel"].forEach(id => {
      const el = $(id);
      if (el) el.href = telHref;
    });
  }

  async function hydrateChrome(settings) {
    if (settings.phone_number) {
      const fp = $("#footer-phone"); if (fp) fp.textContent = settings.phone_number;
      const dp = $("#drawer-phone"); if (dp) dp.textContent = settings.phone_number;
    }
    if (settings.business_hours) {
      const dh = $("#drawer-hours"); if (dh) dh.textContent = settings.business_hours;
    }
    if (settings.address) {
      const fa = $("#footer-address"); if (fa) fa.textContent = settings.address;
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

    const settings = await Data.getSettings();
    hydrateChrome(settings);

    const code = (getParam("id") || "").toUpperCase().trim();
    if (!code) { renderNotFound(); wireWhatsAppAndTel(null, settings); return; }

    let product = null;
    try {
      product = await Data.getProductByCode(code);
    } catch (err) {
      console.error("[Quash] product fetch failed:", err);
    }

    if (!product) { renderNotFound(); wireWhatsAppAndTel(null, settings); return; }

    // Title / breadcrumb
    document.title = `${product.name} — Quash`;
    const crumbCat = $("#crumb-cat");
    if (crumbCat) {
      crumbCat.textContent = product.categoryLabel;
      crumbCat.href = `category.html?cat=${encodeURIComponent(product.category)}`;
    }
    const crumb = $("#crumb-current");
    if (crumb) crumb.textContent = product.name;

    // Detail
    const target = $("#product-detail");
    if (target) target.innerHTML = detailHTML(product);

    // Wire WhatsApp/tel with product code
    wireWhatsAppAndTel(product, settings);

    // Show sticky CTA on mobile
    const sticky = $("#sticky-cta");
    if (sticky) {
      sticky.hidden = false;
      document.body.classList.add("has-sticky-cta");
    }

    // Related
    const related = await Data.getRelated(product.code, product.category);
    if (related.length) {
      const grid = $("#related-grid");
      const section = $("#related-section");
      if (grid && section) {
        grid.innerHTML = related.map(relatedCardHTML).join("");
        section.hidden = false;
      }
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
