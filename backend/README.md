# Livre Magique Backend

Node.js API that creates a full book (plan + 17 images + PDF) from a sheet row and uploads the PDF to Google Drive, then updates the sheet via the GAS webhook.

## Endpoints

- `POST /createBook` — Body: `{ spreadsheetId, rowIndex, outputFolderId, webhookUrl, webhookSecret, row }`. Runs the pipeline and calls the webhook with status + folder link.
- `GET /health` — Returns `{ ok: true }`.
- `GET /auth/drive` — Start OAuth flow to get a refresh token for Drive (personal account).
- `GET /auth/drive/callback` — OAuth callback; shows the refresh token to copy into `DRIVE_REFRESH_TOKEN`.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key. |
| `PORT` | No | Server port (default 8080). |
| `GOOGLE_APPLICATION_CREDENTIALS` | Yes* | Path to Google service account JSON (for Drive upload). |
| `GOOGLE_CLIENT_ID` | For OAuth | OAuth 2.0 Client ID (Google Console). |
| `GOOGLE_CLIENT_SECRET` | For OAuth | OAuth 2.0 Client secret. |
| `DRIVE_REFRESH_TOKEN` | For OAuth | Refresh token from one-time `/auth/drive` flow. |
| `BACKEND_PUBLIC_URL` | For OAuth | Base URL of backend, e.g. `https://your-app.up.railway.app`. |
| `DRIVE_SERVICE_ACCOUNT_JSON` | For SA | JSON string or path for service account. |

**Drive:** use **either** OAuth (personal account) **or** service account. **Option A — OAuth (personal):** 1) Google Console → Credentials → OAuth client ID (Web app), add redirect URI `https://YOUR-BACKEND/auth/drive/callback`. 2) Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BACKEND_PUBLIC_URL in Railway. 3) Open `/auth/drive` in browser, sign in, copy the refresh token. 4) Set DRIVE_REFRESH_TOKEN in Railway; remove GOOGLE_SERVICE_ACCOUNT_JSON. 5) PDF_OUTPUT_FOLDER_ID = your My Drive folder. **Option B — Service account:** output folder must be in a Shared Drive (Workspace); add service account as member.

**Service account storage quota (Option B only):** Service accounts cannot use their own storage. Uploads only work when the **output folder is inside a Shared Drive** (Google Workspace):

1. Create a **Shared Drive** (or use an existing one): Google Drive → Shared drives → New.
2. Add the **service account** as a member: open the Shared Drive → Manage members → Add the email from your JSON `client_email` (e.g. `xxx@project.iam.gserviceaccount.com`) with role **Content manager**.
3. Create a folder inside that Shared Drive (or use the Shared Drive root). Copy the folder ID from the URL: `https://drive.google.com/drive/folders/FOLDER_ID`.
4. In the GAS script, set `PDF_OUTPUT_FOLDER_ID` to that folder ID (the one inside the Shared Drive). The backend will create book subfolders and upload images there; they will use the Shared Drive’s quota.

If you only have a personal Google account (no Workspace), you cannot create a Shared Drive. Use a Google Workspace trial, or host the output folder in a Workspace organization’s Shared Drive.

## Run locally

```bash
cd backend
npm install
export GEMINI_API_KEY=your_key
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
npm start
```

Then set the GAS Script Property `BACKEND_URL` to your backend URL (e.g. `http://localhost:8080` for local testing with a tunnel like ngrok, or your Cloud Run URL).

## Deploy (e.g. Cloud Run)

1. Build and push your container, or use `gcloud run deploy` with Dockerfile.
2. Set env vars in Cloud Run: `GEMINI_API_KEY`, `GOOGLE_APPLICATION_CREDENTIALS` (or mount the JSON).
3. Ensure the Cloud Run service account has Drive write access, or use a dedicated service account key and `GOOGLE_APPLICATION_CREDENTIALS`.
4. Set `BACKEND_URL` in GAS to your Cloud Run URL (e.g. `https://xxx.run.app`). Use `/createBook` as the path: `https://xxx.run.app/createBook`.

## GAS Script Properties

In the Google Apps Script project: **Project settings** → **Script properties**:

- `BACKEND_URL` — Full URL of this API including path, e.g. `https://your-service.run.app/createBook`.
- `WEBHOOK_SECRET` — Optional secret; if set, the backend must send it when calling the sheet-update webhook.
- `DEFAULT_PDF_FOLDER_ID` — Optional default Drive folder ID when column U is empty.
