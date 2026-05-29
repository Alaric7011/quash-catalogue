/* =========================================================================
   Quash Admin — API Client
   -------------------------------------------------------------------------
   Talks to the Apps Script backend. Sends JSON-as-text/plain to avoid
   the CORS preflight that Apps Script can't handle cleanly.

   Public API:
     await AdminAPI.nextCode()
     await AdminAPI.addProduct({ name, category, description, image1, image2, featured })
     await AdminAPI.updateProduct({ code, name?, category?, description?, image1?, image2?, featured?, active? })
     await AdminAPI.uploadImage(file, filename?)        // file: File | Blob
     await AdminAPI.ping()
   ========================================================================= */

const AdminAPI = (() => {

  async function post(payload) {
    const body = JSON.stringify(Object.assign({}, payload, {
      secret: ADMIN_CONFIG.API_SECRET
    }));
    let res;
    try {
      res = await fetch(ADMIN_CONFIG.API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: body,
        redirect: "follow"
      });
    } catch (err) {
      throw new Error("Could not reach the server. Check your internet connection.");
    }
    if (!res.ok) {
      throw new Error("Server returned " + res.status);
    }
    let data;
    try { data = await res.json(); }
    catch { throw new Error("Server returned an invalid response."); }

    if (!data.ok) {
      const msg = data.error === "unauthorized"
        ? "Authorization failed. Check the API secret in admin/js/config.js."
        : (data.error || "Unknown server error.");
      throw new Error(msg);
    }
    return data;
  }

  async function ping()           { return post({ action: "ping" }); }
  async function nextCode()       { return post({ action: "nextCode" }); }
  async function addProduct(p)    { return post(Object.assign({ action: "addProduct" }, p)); }
  async function updateProduct(p) { return post(Object.assign({ action: "updateProduct" }, p)); }
  async function listCategories() { return post({ action: "listCategories" }); }
  async function addCategory(p)   { return post(Object.assign({ action: "addCategory" }, p)); }
  async function updateCategory(p){ return post(Object.assign({ action: "updateCategory" }, p)); }
  async function deleteCategory(p){ return post(Object.assign({ action: "deleteCategory" }, p)); }
  async function countCategoryProducts(slug) {
    return post({ action: "countCategoryProducts", slug: slug });
  }

  /**
   * Compress + resize a chosen image before upload to keep payloads small.
   * Returns a data URL (image/jpeg).
   */
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read the image."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Could not decode the image."));
        img.onload = () => {
          const maxW = ADMIN_CONFIG.MAX_IMAGE_WIDTH;
          let w = img.width, h = img.height;
          if (w > maxW) { h = Math.round(h * (maxW / w)); w = maxW; }
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", ADMIN_CONFIG.IMAGE_JPEG_QUALITY));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function uploadImage(file, filename) {
    if (!file) throw new Error("No image selected.");
    const dataUrl = await compressImage(file);
    const safeName = filename || file.name || "image.jpg";
    return post({ action: "uploadImage", dataUrl, filename: safeName });
  }

  return {
    ping, nextCode, addProduct, updateProduct, uploadImage, compressImage,
    listCategories, addCategory, updateCategory, deleteCategory, countCategoryProducts
  };
})();
