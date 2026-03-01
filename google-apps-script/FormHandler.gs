// --- CONFIGURATION ---
// Single GAS file for Livre Magique: form submission (lovers + Ramadan/kids), kids_orders, column-based app link (O = formula, P = URL). No menu.
// Form submissions from the site require:
// 1) Deploy as Web App: Deploy > Manage deployments > Edit > "Who has access" = "Anyone".
// 2) Use the WEB APP URL in your theme (Deploy > Manage deployments > copy the URL that looks like https://script.google.com/macros/s/.../exec). Do NOT use the "echo" or script.googleusercontent.com link.
// 3) So form POSTs can find the sheet: open your spreadsheet > Extensions > Apps Script > run saveSpreadsheetId() once. Or set Script Property SPREADSHEET_ID to your sheet ID.
//
// 1. YOUR PIXEL ID
var PIXEL_ID = "1869022517306441";

// 2. YOUR SYSTEM USER ACCESS TOKEN (Keep this secret)
var ACCESS_TOKEN = "EAACopQs0dlwBQuZCsmmLnjJpgZCU1XJxv0J7kSEas9A3acmTzu2Bu3sfklnSxs8vvZCL6iCYM5cpb7lAjobZAzp3UsR7BCAUJFm2J2nqxJwnyojnWnRZCNkjUy1HWvS6pqcff9kr4VrESwJT7rcGLFiv9sZCygpLcaeXtxImgTxZAyoroIfYgh7hKoDkZBTGj0vc9QZDZD";

// 3. YOUR GOOGLE DRIVE FOLDER ID (Where photos will be saved)
var FOLDER_ID = "1h0BPEP6IQWczNJC2TQ-x4ztlLnMpgYht";

// 4. Folder where generated book PDFs are saved (fixed)
var PDF_OUTPUT_FOLDER_ID = "1b5gfij0uyZ9NZLJbiCk-me6SJD7WPm_o";

// Kids orders sheet: columns A–W as in your sheet (Date, Nom acheteur, … M=WTP, N=LINK, O=APP, P–R=Photos, S–U=Couverture, V=Status Livre, W=Lien PDF), then optional X=App URL.
var KIDS_ORDERS_HEADERS = ["Date", "Nom acheteur", "Téléphone", "Quantité", "Prix total", "Prénoms", "Âges", "Genres", "Langues", "Thèmes", "Statut", "Notes", "WTP", "LINK", "APP", "Photo enfant 1", "Photo enfant 2", "Photo enfant 3", "Couverture 1", "Couverture 2", "Couverture 3", "Status Livre", "Lien PDF", "App URL", "Statut changé le", "Relance 1 le", "Relance 2 le", "Relance 3 le", "adresse", "ville", "commune", "Couv / Livre", "✉ NRP 1", "✉ NRP 2", "✉ NRP 3", "✉ Message succès"];
var KIDS_ORDERS_COLS = 36;
var KIDS_COL_NOTES_CONFIRMATION = 12;
var KIDS_COL_PHOTO1 = 16;   // P
var KIDS_COL_PHOTO2 = 17;   // Q
var KIDS_COL_PHOTO3 = 18;   // R
var KIDS_COL_COUVERTURE_1 = 19;  // S
var KIDS_COL_COUVERTURE_2 = 20;  // T
var KIDS_COL_COUVERTURE_3 = 21;  // U
var KIDS_COL_STATUS_LIVRE = 22;  // V
var KIDS_COL_LIEN_PDF = 23;      // W
var KIDS_COL_STATUT_CHANGE_LE = 25;
var KIDS_COL_RELANCE_1 = 26;
var KIDS_COL_RELANCE_2 = 27;
var KIDS_COL_RELANCE_3 = 28;
var KIDS_COL_ADRESSE = 29;
var KIDS_COL_VILLE = 30;
var KIDS_COL_COMMUNE = 31;
var KIDS_COL_ACTION_COUVERTURE_LIVRE = 32;
var KIDS_COL_ACTION_NRP1 = 33;
var KIDS_COL_ACTION_NRP2 = 34;
var KIDS_COL_ACTION_NRP3 = 35;
var KIDS_COL_ACTION_SUCCES = 36;
// M=WTP dropdown, N=WhatsApp LINK, O=APP (formula to open app)
var KIDS_COL_WTP_DROPDOWN = 13;  // M
var KIDS_COL_APP_URL = 24;       // X: GAS writes session URL here when M=COVER (optional; O formula can call openApp directly)

// Script Properties: BACKEND_URL (required), APP_URL (for app link), WEBHOOK_URL (web app exec URL), WEBHOOK_SECRET (optional)
// Hardcoded sheet ID so form POSTs always find the sheet (same as the URL you use for the spreadsheet).
var FALLBACK_SPREADSHEET_ID = "1oEsWd5aHhBb2zrFUDXrqAwHSSAY5JbaNKvT77fBqjzo";

