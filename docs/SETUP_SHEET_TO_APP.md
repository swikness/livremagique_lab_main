# Setup: "Ouvrir dans l'app" (Sheet → App → Drive)

You use **Railway** for the backend. Follow these steps in order.

---

## 1. Backend on Railway

- **Deploy the new code:** Push your repo to Git. Railway deploys from your connected repo, so after you push, Railway will build and deploy the backend with the new routes (`/sheet/prepare`, `/sheet/session/:id`, `/uploadPdf`) and `multer`.
- Your `BACKEND_URL` in GAS should point to that Railway URL (e.g. `https://livremagiquelabmain-production.up.railway.app` — no trailing slash).

---

## 2. GAS Script Properties (Google Sheet)

In the sheet: **Extensions → Apps Script** → (left) **Project settings** (gear) → **Script properties**.

Add or edit:

| Name          | Value                                                                 |
|---------------|-----------------------------------------------------------------------|
| `BACKEND_URL` | Your Railway backend URL, e.g. `https://livre-magique-backend.railway.app` (no trailing slash, no `/createBook`) |
| `APP_URL`     | The URL where the **frontend app** runs, e.g. `https://livre-magique.vercel.app` or your Vite dev URL. No trailing slash. |
| `WEBHOOK_URL` | Your GAS web app **exec** URL (Deploy → Web app → copy the URL that ends in `/exec`). |
| `WEBHOOK_SECRET` | (Optional) Same as before. |

**You already have `BACKEND_URL` and `WEBHOOK_URL`.** Add **`APP_URL`** = the URL where the frontend (React app) runs — e.g. your Vercel/Netlify URL or `http://localhost:5173` for local testing. No trailing slash.

---

## 3. Where are the photos generated?

- **"Créer le livre pour cette ligne"** (first menu item): the **backend** (Railway) does everything: story plan, all 16 scene images, PDF, upload to Drive. GAS only sends the row; backend runs Gemini.
- **"Ouvrir dans l'app (révision)"** (new menu item): the **app (frontend)** generates the photos. When you click "Confirmer et générer" in the app, it uses **Gemini from the browser** (your `VITE_GEMINI_API_KEY`). The backend is only used to: store/return the session (`/sheet/prepare`, `/sheet/session/:id`) and to receive the finished PDF and upload it to Drive (`/uploadPdf`). So in the review flow, **photos = app**. Backend = session + PDF upload only.

---

## 4. Frontend (the React app)

The app must know the backend URL so it can:

- Load the session when you open `?fromSheet=...`
- Upload the PDF when you click "Envoyer vers Drive"

**If you use Vite (npm run dev / build):**

- In the **root** of the project (where `index.html` / `vite.config` is), create or edit `.env` or `.env.production`:
  - Add one line:
    ```bash
    VITE_BACKEND_URL=https://livre-magique-backend.railway.app
    ```
  - Replace with your real Railway URL (no trailing slash).
- Restart dev server (`npm run dev`) or rebuild and redeploy.

**If you deploy the frontend (e.g. Vercel / Netlify):**

- In the dashboard, add an **environment variable**:
  - Name: `VITE_BACKEND_URL`
  - Value: `https://livre-magique-backend.railway.app` (your Railway backend URL).
- Redeploy so the new variable is used.

---

## 5. Checklist (copy-paste and fill)

1. **Railway**
   - [ ] Backend is deployed and running.
   - [ ] You know the public URL (e.g. `https://xxx.railway.app`).

2. **GAS (Script properties)**
   - [ ] `BACKEND_URL` = Railway backend URL (no trailing slash).
   - [ ] `APP_URL` = frontend URL (where you open the Livre Magique app in the browser).
   - [ ] `WEBHOOK_URL` = GAS web app exec URL.

3. **Frontend**
   - [ ] `VITE_BACKEND_URL` = same Railway backend URL (in `.env` or in Vercel/Netlify env vars).
   - [ ] Restart dev or redeploy after changing it.

4. **Test**
   - [ ] In the sheet, select a row (with cover in column V).
   - [ ] Menu **Livre Magique** → **Ouvrir dans l'app (révision)**.
   - [ ] Confirm → click the link. The app should open with data loaded.
   - [ ] Click **Confirmer et générer** → after generation, click **Envoyer vers Drive** (after splitting scenes 1–15). Sheet should show Généré and PDF link.

---

## 6. One-line summary

- **Backend (Railway):** already done; just deploy the updated code.
- **GAS:** set `APP_URL` = frontend URL, keep `BACKEND_URL` = Railway URL.
- **Frontend:** set `VITE_BACKEND_URL` = Railway URL, then rebuild/redeploy.

That’s it.
