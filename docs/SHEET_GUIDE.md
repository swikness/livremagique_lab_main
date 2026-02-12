# Livre Magique — Sheet Setup & Guide

Use this to set up your Google Sheet and to fill the "Guide" sheet for your team.

---

## 1. Main sheet columns (Orders)

The **first sheet** (used by the script) should have these columns (A–X). Column layout from your sheet:

| Col | Letter | Header | Description |
|-----|--------|--------|-------------|
| 1 | A | Date | Filled automatically (dd/MM/yyyy HH:mm:ss). |
| 2 | B | Nom Client | Buyer name. |
| 3 | C | Téléphone | Buyer phone. |
| 4 | D | Livre Choisi | Raisons d'Aimer / Années d'Amour / Liste de Rêves / 100% Sur Mesure. |
| 5 | E | Pour Qui | Elle or Lui. |
| 6–9 | F–I | Prénom (Lui), Âge (Lui), Prénom (Elle), Âge (Elle) | Partner names and ages. |
| 10 | J | Langue | Français, Arabe, Anglais. |
| 11 | K | Style | e.g. 3D Animation, Disney. |
| 12 | L | Années | For "Années d'Amour". |
| 13 | M | Titre Perso | For "100% Sur Mesure". |
| 14 | N | Description | Custom note or synopsis. |
| 15 | O | Les 10 Moments | Options list (comma-separated). |
| 16 | P | Emballage ? | OUI / NON. |
| 17 | Q | Prix Total | e.g. 299 DH. |
| 18 | R | Statut | Order status (e.g. Nouveau). |
| 19–20 | S–T | Photo Lui, Photo Elle | Drive URLs of photos. |
| 21 | U | Details | Not used for book creation. |
| 22 | V | **Couverture** | **Required.** URL of the pre-generated front cover. The book uses this as page 1 and as character reference; generate the cover separately and paste the Drive link here. |
| 23 | W | **Status Livre** | Nouveau / En file / En cours / Généré / Erreur. Filled by the script. |
| 24 | X | **Livre PDF** | Link to the 32-page PDF when Status Livre = Généré. |

**Output folder:** The generated PDF is always saved to the same Drive folder (fixed ID in the script). No column is used for the folder.

### Fields used for story creation only

These columns are the **only** ones used to build the story (theme, characters, language, style, and the 17-part plan and scene text):

| Column | Header | Use in story |
|--------|--------|---------------|
| D | Livre Choisi | Theme type (Raisons / Années / Liste / 100% Sur Mesure). |
| E | Pour Qui | HER vs HIM in theme. |
| F–I | Prénom/Âge (Lui/Elle) | Character names and ages. |
| J | Langue | Language for all story and scene text. |
| K | Style | Visual style for image prompts. |
| L | Années | For “Années d’Amour” theme. |
| N | Description | Extra context for “100% Sur Mesure”. |
| O | Les 10 Moments | **Scenes description / what the book is about** — used for all book types (including personalized Sur Mesure) to drive scene content. |

- **M (Titre Perso)** is for the **cover title only**; it is not used when generating the story or theme.
- **V (Couverture)** is used only as the front-cover image (page 1) and as the visual reference for scene/back-cover images; it is not an input to the story text.

---

## 2. Guide sheet (second tab)

Add a **second sheet** named e.g. **"Guide"** or **"Comment utiliser"**. Copy the content from [Guide_Sheet_Content.txt](Guide_Sheet_Content.txt) and paste it into the sheet (e.g. one block per row in column A, or use the two-column layout as in the file).

---

## 3. Header row (row 1)

Row 1 of the main sheet must contain the column headers. Data starts from row 2.

## 4. Backend and GAS configuration

- **Backend**: Deploy the `backend/` service (see [backend/README.md](../backend/README.md)). It needs `GEMINI_API_KEY` and Drive upload (service account). The backend uses the **front cover from column V** as page 1 and as the only character reference for generating the 15 story scenes and the back cover; it does not regenerate the front cover.
- **GAS Script Properties** (Project settings → Script properties):
  - `BACKEND_URL`: full URL of the backend, e.g. `https://your-app.run.app/createBook`.
  - `WEBHOOK_URL`: **required for book creation.** The web app URL so the backend can update the sheet (Status Livre + Livre PDF). Must be the **exec** URL (see below).
  - `WEBHOOK_SECRET`: (optional) secret so only your backend can call the update-row webhook.
- **Publish GAS as web app**: Deploy the script as a web app (Deploy → New deployment → Web app). Execute as: Me, Who has access: Anyone. Copy the **Web app URL** (it ends in `/exec`). Paste it in Script Properties as **WEBHOOK_URL**. Without this, the backend gets 404 when it tries to update the sheet.
- **Output folder (Drive):** The script uses a fixed folder ID (`PDF_OUTPUT_FOLDER_ID` in the script) where a subfolder is created per book and the 32-page PDF is uploaded. **This folder must be inside a Google Shared Drive** (Workspace), and the **service account** (from backend env `GOOGLE_SERVICE_ACCOUNT_JSON`) must be added as a **member of that Shared Drive** (Content manager). Otherwise you get “Service Accounts do not have storage quota”. See [backend/README.md](../backend/README.md) for step-by-step setup.

## 5. Workflow summary

1. New order creates a row (A–T filled). Generate the **front cover** separately and put its URL in **V (Couverture)**.
2. Select a cell in that row → Menu **Livre Magique** → **Créer le livre pour cette ligne**.
3. A **confirmation dialog** shows client, livre, style, language, names, etc. Click OK to send or Cancel to abort.
4. W becomes En file, then En cours. When done, W = Généré and X = link to the **32-page PDF**.
5. If W = Erreur, check that V (couverture) is filled and data is correct, then try again.

## 6. Menu “Livre Magique” not showing

The menu is added when the spreadsheet opens (`onOpen`). If you don’t see **Livre Magique** in the menu bar:

1. Open **Extensions → Apps Script** (from the same spreadsheet).
2. In the function dropdown at the top, select **`addLivreMagiqueMenu`**.
3. Click **Run** (▶). Authorize if prompted.
4. Return to the spreadsheet tab and **refresh the page** (F5). The **Livre Magique** menu should appear.

The script expects the orders data to be on a sheet named **orders** (or it uses the first sheet).