// Normalize backend/app URL: ensure it has https:// and no trailing slash
function normalizeBackendUrl(url) {
    if (!url || typeof url !== "string") return "";
    var u = url.trim().replace(/\/+$/, "");
    if (u && u.indexOf("http://") !== 0 && u.indexOf("https://") !== 0) u = "https://" + u;
    return u;
}

// --- REFERENCE DEFAULTS (for reference sheet / template text) ---
var REFERENCE_DEFAULTS = {};

// --- No menu: all actions from columns (M = dropdown, N = WhatsApp link, O = app link formula) ---
function onOpen() {}

function addLivreMagiqueMenu() {}

// --- ROW ACTIONS (see user's pasted script for full bodies) ---
function ouvrirAppPourCetteLigne() { /* see user's pasted script */ }
function genererCouverturePourCetteLigne() { /* see user's pasted script */ }
function genererCouvertureKidsPourCetteLigne() { runGenererCouvertureKids(); }
function runGenererCouvertureKids() {
    var sheet = SpreadsheetApp.getActiveSheet();
    var range = SpreadsheetApp.getActiveRange();
    if (!sheet || !range || sheet.getName() !== "kids_orders") {
        SpreadsheetApp.getUi().alert("Sélectionnez une cellule dans la feuille kids_orders.");
        return;
    }
    var rowIndex = range.getRow();
    if (rowIndex < 2) {
        SpreadsheetApp.getUi().alert("Sélectionnez une ligne de données (ligne 2 ou plus).");
        return;
    }
    var props = PropertiesService.getScriptProperties();
    var backendUrl = normalizeBackendUrl(props.getProperty("BACKEND_URL") || "");
    var appUrl = normalizeBackendUrl(props.getProperty("APP_URL") || "");
    if (!backendUrl || !appUrl) {
        SpreadsheetApp.getUi().alert("Configurez BACKEND_URL et APP_URL dans les propriétés du script.");
        return;
    }
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var lastCol = Math.max(KIDS_ORDERS_COLS, sheet.getLastColumn());
    var rowValues = sheet.getRange(rowIndex, 1, rowIndex, lastCol).getValues()[0];
    var row = buildKidsRowPayloadFromValues(rowValues, rowIndex, sheet);
    var webhookUrl = PropertiesService.getScriptProperties().getProperty("WEBHOOK_URL") || "";
    if (!webhookUrl) {
        try { webhookUrl = ScriptApp.getService().getUrl() || ""; } catch (e) {}
    }
    var webhookSecret = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET") || "";
    var payload = {
        spreadsheetId: doc.getId(),
        sheetName: "kids_orders",
        rowIndex: rowIndex,
        outputFolderId: PDF_OUTPUT_FOLDER_ID || props.getProperty("PDF_OUTPUT_FOLDER_ID") || "",
        webhookUrl: webhookUrl,
        webhookSecret: webhookSecret,
        type: "ramadan",
        coverColumn: KIDS_COL_COUVERTURE_1,
        row: row
    };
    var options = { method: "post", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true };
    var resp = UrlFetchApp.fetch(backendUrl + "/sheet/prepareCover", options);
    var code = resp.getResponseCode();
    var body = resp.getContentText();
    if (code !== 200) {
        SpreadsheetApp.getUi().alert("Erreur backend: " + code + " " + body);
        return;
    }
    var result = JSON.parse(body);
    var sessionId = result.sessionId;
    if (!sessionId) {
        SpreadsheetApp.getUi().alert("Backend n'a pas renvoyé sessionId.");
        return;
    }
    var openUrl = appUrl + "?fromSheet=" + sessionId + "&template=ramadan";
    sheet.getRange(rowIndex, KIDS_COL_APP_URL).setValue(openUrl);
}

function buildKidsRowPayloadFromValues(rowValues, rowIndex, sheet) {
    var photo1Url = rowValues[KIDS_COL_PHOTO1 - 1] ? String(rowValues[KIDS_COL_PHOTO1 - 1]).trim() : "";
    var photo2Url = rowValues[KIDS_COL_PHOTO2 - 1] ? String(rowValues[KIDS_COL_PHOTO2 - 1]).trim() : "";
    var photo3Url = rowValues[KIDS_COL_PHOTO3 - 1] ? String(rowValues[KIDS_COL_PHOTO3 - 1]).trim() : "";
    var child1Base64 = photo1Url ? fetchDrivePhotoAsBase64(photo1Url) : "";
    var child2Base64 = photo2Url ? fetchDrivePhotoAsBase64(photo2Url) : "";
    var child3Base64 = photo3Url ? fetchDrivePhotoAsBase64(photo3Url) : "";
    return {
        date: rowValues[0],
        buyerName: rowValues[1],
        phone: rowValues[2],
        pack: rowValues[3],
        price: rowValues[4],
        prenoms: rowValues[5],
        ages: rowValues[6],
        genres: rowValues[7],
        langues: rowValues[8],
        themes: rowValues[9],
        status: rowValues[10],
        child1PhotoUrl: photo1Url,
        child2PhotoUrl: photo2Url,
        child3PhotoUrl: photo3Url,
        child1PhotoBase64: child1Base64 || "",
        child2PhotoBase64: child2Base64 || "",
        child3PhotoBase64: child3Base64 || "",
        coverImageBase64: ""
    };
}

