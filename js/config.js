const CONFIG = {
  // -- Google Sheets (published CSV URLs) --------------------------------
  SHEETS: {
    PRODUCTS_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS0aLhyvFgoKwm-9Ngwl1tK0rbZg4ROziljq1CP4_X-yXh5BJ7iHA7lmER-0aM70n6iBx7ubQpTzFdF/pub?gid=0&single=true&output=csv",
    SETTINGS_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS0aLhyvFgoKwm-9Ngwl1tK0rbZg4ROziljq1CP4_X-yXh5BJ7iHA7lmER-0aM70n6iBx7ubQpTzFdF/pub?gid=1189376026&single=true&output=csv",
    // Leave as empty string until you publish the Categories tab.
    // When empty, the site uses the CATEGORIES array below as fallback.
    CATEGORIES_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS0aLhyvFgoKwm-9Ngwl1tK0rbZg4ROziljq1CP4_X-yXh5BJ7iHA7lmER-0aM70n6iBx7ubQpTzFdF/pub?gid=941870596&single=true&output=csv"
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

  // -- Categories (fallback only — admin manages categories via the Sheet)
  // The CATEGORIES_CSV URL above is the live source. This list is used:
  //   (a) before the network resolves, and
  //   (b) if the Sheet fetch fails.
  // Keep this in rough sync with what's in the Categories tab.
  // `image` is OPTIONAL. Drop a file into assets/images/ and point to it.
  CATEGORIES: [
    { slug: "belly",         name: "Belly",        image: "assets/images/cat-belly.png" },
    { slug: "flat-sandals",  name: "Flat Sandals", image: "assets/images/cat-flat-sandals.png" },
    { slug: "daily-wear",    name: "Daily Wear",   image: "assets/images/cat-daily-wear.png" },
    { slug: "party-wear",    name: "Party Wear",   image: "assets/images/cat-party-wear.png" }
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