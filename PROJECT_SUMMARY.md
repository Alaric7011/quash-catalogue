# Quash Catalogue — Project Summary for Technical Review

> Compact handoff doc for an external AI engineer to review architecture and suggest improvements.

---

## 1. Project Overview

**What it is.** A premium, static, browser-only catalogue website for **Quash**, a wholesale women's sandals business. Retailers browse collections and inquire via WhatsApp or phone. Not e-commerce: no cart, checkout, accounts, payments, or stock.

**Main features.**
- Home page: hero, featured products, category showcase, about, testimonials, contact.
- Category page (`category.html?cat=<slug>`): grid of products in a category, "Load More" pagination (20/batch).
- Product page (`product.html?id=<code>`): gallery (1–2 images), description, WhatsApp + Call CTAs, related products.
- Sticky mobile CTA bar (WhatsApp + Call) on product page; floating WhatsApp FAB on other pages.
- All product/contact content fed live from a published Google Sheet (CSV).

**Status.** V1 complete and wired to a real Google Sheet; logo/hero/about images supplied. Ready for content load and deploy.

**Constraints / goals.**
- Premium fashion aesthetic (white + sage/light green + neutrals; serif headings); no startup vibe.
- Owner must update products without touching code (Google Sheets is the CMS).
- ~300–500 products expected.
- Vanilla HTML/CSS/JS only — no frameworks, no build step.
- Mobile-first; bulk of traffic expected on phones.
- Lightweight, fast, easy to maintain.

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Markup | Plain HTML5 (3 pages) | Static, SEO-friendly, no build needed |
| Styles | Plain CSS with custom properties | Themable via tokens; no Tailwind/Bootstrap by requirement |
| Scripts | Vanilla JS (ES2017+) | No framework constraint; small footprint |
| Fonts | Google Fonts — Playfair Display (serif) + Inter (sans) | Premium fashion typography pairing |
| CMS | Google Sheets "Publish to web" CSV endpoints | Owner edits like Excel; no auth/API key |
| Hosting (intended) | Netlify / Vercel / Cloudflare Pages | Static, free tier, HTTPS, custom domain |
| Image hosting | User-supplied URLs in Sheet (recommended: Cloudinary) | Avoids Drive's unreliable embed URLs |

**No build tools.** Files are served as-is. **No npm dependencies.** A custom CSV parser is inlined to avoid Papa Parse.

---

## 3. Folder & File Structure

```
Quash Footwear Catalogue/
├── index.html              Home page
├── category.html           Dynamic category page (uses ?cat=)
├── product.html            Dynamic product detail (uses ?id=)
├── README.md               Owner-facing setup guide
├── PROJECT_SUMMARY.md      (this doc)
├── css/
│   ├── style.css           Global: tokens, reset, type, nav, footer, buttons, card, FAB, utilities
│   ├── home.css            Home-only: hero, categories, about, testimonials, contact
│   ├── category.css        Category-only: cat-hero, breadcrumb, load-more, inquiry strip
│   └── product.css         Product-only: detail layout, gallery, sticky CTA bar
├── js/
│   ├── config.js           Sheet URLs, default settings, category list, paging constants
│   ├── data.js             CSV parsing, fetch + cache, query API, link builders
│   ├── home.js             Hydrates home: settings, featured, categories, drawer
│   ├── category.js         Reads ?cat=, filters products, renders Load More
│   └── product.js          Reads ?id=, renders detail + related, wires sticky CTA
└── assets/
    ├── logo-placeholder.png    Navbar logo (used as <img>)
    ├── icons/                  favicon.svg + WhatsApp/phone/arrow SVGs
    └── images/                 hero.png, about.png (brand photography)
```

### File-by-file responsibilities

**`js/config.js`** — Single source of truth for environment-ish data.
- Exports: global `const CONFIG` (frozen). Fields: `SHEETS.{PRODUCTS_CSV,SETTINGS_CSV}`, `DEFAULTS` (fallback settings), `CATEGORIES` (slug+name list), `PRODUCTS_PER_PAGE`, `FEATURED_LIMIT`, `RELATED_LIMIT`, `BRAND`.
- Depended on by: `data.js`, every page script.

