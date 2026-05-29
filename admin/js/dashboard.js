/* =========================================================================
   Quash Admin — Dashboard / Login page
   ========================================================================= */

(function () {
  "use strict";

  const { $, setBusy } = AdminUI;

  const viewLogin     = $("#view-login");
  const viewDashboard = $("#view-dashboard");

  function showDashboard() {
    viewLogin.classList.add("is-hidden");
    viewDashboard.classList.remove("is-hidden");
  }
  function showLogin() {
    viewDashboard.classList.add("is-hidden");
    viewLogin.classList.remove("is-hidden");
    setTimeout(() => $("#password").focus(), 80);
  }

  // Already logged in? skip to dashboard.
  if (Auth.isAuthed()) {
    showDashboard();
  } else {
    showLogin();
  }

  // Login form
  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input  = $("#password");
    const err    = $("#login-error");
    const submit = $("#login-submit");
    err.textContent = "";
    setBusy(submit, true, "Checking…");

    const ok = await Auth.tryLogin(input.value);
    setBusy(submit, false);

    if (ok) {
      input.value = "";
      showDashboard();
    } else {
      err.textContent = "Incorrect password.";
      input.select();
    }
  });

  // Logout
  $("#logout-btn").addEventListener("click", () => Auth.logout());

  // Helper: dev-only — log a SHA-256 hash for any password the owner wants.
  // Open the console and call:    quashHash("my-password")
  window.quashHash = (s) => Auth.sha256Hex(s).then(h => {
    console.log("SHA-256:", h);
    return h;
  });
})();
