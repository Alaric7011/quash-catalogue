/* =========================================================================
   Quash — Site Configuration
   -------------------------------------------------------------------------
   This is the ONLY file the business owner / developer needs to update when
   the Google Sheet location or business contact defaults change.

   HOW TO CONNECT YOUR GOOGLE SHEET
   --------------------------------
   1. Open your Google Sheet (must have two tabs: "Products" and "Settings").
   2. File  →  Share  →  Publish to web.
   3. Under "Link":
        - Select the "Products" tab
        - Format: Comma-separated values (.csv)
        - Click Publish, copy the URL, paste it into PRODUCTS_CSV below.
      Then repeat for the "Settings" tab and paste into SETTINGS_CSV.
   4. Save. The site reads live from your sheet — no code changes needed
      when you add/remove products.

   PRODUCTS sheet columns (exact header names, lowercase):
     code | name | category | description | image1 | image2 | featured | active

   SETTINGS sheet columns:
     key | value
     Recommended keys:
       whatsapp_number  (digits only, with country code, e.g. 919876543210)
       phone_number     (display format, e.g. +91 98765 43210)
       address          (single line or use \n for line break)
       about_text       (paragraph for the About section)
       business_hours   (e.g. Mon–Sat, 10am–8pm)
       instagram_url    (optional)
   ========================================================================= */

const CONFIG = {
  // -- Google Sheets (published CSV URLs) --------------------------------
  SHEETS: {
    PRODUCTS_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS0aLhyvFgoKwm-9Ngwl1tK0rbZg4ROziljq1CP4_X-yXh5BJ7iHA7lmER-0aM70n6iBx7ubQpTzFdF/pub?gid=0&single=true&output=csv",
    SETTINGS_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS0aLhyvFgoKwm-9Ngwl1tK0rbZg4ROziljq1CP4_X-yXh5BJ7iHA7lmER-0aM70n6iBx7ubQpTzFdF/pub?gid=1189376026&single=true&output=csv"
  },

  // -- Fallback values used if Settings sheet is unreachable -------------
  // Also seed values you can show before the network resolves.
  DEFAULTS: {
    whatsapp_number: "919876543210",
    phone_number: "+91 98765 43210",
    address: "Shop 12, Fashion Street, Mumbai, Maharashtra 400001",
    about_text:
      "Quash crafts premium women's sandals for retailers across India. " +
      "Every pair is designed in-house with a focus on comfort, finish, and " +
      "trend-forward silhouettes — made for shops that demand consistency, " +
      "quality, and a fashion-first edge.",
    business_hours: "Mon – Sat, 10:00 AM – 8:00 PM",
    instagram_url: ""
  },

  // -- Categories (single source of truth for nav + category pages) ------
  // Adding a future category is just: append a row + start tagging products.
  CATEGORIES: [
    { slug: "belly",         name: "Belly" },
    { slug: "flat-sandals",  name: "Flat Sandals" },
    { slug: "daily-wear",    name: "Daily Wear" },
    { slug: "party-wear",    name: "Party Wear" }
  ],

  // -- Paging / display behavior -----------------------------------------
  PRODUCTS_PER_PAGE: 20,
  FEATURED_LIMIT: 8,
  RELATED_LIMIT: 4,

  // -- Branding ----------------------------------------------------------
  BRAND: {
    name: "Quash",
    tagline: "Premium wholesale women's sandals"
  }
};

// Freeze to prevent accidental runtime mutation.
Object.freeze(CONFIG);
Object.freeze(CONFIG.SHEETS);
Object.freeze(CONFIG.DEFAULTS);
Object.freeze(CONFIG.BRAND);
