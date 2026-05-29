/* =========================================================================
   Quash Admin — Configuration
   -------------------------------------------------------------------------
   Fill in the three values below after deploying the Apps Script backend.
   See admin/apps-script/README.md for the full setup.
   ========================================================================= */

const ADMIN_CONFIG = {
  // The Apps Script Web App URL (ends with /exec). From Code.gs deployment.
  API_URL: "https://script.google.com/macros/s/AKfycbwjAJ1JOautZNJ6ZuvcOgWQBcWV8XC488Bz-azzz6z5G67UbEfWFHcud0Vmvs8kze1kAA/exec",

  // Same string as API_SECRET in Code.gs.
  API_SECRET: "8f3c1b2d7a9e4c6f1a8d5e2b9c7f0a4d6e3b1c9f8a2d5e7c4b6f0a1d9e8c3b7",

  // SHA-256 hex hash of the admin password. See README for how to generate.
  ADMIN_PASSWORD_HASH:
    "0b413839308c54aa7330012e44ff6bc543ac5a53187f7c9606cab78694442dbb",

  // How long to keep the admin "logged in" within a browser session.
  // (Cleared automatically when the tab closes — uses sessionStorage.)
  SESSION_KEY: "quash_admin_authed",

  // Image upload: client-side resize cap (keeps payloads small).
  MAX_IMAGE_WIDTH: 1600,
  IMAGE_JPEG_QUALITY: 0.85
};

Object.freeze(ADMIN_CONFIG);