function remplirLienAppPourCetteLigne() {
    var sheet = SpreadsheetApp.getActiveSheet();
    var range = SpreadsheetApp.getActiveRange();
    if (!sheet || !range) {
        SpreadsheetApp.getUi().alert("Sélectionnez une cellule.");
        return;
    }
    if (sheet.getName() !== "kids_orders") {
        SpreadsheetApp.getUi().alert("Cette action est réservée à la feuille kids_orders.");
        return;
    }
    var rowIndex = range.getRow();
    if (rowIndex < 2) {
        SpreadsheetApp.getUi().alert("Sélectionnez une ligne de données (ligne 2 ou plus).");
        return;
    }
    try {
        tryFillLinkInColumnO(sheet, rowIndex);
        SpreadsheetApp.getActiveSpreadsheet().toast("Lien ajouté en colonne O.", "Lien app", 4);
    } catch (e) {
        SpreadsheetApp.getUi().alert("Erreur: " + e.toString());
    }
}

function tryFillLinkInColumnO(sheet, rowIndex) {
    if (!sheet || sheet.getName() !== "kids_orders" || rowIndex < 2) return;
    var props = PropertiesService.getScriptProperties();
    var backendUrl = normalizeBackendUrl(props.getProperty("BACKEND_URL") || "");
    var appUrl = normalizeBackendUrl(props.getProperty("APP_URL") || "");
    if (!backendUrl || !appUrl) return;
    var doc = sheet.getParent();
    var lastCol = Math.max(KIDS_ORDERS_COLS, sheet.getLastColumn());
    var rowValues = sheet.getRange(rowIndex, 1, rowIndex, lastCol).getValues()[0];
    var row = buildKidsRowPayloadFromValues(rowValues, rowIndex, sheet);
    var webhookUrl = props.getProperty("WEBHOOK_URL") || "";
    if (!webhookUrl) {
        try { webhookUrl = ScriptApp.getService().getUrl() || ""; } catch (e) {}
    }
    var webhookSecret = props.getProperty("WEBHOOK_SECRET") || "";
    var payload = {
        spreadsheetId: doc.getId(),
        sheetName: "kids_orders",
        rowIndex: rowIndex,
        outputFolderId: PDF_OUTPUT_FOLDER_ID || props.getProperty("PDF_OUTPUT_FOLDER_ID") || "",
        webhookUrl: webhookUrl,
        webhookSecret: webhookSecret,
        type: "ramadan",
        coverColumn: KIDS_COL_COUVERTURE_1,
        row: row
    };
    var options = { method: "post", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true };
    var resp = UrlFetchApp.fetch(backendUrl + "/sheet/prepareCover", options);
    var code = resp.getResponseCode();
    var body = resp.getContentText();
    if (code !== 200 || !body) return;
    var result = JSON.parse(body);
    var sessionId = result.sessionId;
    if (!sessionId) return;
    var openUrl = appUrl + "?fromSheet=" + sessionId + "&template=ramadan";
    sheet.getRange(rowIndex, KIDS_COL_APP_URL).setValue(openUrl);
}

