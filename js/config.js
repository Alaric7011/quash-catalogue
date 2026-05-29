const CONFIG = {
  // -- Google Sheets (published CSV URLs) --------------------------------
  SHEETS: {
    PRODUCTS_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS0aLhyvFgoKwm-9Ngwl1tK0rbZg4ROziljq1CP4_X-yXh5BJ7iHA7lmER-0aM70n6iBx7ubQpTzFdF/pub?gid=0&single=true&output=csv",
    SETTINGS_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS0aLhyvFgoKwm-9Ngwl1tK0rbZg4ROziljq1CP4_X-yXh5BJ7iHA7lmER-0aM70n6iBx7ubQpTzFdF/pub?gid=1189376026&single=true&output=csv"
  },

  // -- Fallback values used if Settings sheet is unreachable -------------
  // Also seed values you can show before the network resolves.
  DEFAULTS: {
    whatsapp_number: "+91 85953 73993",
    phone_number: "+91 85953 73993",
    address: "Quash Footwear, Ballimaran",
    about_text:
      "Quash Footwear crafts premium women's sandals for retailers across India. " +
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
    name: "Quash Footwear",
    tagline: "Premium wholesale women's Footwear collection"
  }
};

// Freeze to prevent accidental runtime mutation.
Object.freeze(CONFIG);
Object.freeze(CONFIG.SHEETS);
Object.freeze(CONFIG.DEFAULTS);
Object.freeze(CONFIG.BRAND);