**`js/data.js`** — IIFE module exposing global `const Data`.
- Internals: `parseCSV(text)` (RFC-style handling of quotes/commas/newlines), `normalizeProduct(row)`, `truthy()`, `slugify()`, `categoryName()`, in-flight `_productsPromise` / `_settingsPromise` (per-page-load memoization).
- Public API: `getProducts()`, `getSettings()`, `getProductByCode(code)`, `getProductsByCategory(slug)`, `getFeatured(limit?)`, `getRelated(currentCode, slug, limit?)`, `whatsappLink(number, productCode?)`, `telLink(number)`, `slugify()`, `categoryName()`.
- Depends on: `CONFIG`, native `fetch`.

**`js/home.js`, `js/category.js`, `js/product.js`** — Per-page orchestrators.
- Each: wire mobile drawer, hydrate settings into DOM (WhatsApp/tel hrefs, phone, address, hours, year), render that page's main view, render skeletons during fetch, handle empty/error states.
- Render functions are local string-template helpers (`productCardHTML`, `categoryTileHTML`, `detailHTML`, `relatedCardHTML`, `skeletonGridHTML`). Output is `innerHTML`-injected.
- Each is self-contained (no cross-page imports); duplication is intentional and small.

**`css/style.css`** — Globals only. Defines design tokens, base typography, nav/drawer, footer, buttons (`.btn--primary|sage|ghost|light|whatsapp|block|sm`), `.product-grid` + `.product-card` (shared across home, category, product/related), `.fab-whatsapp`, skeletons, fade-in, focus-visible, container, section helpers, responsive breakpoints (640 / 1024). All colors and spacing use CSS custom properties.

**Page CSS** — only the styles unique to that page. The product page duplicates `.breadcrumb` styles (same rules) so it doesn't need to load `category.css`. Tradeoff: tiny duplication to avoid cross-page CSS coupling.

**`index.html` / `category.html` / `product.html`** — share an identical navbar, mobile drawer, footer, and FAB structure (with appropriate `.is-active` shifts). Product page adds a sticky bottom CTA bar (mobile only via CSS).

---

## 4. Application Flow

### Boot
1. Browser loads `<page>.html`. Stylesheets and Google Fonts load via `<link>`.
2. Three scripts load in order at the end of `<body>`: `config.js` → `data.js` → `<page>.js`. All three define global `const`s (`CONFIG`, `Data`, and an IIFE that runs after `DOMContentLoaded`).
3. On `DOMContentLoaded`, the page-script runs an `init()` that: wires the mobile drawer, asks `Data` for settings + the data it needs, and renders.

### Data flow
```
Google Sheet (Products tab, Settings tab)
      │  (Publish to web → CSV URL)
      ▼
fetch(PRODUCTS_CSV) / fetch(SETTINGS_CSV)        ← memoized per page load
      │
      ▼
parseCSV() → headers lowercased → row objects
      │
      ▼
normalizeProduct() → typed object, filter on active===true
      │
      ▼
Page-specific query (getFeatured / getProductsByCategory / getProductByCode / getRelated)
      │
      ▼
Render function (template strings) → element.innerHTML = "..."
      │
      ▼
DOM with fade-in animation; settings populate CTAs + footer + drawer
```

### State management
- **No global app state.** Each page reloads from network on navigation.
- **Two in-flight Promises** in `data.js` (`_productsPromise`, `_settingsPromise`) deduplicate concurrent calls during a single page load.
- **No `localStorage`/`sessionStorage`** by V1 design (deliberately simple).
- **Render state** is implicit DOM after `innerHTML` writes. Category page keeps `state.rendered` and `state.all` as private vars for Load-More.