function showClickableLinkDialog(title, url, instructionText) {
    var safeUrl = (url || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
    var safeText = (instructionText || "Cliquez sur le lien ci-dessous :").replace(/</g, "&lt;").replace(/"/g, "&quot;");
    var html = "<!DOCTYPE html><html><head><meta charset='utf-8'><style>body{font-family:sans-serif;padding:16px;} p{margin:0 0 10px 0;} a{color:#1967d2;text-decoration:underline;word-break:break-all;}</style></head><body><p><strong>" + safeText + "</strong></p><p><a href=\"" + safeUrl + "\" target=\"_blank\">" + safeUrl + "</a></p><p style='margin-top:14px;font-size:12px;color:#666;'>Fermez avec le X après avoir ouvert le lien.</p></body></html>";
    SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(480).setHeight(160), title || "Lien");
}

function fetchDrivePhotoAsBase64(driveFileUrl) {
    if (!driveFileUrl || driveFileUrl.length < 10) return null;
    var match = driveFileUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (!match || !match[1]) return null;
    try {
        var file = DriveApp.getFileById(match[1]);
        var blob = file.getBlob();
        var base64 = Utilities.base64Encode(blob.getBytes());
        var mime = blob.getContentType() || "image/jpeg";
        return "data:" + mime + ";base64," + base64;
    } catch (e) {
        Logger.log("fetchDrivePhotoAsBase64: " + e.toString());
        return null;
    }
}

function creerLivrePourCetteLigne() { /* see user's pasted script */ }
function creerLivreKidsPourCetteLigne() { runCreerLivreKids(); }
function runCreerLivreKids() { /* see user's pasted script */ }

function kidsFormatTrackingDate(d) { return d ? Utilities.formatDate(new Date(d), "Africa/Casablanca", "dd/MM/yyyy HH:mm") : ""; }
function onEdit(e) {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    if (sheet.getName() !== "kids_orders") return;
    var col = e.range.getColumn();
    var rowIndex = e.range.getRow();
    if (rowIndex < 2) return;
    // Column M (13): when user selects "COVER" from dropdown, fill app URL in column X so O's HYPERLINK can use it
    if (col === KIDS_COL_WTP_DROPDOWN) {
        var val = e.value ? String(e.value).trim() : "";
        if (val === "COVER") {
            try {
                tryFillLinkInColumnO(sheet, rowIndex);
            } catch (err) {
                Logger.log("onEdit COVER tryFillLinkInColumnO: " + err.toString());
            }
        }
        return;
    }
}
function kidsGetPhoneFromRow(sheet, rowIndex) { /* see user's pasted script */ return ""; }
function kidsGetTemplateReplaced(template, row) { /* see user's pasted script */ return template; }
function showWhatsAppDialog(title, message, phone) { /* see user's pasted script */ }
function kidsOpenWhatsApp(phone, text) { /* see user's pasted script */ }
function runWhatsAppNRP() { /* see user's pasted script */ }
function runWhatsAppSuccess() { /* see user's pasted script */ }
function migrerColonnesKidsOrders() { /* see user's pasted script */ }

// --- WEB APP: doGet / doPost ---
function doGet(e) {
    var lock = LockService.getScriptLock();
    lock.tryLock(10000);
    try {
        var params = e && e.parameter ? e.parameter : {};
        if (params.ping === "1" || params.ping === "true") {
            var ss = getSpreadsheet();
            var sheet = ss ? ss.getSheetByName("kids_orders") : null;
            if (sheet) {
                var pingRow = [Utilities.formatDate(new Date(), "Africa/Casablanca", "dd/MM/yyyy HH:mm:ss"), "PING TEST", "'0000000000", 1, "0 DH", "", "", "", "", "", "Ping", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "—", false, false, false, false];
                sheet.appendRow(pingRow);
                return ContentService.createTextOutput("OK: Ping written to kids_orders. Form POSTs will use the same sheet.").setMimeType(ContentService.MimeType.TEXT_PLAIN);
            }
            return ContentService.createTextOutput("Error: No spreadsheet. Run saveSpreadsheetId() from the script editor with your sheet open, then run ping again.").setMimeType(ContentService.MimeType.TEXT_PLAIN);
        }
        if (params.action === "updateRow") {
            var token = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET") || "";
            if (token && params.token !== token) {
                return ContentService.createTextOutput(JSON.stringify({ result: "error", error: "unauthorized" })).setMimeType(ContentService.MimeType.JSON);
            }
            var spreadsheetId = params.spreadsheetId;
            var rowIndex = parseInt(params.rowIndex, 10);
            var status = params.status || "";
            var pdfUrl = params.pdfUrl || "";
            var coverUrl = params.coverUrl || "";
            var sheetName = params.sheetName || "lovers_orders";
            var coverColumnParam = params.coverColumn;
            if (!spreadsheetId || !rowIndex || rowIndex < 2) {
                return ContentService.createTextOutput(JSON.stringify({ result: "error", error: "missing params" })).setMimeType(ContentService.MimeType.JSON);
            }
            var spread = SpreadsheetApp.openById(spreadsheetId);
            var sheetToUpdate = spread.getSheetByName(sheetName) || spread.getSheets()[0];
            var colStatus = (sheetName === "kids_orders") ? KIDS_COL_STATUS_LIVRE : 23;
            var colPdf = (sheetName === "kids_orders") ? KIDS_COL_LIEN_PDF : 24;
            var colCover = (sheetName === "kids_orders" && coverColumnParam) ? parseInt(coverColumnParam, 10) : (sheetName === "kids_orders" ? KIDS_COL_COUVERTURE_1 : 22);
            if (status) sheetToUpdate.getRange(rowIndex, colStatus).setValue(status);
            if (pdfUrl) sheetToUpdate.getRange(rowIndex, colPdf).setValue(pdfUrl);
            if (coverUrl) sheetToUpdate.getRange(rowIndex, colCover).setValue(coverUrl);
            return ContentService.createTextOutput(JSON.stringify({ result: "success" })).setMimeType(ContentService.MimeType.JSON);
        }
        // action=openApp: open Vercel app with prefilled data from that row (no need to select COVER first)
        if (params.action === "openApp") {
            var rowIndex = parseInt(params.rowIndex, 10);
            if (!rowIndex || rowIndex < 2) {
                return ContentService.createTextOutput("Missing or invalid rowIndex").setMimeType(ContentService.MimeType.TEXT_PLAIN);
            }
            var ss = params.spreadsheetId ? SpreadsheetApp.openById(params.spreadsheetId) : getSpreadsheet();
            if (!ss) {
                return ContentService.createTextOutput("Spreadsheet not found. Set SPREADSHEET_ID or pass spreadsheetId in the URL.").setMimeType(ContentService.MimeType.TEXT_PLAIN);
            }
            var sheet = ss.getSheetByName(params.sheetName || "kids_orders");
            if (!sheet) {
                return ContentService.createTextOutput("Sheet kids_orders not found.").setMimeType(ContentService.MimeType.TEXT_PLAIN);
            }
            var props = PropertiesService.getScriptProperties();
            var backendUrl = normalizeBackendUrl(props.getProperty("BACKEND_URL") || "");
            var appUrl = normalizeBackendUrl(props.getProperty("APP_URL") || "");
            if (!backendUrl || !appUrl) {
                return ContentService.createTextOutput("Set BACKEND_URL and APP_URL in Script properties.").setMimeType(ContentService.MimeType.TEXT_PLAIN);
            }
            var lastCol = Math.max(KIDS_ORDERS_COLS, sheet.getLastColumn());
            var rowValues = sheet.getRange(rowIndex, 1, rowIndex, lastCol).getValues()[0];
            var row = buildKidsRowPayloadFromValues(rowValues, rowIndex, sheet);
            var webhookUrl = props.getProperty("WEBHOOK_URL") || "";
            if (!webhookUrl) {
                try { webhookUrl = ScriptApp.getService().getUrl() || ""; } catch (ex) {}
            }
            var webhookSecret = props.getProperty("WEBHOOK_SECRET") || "";
            var payload = {
                spreadsheetId: ss.getId(),
                sheetName: "kids_orders",
                rowIndex: rowIndex,
                outputFolderId: PDF_OUTPUT_FOLDER_ID || props.getProperty("PDF_OUTPUT_FOLDER_ID") || "",
                webhookUrl: webhookUrl,
                webhookSecret: webhookSecret,
                type: "ramadan",
                coverColumn: KIDS_COL_COUVERTURE_1,
                row: row
            };
            var resp = UrlFetchApp.fetch(backendUrl + "/sheet/prepareCover", {
                method: "post",
                contentType: "application/json",
                payload: JSON.stringify(payload),
                muteHttpExceptions: true
            });
            var code = resp.getResponseCode();
            var body = resp.getContentText();
            if (code !== 200 || !body) {
                return ContentService.createTextOutput("Backend error " + code + ". Check BACKEND_URL and logs.").setMimeType(ContentService.MimeType.TEXT_PLAIN);
            }
            var result = JSON.parse(body);
            var sessionId = result.sessionId;
            if (!sessionId) {
                return ContentService.createTextOutput("Backend did not return sessionId.").setMimeType(ContentService.MimeType.TEXT_PLAIN);
            }
            var appLinkUrl = appUrl + "?fromSheet=" + encodeURIComponent(sessionId) + "&template=ramadan";
            if (params.format === "json") {
                return ContentService.createTextOutput(JSON.stringify({ redirectUrl: appLinkUrl })).setMimeType(ContentService.MimeType.JSON);
            }
            var safeHref = appLinkUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
            var urlInScript = JSON.stringify(appLinkUrl);
            var html = "<!DOCTYPE html><html><head><meta charset='utf-8'>" +
                "<meta http-equiv='refresh' content='0;url=" + appLinkUrl.replace(/&/g, "&amp;").replace(/'/g, "%27") + "'>" +
                "<script>window.location.replace(" + urlInScript + ");<\/script>" +
                "</head><body style='font-family:sans-serif;padding:24px;text-align:center;'>" +
                "<p>Redirection vers l'app…</p>" +
                "<p><a href=\"" + safeHref + "\" target=\"_blank\" rel=\"noopener\" style='color:#1967d2;font-size:18px;'>Ouvrir l'app — cliquez ici</a></p>" +
                "<p><button type='button' onclick=\"navigator.clipboard.writeText(" + urlInScript + ");this.textContent='Lien copié !';\" style='padding:10px 20px;cursor:pointer;background:#1967d2;color:#fff;border:none;border-radius:8px;'>Copier le lien</button></p>" +
                "</body></html>";
            return ContentService.createTextOutput(html).setMimeType(ContentService.MimeType.HTML);
        }
        if (!params.data) {
            Logger.log("doGet: no data");
            return ContentService.createTextOutput("error");
        }
        var payloadB64 = params.data;
        var payloadStr = decodeURIComponent(escape(Utilities.newBlob(Utilities.base64Decode(payloadB64)).getDataAsString()));
        var data = JSON.parse(payloadStr);
        routeFormSubmission(data);
        var gif = Utilities.base64Decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
        return ContentService.createTextOutput().setMimeType(ContentService.MimeType.PNG).setContent(gif);
    } catch (err) {
        Logger.log("doGet: " + err.toString());
        return ContentService.createTextOutput("error");
    } finally {
        lock.releaseLock();
    }
}

function doPost(e) {
    var lock = LockService.getScriptLock();
    lock.tryLock(10000);
    try {
        var data;
        var raw = "";
        if (e && e.parameter && e.parameter.data) {
            raw = e.parameter.data;
        }
        if ((!raw || raw.length < 2) && e && e.postData && e.postData.contents) {
            raw = typeof e.postData.contents === "string" ? e.postData.contents : "";
        }
        if (!raw || raw.length < 2) {
            Logger.log("doPost: no or empty POST data");
            return ramadanFormResponse("error", "No POST data");
        }
        if (raw.indexOf("data=") === 0 || raw.indexOf("&") >= 0) {
            var parsed = parseFormUrlencoded(raw);
            if (parsed.data) raw = parsed.data;
        }
        try {
            data = JSON.parse(raw);
        } catch (err1) {
            try {
                data = JSON.parse(decodeURIComponent(raw));
            } catch (parseErr) {
                Logger.log("doPost: JSON parse failed - " + parseErr.toString());
                return ramadanFormResponse("error", "Invalid JSON");
            }
        }
        if (!data || typeof data !== "object") {
            return ramadanFormResponse("error", "Invalid payload");
        }
        routeFormSubmission(data);
        return ramadanFormResponse("success", null);
    } catch (err) {
        Logger.log("doPost: " + err.toString());
        return ramadanFormResponse("error", err.toString());
    } finally {
        lock.releaseLock();
    }
}

function ramadanFormResponse(result, errorMsg) {
    var err = (errorMsg || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "\\\"").replace(/\n/g, " ");
    var payload = result === "success"
        ? "{ type: 'ramadan-form', result: 'success' }"
        : "{ type: 'ramadan-form', result: 'error', error: '" + err + "' }";
    var html = "<!DOCTYPE html><html><head><meta charset='utf-8'></head><body><script>try { window.parent.postMessage(" + payload + ", '*'); } catch (e) { }<\/script><p>" + (result === "success" ? "OK" : "Error") + "</p></body></html>";
    return ContentService.createTextOutput(html).setMimeType(ContentService.MimeType.HTML);
}

function parseFormUrlencoded(str) {
    var out = {};
    var pairs = str.split("&");
    for (var i = 0; i < pairs.length; i++) {
        var idx = pairs[i].indexOf("=");
        if (idx >= 0) {
            var k = decodeURIComponent(pairs[i].substring(0, idx).replace(/\+/g, " "));
            var v = decodeURIComponent(pairs[i].substring(idx + 1).replace(/\+/g, " "));
            out[k] = v;
        }
    }
    return out;
}

function routeFormSubmission(data) {
    try {
        if (data.kind === "KIDS_FLOW_V2") {
            processKidsSubmission(data);
            return;
        }
        if (data.kind === "RAMADAN_FLOW" || data.template === "ramadan") {
            processRamadanSubmission(data);
            return;
        }
        processFormSubmission(data);
    } catch (routeErr) {
        Logger.log("routeFormSubmission: " + routeErr.toString());
        throw routeErr;
    }
}

function getSpreadsheet() {
    var id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
    if (!id || id.length < 10) id = typeof FALLBACK_SPREADSHEET_ID !== "undefined" ? FALLBACK_SPREADSHEET_ID : "";
    if (id && id.length > 10) {
        try {
            return SpreadsheetApp.openById(id);
        } catch (e) {
            Logger.log("getSpreadsheet openById failed: " + e.toString());
            if (typeof FALLBACK_SPREADSHEET_ID !== "undefined" && FALLBACK_SPREADSHEET_ID && FALLBACK_SPREADSHEET_ID !== id) {
                try {
                    return SpreadsheetApp.openById(FALLBACK_SPREADSHEET_ID);
                } catch (e2) {}
            }
        }
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) {
        try {
            PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", ss.getId());
        } catch (e) {}
        return ss;
    }
    return null;
}

function saveSpreadsheetId() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
        Logger.log("Open the spreadsheet first, then run saveSpreadsheetId from the script editor.");
        return "Open the sheet and run again.";
    }
    PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", ss.getId());
    Logger.log("SPREADSHEET_ID saved: " + ss.getId());
    return "OK. Form submissions will now write to this sheet.";
}

