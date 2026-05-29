/* =========================================================================
   Quash Admin — Google Apps Script Backend
   -------------------------------------------------------------------------
   Deploy this script as a Web App from the same Google account that owns
   the Quash Products spreadsheet. The admin panel sends signed POST
   requests here; this script writes to the sheet and uploads images
   to a designated Drive folder.

   Setup instructions live in apps-script/README.md.
   ========================================================================= */

// ===== CONFIG — fill these in before deploying ==========================
const SHEET_ID        = "REPLACE_WITH_SHEET_ID";       // Spreadsheet ID (from its URL)
const PRODUCTS_TAB    = "Products";                    // Tab name (must match)
const DRIVE_FOLDER_ID = "REPLACE_WITH_FOLDER_ID";      // Drive folder for product images
const API_SECRET      = "REPLACE_WITH_LONG_RANDOM_STRING"; // Shared secret with admin/js/config.js
const CODE_PREFIX     = "QSH-";
const CODE_PAD        = 3;                             // QSH-001, QSH-002, ...
// =========================================================================


/**
 * Main POST entry point. All admin actions route through here.
 * Request body is JSON sent as text/plain (to avoid CORS preflight).
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");

    // Auth check
    if (payload.secret !== API_SECRET) {
      return json({ ok: false, error: "unauthorized" });
    }

    switch (payload.action) {
      case "ping":          return json({ ok: true, pong: true });
      case "nextCode":      return json({ ok: true, code: nextCode_() });
      case "addProduct":    return json(addProduct_(payload));
      case "updateProduct": return json(updateProduct_(payload));
      case "uploadImage":   return json(uploadImage_(payload));
      default:              return json({ ok: false, error: "unknown_action" });
    }
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

/**
 * GET — useful for browser-side connection test. Just confirms the script
 * is deployed and reachable. Doesn't expose any data.
 */
function doGet() {
  return json({ ok: true, service: "quash-admin", time: new Date().toISOString() });
}

// ===== Actions ==========================================================

/** Compute next product code by scanning the code column. */
function nextCode_() {
  const sheet = sheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return CODE_PREFIX + pad_(1);

  const codes = sheet.getRange(2, 1, lastRow - 1, 1).getValues().map(r => String(r[0] || ""));
  let max = 0;
  codes.forEach(c => {
    const m = c.match(new RegExp("^" + escapeRegex_(CODE_PREFIX) + "(\\d+)$", "i"));
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  });
  return CODE_PREFIX + pad_(max + 1);
}

/** Append a new product row. Code is generated server-side (atomic). */
function addProduct_(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = sheet_();
    const code = nextCode_();
    // Columns: code | name | category | description | image1 | image2 | featured | active
    sheet.appendRow([
      code,
      String(p.name || ""),
      String(p.category || ""),
      String(p.description || ""),
      String(p.image1 || ""),
      String(p.image2 || ""),
      p.featured ? "TRUE" : "FALSE",
      "TRUE"   // newly created products are always active
    ]);
    return { ok: true, code: code };
  } finally {
    lock.releaseLock();
  }
}

/** Update an existing product row, found by code. */
function updateProduct_(p) {
  const sheet = sheet_();
  const code = String(p.code || "").toUpperCase();
  if (!code) return { ok: false, error: "missing_code" };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: false, error: "not_found" };

  const codes = sheet.getRange(2, 1, lastRow - 1, 1).getValues().map(r => String(r[0] || "").toUpperCase());
  const idx = codes.indexOf(code);
  if (idx < 0) return { ok: false, error: "not_found" };
  const rowNum = idx + 2; // header is row 1

  // Read current row to preserve fields not present in payload.
  const current = sheet.getRange(rowNum, 1, 1, 8).getValues()[0];

  const next = [
    current[0],                                                 // code (never changes)
    has(p, "name")        ? String(p.name)        : current[1],
    has(p, "category")    ? String(p.category)    : current[2],
    has(p, "description") ? String(p.description) : current[3],
    has(p, "image1")      ? String(p.image1)      : current[4],
    has(p, "image2")      ? String(p.image2)      : current[5],
    has(p, "featured")    ? (p.featured ? "TRUE" : "FALSE") : current[6],
    has(p, "active")      ? (p.active   ? "TRUE" : "FALSE") : current[7]
  ];
  sheet.getRange(rowNum, 1, 1, 8).setValues([next]);
  return { ok: true, code: code };
}

/**
 * Upload a base64-encoded image to the designated Drive folder.
 * Returns a public, embeddable URL.
 *
 * payload: { dataUrl: "data:image/jpeg;base64,...", filename: "QSH-001-1.jpg" }
 */
function uploadImage_(p) {
  if (!p.dataUrl) return { ok: false, error: "missing_dataUrl" };

  const m = String(p.dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return { ok: false, error: "invalid_dataUrl" };

  const mime = m[1];
  const bytes = Utilities.base64Decode(m[2]);
  const blob = Utilities.newBlob(bytes, mime, safeFilename_(p.filename, mime));

  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // Use the lh3.googleusercontent.com pattern — reliable for <img> embedding,
  // unlike the default Drive view URLs.
  const url = "https://lh3.googleusercontent.com/d/" + file.getId() + "=w1600";
  return { ok: true, url: url, driveId: file.getId() };
}

// ===== Helpers ==========================================================

function sheet_() {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(PRODUCTS_TAB);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function pad_(n) {
  let s = String(n);
  while (s.length < CODE_PAD) s = "0" + s;
  return s;
}

function escapeRegex_(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safeFilename_(name, mime) {
  const ext = (mime || "").split("/")[1] || "jpg";
  const base = String(name || "image").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64);
  return base.endsWith("." + ext) ? base : base + "." + ext;
}

function has(o, k) {
  return Object.prototype.hasOwnProperty.call(o, k);
}
