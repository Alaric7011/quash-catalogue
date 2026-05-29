/* =========================================================================
   Quash — Data Layer
   -------------------------------------------------------------------------
   Responsibilities:
     1. Fetch Products + Settings CSV from Google Sheets.
     2. Parse CSV into clean JS objects.
     3. Provide a small, consistent query API to the page scripts.
     4. Build outbound WhatsApp / tel links.

   This file has no DOM access. Pages call it; it returns data.
   Depends on: config.js (must load first in HTML).
   ========================================================================= */

const Data = (() => {

  /* ----------------------------------------------------------------------
     CSV parser
     Handles quoted fields, embedded commas, embedded newlines, and "" -> "
     Returns: Array<Record<string,string>>  (header row becomes keys)
  ---------------------------------------------------------------------- */
  function parseCSV(text) {
    const rows = [];
    let field = "";
    let row = [];
    let inQuotes = false;
    let i = 0;

    // Strip BOM if present.
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

    while (i < text.length) {
      const ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += ch; i++; continue;
      }

      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === ",") { row.push(field); field = ""; i++; continue; }
      if (ch === "\r") { i++; continue; }
      if (ch === "\n") {
        row.push(field); rows.push(row);
        field = ""; row = []; i++; continue;
      }
      field += ch; i++;
    }
    // Flush final field/row if file doesn't end in newline.
    if (field.length || row.length) { row.push(field); rows.push(row); }

    if (rows.length === 0) return [];

    const headers = rows[0].map(h => h.trim().toLowerCase());
    return rows.slice(1)
      .filter(r => r.some(cell => (cell || "").trim() !== ""))
      .map(r => {
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = (r[idx] || "").trim(); });
        return obj;
      });
  }

  /* ----------------------------------------------------------------------
     Helpers
  ---------------------------------------------------------------------- */
  function truthy(v) {
    const s = String(v || "").trim().toLowerCase();
    return s === "true" || s === "yes" || s === "1" || s === "y";
  }

  function slugify(s) {
    return String(s || "")
      .toLowerCase()
      .trim()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function categoryName(slug) {
    const found = CONFIG.CATEGORIES.find(c => c.slug === slug);
    return found ? found.name : slug;
  }

  /* ----------------------------------------------------------------------
     Normalization — turn raw CSV row into a product object
  ---------------------------------------------------------------------- */
  function normalizeProduct(row) {
    return {
      code:        (row.code || "").toUpperCase(),
      name:        row.name || "",
      category:    slugify(row.category),
      categoryLabel: categoryName(slugify(row.category)),
      description: row.description || "",
      image1:      row.image1 || "",
      image2:      row.image2 || "",
      featured:    truthy(row.featured),
      active:      truthy(row.active)
    };
  }

  /* ----------------------------------------------------------------------
     Fetchers
  ---------------------------------------------------------------------- */
  async function fetchCSV(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Sheet fetch failed: " + res.status);
    const text = await res.text();
    return parseCSV(text);
  }

  // Cache for the duration of the page load (re-fetched on full reload).
  let _productsPromise = null;
  let _settingsPromise = null;
  let _categoriesPromise = null;

  async function getProducts() {
    if (!_productsPromise) {
      _productsPromise = fetchCSV(CONFIG.SHEETS.PRODUCTS_CSV)
        .then(rows => rows
          .map(normalizeProduct)
          .filter(p => p.active && p.code && p.name)
        )
        .catch(err => {
          console.warn("[Quash] Could not load products:", err);
          return [];
        });
    }
    return _productsPromise;
  }

  async function getCategories() {
    if (!_categoriesPromise) {
      const url = (CONFIG.SHEETS && CONFIG.SHEETS.CATEGORIES_CSV) || "";
      // If the Categories tab hasn't been published yet, use the config fallback.
      if (!url || /REPLACE_WITH/i.test(url)) {
        _categoriesPromise = Promise.resolve(
          (CONFIG.CATEGORIES || []).map(c => ({
            slug: c.slug, name: c.name, image: c.image || "", order: 0, active: true
          }))
        );
      } else {
        _categoriesPromise = fetchCSV(url)
          .then(rows => rows
            .filter(r => (r.slug || "").trim())
            .map(r => ({
              slug:   (r.slug  || "").toLowerCase().trim(),
              name:   r.name   || "",
              image:  r.image  || "",
              order:  Number(r.order) || 0,
              active: truthy(r.active)
            }))
            .filter(c => c.active)
            .sort((a, b) => a.order - b.order)
          )
          .catch(err => {
            console.warn("[Quash] Could not load categories, using fallback:", err);
            return (CONFIG.CATEGORIES || []).map(c => ({
              slug: c.slug, name: c.name, image: c.image || "", order: 0, active: true
            }));
          });
      }
    }
    return _categoriesPromise;
  }

  async function getSettings() {
    if (!_settingsPromise) {
      _settingsPromise = fetchCSV(CONFIG.SHEETS.SETTINGS_CSV)
        .then(rows => {
          const settings = { ...CONFIG.DEFAULTS };
          rows.forEach(r => {
            const k = (r.key || "").trim().toLowerCase();
            const v = (r.value || "").trim();
            if (k && v) settings[k] = v;
          });
          return settings;
        })
        .catch(err => {
          console.warn("[Quash] Could not load settings, using defaults:", err);
          return { ...CONFIG.DEFAULTS };
        });
    }
    return _settingsPromise;
  }

  /* ----------------------------------------------------------------------
     Queries
  ---------------------------------------------------------------------- */
  async function getProductByCode(code) {
    if (!code) return null;
    const products = await getProducts();
    const target = code.toUpperCase();
    return products.find(p => p.code === target) || null;
  }

  async function getProductsByCategory(slug) {
    const products = await getProducts();
    return products.filter(p => p.category === slug);
  }

  async function getFeatured(limit) {
    const products = await getProducts();
    const lim = limit || CONFIG.FEATURED_LIMIT;
    return products.filter(p => p.featured).slice(0, lim);
  }

  async function getRelated(currentCode, categorySlug, limit) {
    const lim = limit || CONFIG.RELATED_LIMIT;
    const list = await getProductsByCategory(categorySlug);
    return list
      .filter(p => p.code !== (currentCode || "").toUpperCase())
      .slice(0, lim);
  }

  /* ----------------------------------------------------------------------
     Outbound link builders
  ---------------------------------------------------------------------- */
  function whatsappLink(number, productCode) {
    const digits = String(number || "").replace(/[^\d]/g, "");
    const message = productCode
      ? `Hi Quash, I'm interested in product ${productCode}.`
      : "Hi Quash, I'd like to know more about your collection.";
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }

  function telLink(number) {
    return `tel:${String(number || "").replace(/\s+/g, "")}`;
  }

  /* ----------------------------------------------------------------------
     Public API
  ---------------------------------------------------------------------- */
  return {
    // queries
    getProducts,
    getSettings,
    getCategories,
    getProductByCode,
    getProductsByCategory,
    getFeatured,
    getRelated,
    // helpers
    whatsappLink,
    telLink,
    slugify,
    categoryName
  };
})();