function getOrCreateReferenceSheet(doc) {
    doc = doc || getSpreadsheet();
    var sheet = doc.getSheetByName("reference");
    if (!sheet) sheet = doc.insertSheet("reference");
    return sheet;
}

function getReferenceText(key, doc) {
    var sheet = getOrCreateReferenceSheet(doc);
    var data = sheet.getDataRange().getValues();
    for (var i = 0; i < data.length; i++) {
        if (data[i][0] == key) return data[i][1];
    }
    return REFERENCE_DEFAULTS[key] || "";
}

function getOrCreateKidsOrdersSheet(doc) {
    doc = doc || getSpreadsheet();
    var sheet = doc.getSheetByName("kids_orders");
    if (!sheet) {
        sheet = doc.insertSheet("kids_orders");
        sheet.getRange(1, 1, 1, KIDS_ORDERS_HEADERS.length).setValues([KIDS_ORDERS_HEADERS]);
        sheet.setFrozenRows(1);
        applyActionColumnValidation(sheet);
    }
    return sheet;
}

function applyActionColumnValidation(sheet) {
    sheet = sheet || getSpreadsheet().getSheetByName("kids_orders");
    if (!sheet) return;
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return;
    var ruleCouv = SpreadsheetApp.newDataValidation().requireValueInList(["—", "Générer couverture", "Créer livre"], true).setAllowInvalid(false).build();
    sheet.getRange(2, KIDS_COL_ACTION_COUVERTURE_LIVRE, lastRow, KIDS_COL_ACTION_COUVERTURE_LIVRE).setDataValidation(ruleCouv);
    var ruleCheckbox = SpreadsheetApp.newDataValidation().requireCheckbox().build();
    sheet.getRange(2, KIDS_COL_ACTION_NRP1, lastRow, KIDS_COL_ACTION_SUCCES).setDataValidation(ruleCheckbox);
    var checkboxRange = sheet.getRange(2, KIDS_COL_ACTION_NRP1, lastRow, KIDS_COL_ACTION_SUCCES);
}

