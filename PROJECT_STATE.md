# Livre Magique Lab — Project State & Configuration

**Last updated:** February 2026  
This file records the current setup, what was fixed, and how everything is configured so you can pick up where you left off.

---

## 1. What We Fixed (Summary)

| Issue | Fix |
|-------|-----|
| **"Cannot access 'Rt' / 'he' / 'qt' / 'Gt' before initialization"** | Moved all imports to top of `App.tsx`; then lazy-loaded heavy modules so they don’t run at app startup. |
| **"Cannot access 'sheetContext' before initialization"** | Moved sheet-related state (`sheetContext`, `sheetCoverBase64`, `sheetCoverOnlyMode`, `fromSheetLoading`, `fromSheetError`) to be declared **before** any `useEffect` that uses them. |
| **502 when clicking "Générer la couverture" in sheet** | Backend `index.js` was empty. Implemented Express server with `POST /sheet/prepare`, `POST /sheet/prepareCover`, `GET /sheet/session/:id`, `GET /health`. |
| **"Failed to fetch" when opening the app from the sheet link** | Backend was not sending CORS headers. Added CORS middleware so the Vercel frontend can call the Railway backend. |
| **Chunk/minify init-order issues** | Vite: `minify: false` (so errors show real variable names); `manualChunks` keeps React in entry; lazy-loaded `geminiService`, `ramadanTemplate`, Cropper, jsPDF. |

---

## 2. Repo Layout (Key Files)

```
livre-magique-lab-main/
├── index.tsx              # Entry: React root + error boundary
├── App.tsx                # Main app (sheet context, lazy services, TRANSLATIONS)
├── lazyServices.ts        # Dynamic import of geminiService & ramadanTemplate (avoids init order)
├── geminiService.ts       # Gemini API (story plan, images, etc.) — loaded on first use
├── ramadanTemplate.ts     # Ramadan kids story template — loaded on first use
├── types.ts               # Shared types
├── storage.ts             # Session storage helpers
├── vite.config.ts         # Vite build (no minify, manualChunks, chunkSizeWarningLimit)
├── package.json           # Frontend deps (React 19, Vite 6, jspdf, react-easy-crop, etc.)
├── .env.local             # Local env (VITE_BACKEND_URL, VITE_GEMINI_API_KEY) — not committed
├── backend/
│   ├── index.js           # Express: /sheet/prepare, /sheet/prepareCover, /sheet/session/:id, /health + CORS
│   ├── lib/
│   │   ├── mapRowToUserInput.js   # Lovers row → userInput + theme
│   │   ├── webhook.js             # Call GAS webhook to update sheet
│   │   ├── drive.js, pdf.js, gemini.js
│   └── package.json       # Backend deps (express, etc.)
├── docs/
│   └── SETUP_SHEET_TO_APP.md
├── google-apps-script/    # Reference GAS (FullScript_GoogleAppsScript.gs, etc.)
└── PROJECT_STATE.md       # This file
```

---

## 3. Environment & Configuration

### 3.1 Frontend (Vite / Vercel)

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_BACKEND_URL` | `.env.local` (local), Vercel env (prod) | Backend base URL (no trailing slash). Used for `/sheet/session/:id`, PDF upload. |
| `VITE_GEMINI_API_KEY` | `.env.local` or Vercel | Gemini API key for story/image generation in the browser. |

- **Local:** Copy `.env.example` to `.env.local` and fill values; run `npm run dev` (port 3000).
- **Vercel:** Project → Settings → Environment Variables. Add `VITE_BACKEND_URL` and `VITE_GEMINI_API_KEY`. Redeploy after changes.

### 3.2 Backend (Railway)

| Variable | Purpose |
|----------|---------|
| `PORT` | Server port (default 8080; Railway sets this). |
| (Others) | Backend README lists optional vars for Drive, etc.; sheet session flow does not require them. |

- Sessions are **in-memory** (lost on restart). For persistence later, add Redis or a DB.

### 3.3 Google Apps Script (Sheet)

In **Extensions → Apps Script → Project settings → Script properties**:

| Property | Value (example) | Notes |
|----------|------------------|--------|
| `BACKEND_URL` | `https://livremagiquelabmain-production.up.railway.app` | No trailing slash. |
| `APP_URL` | `https://livremagique-lab-main.vercel.app` | Frontend URL; no trailing slash. |
| `WEBHOOK_URL` | `https://script.google.com/macros/s/.../exec` | GAS Web App deploy URL. |
| `WEBHOOK_SECRET` | (optional) | If set, backend must send it when calling webhook. |
| `SPREADSHEET_ID` | Your sheet ID | Optional; script can also use active spreadsheet. |

---

## 4. Deploy & Run

### 4.1 Frontend

- **Local:** `npm install` → `npm run dev` (http://localhost:3000).
- **Build:** `npm run build` → `npm run preview` (http://localhost:4173).
- **Deploy:** Vercel auto-deploys from Git (e.g. `main`). Ensure `VITE_BACKEND_URL` and `VITE_GEMINI_API_KEY` are set in Vercel.

### 4.2 Backend

- **Local:** `cd backend && npm install && npm start` (port 8080).
- **Deploy:** Railway auto-deploys from same repo (e.g. root or `backend` as start path). No extra build step; `node index.js`.

### 4.3 Git → Deploy

- Push to `main` (or your connected branch) → Vercel and Railway auto-deploy.
- After backend changes: wait for Railway deploy, then test sheet → app link again.

---

## 5. Sheet → App Flow (Current Behavior)

1. User in Google Sheet: selects row → **Livre Magique** → **Générer la couverture pour cette ligne** (or **Ouvrir dans l'app**).
2. GAS: builds payload (row data, photos as base64, webhook URL, etc.) → `POST` to `BACKEND_URL/sheet/prepareCover` (or `/sheet/prepare`).
3. Backend: stores session in memory, returns `{ sessionId }`.
4. GAS: shows user link `APP_URL?fromSheet=sessionId` (and `&template=ramadan` for kids).
5. User opens link in browser. App: `GET BACKEND_URL/sheet/session/sessionId` → loads session, pre-fills form, shows “Générer la couverture” / “Confirmer et envoyer”.
6. User generates cover (and optionally PDF) in app, then “Confirmer et envoyer” / “Envoyer vers Drive”. App POSTs to backend; backend can call GAS webhook to update the sheet (if that route is implemented).

---

## 6. Build Notes (Vite)

- **Minification:** Disabled (`minify: false`) so runtime errors show real variable names. To shrink bundle size again, set `minify: 'esbuild'` in `vite.config.ts`.
- **Chunks:** `manualChunks` keeps React in the entry chunk; other `node_modules` go to `vendor`. Lazy-loaded: `geminiService`, `ramadanTemplate`, `react-easy-crop`, `jspdf`.
- **Chunk size warning:** `chunkSizeWarningLimit: 2000` to avoid warnings for large bundles.

---

## 7. Quick Checklist When You Come Back

- [ ] Backend: Railway service up; `BACKEND_URL` in GAS and `VITE_BACKEND_URL` in Vercel match that URL (no trailing slash).
- [ ] Frontend: Vercel env has `VITE_BACKEND_URL` and `VITE_GEMINI_API_KEY`; redeploy if you changed env.
- [ ] Sheet: GAS script properties set; Web App deployed (Test or Production) and `WEBHOOK_URL` is the `/exec` link.
- [ ] Test: Sheet → “Générer la couverture” → open link → app loads without “Failed to fetch” and form is pre-filled.

---

*To update this doc: edit `PROJECT_STATE.md` and commit. Keep env values and secrets in env vars / script properties, not in this file.*
