/* =========================================================================
   Quash Admin — Shared DOM Helpers
   -------------------------------------------------------------------------
   Tiny utilities used across admin pages: $, toast, busy state, escapers.
   ========================================================================= */

const AdminUI = (() => {
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function escapeHTML(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function escapeAttr(s) { return escapeHTML(s); }

  /** Toast notifications — single container, auto-dismissing. */
  function ensureToastHost() {
    let host = $("#toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "toast-host";
      host.className = "toast-host";
      document.body.appendChild(host);
    }
    return host;
  }
  function toast(message, kind) {
    const host = ensureToastHost();
    const el = document.createElement("div");
    el.className = "toast toast--" + (kind || "info");
    el.textContent = message;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-shown"));
    setTimeout(() => {
      el.classList.remove("is-shown");
      setTimeout(() => el.remove(), 250);
    }, kind === "error" ? 4500 : 2800);
  }

  /** Toggle a button into a "busy" / loading state. */
  function setBusy(btn, isBusy, busyLabel) {
    if (!btn) return;
    if (isBusy) {
      btn.dataset.label = btn.textContent;
      btn.textContent = busyLabel || "Working…";
      btn.disabled = true;
      btn.classList.add("is-busy");
    } else {
      if (btn.dataset.label) btn.textContent = btn.dataset.label;
      delete btn.dataset.label;
      btn.disabled = false;
      btn.classList.remove("is-busy");
    }
  }

  /** Format category slug -> display name using public CONFIG.CATEGORIES. */
  function categoryName(slug) {
    if (typeof CONFIG !== "undefined" && CONFIG.CATEGORIES) {
      const c = CONFIG.CATEGORIES.find(x => x.slug === slug);
      if (c) return c.name;
    }
    return slug;
  }

  return { $, $$, escapeHTML, escapeAttr, toast, setBusy, categoryName };
})();