function applyActionColumnValidationForRow(sheet, rowIndex) {
    if (!sheet || rowIndex < 2) return;
    var ruleCouv = SpreadsheetApp.newDataValidation().requireValueInList(["—", "Générer couverture", "Créer livre"], true).setAllowInvalid(false).build();
    sheet.getRange(rowIndex, KIDS_COL_ACTION_COUVERTURE_LIVRE, rowIndex, KIDS_COL_ACTION_COUVERTURE_LIVRE).setDataValidation(ruleCouv).setValue("—");
    var ruleCheckbox = SpreadsheetApp.newDataValidation().requireCheckbox().build();
    sheet.getRange(rowIndex, KIDS_COL_ACTION_NRP1, rowIndex, KIDS_COL_ACTION_SUCCES).setDataValidation(ruleCheckbox);
    sheet.getRange(rowIndex, KIDS_COL_ACTION_NRP1, rowIndex, KIDS_COL_ACTION_SUCCES).setValues([[false, false, false, false]]);
}

function cleanupExtraColumnValidation(sheet) { /* see user's pasted script */ }

function processRamadanSubmission(data) {
    var doc = getSpreadsheet();
    var sheet = getOrCreateKidsOrdersSheet(doc);
    saveSpreadsheetId(doc.getId());
    var date = kidsFormatTrackingDate(new Date());
    var row = [
        date,
        data.buyerName || data.nom || "",
        (data.phone || data.tel || "").toString().replace(/^([0-9])/, "'$1"),
        data.prenoms || "",
        data.ages || "",
        data.langues || "Français",
        data.themes || "",
        data.style || "3D Animation",
        data.prix || "299 DH",
        "Nouveau",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
    ];
    sheet.appendRow(row);
    var lastRow = sheet.getLastRow();
    applyActionColumnValidationForRow(sheet, lastRow);
    try {
        tryFillLinkInColumnO(sheet, lastRow);
    } catch (e) {
        Logger.log("tryFillLinkInColumnO failed: " + e.toString());
    }
}

