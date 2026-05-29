/* =========================================================================
   Quash Admin — Password Gate
   -------------------------------------------------------------------------
   - Hashes the entered password with SHA-256 and compares against the
     stored hash in admin/js/config.js.
   - On success, sets a sessionStorage flag (cleared when tab closes).
   - Exposes Auth.requireAuth() — call at the top of every admin page.

   This is a soft gate. Real security is enforced by the Apps Script's
   API_SECRET (see Code.gs).
   ========================================================================= */

const Auth = (() => {
  async function sha256Hex(str) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function isAuthed() {
    return sessionStorage.getItem(ADMIN_CONFIG.SESSION_KEY) === "true";
  }

  function setAuthed(v) {
    if (v) sessionStorage.setItem(ADMIN_CONFIG.SESSION_KEY, "true");
    else sessionStorage.removeItem(ADMIN_CONFIG.SESSION_KEY);
  }

  async function tryLogin(password) {
    if (!password) return false;
    const hash = await sha256Hex(password);
    const ok = hash.toLowerCase() === String(ADMIN_CONFIG.ADMIN_PASSWORD_HASH || "").toLowerCase();
    if (ok) setAuthed(true);
    return ok;
  }

  function logout() {
    setAuthed(false);
    window.location.href = "index.html";
  }

  /**
   * Call at the top of every protected admin page (NOT the login page).
   * Redirects to index.html if not authed.
   */
  function requireAuth() {
    if (!isAuthed()) {
      window.location.replace("index.html");
      return false;
    }
    return true;
  }

  return { sha256Hex, isAuthed, tryLogin, logout, requireAuth };
})();
