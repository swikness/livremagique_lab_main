# Google Apps Script (Livre Magique)

There is **one script file**: **FormHandler.gs**. Copy its contents into your Google Sheet's Apps Script project (Extensions → Apps Script). It includes:

- **Form submission** from the website (lovers + Ramadan/kids) → writes to the sheet
- **kids_orders** sheet: 32 columns; column M = dropdown (e.g. NRP 1, NRP 2, NRP 3, COVER), N = WhatsApp link formula, **O = app link formula**, **P = app URL** (script writes the session link here)
- **No menu**: when you select **COVER** in column M, the script creates a session and writes the app URL in column P; new rows from the form also get the URL in P
- **doGet / doPost**: ping, webhook (updateRow), and form data handling
- **Script properties**: `BACKEND_URL`, `APP_URL`, `WEBHOOK_URL`, optional `WEBHOOK_SECRET` and `SPREADSHEET_ID` (or run `saveSpreadsheetId()` once with the sheet open)

## Column O (app link)

- Use the **direct GAS link** in the formula (no Vercel /api/open). The script shows a page with the app link and a "Copier le lien" button; if the page appears as raw code, the URL is shown in a box so you can copy it.
- **O2** (fill down):  
  `=HYPERLINK("https://script.google.com/macros/s/AKfycbxW5Yf0Yf5aapLGwP10eZVp-ovoFtCowGTJsj9G_Tgnta_esnI9MsCF-7VX-gDIMqQofQ/exec?action=openApp&sheetName=kids_orders&rowIndex="&ROW(),"Open")`

## Script properties

In **Extensions → Apps Script → Project settings → Script properties** set:

- `BACKEND_URL` — Backend base URL (e.g. Railway).
- `APP_URL` — Frontend app URL (e.g. Vercel) for the app link.
- `WEBHOOK_URL` — This script's web app **exec** URL.
- `WEBHOOK_SECRET` — (Optional) for webhook calls.
- `SPREADSHEET_ID` — (Optional) or run `saveSpreadsheetId()` once with the sheet open.

## Deploy

Deploy as **Web app**: Execute as **Me**, Who has access **Anyone**. Use the **exec** URL in your theme/form and as `WEBHOOK_URL`.