### User interaction
- Home: Hero CTA → `#collections` (smooth scroll) or WhatsApp deeplink. Category tile click → `category.html?cat=<slug>`. Featured card click → `product.html?id=<code>`.
- Category: Card click → product page. "Load More" appends the next 20 cards from in-memory list. Strip CTA → WhatsApp/tel.
- Product: WhatsApp button → `https://wa.me/<digits>?text=Hi%20Quash%2C%20I'm%20interested%20in%20product%20<CODE>.`. Tel button → `tel:<digits>`. Related card click → another product page.
- All pages: FAB and footer CTAs → WhatsApp/tel.

### Event flow
- Mobile drawer: `#nav-toggle` click → open; `#nav-close` click + drawer link click + `Escape` keydown → close; toggles `body.overflow`.
- Load more: button click → append next slice → update status text → hide button when exhausted.
- Product page: on successful product render, sets `body.has-sticky-cta` (CSS uses this to hide FAB on mobile and pad the footer).

### Module communication
Strict one-way: `CONFIG` is read everywhere; `Data` reads `CONFIG`; page scripts read both. No event bus, no pub/sub, no globals beyond `CONFIG` and `Data`.

---

## 5. Major Technical Decisions

| Decision | Why |
|---|---|
| **Vanilla JS, no framework** | Hard requirement; also: zero deps, no build, easiest long-term maintenance. |
| **Multi-page (3 HTML files) over SPA** | SEO + share-friendly URLs + simpler mental model; product/category pages can be statically crawled with their `?param`. |
| **Google Sheets "Publish to web" CSV (not Sheets API)** | No API key, no auth, no quota anxiety; owner already knows Sheets. |
| **Hand-rolled CSV parser (~30 LOC)** | Avoid the ~7KB Papa Parse dep; user requirement: no unnecessary libraries. Robust for quoted fields, embedded newlines, escaped quotes — tested. |
| **IIFE module pattern for `Data`** | Pre-ES-modules compatibility, lets closure hold `_productsPromise` without leaking. Avoids `import`/`export` (which require `type="module"` and stricter MIME types from local servers). |
| **In-flight Promise memoization, no localStorage caching** | Keeps freshness contract simple — every full page load reflects current Sheet state. Caching adds invalidation complexity that isn't justified at this scale. |
| **CSS custom-property design tokens** | Single change to retheme; allows fluid clamps for type (`clamp(2rem, 4vw, 3rem)`). |
| **Mobile-first CSS, breakpoints 640 / 1024** | Simpler base layer, additive complexity upward. Matches expected traffic mix. |
| **CSS Grid for product grid, Flex for component interiors** | Grid for 2D layout; Flex for one-axis alignment. Standard idiom. |
| **Load More button vs infinite scroll** | Easier accessibility, sane back-button behavior, no scroll listeners. With 20–500 items in memory, instant slicing. |
| **Skeleton placeholders during fetch** | Prevents layout shift; perceived perf > literal perf. |
| **Body class `has-sticky-cta` to control FAB visibility on product mobile** | Lets CSS solve a cross-component visibility problem without JS poking individual elements. |
| **Categories defined in `config.js`, not the Sheet** | They change rarely; baking them lets the navbar/footer render before the network resolves. New category = one-line code edit. |
| **Settings tab key-value (not columns)** | Lets the owner add new keys without schema changes; gracefully merges with `CONFIG.DEFAULTS`. |
| **Logo as `<img>` rather than inline SVG** | Owner can swap a file without editing markup; same for hero/about images. |
| **WhatsApp deeplink format `https://wa.me/<digits>?text=...`** | Works on web + mobile, opens app where installed. |
| **No analytics / no service worker in V1** | Out of scope; aesthetic + content correctness first. |

---

## 6. Current Problems / Limitations

