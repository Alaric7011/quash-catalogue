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
const CATEGORIES_TAB  = "Categories";                  // Tab name (must match)
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
      case "ping":           return json({ ok: true, pong: true });
      case "nextCode":       return json({ ok: true, code: nextCode_() });
      case "addProduct":     return json(addProduct_(payload));
      case "updateProduct":  return json(updateProduct_(payload));
      case "uploadImage":    return json(uploadImage_(payload));
      // Category actions
      case "listCategories": return json(listCategories_());
      case "addCategory":    return json(addCategory_(payload));
      case "updateCategory": return json(updateCategory_(payload));
      case "deleteCategory": return json(deleteCategory_(payload));
      case "countCategoryProducts": return json(countCategoryProducts_(payload));
      default:               return json({ ok: false, error: "unknown_action" });
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

// ===== Category actions =================================================

/** Read all category rows. Columns: slug | name | image | order | active */
function listCategories_() {
  const sheet = catSheet_();
  if (!sheet) return { ok: false, error: "missing_categories_tab" };
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: true, categories: [] };

  const values = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  const categories = values
    .filter(r => String(r[0] || "").trim() !== "")
    .map(r => ({
      slug:   String(r[0] || "").toLowerCase().trim(),
      name:   String(r[1] || "").trim(),
      image:  String(r[2] || "").trim(),
      order:  Number(r[3]) || 0,
      active: truthy_(r[4])
    }))
    .sort((a, b) => a.order - b.order);

  return { ok: true, categories };
}

/** Append a new category. Slug auto-generated from name (server-side authority). */
function addCategory_(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = catSheet_();
    if (!sheet) return { ok: false, error: "missing_categories_tab" };

    const name = String(p.name || "").trim();
    if (!name) return { ok: false, error: "missing_name" };
    const slug = slugify_(name);
    if (!slug) return { ok: false, error: "invalid_name" };

    const lastRow = sheet.getLastRow();
    let nextOrder = 1;
    if (lastRow >= 2) {
      const rows = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
      // Uniqueness on slug
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0] || "").toLowerCase().trim() === slug) {
          return { ok: false, error: "duplicate_slug", slug };
        }
      }
      const orders = rows.map(r => Number(r[3]) || 0);
      if (orders.length) nextOrder = Math.max.apply(null, orders) + 1;
    }

    sheet.appendRow([slug, name, String(p.image || ""), nextOrder, "TRUE"]);
    return { ok: true, slug, name };
  } finally {
    lock.releaseLock();
  }
}

/** Update name / image / active for an existing category. Slug is immutable. */
function updateCategory_(p) {
  const sheet = catSheet_();
  if (!sheet) return { ok: false, error: "missing_categories_tab" };

  const slug = String(p.slug || "").toLowerCase().trim();
  if (!slug) return { ok: false, error: "missing_slug" };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: false, error: "not_found" };

  const slugs = sheet.getRange(2, 1, lastRow - 1, 1).getValues()
    .map(r => String(r[0] || "").toLowerCase().trim());
  const idx = slugs.indexOf(slug);
  if (idx < 0) return { ok: false, error: "not_found" };
  const rowNum = idx + 2;

  const current = sheet.getRange(rowNum, 1, 1, 5).getValues()[0];
  const next = [
    current[0],                                                 // slug (never changes)
    has(p, "name")   ? String(p.name)  : current[1],
    has(p, "image")  ? String(p.image) : current[2],
    has(p, "order")  ? Number(p.order) : current[3],
    has(p, "active") ? (p.active ? "TRUE" : "FALSE") : current[4]
  ];
  sheet.getRange(rowNum, 1, 1, 5).setValues([next]);
  return { ok: true, slug };
}

/**
 * Delete a category permanently. By default, BLOCKS the delete if any
 * products are tagged with that category — pass `force: true` to override.
 */
function deleteCategory_(p) {
  const sheet = catSheet_();
  if (!sheet) return { ok: false, error: "missing_categories_tab" };

  const slug = String(p.slug || "").toLowerCase().trim();
  if (!slug) return { ok: false, error: "missing_slug" };

  const count = countCategoryProducts_({ slug }).count;
  if (count > 0 && !p.force) {
    return { ok: false, error: "has_products", count };
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: false, error: "not_found" };

  const slugs = sheet.getRange(2, 1, lastRow - 1, 1).getValues()
    .map(r => String(r[0] || "").toLowerCase().trim());
  const idx = slugs.indexOf(slug);
  if (idx < 0) return { ok: false, error: "not_found" };

  sheet.deleteRow(idx + 2);
  return { ok: true, slug, productsOrphaned: count };
}

/** Count products whose `category` column equals the given slug. */
function countCategoryProducts_(p) {
  const slug = String(p.slug || "").toLowerCase().trim();
  if (!slug) return { ok: false, error: "missing_slug", count: 0 };

  const prodSheet = sheet_();
  const lastRow = prodSheet.getLastRow();
  if (lastRow < 2) return { ok: true, count: 0 };

  const cats = prodSheet.getRange(2, 3, lastRow - 1, 1).getValues();
  let count = 0;
  for (let i = 0; i < cats.length; i++) {
    if (String(cats[i][0] || "").toLowerCase().trim() === slug) count++;
  }
  return { ok: true, count };
}

// ===== Helpers ==========================================================

function sheet_() {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(PRODUCTS_TAB);
}

function catSheet_() {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(CATEGORIES_TAB);
}

function slugify_(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function truthy_(v) {
  const s = String(v == null ? "" : v).trim().toLowerCase();
  return s === "true" || s === "yes" || s === "1" || s === "y";
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
