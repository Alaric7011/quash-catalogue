/* =========================================================================
   Quash — Home Page Script
   -------------------------------------------------------------------------
   Responsibilities:
     1. Hydrate settings (WhatsApp, phone, address, about) into the DOM
     2. Render featured products from the Sheet
     3. Render category tiles from CONFIG.CATEGORIES
     4. Wire mobile nav drawer
   ========================================================================= */

(function () {
  "use strict";

  /* --------------------------- DOM helpers ----------------------------- */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* --------------------------- Render: cards --------------------------- */
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
      </a>
    `;
  }

  function categoryTileHTML(cat) {
    return `
      <a href="category.html?cat=${encodeURIComponent(cat.slug)}" class="category-tile fade-in" aria-label="View ${escapeAttr(cat.name)}">
        <div class="category-tile__bg">
          <span class="category-tile__bg-letter">${escapeHTML(cat.name.charAt(0))}</span>
        </div>
        <div class="category-tile__overlay"></div>
        <div class="category-tile__content">
          <div class="category-tile__name">${escapeHTML(cat.name)}</div>
          <span class="category-tile__cta">Explore</span>
        </div>
      </a>
    `;
  }

  /* --------------------------- Render: sections ------------------------ */
  function skeletonCardsHTML(n) {
    let html = "";
    for (let i = 0; i < n; i++) {
      html += `
        <div class="product-card">
          <div class="product-card__media skeleton"></div>
          <div class="product-card__body">
            <div class="skeleton" style="height:1rem;width:70%;margin-bottom:6px;"></div>
            <div class="skeleton" style="height:0.75rem;width:40%;"></div>
          </div>
        </div>`;
    }
    return html;
  }

  async function renderFeatured() {
    const grid = $("#featured-grid");
    if (!grid) return;

    grid.innerHTML = skeletonCardsHTML(4);

    const featured = await Data.getFeatured();
    if (!featured.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <h3>Our new collection is on its way</h3>
          <p>In the meantime, get in touch and we'll share the catalogue with you.</p>
        </div>`;
      return;
    }
    grid.innerHTML = featured.map(productCardHTML).join("");
  }

  function renderCategories() {
    const grid = $("#categories-grid");
    if (!grid) return;
    grid.innerHTML = CONFIG.CATEGORIES.map(categoryTileHTML).join("");
  }

  /* --------------------------- Hydrate: settings ----------------------- */
  async function hydrateSettings() {
    const s = await Data.getSettings();

    // About text
    const aboutEl = $("#about-text");
    if (aboutEl && s.about_text) aboutEl.textContent = s.about_text;

    // Address / hours
    const addr = $("#contact-address");
    if (addr && s.address) addr.textContent = s.address;
    const hours = $("#contact-hours");
    if (hours && s.business_hours) hours.textContent = s.business_hours;

    // Phone displays
    const phoneTargets = ["#footer-phone", "#drawer-phone"];
    phoneTargets.forEach(id => {
      const el = $(id);
      if (el && s.phone_number) el.textContent = s.phone_number;
    });
    const drawerHours = $("#drawer-hours");
    if (drawerHours && s.business_hours) drawerHours.textContent = s.business_hours;

    // Footer
    const footerAddr = $("#footer-address");
    if (footerAddr && s.address) footerAddr.textContent = s.address;
    const yearEl = $("#footer-year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // CTAs (WhatsApp + tel) — set on every relevant element
    const waHref = Data.whatsappLink(s.whatsapp_number);
    const telHref = Data.telLink(s.phone_number);

    [
      "#nav-whatsapp",
      "#hero-whatsapp",
      "#contact-whatsapp",
      "#footer-whatsapp",
      "#fab-whatsapp"
    ].forEach(id => {
      const el = $(id);
      if (el) {
        el.href = waHref;
        el.target = "_blank";
        el.rel = "noopener noreferrer";
      }
    });

    ["#contact-tel", "#footer-tel"].forEach(id => {
      const el = $(id);
      if (el) el.href = telHref;
    });

    // Display phone on the tel anchors (link text in #contact-tel)
    const contactTel = $("#contact-tel");
    if (contactTel && s.phone_number) contactTel.textContent = s.phone_number;
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
    $$(".nav__drawer-link", drawer).forEach(a => a.addEventListener("click", shut));
    document.addEventListener("keydown", e => { if (e.key === "Escape") shut(); });
  }

  /* --------------------------- Utilities ------------------------------- */
  function escapeHTML(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function escapeAttr(s) { return escapeHTML(s); }
  function initial(s) { return (String(s || "Q").trim().charAt(0) || "Q").toUpperCase(); }

  /* --------------------------- Init ------------------------------------ */
  document.addEventListener("DOMContentLoaded", () => {
    wireDrawer();
    renderCategories();
    hydrateSettings();
    renderFeatured();
  });
})();