**Known limitations.**
- Sheet's published CSV URL is publicly readable. Acceptable here (no prices, no PII) but worth noting.
- No retry/backoff on fetch failure — single attempt, then fallback to defaults/empty state.
- No `localStorage` caching: each fresh tab/reload re-fetches both CSVs (~30–100KB each at 500 products). Acceptable, but every category browse pays the cost.
- Image URLs are owner-supplied raw strings. No fallback if a URL 404s mid-grid; the broken-image icon shows.
- Testimonials are hardcoded in `index.html` (not in the Sheet) — owner edits HTML to change them.
- No SEO sitemap. Product pages are crawlable via URL but not enumerated anywhere static.
- No structured data (`Product` JSON-LD) on product pages.
- No OG image set per product (only site-level on home).
- `assets/images/hero2.png` is unreferenced (dead asset).
- Phone displayed inside the footer link uses a `<span>` inside an `<a>` — works, slightly awkward markup.

**Code-quality areas to watch.**
- Three page scripts each define near-identical helpers: `escapeHTML`, `escapeAttr`, `initial`, mobile-drawer wiring, settings hydration. ~80 LOC of duplication. Tradeoff: simplicity (no shared module) vs DRY.
- Breadcrumb CSS duplicated across `category.css` and `product.css`.
- `state` in `category.js` is module-private but lives on a `let` — fine for a single category at a time, but couples render to fetch order. No bug today.

**Performance.**
- Every navigation re-runs fetch + parse + render. For 500 products at ~150 bytes/row + headers, total payload is ~80KB per page — fine, but cumulative across browsing.
- Google Fonts loaded synchronously (blocking) — `display=swap` is set so FOUT not FOIT.
- No `srcset` / `<picture>` for responsive images. Mobile downloads desktop-sized images.
- PNG hero/about not converted to WebP/AVIF.

**Areas I'm unsure about.**
- Whether the Sheet's HTTP cache (~5 min) is fast enough for the owner's expectation of "I edited it, refresh, it shows."
- Whether the hand-rolled CSV parser will survive every weird thing an owner pastes into the Sheet (emoji is fine; some odd Excel-from-Mac line-endings might not be — untested).
- How well the "Load More" UX scales at the upper end (e.g., 80+ items rendered in one column on mobile).

---

## 7. Reusable Code Snippets

**CSV parser core (in `data.js`).** RFC-style; handles `"a, b"`, `"line1\nline2"`, `""` escaping.
```js
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
```

**Memoized fetch.** Same pattern for `getSettings`.
```js
let _productsPromise = null;
async function getProducts() {
  if (!_productsPromise) {
    _productsPromise = fetchCSV(CONFIG.SHEETS.PRODUCTS_CSV)
      .then(rows => rows.map(normalizeProduct).filter(p => p.active && p.code && p.name))
      .catch(err => { console.warn(err); return []; });
  }
  return _productsPromise;
}
```