function processKidsSubmission(data) {
    var doc = getSpreadsheet();
    var sheet = getOrCreateKidsOrdersSheet(doc);
    saveSpreadsheetId(doc.getId());
    var date = kidsFormatTrackingDate(new Date());
    var row = [
        date,
        data.buyerName || data.nom || "",
        (data.phone || data.tel || "").toString().replace(/^([0-9])/, "'$1"),
        data.prenoms || "",
        data.ages || "",
        data.langues || "Français",
        data.themes || "",
        data.style || "3D Animation",
        data.prix || "299 DH",
        "Nouveau",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
    ];
    sheet.appendRow(row);
    var lastRow = sheet.getLastRow();
    applyActionColumnValidationForRow(sheet, lastRow);
    try {
        tryFillLinkInColumnO(sheet, lastRow);
    } catch (e) {
        Logger.log("tryFillLinkInColumnO failed: " + e.toString());
    }
}

function testKidsOrdersWrite() { /* see user's pasted script */ }

function processFormSubmission(data) {
    var doc = getSpreadsheet();
    var sheet = doc.getSheetByName("lovers_orders") || doc.getSheets()[0];
    var date = Utilities.formatDate(new Date(), "Africa/Casablanca", "dd/MM/yyyy HH:mm:ss");
    var bookName = "Inconnu";
    if (data.book && data.book.id == 1) bookName = "Raisons d'Aimer";
    else if (data.book && data.book.id == 2) bookName = "Années d'Amour";
    else if (data.book && data.book.id == 3) bookName = "Liste de Rêves";
    else if (data.book && data.book.id == 4) bookName = "100% Sur Mesure";
    var recipientFr = (data.recipient === "HER") ? "Elle" : "Lui";
    var langMap = { "fr": "Français", "ar": "Arabe", "en": "Anglais" };
    var langFr = data.book && data.book.lang ? (langMap[data.book.lang] || data.book.lang) : "Français";
    var optionsList = "";
    if (data.book && Array.isArray(data.book.options)) optionsList = data.book.options.join(", ");
    else if (data.book && data.book.options) optionsList = data.book.options;
    var totalPrice = 299;
    if (data.book && data.book.id == 4) totalPrice += 49;
    if (data.extras && data.extras.giftwrap) totalPrice += 19;
    var himPhotoUrl = saveImageToDrive(data.partner1 && data.partner1.photo ? data.partner1.photo : "", "LUI_" + (data.buyer && data.buyer.name) + "_" + (data.tracking && data.tracking.eventId), FOLDER_ID);
    var herPhotoUrl = saveImageToDrive(data.partner2 && data.partner2.photo ? data.partner2.photo : "", "ELLE_" + (data.buyer && data.buyer.name) + "_" + (data.tracking && data.tracking.eventId), FOLDER_ID);
    var row = [
        date,
        data.buyer ? data.buyer.name : "",
        "'" + (data.buyer ? data.buyer.phone : ""),
        bookName,
        recipientFr,
        data.partner1 ? data.partner1.name : "",
        data.partner1 ? data.partner1.age : "",
        data.partner2 ? data.partner2.name : "",
        data.partner2 ? data.partner2.age : "",
        langFr,
        data.book ? data.book.style : "",
        data.book ? (data.book.years || "") : "",
        data.book ? (data.book.customTitle || "") : "",
        data.book ? (data.book.customNote || "") : "",
        optionsList,
        (data.extras && data.extras.giftwrap) ? "OUI" : "NON",
        totalPrice + " DH",
        "Nouveau",
        himPhotoUrl,
        herPhotoUrl,
        "",
        "",
        "Nouveau",
        ""
    ];
    sheet.appendRow(row);
    Logger.log("Row appended successfully");
    if (data.tracking) sendToMetaCAPI(data, totalPrice);
}

