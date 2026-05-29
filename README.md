# Quash — Wholesale Catalogue Site

Premium static catalogue site for **Quash**, a wholesale women's sandals business. Built with plain HTML, CSS and vanilla JavaScript. All product data is loaded live from a Google Sheet — no backend, no build step.

---

## How it works

- `index.html` — Home (hero, featured, categories, about, testimonials, contact)
- `category.html?cat=<slug>` — Lists products for a category (20 per page, Load More)
- `product.html?id=<code>` — Single product detail with WhatsApp + Call CTAs
- `admin/` — Password-gated admin panel for adding & editing products (see `admin/apps-script/README.md`)

Products and contact info come from a published Google Sheet (CSV). The owner edits the Sheet; the website reflects the change on next page load.

---

## Connecting the Google Sheet (one-time setup)

1. **Create a Google Sheet** with two tabs named exactly `Products` and `Settings`.

2. **Products tab** — first row must be these column headers (lowercase):
   ```
   code | name | category | description | image1 | image2 | featured | active
   ```
   - `code` — unique ID, e.g. `QSH-001`
   - `category` — one of: `belly`, `flat-sandals`, `daily-wear`, `party-wear`
   - `image1` / `image2` — public image URLs (recommend Cloudinary)
   - `featured` / `active` — `TRUE` or `FALSE`

3. **Settings tab** — two columns: `key` and `value`. Recommended keys:
   ```
   whatsapp_number  919876543210
   phone_number     +91 98765 43210
   address          Shop 12, Fashion Street, Mumbai
   business_hours   Mon – Sat, 10:00 AM – 8:00 PM
   about_text       Quash crafts premium women's sandals...
   ```

4. **Publish to web:** `File → Share → Publish to web`
   - Select the `Products` tab, format **CSV**, click Publish, copy the URL.
   - Repeat for the `Settings` tab.

5. **Paste both URLs** into `js/config.js`:
   ```js
   SHEETS: {
     PRODUCTS_CSV: "https://docs.google.com/spreadsheets/d/e/.../pub?gid=0&single=true&output=csv",
     SETTINGS_CSV: "https://docs.google.com/spreadsheets/d/e/.../pub?gid=1&single=true&output=csv"
   }
   ```

That's it. Edits in the Sheet appear on the site within ~1–5 minutes (Google's publish cache).

---

## Adding a new category later

1. Add the category in `js/config.js` under `CONFIG.CATEGORIES`:
   ```js
   { slug: "heels", name: "Heels" }
   ```
2. Use the same slug in the `category` column of any product row.

The navbar dropdown, homepage tiles, and category pages all read from this list.

---

## Image hosting recommendation

Use **Cloudinary** (free tier, drag-and-drop upload). Paste the resulting URL into `image1` / `image2`. Avoid using Google Drive links — they're slow and unreliable for image embedding.

---

## Folder structure

```
quash/
├── index.html
├── category.html
├── product.html
├── README.md
├── css/
│   ├── style.css       (global tokens, nav, footer, cards)
│   ├── home.css
│   ├── category.css
│   └── product.css
├── js/
│   ├── config.js       (Sheet URLs, categories, defaults)
│   ├── data.js         (fetch + CSV parse + queries)
│   ├── home.js
│   ├── category.js
│   └── product.js
└── assets/
    ├── images/
    ├── icons/
    └── logo-placeholder.svg
```

---

## Deploying

Drag the folder onto **Netlify**, **Vercel**, or **Cloudflare Pages** — all three offer free hosting with HTTPS and custom domains. No build step needed.

---

## WhatsApp inquiry message

Auto-filled on product pages as:

> Hi Quash, I'm interested in product **[PRODUCT CODE]**.

The phone number used for WhatsApp comes from the `whatsapp_number` row in the Settings tab (digits only, with country code).