**WhatsApp link builder.**
```js
function whatsappLink(number, productCode) {
  const digits = String(number || "").replace(/[^\d]/g, "");
  const message = productCode
    ? `Hi Quash, I'm interested in product ${productCode}.`
    : "Hi Quash, I'd like to know more about your collection.";
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
```

**Mobile drawer wiring (duplicated in 3 page scripts).**
```js
toggle.addEventListener("click", () => {
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  toggle.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
});
document.addEventListener("keydown", e => { if (e.key === "Escape") shut(); });
```

---

## 8. Improvement Opportunities

**Performance.**
- Cache products + settings in `localStorage` with a 5–15 min TTL; serve cached instantly, revalidate in background. Cuts perceived nav cost to ~0.
- Convert hero/about PNG → WebP/AVIF; add `srcset` / `sizes` for responsive sizing.
- Recommend (and enforce in README) Cloudinary URLs with `f_auto,q_auto,w_<width>` transformations so product images are right-sized per device.
- Preconnect to the Sheet host (`docs.google.com`) so the first fetch is faster.

**Architecture / maintainability.**
- Extract a tiny `js/shared.js`: `$`, `$$`, `escapeHTML`, `escapeAttr`, `initial`, mobile-drawer wiring, settings hydration. Load before each page script. Eliminates ~80 LOC of duplication without introducing a build step.
- Move testimonials to a third Sheet tab (or extend Settings with `testimonial_1_name`, etc.) so the owner controls them.
- Add a `Categories` tab to the Sheet (slug/name/order/hero image/description). Currently categories are baked in `config.js`. Sheet-driven categories make adding "Heels" or "Bridal" code-free.

**SEO.**
- Per-product `<title>`, `<meta description>`, OpenGraph image (the first product image), JSON-LD `Product` schema (no `offers`).
- Generate `sitemap.xml` at build/deploy (small Node script run by CI) so search engines can enumerate `product.html?id=…` URLs.
- Server-side render product pages later if SEO becomes a priority (Cloudflare Pages function or Astro pre-render). Currently the title is set after JS runs — Googlebot handles JS but not all crawlers do.

**UX.**
- Image gallery: support 1–N images per product (currently capped at 2). Tap to zoom on mobile (lightweight, ~30 LOC).
- Sticky CTA bar could also appear on the category page when the inquiry strip scrolls past.
- "Recently viewed" strip on home (read from `localStorage`) — low-effort retention nudge.
- Subtle scroll-driven reveal animation on Featured/Categories using `IntersectionObserver` (single observer, perf-cheap).

**Resilience.**
- Add a retry-once with backoff for the CSV fetch.
- If `image1` 404s, fall back to a sage-gradient placeholder via `onerror`.
- Surface a small toast/banner ("Updating catalogue…") when fetch fails but cache exists.

**Accessibility.**
- The drawer should trap focus while open.
- The product gallery image needs a more descriptive `alt` than the product name (it could say "Pearl Belly sandal — alternate view from above" via a third Sheet column, optional).
- The hero image's `alt` text is generic; could come from the Sheet.

**Scalability (toward 500+ products).**
- If single-page navigation becomes desirable, swap to client-side routing with `history.pushState` and a single shell — still no framework. Saves the re-fetch + re-render on each navigation.
- If `Load More` feels slow on low-end devices at 100+ DOM nodes per render, virtualize the grid (intersection-based recycling).

---

## 9. Questions for Technical Review

1. **Caching strategy.** Is per-page-load fetch acceptable for ~500 products at expected traffic (handful of bulk-buyer sessions per day), or should we add `localStorage` + stale-while-revalidate? What TTL is right given the owner's "I edit, then refresh" expectation?

2. **CSV vs Sheets API.** Are there real-world failure modes for "Publish to web" CSV (rate limits, propagation delay, format quirks) that argue for the Sheets API with a build-time fetch instead?

3. **Image hosting.** For a non-technical owner managing ~500 images, what's the simplest pipeline that still delivers responsive WebP at the edge? Cloudinary unsigned uploads from a custom URL? ImageKit? A monthly batch via Drive → Cloudinary auto-sync?

4. **Multi-page vs SPA.** At what point does the per-navigation re-fetch + re-render hurt enough to justify a client-side router on top of the same files?

5. **SEO.** Given Google Sheets is the source of truth, what's the lowest-effort way to get crawlable, statically-rendered product pages? (Static site generator that consumes the same CSV at build time? Cloudflare Pages with a build hook on Sheet edit?)

6. **Hand-rolled CSV parser risks.** What inputs would break it that a real parser wouldn't (Excel BOM is handled; what about CR-only line endings, NBSP whitespace in numeric flags, fields containing a single `"`)? Is the ~30 LOC saved worth the long-tail risk?

7. **DRY across page scripts.** Is a single `shared.js` worth introducing, or does the duplication keep each page comprehensible and decoupled in a way that helps over time?

8. **Analytics.** WhatsApp click-through is the conversion event. What's the right lightweight tracker (Plausible? a `wa.me`-redirect through a logging endpoint?) that respects privacy and survives WhatsApp's own redirect chain?

9. **Sheet schema evolution.** As features grow, is there a better way to model "settings + content" than two tabs, without introducing a real CMS?

10. **Accessibility audit.** Anything I'd predictably miss with this hand-rolled approach — particularly around the drawer, the Load-More live region, and the sticky bottom CTA bar's interaction with the floating WhatsApp button?
