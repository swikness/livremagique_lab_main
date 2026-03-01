# Google Apps Script (Livre Magique)

There is **one script file**: **FormHandler.gs**. Copy its contents into your Google Sheet's Apps Script project (Extensions → Apps Script). It includes:

- **Form submission** from the website (lovers + Ramadan/kids) → writes to the sheet
- **kids_orders** sheet: 32 columns; column M = dropdown (e.g. NRP 1, NRP 2, NRP 3, COVER), N = WhatsApp link formula, **O = app link formula**, **P = app URL** (script writes the session link here)
- **No menu**: when you select **COVER** in column M, the script creates a session and writes the app URL in column P; new rows from the form also get the URL in P
- **doGet / doPost**: ping, webhook (updateRow), and form data handling
- **Script properties**: `BACKEND_URL`, `APP_URL`, `WEBHOOK_URL`, optional `WEBHOOK_SECRET` and `SPREADSHEET_ID` (or run `saveSpreadsheetId()` once with the sheet open)

## Column O (app link)

- Use this formula so "Open" goes through Vercel and redirects straight to the app (no raw HTML):
  **O2**: `=HYPERLINK("https://livremagique-lab-main.vercel.app/api/open?sheet=kids_orders&row="&ROW(),"Open")` — fill down for O3, O4, …
- **Vercel env var:** In the Vercel project, set **GAS_EXEC_URL** = your GAS Web App exec URL (e.g. `https://script.google.com/macros/s/xxx/exec`). The API route calls the script with `format=json` and redirects the browser to the app.

## Script properties

In **Extensions → Apps Script → Project settings → Script properties** set:

- `BACKEND_URL` — Backend base URL (e.g. Railway).
- `APP_URL` — Frontend app URL (e.g. Vercel) for the app link.
- `WEBHOOK_URL` — This script's web app **exec** URL.
- `WEBHOOK_SECRET` — (Optional) for webhook calls.
- `SPREADSHEET_ID` — (Optional) or run `saveSpreadsheetId()` once with the sheet open.

## Deploy

Deploy as **Web app**: Execute as **Me**, Who has access **Anyone**. Use the **exec** URL in your theme/form and as `WEBHOOK_URL`.
