# Quash Admin — Backend Setup (Google Apps Script)

The admin panel needs a tiny serverless backend to **write** to your Google Sheet and **upload images** to Drive. We use Google Apps Script — it's free, runs under your Google account, and integrates natively with Sheets and Drive.

You only do this setup once. After that, the admin panel just works.

---

## Step 1 — Create a Drive folder for product images

1. Open Google Drive.
2. Create a new folder called **Quash Product Images**.
3. Open the folder. Look at the URL — it ends with `.../folders/<FOLDER_ID>`. Copy the `FOLDER_ID` portion.

---

## Step 2 — Get your Spreadsheet ID

1. Open your Quash Products Google Sheet.
2. The URL is `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit...`. Copy the `SHEET_ID`.

---

## Step 3 — Generate an API secret

Open a terminal and run any of these, or just type ~40 random characters yourself:

```
openssl rand -hex 32
```

Save the string somewhere safe — you'll paste it in two places (the script and the admin panel).

---

## Step 4 — Deploy the Apps Script

1. Open your Quash Products Sheet.
2. **Extensions → Apps Script.** A new editor tab opens.
3. Delete any starter code, then paste the full contents of `Code.gs` (in this folder).
4. At the top of the file, replace the four placeholder constants:
   ```js
   const SHEET_ID        = "your_sheet_id_here";
   const DRIVE_FOLDER_ID = "your_drive_folder_id_here";
   const API_SECRET      = "your_long_random_secret_here";
   ```
   Leave `PRODUCTS_TAB`, `CODE_PREFIX`, and `CODE_PAD` unless you changed your sheet's tab name.
5. Save (disk icon, or Ctrl+S / Cmd+S).
6. Click **Deploy → New deployment**.
7. Click the gear next to "Select type" → choose **Web app**.
8. Fill in:
   - **Description:** `Quash admin v1`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
9. Click **Deploy**.
10. Google will ask you to authorize the script — approve the permissions (Sheets + Drive).
11. Copy the **Web app URL** that's shown (ends in `/exec`). You'll need it in the next step.

---

## Step 5 — Wire the admin panel

Open `admin/js/config.js` and paste:

```js
API_URL:    "https://script.google.com/macros/s/.../exec",   // from step 4
API_SECRET: "your_long_random_secret_here",                  // same as in Code.gs
ADMIN_PASSWORD_HASH: "..."                                   // see below
```

To generate the `ADMIN_PASSWORD_HASH`, open the admin login page. The page shows a small "generate hash" helper in the browser console — or compute manually:

```js
// Run in browser console:
crypto.subtle.digest("SHA-256", new TextEncoder().encode("your-chosen-password"))
  .then(b => console.log(Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2,"0")).join("")));
```

Paste the resulting hex string as `ADMIN_PASSWORD_HASH`.

---

## Step 6 — Test

1. Open `admin/index.html` in your browser.
2. Log in with your chosen password.
3. The dashboard should appear.
4. Click **Add Item** → fill the form with a test product → save. You should see the new row in your Sheet within seconds.

---

## Updating the script later

If you ever change `Code.gs`:
1. Save in the Apps Script editor.
2. **Deploy → Manage deployments → Edit (pencil icon) → Version: New version → Deploy.**
3. The same URL stays valid; no need to update the admin panel.

---

## Security notes

- The admin panel password is a **deterrent**, not real auth. Anyone who can read the JS can see the password hash and the API secret.
- Real security comes from the Apps Script URL being unguessable plus the `API_SECRET` shared key.
- For higher security, host the admin behind HTTP Basic Auth at the hosting provider (Netlify / Cloudflare Pages both support this), and rotate the API_SECRET periodically.
- The script runs as **you**. Anyone with the URL + secret can write to your sheet. Don't paste the URL or secret into public chats, GitHub, screenshots, etc.

---

## Image hosting alternative (later)

Drive image URLs work but aren't as fast as a real CDN. To migrate to **Cloudinary** later:

1. Sign up at cloudinary.com (free tier ~25k images).
2. Create an unsigned upload preset.
3. Replace the `uploadImage_` function in `Code.gs` with a call to Cloudinary's upload API, or change the admin to upload directly to Cloudinary from the browser and skip the Apps Script for images. The Sheet column structure doesn't change.