function saveImageToDrive(base64String, fileName, folderId) {
    if (!base64String || base64String.length < 100) return "";
    try {
        var contentType = base64String.substring(5, base64String.indexOf(';'));
        var bytes = Utilities.base64Decode(base64String.substr(base64String.indexOf('base64,') + 7));
        var blob = Utilities.newBlob(bytes, contentType, fileName);
        var file = Drive.Files.insert({ title: fileName, parents: [{ id: folderId }], mimeType: contentType }, blob);
        Drive.Permissions.insert({ role: 'reader', type: 'anyone', withLink: true }, file.id);
        return "https://drive.google.com/file/d/" + file.id + "/view";
    } catch (e) {
        Logger.log("ERROR in saveImageToDrive: " + e.toString());
        return "Erreur: " + e.toString();
    }
}

function sendToMetaCAPI(data, price) {
    try {
        var url = "https://graph.facebook.com/v19.0/" + PIXEL_ID + "/events?access_token=" + ACCESS_TOKEN;
        var cleanPhone = data.buyer && data.buyer.phone ? data.buyer.phone.replace(/\D/g, '') : "";
        var phoneHash = sha256(cleanPhone);
        var names = (data.buyer && data.buyer.name) ? data.buyer.name.trim().split(" ") : [];
        var fn = names[0] || "";
        var ln = names.length > 1 ? names[names.length - 1] : "";
        var payload = {
            data: [{
                event_name: "Lead",
                event_time: Math.floor(new Date().getTime() / 1000),
                event_source_url: data.tracking.pageUrl,
                event_id: data.tracking.eventId,
                action_source: "website",
                user_data: { ph: [phoneHash], fn: [sha256(fn)], ln: [sha256(ln)], client_user_agent: data.tracking.userAgent, fbp: data.tracking.fbp, fbc: data.tracking.fbc },
                custom_data: { currency: "MAD", value: price, content_name: "Livre Magique: " + (data.book ? data.book.id : ""), recipient: data.recipient }
            }]
        };
        UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true });
    } catch (e) {
        Logger.log("CAPI Error: " + e.toString());
    }
}

function sha256(str) {
    if (!str) return null;
    var clean = str.trim().toLowerCase();
    var signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, clean, Utilities.Charset.UTF_8);
    var txt = "";
    for (var i = 0; i < signature.length; i++) {
        var byte = signature[i];
        if (byte < 0) byte += 256;
        txt += (byte < 16 ? "0" : "") + byte.toString(16);
    }
    return txt;
}

function testDriveAccess() {
    try {
        var folder = Drive.Files.get(FOLDER_ID);
        Logger.log("SUCCESS! Folder: " + folder.title);
        return "Success! Check the logs.";
    } catch (e) {
        Logger.log("ERROR: " + e.toString());
        return "Error: " + e.toString();
    }
}
