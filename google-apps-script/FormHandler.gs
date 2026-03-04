// --- CONFIGURATION ---
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

// 4. Folder where generated cover PDFs are saved (fixed)
var PDF_OUTPUT_FOLDER_ID = "1b5gfij0uyZ9NZLJbiCk-me6SJD7WPm_o";

// 5. Folder where finished book PDFs are saved (change this to your book folder)
var BOOK_OUTPUT_FOLDER_ID = "CHANGE_ME_BOOK_FOLDER_ID";

// Column numbers: V=22 Couverture, W=23 Status Livre, X=24 Livre PDF
var COL_COUVERTURE = 22;
var COL_STATUS_LIVRE = 23;
var COL_LIEN_PDF = 24;

// Kids orders sheet: 29 columns A–AC exactly. Y = Statut changé le (timestamp).
var KIDS_ORDERS_HEADERS = ["Date", "Nom acheteur", "Téléphone", "Quantité", "Prix total", "Prénoms", "Âges", "Genres", "Langues", "Thèmes", "Statut", "Notes", "WTP", "LINK", "APP", "Photo enfant 1", "Photo enfant 2", "Photo enfant 3", "Couverture 1", "Couverture 2", "Couverture 3", "Status Livre", "Lien PDF", "App URL", "Statut changé le", "Relance 1 le", "Relance 2 le", "Relance 3 le", "adresse"];
var KIDS_ORDERS_COLS = 29;
var KIDS_COL_PHOTO1 = 16;
var KIDS_COL_PHOTO2 = 17;
var KIDS_COL_PHOTO3 = 18;
var KIDS_COL_COUVERTURE_1 = 19;
var KIDS_COL_COUVERTURE_2 = 20;
var KIDS_COL_COUVERTURE_3 = 21;
var KIDS_COL_STATUS_LIVRE = 22;
var KIDS_COL_LIEN_PDF = 23; // Column W — repurposed as Book checkbox
var KIDS_COL_BOOK = 23;     // Column W: Book checkbox → popup with per-kid book links
var KIDS_COL_APP_URL = 24;
var KIDS_COL_STATUT_CHANGE_LE = 25;  // Y
var KIDS_COL_RELANCE_1 = 26;
var KIDS_COL_RELANCE_2 = 27;
var KIDS_COL_RELANCE_3 = 28;
var KIDS_COL_ADRESSE = 29;           // AC
var KIDS_COL_NOM = 2;                // B
var KIDS_COL_PRENOMS = 6;            // F
var KIDS_COL_AGES = 7;               // G
var KIDS_COL_GENRES = 8;             // H
var KIDS_COL_COUVERTURE = 19;
var KIDS_COL_ACTION_COUVERTURE_LIVRE = 32;
var KIDS_COL_ACTION_NRP1 = 33;
var KIDS_COL_ACTION_NRP2 = 34;
var KIDS_COL_ACTION_NRP3 = 35;
var KIDS_COL_ACTION_SUCCES = 36;
var KIDS_COL_APP = 15;  // Column O: dropdown "Ouvrir l'app" → popup with link

// Script Properties: BACKEND_URL (required), APP_URL (for "Ouvrir dans l'app"), WEBHOOK_URL (web app exec URL), WEBHOOK_SECRET (optional)
// Hardcoded sheet ID so form POSTs always find the sheet (same as the URL you use for the spreadsheet).
var FALLBACK_SPREADSHEET_ID = "1oEsWd5aHhBb2zrFUDXrqAwHSSAY5JbaNKvT77fBqjzo";

// --- MENU (runs when you open the sheet). No menu on kids_orders (no column-verify). ---
function onOpen() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss ? ss.getActiveSheet() : null;
    var sheetName = sheet ? sheet.getName() : "";
    var ui = SpreadsheetApp.getUi();
    if (sheetName === "kids_orders") {
      return;
    }
    var menu = ui.createMenu("Livre Magique");
    menu.addItem("Créer le livre pour cette ligne", "creerLivrePourCetteLigne")
      .addItem("Ouvrir dans l'app (révision)", "ouvrirAppPourCetteLigne")
      .addItem("Générer la couverture pour cette ligne", "genererCouverturePourCetteLigne");
    menu.addToUi();
  } catch (err) {
    Logger.log("onOpen: " + err.toString());
  }
}

// If menu doesn't show: run this once from the script editor, then refresh the sheet.
function addLivreMagiqueMenu() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss ? ss.getActiveSheet() : null;
  var sheetName = sheet ? sheet.getName() : "";
  var ui = SpreadsheetApp.getUi();
  if (sheetName === "kids_orders") {
    return;
  }
  var menu = ui.createMenu("Livre Magique");
  menu.addItem("Créer le livre pour cette ligne", "creerLivrePourCetteLigne")
    .addItem("Ouvrir dans l'app (révision)", "ouvrirAppPourCetteLigne")
    .addItem("Générer la couverture pour cette ligne", "genererCouverturePourCetteLigne");
  menu.addToUi();
}

// --- OPEN IN APP (sheet-to-app review flow: app generates photos, user reviews, then Send to Drive) ---
function ouvrirAppPourCetteLigne() {
  var ui = SpreadsheetApp.getUi();
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var range = sheet.getActiveRange();
    if (!range) {
      ui.alert("Sélectionnez une cellule de la ligne à traiter.");
      return;
    }
    var rowIndex = range.getRow();
    if (rowIndex === 1) {
      ui.alert("Sélectionnez une ligne de données (pas l'en-tête).");
      return;
    }
    var backendUrl = PropertiesService.getScriptProperties().getProperty("BACKEND_URL");
    var appUrl = PropertiesService.getScriptProperties().getProperty("APP_URL");
    if (!backendUrl) {
      ui.alert("BACKEND_URL manquant. Paramètres du projet > Propriétés du script.");
      return;
    }
    if (!appUrl) {
      ui.alert("APP_URL manquant. Paramètres du projet > Propriétés du script (URL de l'app de révision).");
      return;
    }
    var rowValues = sheet.getRange(rowIndex, 1, rowIndex, 24).getValues()[0];
    var coverUrl = rowValues[COL_COUVERTURE - 1] ? String(rowValues[COL_COUVERTURE - 1]).trim() : "";
    if (!coverUrl) {
      ui.alert("Couverture manquante. Mettez l'URL en colonne V.");
      return;
    }
    var coverBase64 = fetchDrivePhotoAsBase64(coverUrl);
    if (!coverBase64) {
      ui.alert("Impossible de lire l'image en colonne V. Vérifiez le lien Drive.");
      return;
    }
    var himPhotoUrl = rowValues[18] ? String(rowValues[18]).trim() : "";
    var herPhotoUrl = rowValues[19] ? String(rowValues[19]).trim() : "";
    var himPhotoBase64 = himPhotoUrl ? fetchDrivePhotoAsBase64(himPhotoUrl) : "";
    var herPhotoBase64 = herPhotoUrl ? fetchDrivePhotoAsBase64(herPhotoUrl) : "";
    var recipientLabel = (rowValues[4] && String(rowValues[4]).toLowerCase().indexOf("elle") >= 0) ? "Elle" : "Lui";
    var confirmMsg = "Ouvrir l'app avec cette ligne ?\n\nClient: " + (rowValues[1] || "") + "\nLivre: " + (rowValues[3] || "") + "\nPour qui: " + recipientLabel + "\nPrénom (Lui): " + (rowValues[5] || "") + " | (Elle): " + (rowValues[7] || "") + "\nLangue: " + (rowValues[9] || "") + "\nStyle: " + (rowValues[10] || "") + "\n\nVous pourrez confirmer, générer les photos, recadrer/régénérer puis Envoyer vers Drive.";
    if (ui.alert("Ouvrir dans l'app", confirmMsg, SpreadsheetApp.getUi().ButtonSet.OK_CANCEL) !== SpreadsheetApp.getUi().Button.OK) return;
    var webhookSecret = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET") || "";
    var webhookUrl = PropertiesService.getScriptProperties().getProperty("WEBHOOK_URL") || "";
    if (!webhookUrl) {
      try {
        webhookUrl = ScriptApp.getService().getUrl() || "";
      } catch (svcErr) {
        Logger.log("getService.getUrl: " + svcErr.toString());
      }
    }
    var baseUrl = backendUrl.replace(/\/createBook\/?$/, "").replace(/\/$/, "");
    var prepareUrl = baseUrl + "/sheet/prepare";
    var payload = {
      spreadsheetId: ss.getId(),
      sheetName: sheet.getName(),
      rowIndex: rowIndex,
      outputFolderId: PDF_OUTPUT_FOLDER_ID,
      webhookUrl: webhookUrl,
      webhookSecret: webhookSecret,
      row: {
        date: rowValues[0],
        buyerName: rowValues[1],
        phone: rowValues[2],
        bookName: rowValues[3],
        recipient: (rowValues[4] && String(rowValues[4]).toLowerCase().indexOf("elle") >= 0) ? "HER" : "HIM",
        partner1Name: rowValues[5],
        partner1Age: rowValues[6],
        partner2Name: rowValues[7],
        partner2Age: rowValues[8],
        language: rowValues[9],
        style: rowValues[10],
        years: rowValues[11],
        customTitle: rowValues[12],
        customNote: rowValues[13],
        optionsList: rowValues[14],
        giftwrap: rowValues[15],
        price: rowValues[16],
        status: rowValues[17],
        himPhotoUrl: himPhotoUrl,
        herPhotoUrl: herPhotoUrl,
        himPhotoBase64: himPhotoBase64 || "",
        herPhotoBase64: herPhotoBase64 || "",
        coverImageBase64: coverBase64
      }
    };
    var resp = UrlFetchApp.fetch(prepareUrl, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      fetchTimeoutSeconds: 60
    });
    var code = resp.getResponseCode();
    var body = resp.getContentText();
    if (code >= 200 && code < 300) {
      var data = JSON.parse(body || "{}");
      var sessionId = data.sessionId;
      if (!sessionId) {
        ui.alert("Erreur: le serveur n'a pas renvoyé de sessionId.");
        return;
      }
      var openUrl = appUrl.replace(/\/$/, "") + "?fromSheet=" + sessionId;
      showClickableLinkDialog("Ouvrir dans l'app", openUrl, "Cliquez sur le lien pour ouvrir l'app dans votre navigateur :");
    } else {
      ui.alert("Erreur (" + code + "): " + (body || "Vérifiez les logs."));
    }
  } catch (err) {
    ui.alert("Erreur: " + err.toString());
  }
}

// --- GENERATE COVER (sheet-to-app: open app, generate quick cover, then Send confirm → Drive + link in col V) ---
function genererCouverturePourCetteLigne() {
  var ui = SpreadsheetApp.getUi();
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var range = sheet.getActiveRange();
    if (!range) {
      ui.alert("Sélectionnez une cellule de la ligne à traiter.");
      return;
    }
    var rowIndex = range.getRow();
    if (rowIndex === 1) {
      ui.alert("Sélectionnez une ligne de données (pas l'en-tête).");
      return;
    }
    var backendUrl = PropertiesService.getScriptProperties().getProperty("BACKEND_URL");
    var appUrl = PropertiesService.getScriptProperties().getProperty("APP_URL");
    if (!backendUrl) {
      ui.alert("BACKEND_URL manquant. Paramètres du projet > Propriétés du script.");
      return;
    }
    if (!appUrl) {
      ui.alert("APP_URL manquant. Paramètres du projet > Propriétés du script (URL de l'app).");
      return;
    }
    var rowValues = sheet.getRange(rowIndex, 1, rowIndex, 24).getValues()[0];
    var himPhotoUrl = rowValues[18] ? String(rowValues[18]).trim() : "";
    var herPhotoUrl = rowValues[19] ? String(rowValues[19]).trim() : "";
    var himPhotoBase64 = himPhotoUrl ? fetchDrivePhotoAsBase64(himPhotoUrl) : "";
    var herPhotoBase64 = herPhotoUrl ? fetchDrivePhotoAsBase64(herPhotoUrl) : "";
    var recipientLabel = (rowValues[4] && String(rowValues[4]).toLowerCase().indexOf("elle") >= 0) ? "Elle" : "Lui";
    var bookName = String(rowValues[3] || "").trim();
    var customTitle = String(rowValues[12] || "").trim();
    var titleDisplay = customTitle ? customTitle : bookName;
    var yearsDisplay = String(rowValues[11] || "").trim() || "-";
    var confirmMsg = "Générer la couverture pour cette ligne ?\n\n" +
      "Pour qui : " + recipientLabel + "\n" +
      "Prénom (Lui) : " + (rowValues[5] || "-") + "  |  (Elle) : " + (rowValues[7] || "-") + "\n" +
      "Âge (Lui) : " + (rowValues[6] || "-") + "  |  (Elle) : " + (rowValues[8] || "-") + "\n" +
      "Titre / Livre : " + titleDisplay + "\n" +
      "Langue : " + (rowValues[9] || "-") + "\n" +
      "Style : " + (rowValues[10] || "-") + "\n" +
      "Années : " + yearsDisplay + "\n\n" +
      "Vous pourrez générer la couverture puis Confirmer et envoyer (lien en colonne V).";
    if (ui.alert("Générer la couverture", confirmMsg, SpreadsheetApp.getUi().ButtonSet.OK_CANCEL) !== SpreadsheetApp.getUi().Button.OK) return;
    var webhookSecret = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET") || "";
    var webhookUrl = PropertiesService.getScriptProperties().getProperty("WEBHOOK_URL") || "";
    if (!webhookUrl) {
      try {
        webhookUrl = ScriptApp.getService().getUrl() || "";
      } catch (svcErr) {
        Logger.log("getService.getUrl: " + svcErr.toString());
      }
    }
    var baseUrl = backendUrl.replace(/\/createBook\/?$/, "").replace(/\/$/, "");
    var prepareUrl = baseUrl + "/sheet/prepareCover";
    var payload = {
      spreadsheetId: ss.getId(),
      sheetName: sheet.getName(),
      rowIndex: rowIndex,
      outputFolderId: PDF_OUTPUT_FOLDER_ID,
      webhookUrl: webhookUrl,
      webhookSecret: webhookSecret,
      row: {
        date: rowValues[0],
        buyerName: rowValues[1],
        phone: rowValues[2],
        bookName: rowValues[3],
        recipient: (rowValues[4] && String(rowValues[4]).toLowerCase().indexOf("elle") >= 0) ? "HER" : "HIM",
        partner1Name: rowValues[5],
        partner1Age: rowValues[6],
        partner2Name: rowValues[7],
        partner2Age: rowValues[8],
        language: rowValues[9],
        style: rowValues[10],
        years: rowValues[11],
        customTitle: rowValues[12],
        customNote: rowValues[13],
        optionsList: rowValues[14],
        giftwrap: rowValues[15],
        price: rowValues[16],
        status: rowValues[17],
        himPhotoUrl: himPhotoUrl,
        herPhotoUrl: herPhotoUrl,
        himPhotoBase64: himPhotoBase64 || "",
        herPhotoBase64: herPhotoBase64 || "",
        coverImageBase64: ""
      }
    };
    var resp = UrlFetchApp.fetch(prepareUrl, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      fetchTimeoutSeconds: 60
    });
    var code = resp.getResponseCode();
    var body = resp.getContentText();
    if (code >= 200 && code < 300) {
      var data = JSON.parse(body || "{}");
      var sessionId = data.sessionId;
      if (!sessionId) {
        ui.alert("Erreur: le serveur n'a pas renvoyé de sessionId.");
        return;
      }
      var openUrl = appUrl.replace(/\/$/, "") + "?fromSheet=" + sessionId;
      showClickableLinkDialog("Générer la couverture", openUrl, "Cliquez sur le lien, générez la couverture puis cliquez sur Confirmer et envoyer.");
    } else {
      ui.alert("Erreur (" + code + "): " + (body || "Vérifiez les logs."));
    }
  } catch (err) {
    ui.alert("Erreur: " + err.toString());
  }
}

// --- GENERATE COVER FROM KIDS_ORDERS (Ramadan/kids sheet: same flow as lovers) ---
function genererCouvertureKidsPourCetteLigne() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss ? ss.getActiveSheet() : null;
  if (!sheet || sheet.getName() !== "kids_orders") {
    ui.alert("Ouvrez l'onglet kids_orders et sélectionnez une ligne.");
    return;
  }
  var range = sheet.getActiveRange();
  if (!range) {
    ui.alert("Sélectionnez une cellule de la ligne à traiter.");
    return;
  }
  var rowIndex = range.getRow();
  if (rowIndex === 1) {
    ui.alert("Sélectionnez une ligne de données (pas l'en-tête).");
    return;
  }
  runGenererCouvertureKids(sheet, rowIndex);
}

function runGenererCouvertureKids(sheet, rowIndex) {
  var ui = SpreadsheetApp.getUi();
  try {
    var ss = sheet.getParent();
    var backendUrl = PropertiesService.getScriptProperties().getProperty("BACKEND_URL");
    var appUrl = PropertiesService.getScriptProperties().getProperty("APP_URL");
    if (!backendUrl || !appUrl) {
      ui.alert("BACKEND_URL ou APP_URL manquant. Paramètres du projet > Propriétés du script.");
      return;
    }
    var rowValues = sheet.getRange(rowIndex, 1, rowIndex, KIDS_ORDERS_COLS).getValues()[0];
    var photo1Url = rowValues[KIDS_COL_PHOTO1 - 1] ? String(rowValues[KIDS_COL_PHOTO1 - 1]).trim() : "";
    var photo2Url = rowValues[KIDS_COL_PHOTO2 - 1] ? String(rowValues[KIDS_COL_PHOTO2 - 1]).trim() : "";
    var photo3Url = rowValues[KIDS_COL_PHOTO3 - 1] ? String(rowValues[KIDS_COL_PHOTO3 - 1]).trim() : "";
    var cov1 = rowValues[KIDS_COL_COUVERTURE_1 - 1] ? String(rowValues[KIDS_COL_COUVERTURE_1 - 1]).trim() : "";
    var cov2 = rowValues[KIDS_COL_COUVERTURE_2 - 1] ? String(rowValues[KIDS_COL_COUVERTURE_2 - 1]).trim() : "";
    var cov3 = rowValues[KIDS_COL_COUVERTURE_3 - 1] ? String(rowValues[KIDS_COL_COUVERTURE_3 - 1]).trim() : "";
    var coverIndex = 0;
    var kidPhotoUrl = "";
    var kidBase64 = "";
    if (!cov1 && photo1Url) {
      coverIndex = 1;
      kidPhotoUrl = photo1Url;
      kidBase64 = fetchDrivePhotoAsBase64(photo1Url);
    } else if (cov1 && !cov2 && photo2Url) {
      coverIndex = 2;
      kidPhotoUrl = photo2Url;
      kidBase64 = fetchDrivePhotoAsBase64(photo2Url);
    } else if (cov1 && cov2 && !cov3 && photo3Url) {
      coverIndex = 3;
      kidPhotoUrl = photo3Url;
      kidBase64 = fetchDrivePhotoAsBase64(photo3Url);
    }
    if (!coverIndex || !kidBase64) {
      if (cov1 && cov2 && cov3) {
        ui.alert("Les trois couvertures pour cette ligne sont déjà générées.");
      } else {
        ui.alert("Pour la prochaine couverture, une photo enfant est requise (Photo enfant " + (cov1 && !cov2 ? "2" : cov2 ? "3" : "1") + ").");
      }
      return;
    }
    var coverColumn = KIDS_COL_COUVERTURE_1 + coverIndex - 1;
    var webhookSecret = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET") || "";
    var webhookUrl = PropertiesService.getScriptProperties().getProperty("WEBHOOK_URL") || "";
    if (!webhookUrl) {
      try { webhookUrl = ScriptApp.getService().getUrl() || ""; } catch (e) {}
    }
    var baseUrl = backendUrl.replace(/\/createBook\/?$/, "").replace(/\/$/, "");
    var prepareUrl = baseUrl + "/sheet/prepareCover";
    var payload = {
      spreadsheetId: ss.getId(),
      sheetName: "kids_orders",
      rowIndex: rowIndex,
      outputFolderId: PDF_OUTPUT_FOLDER_ID,
      webhookUrl: webhookUrl,
      webhookSecret: webhookSecret,
      type: "ramadan",
      coverColumn: coverColumn,
      row: {
        date: rowValues[0],
        buyerName: rowValues[KIDS_COL_NOM - 1],
        phone: rowValues[2],
        pack: rowValues[3],
        price: rowValues[4],
        prenoms: rowValues[KIDS_COL_PRENOMS - 1],
        ages: rowValues[KIDS_COL_AGES - 1] != null ? String(rowValues[KIDS_COL_AGES - 1]).trim() : "",
        genres: rowValues[KIDS_COL_GENRES - 1] != null ? String(rowValues[KIDS_COL_GENRES - 1]).trim() : "",
        langues: rowValues[8],
        themes: rowValues[9],
        status: rowValues[KIDS_COL_STATUS_LIVRE - 1],
        child1PhotoUrl: photo1Url,
        child2PhotoUrl: photo2Url,
        child3PhotoUrl: photo3Url,
        child1PhotoBase64: coverIndex === 1 ? kidBase64 : "",
        child2PhotoBase64: coverIndex === 2 ? kidBase64 : "",
        child3PhotoBase64: coverIndex === 3 ? kidBase64 : "",
        coverImageBase64: ""
      }
    };
    var resp = UrlFetchApp.fetch(prepareUrl, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      fetchTimeoutSeconds: 60
    });
    var code = resp.getResponseCode();
    var body = resp.getContentText();
    if (code >= 200 && code < 300) {
      var data = JSON.parse(body || "{}");
      var sessionId = data.sessionId;
      if (!sessionId) {
        ui.alert("Erreur: le serveur n'a pas renvoyé de sessionId.");
        return;
      }
      var openUrl = appUrl.replace(/\/$/, "") + "?fromSheet=" + sessionId + "&template=ramadan";
      showClickableLinkDialog("Générer la couverture", openUrl, "Cliquez sur le lien, générez la couverture puis cliquez sur Confirmer et envoyer.");
    } else {
      ui.alert("Erreur (" + code + "): " + (body || "Vérifiez les logs."));
    }
  } catch (err) {
    ui.alert("Erreur: " + err.toString());
  }
}

// Split comma-separated field into trimmed array, padded to minLen with fallback value
function splitKidField(value, minLen, fallback) {
  var arr = String(value || "").split(",").map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
  while (arr.length < minLen) arr.push(fallback || "");
  return arr;
}

// --- Open app for row: multi-kid cover links based on column D (Quantité) ---
function runOpenAppForRow(sheet, rowIndex) {
  var ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) {}
  try {
    var ss = sheet.getParent();
    var backendUrl = PropertiesService.getScriptProperties().getProperty("BACKEND_URL");
    var appUrl = PropertiesService.getScriptProperties().getProperty("APP_URL");
    if (!backendUrl || !appUrl) {
      if (ui) ui.alert("BACKEND_URL ou APP_URL manquant. Paramètres du projet > Propriétés du script.");
      else sheet.getRange(rowIndex, KIDS_COL_APP_URL).setValue("Config manquante: BACKEND_URL ou APP_URL");
      return;
    }
    var rowValues = sheet.getRange(rowIndex, 1, 1, KIDS_ORDERS_COLS).getValues()[0];
    var kidCount = parseInt(rowValues[3], 10) || 1; // Column D = Quantité
    if (kidCount < 1) kidCount = 1;
    if (kidCount > 3) kidCount = 3;

    var prenoms = splitKidField(rowValues[KIDS_COL_PRENOMS - 1], kidCount, "Enfant");
    var ages = splitKidField(rowValues[KIDS_COL_AGES - 1], kidCount, "8");
    var genres = splitKidField(rowValues[KIDS_COL_GENRES - 1], kidCount, "");
    var langues = splitKidField(rowValues[8], kidCount, "Français");
    var themes = splitKidField(rowValues[9], kidCount, "");
    var photoUrls = [
      rowValues[KIDS_COL_PHOTO1 - 1] ? String(rowValues[KIDS_COL_PHOTO1 - 1]).trim() : "",
      rowValues[KIDS_COL_PHOTO2 - 1] ? String(rowValues[KIDS_COL_PHOTO2 - 1]).trim() : "",
      rowValues[KIDS_COL_PHOTO3 - 1] ? String(rowValues[KIDS_COL_PHOTO3 - 1]).trim() : ""
    ];

    var webhookSecret = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET") || "";
    var webhookUrl = PropertiesService.getScriptProperties().getProperty("WEBHOOK_URL") || "";
    if (!webhookUrl) {
      try { webhookUrl = ScriptApp.getService().getUrl() || ""; } catch (e) {}
    }
    var baseUrl = backendUrl.replace(/\/createBook\/?$/, "").replace(/\/$/, "");
    var prepareUrl = baseUrl + "/sheet/prepareCover";

    var links = []; // { label, url }
    for (var i = 0; i < kidCount; i++) {
      var photoUrl = photoUrls[i] || "";
      if (!photoUrl) {
        links.push({ label: prenoms[i] + " (pas de photo)", url: "" });
        continue;
      }
      var kidBase64 = fetchDrivePhotoAsBase64(photoUrl);
      if (!kidBase64) {
        links.push({ label: prenoms[i] + " (photo inaccessible)", url: "" });
        continue;
      }
      var coverColumn = KIDS_COL_COUVERTURE_1 + i;
      var payload = {
        spreadsheetId: ss.getId(),
        sheetName: "kids_orders",
        rowIndex: rowIndex,
        outputFolderId: PDF_OUTPUT_FOLDER_ID,
        webhookUrl: webhookUrl,
        webhookSecret: webhookSecret,
        type: "ramadan",
        coverColumn: coverColumn,
        row: {
          date: rowValues[0],
          buyerName: rowValues[KIDS_COL_NOM - 1],
          phone: rowValues[2],
          pack: rowValues[3],
          price: rowValues[4],
          prenoms: prenoms[i],
          ages: ages[i],
          genres: genres[i],
          langues: langues[i],
          themes: themes[i],
          status: rowValues[KIDS_COL_STATUS_LIVRE - 1],
          child1PhotoUrl: photoUrl,
          child1PhotoBase64: kidBase64,
          coverImageBase64: ""
        }
      };
      var resp = UrlFetchApp.fetch(prepareUrl, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
        fetchTimeoutSeconds: 60
      });
      var code = resp.getResponseCode();
      var body = resp.getContentText();
      if (code >= 200 && code < 300) {
        var data = JSON.parse(body || "{}");
        if (data.sessionId) {
          var openUrl = appUrl.replace(/\/$/, "") + "?fromSheet=" + data.sessionId + "&template=ramadan";
          links.push({ label: "Couverture " + (i + 1) + " – " + prenoms[i], url: openUrl });
        } else {
          links.push({ label: prenoms[i] + " (erreur: pas de sessionId)", url: "" });
        }
      } else {
        links.push({ label: prenoms[i] + " (erreur " + code + ")", url: "" });
      }
    }

    var validLinks = links.filter(function(l) { return l.url; });
    if (validLinks.length === 0) {
      var msg = "Aucun lien généré. Vérifiez les photos et la quantité.";
      if (ui) ui.alert(msg);
      else sheet.getRange(rowIndex, KIDS_COL_APP_URL).setValue(msg);
      return;
    }
    // Write first link to column X for mobile
    sheet.getRange(rowIndex, KIDS_COL_APP_URL).setFormula('=HYPERLINK("' + validLinks[0].url.replace(/"/g, '\\"') + '","' + validLinks[0].label.replace(/"/g, '\\"') + '")');
    if (ui) {
      showMultiLinkDialog("Ouvrir l'app – Couvertures", links);
    }
  } catch (err) {
    if (ui) ui.alert("Erreur: " + err.toString());
    else sheet.getRange(rowIndex, KIDS_COL_APP_URL).setValue("Erreur: " + err.toString().substring(0, 200));
  }
}

// --- Open book for row: shows 1-3 app links for full book creation based on filled covers ---
function runOpenBookForRow(sheet, rowIndex) {
  var ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) {}
  try {
    var ss = sheet.getParent();
    var backendUrl = PropertiesService.getScriptProperties().getProperty("BACKEND_URL");
    var appUrl = PropertiesService.getScriptProperties().getProperty("APP_URL");
    var bookFolderId = BOOK_OUTPUT_FOLDER_ID;
    if (!backendUrl || !appUrl) {
      if (ui) ui.alert("BACKEND_URL ou APP_URL manquant. Paramètres du projet > Propriétés du script.");
      else sheet.getRange(rowIndex, KIDS_COL_APP_URL).setValue("Config manquante: BACKEND_URL ou APP_URL");
      return;
    }
    var rowValues = sheet.getRange(rowIndex, 1, 1, KIDS_ORDERS_COLS).getValues()[0];
    var kidCount = parseInt(rowValues[3], 10) || 1;
    if (kidCount < 1) kidCount = 1;
    if (kidCount > 3) kidCount = 3;

    var prenoms = splitKidField(rowValues[KIDS_COL_PRENOMS - 1], kidCount, "Enfant");
    var ages = splitKidField(rowValues[KIDS_COL_AGES - 1], kidCount, "8");
    var genres = splitKidField(rowValues[KIDS_COL_GENRES - 1], kidCount, "");
    var langues = splitKidField(rowValues[8], kidCount, "Français");
    var themes = splitKidField(rowValues[9], kidCount, "");
    var photoUrls = [
      rowValues[KIDS_COL_PHOTO1 - 1] ? String(rowValues[KIDS_COL_PHOTO1 - 1]).trim() : "",
      rowValues[KIDS_COL_PHOTO2 - 1] ? String(rowValues[KIDS_COL_PHOTO2 - 1]).trim() : "",
      rowValues[KIDS_COL_PHOTO3 - 1] ? String(rowValues[KIDS_COL_PHOTO3 - 1]).trim() : ""
    ];
    var coverUrls = [
      rowValues[KIDS_COL_COUVERTURE_1 - 1] ? String(rowValues[KIDS_COL_COUVERTURE_1 - 1]).trim() : "",
      rowValues[KIDS_COL_COUVERTURE_2 - 1] ? String(rowValues[KIDS_COL_COUVERTURE_2 - 1]).trim() : "",
      rowValues[KIDS_COL_COUVERTURE_3 - 1] ? String(rowValues[KIDS_COL_COUVERTURE_3 - 1]).trim() : ""
    ];

    var webhookSecret = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET") || "";
    var webhookUrl = PropertiesService.getScriptProperties().getProperty("WEBHOOK_URL") || "";
    if (!webhookUrl) {
      try { webhookUrl = ScriptApp.getService().getUrl() || ""; } catch (e) {}
    }
    var baseUrl = backendUrl.replace(/\/createBook\/?$/, "").replace(/\/$/, "");
    var prepareUrl = baseUrl + "/sheet/prepareBook";

    var links = [];
    for (var i = 0; i < kidCount; i++) {
      if (!coverUrls[i]) {
        links.push({ label: prenoms[i] + " (couverture manquante)", url: "" });
        continue;
      }
      var coverBase64 = fetchDrivePhotoAsBase64(coverUrls[i]);
      var kidBase64 = photoUrls[i] ? fetchDrivePhotoAsBase64(photoUrls[i]) : "";
      if (!coverBase64) {
        links.push({ label: prenoms[i] + " (couverture inaccessible)", url: "" });
        continue;
      }
      var payload = {
        spreadsheetId: ss.getId(),
        sheetName: "kids_orders",
        rowIndex: rowIndex,
        outputFolderId: bookFolderId,
        webhookUrl: webhookUrl,
        webhookSecret: webhookSecret,
        type: "ramadan",
        kidIndex: i + 1,
        row: {
          date: rowValues[0],
          buyerName: rowValues[KIDS_COL_NOM - 1],
          phone: rowValues[2],
          pack: rowValues[3],
          price: rowValues[4],
          prenoms: prenoms[i],
          ages: ages[i],
          genres: genres[i],
          langues: langues[i],
          themes: themes[i],
          status: rowValues[KIDS_COL_STATUS_LIVRE - 1],
          child1PhotoUrl: photoUrls[i],
          child1PhotoBase64: kidBase64 || "",
          coverImageBase64: coverBase64
        }
      };
      var resp = UrlFetchApp.fetch(prepareUrl, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
        fetchTimeoutSeconds: 60
      });
      var code = resp.getResponseCode();
      var body = resp.getContentText();
      if (code >= 200 && code < 300) {
        var data = JSON.parse(body || "{}");
        if (data.sessionId) {
          var openUrl = appUrl.replace(/\/$/, "") + "?fromSheet=" + data.sessionId + "&template=ramadan";
          links.push({ label: "Livre " + (i + 1) + " – " + prenoms[i], url: openUrl });
        } else {
          links.push({ label: prenoms[i] + " (erreur: pas de sessionId)", url: "" });
        }
      } else {
        links.push({ label: prenoms[i] + " (erreur " + code + ")", url: "" });
      }
    }

    var validLinks = links.filter(function(l) { return l.url; });
    if (validLinks.length === 0) {
      var msg = "Aucun lien de livre généré. Vérifiez que les couvertures sont remplies.";
      if (ui) ui.alert(msg);
      else sheet.getRange(rowIndex, KIDS_COL_APP_URL).setValue(msg);
      return;
    }
    sheet.getRange(rowIndex, KIDS_COL_APP_URL).setFormula('=HYPERLINK("' + validLinks[0].url.replace(/"/g, '\\"') + '","' + validLinks[0].label.replace(/"/g, '\\"') + '")');
    if (ui) {
      showMultiLinkDialog("Créer les livres", links);
    }
  } catch (err) {
    if (ui) ui.alert("Erreur: " + err.toString());
    else sheet.getRange(rowIndex, KIDS_COL_APP_URL).setValue("Erreur: " + err.toString().substring(0, 200));
  }
}

// --- CREATE BOOK (runs when you click the menu) ---
function creerLivrePourCetteLigne() {
  var ui = SpreadsheetApp.getUi();
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var range = sheet.getActiveRange();
    if (!range) {
      ui.alert("Sélectionnez une cellule de la ligne à traiter.");
      return;
    }
    var rowIndex = range.getRow();
    if (rowIndex === 1) {
      ui.alert("Sélectionnez une ligne de données (pas l'en-tête).");
      return;
    }
    var backendUrl = PropertiesService.getScriptProperties().getProperty("BACKEND_URL");
    if (!backendUrl) {
      ui.alert("BACKEND_URL manquant. Paramètres du projet > Propriétés du script.");
      return;
    }
    var rowValues = sheet.getRange(rowIndex, 1, rowIndex, 24).getValues()[0];
    var coverUrl = rowValues[COL_COUVERTURE - 1] ? String(rowValues[COL_COUVERTURE - 1]).trim() : "";
    if (!coverUrl) {
      ui.alert("Couverture manquante. Mettez l'URL en colonne V.");
      return;
    }
    var coverBase64 = fetchDrivePhotoAsBase64(coverUrl);
    if (!coverBase64) {
      ui.alert("Impossible de lire l'image en colonne V. Vérifiez le lien Drive.");
      return;
    }
    var himPhotoUrl = rowValues[18] ? String(rowValues[18]).trim() : "";
    var herPhotoUrl = rowValues[19] ? String(rowValues[19]).trim() : "";
    var himPhotoBase64 = himPhotoUrl ? fetchDrivePhotoAsBase64(himPhotoUrl) : "";
    var herPhotoBase64 = herPhotoUrl ? fetchDrivePhotoAsBase64(herPhotoUrl) : "";
    var recipientLabel = (rowValues[4] && String(rowValues[4]).toLowerCase().indexOf("elle") >= 0) ? "Elle" : "Lui";
    var bookNameBook = String(rowValues[3] || "").trim();
    var customTitleBook = String(rowValues[12] || "").trim();
    var titleDisplayBook = customTitleBook ? customTitleBook : bookNameBook;
    var yearsDisplayBook = String(rowValues[11] || "").trim() || "-";
    var confirmMsgBook = "Vérifiez les informations pour la création du livre :\n\n" +
      "Pour qui : " + recipientLabel + "\n" +
      "Prénom (Lui) : " + (rowValues[5] || "-") + "  |  (Elle) : " + (rowValues[7] || "-") + "\n" +
      "Âge (Lui) : " + (rowValues[6] || "-") + "  |  (Elle) : " + (rowValues[8] || "-") + "\n" +
      "Titre / Livre : " + titleDisplayBook + "\n" +
      "Langue : " + (rowValues[9] || "-") + "\n" +
      "Style : " + (rowValues[10] || "-") + "\n" +
      "Années : " + yearsDisplayBook + "\n" +
      "Couverture (col. V) : OK\n\n" +
      "Confirmer la création du livre ?";
    if (ui.alert("Créer le livre", confirmMsgBook, SpreadsheetApp.getUi().ButtonSet.OK_CANCEL) !== SpreadsheetApp.getUi().Button.OK) return;
    sheet.getRange(rowIndex, COL_STATUS_LIVRE).setValue("En file");
    var webhookSecret = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET") || "";
    var webhookUrl = PropertiesService.getScriptProperties().getProperty("WEBHOOK_URL") || "";
    if (!webhookUrl) {
      try {
        webhookUrl = ScriptApp.getService().getUrl() || "";
      } catch (svcErr) {
        Logger.log("getService.getUrl: " + svcErr.toString());
      }
    }
    var payload = {
      spreadsheetId: ss.getId(),
      sheetName: sheet.getName(),
      rowIndex: rowIndex,
      outputFolderId: PDF_OUTPUT_FOLDER_ID,
      webhookUrl: webhookUrl,
      webhookSecret: webhookSecret,
    row: {
      date: rowValues[0],
      buyerName: rowValues[1],
      phone: rowValues[2],
      bookName: rowValues[3],
      recipient: (rowValues[4] && String(rowValues[4]).toLowerCase().indexOf("elle") >= 0) ? "HER" : "HIM",
      partner1Name: rowValues[5],
      partner1Age: rowValues[6],
      partner2Name: rowValues[7],
      partner2Age: rowValues[8],
      language: rowValues[9],
      style: rowValues[10],
      years: rowValues[11],
      customTitle: rowValues[12],
      customNote: rowValues[13],
      optionsList: rowValues[14],
      giftwrap: rowValues[15],
      price: rowValues[16],
      status: rowValues[17],
      himPhotoUrl: himPhotoUrl,
      herPhotoUrl: herPhotoUrl,
      himPhotoBase64: himPhotoBase64 || "",
      herPhotoBase64: herPhotoBase64 || "",
      coverImageBase64: coverBase64
    }
  };
  try {
    var resp = UrlFetchApp.fetch(backendUrl, { method: "post", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true });
    var code = resp.getResponseCode();
    var body = resp.getContentText();
    if (code >= 200 && code < 300) {
      ui.alert("Demande envoyée. Le statut sera mis à jour quand le serveur aura terminé.");
    } else {
      sheet.getRange(rowIndex, COL_STATUS_LIVRE).setValue("Erreur");
      ui.alert("Erreur (" + code + "): " + (body || "Vérifiez les logs."));
    }
  } catch (e) {
    sheet.getRange(rowIndex, COL_STATUS_LIVRE).setValue("Erreur");
    ui.alert("Erreur: " + e.toString());
  }
  } catch (err) {
    ui.alert("Erreur: " + err.toString());
  }
}

// --- CREATE BOOK FROM KIDS_ORDERS (Ramadan/kids sheet) ---
function creerLivreKidsPourCetteLigne() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss ? ss.getActiveSheet() : null;
  if (!sheet || sheet.getName() !== "kids_orders") {
    ui.alert("Ouvrez l'onglet kids_orders et sélectionnez une ligne.");
    return;
  }
  var range = sheet.getActiveRange();
  if (!range) {
    ui.alert("Sélectionnez une cellule de la ligne à traiter.");
    return;
  }
  var rowIndex = range.getRow();
  if (rowIndex === 1) {
    ui.alert("Sélectionnez une ligne de données (pas l'en-tête).");
    return;
  }
  runCreerLivreKids(sheet, rowIndex);
}

function runCreerLivreKids(sheet, rowIndex) {
  var ui = SpreadsheetApp.getUi();
  try {
    var ss = sheet.getParent();
    var backendUrl = PropertiesService.getScriptProperties().getProperty("BACKEND_URL");
    if (!backendUrl) {
      ui.alert("BACKEND_URL manquant. Paramètres du projet > Propriétés du script.");
      return;
    }
    var rowValues = sheet.getRange(rowIndex, 1, rowIndex, KIDS_ORDERS_COLS).getValues()[0];
    var cov1 = rowValues[KIDS_COL_COUVERTURE_1 - 1] ? String(rowValues[KIDS_COL_COUVERTURE_1 - 1]).trim() : "";
    var cov2 = rowValues[KIDS_COL_COUVERTURE_2 - 1] ? String(rowValues[KIDS_COL_COUVERTURE_2 - 1]).trim() : "";
    var cov3 = rowValues[KIDS_COL_COUVERTURE_3 - 1] ? String(rowValues[KIDS_COL_COUVERTURE_3 - 1]).trim() : "";
    var coverUrl = cov1 || cov2 || cov3;
    if (!coverUrl) {
      ui.alert("Au moins une couverture est requise (colonne Couverture 1, 2 ou 3).");
      return;
    }
    var coverBase64 = fetchDrivePhotoAsBase64(coverUrl);
    if (!coverBase64) {
      ui.alert("Impossible de lire l'image en colonne Couverture. Vérifiez le lien Drive.");
      return;
    }
    var photo1Url = rowValues[KIDS_COL_PHOTO1 - 1] ? String(rowValues[KIDS_COL_PHOTO1 - 1]).trim() : "";
    var photo2Url = rowValues[KIDS_COL_PHOTO2 - 1] ? String(rowValues[KIDS_COL_PHOTO2 - 1]).trim() : "";
    var photo3Url = rowValues[KIDS_COL_PHOTO3 - 1] ? String(rowValues[KIDS_COL_PHOTO3 - 1]).trim() : "";
    var child1Base64 = photo1Url ? fetchDrivePhotoAsBase64(photo1Url) : "";
    var child2Base64 = photo2Url ? fetchDrivePhotoAsBase64(photo2Url) : "";
    var child3Base64 = photo3Url ? fetchDrivePhotoAsBase64(photo3Url) : "";
    var confirmMsg = "Créer le livre pour cette ligne ?\n\nClient: " + (rowValues[KIDS_COL_NOM - 1] || "") + "\nQuantité: " + (rowValues[3] || "") + "\nPrénoms: " + (rowValues[KIDS_COL_PRENOMS - 1] || "") + "\nLangues: " + (rowValues[8] || "") + "\nThèmes: " + (rowValues[9] || "") + "\nCouverture: OK\n\nLe statut sera mis à jour à la fin.";
    if (ui.alert("Créer le livre", confirmMsg, SpreadsheetApp.getUi().ButtonSet.OK_CANCEL) !== SpreadsheetApp.getUi().Button.OK) return;
    sheet.getRange(rowIndex, KIDS_COL_STATUS_LIVRE).setValue("En file");
    var webhookSecret = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET") || "";
    var webhookUrl = PropertiesService.getScriptProperties().getProperty("WEBHOOK_URL") || "";
    if (!webhookUrl) {
      try { webhookUrl = ScriptApp.getService().getUrl() || ""; } catch (e) {}
    }
    var payload = {
      spreadsheetId: ss.getId(),
      sheetName: "kids_orders",
      rowIndex: rowIndex,
      outputFolderId: PDF_OUTPUT_FOLDER_ID,
      webhookUrl: webhookUrl,
      webhookSecret: webhookSecret,
      type: "ramadan",
      row: {
        date: rowValues[0],
        buyerName: rowValues[KIDS_COL_NOM - 1],
        phone: rowValues[2],
        pack: rowValues[3],
        price: rowValues[4],
        prenoms: rowValues[KIDS_COL_PRENOMS - 1],
        ages: rowValues[KIDS_COL_AGES - 1] != null ? String(rowValues[KIDS_COL_AGES - 1]).trim() : "",
        genres: rowValues[KIDS_COL_GENRES - 1] != null ? String(rowValues[KIDS_COL_GENRES - 1]).trim() : "",
        langues: rowValues[8],
        themes: rowValues[9],
        status: rowValues[KIDS_COL_STATUS_LIVRE - 1],
        child1PhotoUrl: photo1Url,
        child2PhotoUrl: photo2Url,
        child3PhotoUrl: photo3Url,
        child1PhotoBase64: child1Base64 || "",
        child2PhotoBase64: child2Base64 || "",
        child3PhotoBase64: child3Base64 || "",
        coverImageBase64: coverBase64
      }
    };
    try {
      var resp = UrlFetchApp.fetch(backendUrl, { method: "post", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true });
      var code = resp.getResponseCode();
      var body = resp.getContentText();
      if (code >= 200 && code < 300) {
        ui.alert("Demande envoyée. Le statut sera mis à jour quand le serveur aura terminé.");
      } else {
        sheet.getRange(rowIndex, KIDS_COL_STATUS_LIVRE).setValue("Erreur");
        ui.alert("Erreur (" + code + "): " + (body || "Vérifiez les logs."));
      }
    } catch (e) {
      sheet.getRange(rowIndex, KIDS_COL_STATUS_LIVRE).setValue("Erreur");
      ui.alert("Erreur: " + e.toString());
    }
  } catch (err) {
    ui.alert("Erreur: " + err.toString());
  }
}

function fetchDrivePhotoAsBase64(viewUrl) {
  if (!viewUrl || viewUrl.length < 10) return null;
  var match = viewUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  var fileId = match[1];
  try {
    var file = DriveApp.getFileById(fileId);
    var blob = file.getBlob();
    var base64 = Utilities.base64Encode(blob.getBytes());
    var mime = blob.getContentType() || "image/jpeg";
    return "data:" + mime + ";base64," + base64;
  } catch (e) {
    Logger.log("fetchDrivePhotoAsBase64: " + e.toString());
    return null;
  }
}

// Format for tracking date columns: same day as today → time only (HH:mm), else date+time (dd/MM/yyyy HH:mm).
function kidsFormatTrackingDate(date) {
  var d = date || new Date();
  var tz = "Africa/Casablanca";
  var dStr = Utilities.formatDate(d, tz, "yyyyMMdd");
  var todayStr = Utilities.formatDate(new Date(), tz, "yyyyMMdd");
  if (dStr === todayStr) return Utilities.formatDate(d, tz, "HH:mm");
  return Utilities.formatDate(d, tz, "dd/MM/yyyy HH:mm");
}

// --- onEdit: kids_orders only — set "Statut changé le" when Statut first changes from Nouveau ---
function onEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  if (sheet.getName() !== "kids_orders") return;
  var col = e.range.getColumn();
  var rowIndex = e.range.getRow();
  if (rowIndex === 1) return;

  // Statut (col 11 / K): when changed from Nouveau, set Notes (col 12) with timestamp.
  if (col === 11) {
    var newStatut = e.range.getValue() ? String(e.range.getValue()).trim() : "";
    if (newStatut === "Nouveau") return;
    var statutChangeCell = sheet.getRange(rowIndex, KIDS_COL_STATUT_CHANGE_LE);
    if (statutChangeCell.getValue()) return;
    statutChangeCell.setValue(kidsFormatTrackingDate());
    return;
  }

  if (col === KIDS_COL_ACTION_COUVERTURE_LIVRE) {
    var valCouv = e.range.getValue() ? String(e.range.getValue()).trim() : "";
    if (valCouv === "" || valCouv === "—") return;
    if (valCouv === "Générer couverture") runGenererCouvertureKids(sheet, rowIndex);
    else if (valCouv === "Créer livre") runCreerLivreKids(sheet, rowIndex);
    e.range.setValue("—");
    return;
  }

  // Column O (APP): checkbox → check = open app cover popup, then uncheck
  if (col === KIDS_COL_APP && e.value === "TRUE") {
    e.range.setValue(false);
    runOpenAppForRow(sheet, rowIndex);
    return;
  }

  // Column W (BOOK): checkbox → check = open book creation popup, then uncheck
  if (col === KIDS_COL_BOOK && e.value === "TRUE") {
    e.range.setValue(false);
    runOpenBookForRow(sheet, rowIndex);
    return;
  }

  // Checkbox columns: TRUE = user ticked it → run action → uncheck
  if (col === KIDS_COL_ACTION_NRP1 && e.value === "TRUE") {
    e.range.setValue(false);
    runWhatsAppNRP(sheet, rowIndex, 1);
    return;
  }
  if (col === KIDS_COL_ACTION_NRP2 && e.value === "TRUE") {
    e.range.setValue(false);
    runWhatsAppNRP(sheet, rowIndex, 2);
    return;
  }
  if (col === KIDS_COL_ACTION_NRP3 && e.value === "TRUE") {
    e.range.setValue(false);
    runWhatsAppNRP(sheet, rowIndex, 3);
    return;
  }
  if (col === KIDS_COL_ACTION_SUCCES && e.value === "TRUE") {
    e.range.setValue(false);
    runWhatsAppSuccess(sheet, rowIndex);
    return;
  }
}

// --- WhatsApp helpers (kids_orders only): phone normalize, template fill, open wa.me + optional cover dialog ---
function kidsGetPhoneFromRow(sheet, rowIndex) {
  var phoneCell = sheet.getRange(rowIndex, 3).getValue();
  var raw = (phoneCell != null) ? String(phoneCell).replace(/^'/, "").trim() : "";
  var digits = raw.replace(/\D/g, "");
  if (digits.length < 9) return "";
  if (digits.charAt(0) === "0") digits = "212" + digits.substring(1);
  else if (digits.length === 9 && (digits.charAt(0) === "6" || digits.charAt(0) === "7")) digits = "212" + digits;
  return digits;
}

function kidsGetTemplateReplaced(template, rowValues) {
  if (!template || !rowValues) return template;
  var s = template;
  s = s.replace(/\{\{nom\}\}/g, (rowValues[KIDS_COL_NOM - 1] != null) ? String(rowValues[KIDS_COL_NOM - 1]).trim() : "");
  s = s.replace(/\{\{prenoms\}\}/g, (rowValues[KIDS_COL_PRENOMS - 1] != null) ? String(rowValues[KIDS_COL_PRENOMS - 1]).trim() : "");
  s = s.replace(/\{\{telephone\}\}/g, (rowValues[2] != null) ? String(rowValues[2]).replace(/^'/, "").trim() : "");
  return s;
}

// Shared: show a dialog with a clickable link (used for app URL, cover link). If autoOpenInNewTab is true, also opens the url in a new tab when the dialog loads.
function showClickableLinkDialog(title, url, instructionText, autoOpenInNewTab) {
  var safeUrl = url.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  var safeText = (instructionText || "Cliquez sur le lien ci-dessous :").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  var urlJs = url.replace(/\\/g, "\\\\").replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/"/g, "\\\"");
  var openScript = (autoOpenInNewTab && url) ? "<script>setTimeout(function(){ try { window.open(\"" + urlJs + "\", \"_blank\"); } catch(e) {} }, 200);<\/script>" : "";
  var html = "<!DOCTYPE html><html><head><meta charset='utf-8'><style>body{font-family:sans-serif;padding:16px;} p{margin:0 0 10px 0;} a{color:#1967d2;text-decoration:underline;word-break:break-all;}</style></head><body>" + openScript + "<p><strong>" + safeText + "</strong></p><p><a href=\"" + safeUrl + "\" target=\"_blank\">" + safeUrl + "</a></p><p style='margin-top:14px;font-size:12px;color:#666;'>Fermez avec le X après avoir ouvert le lien.</p></body></html>";
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(480).setHeight(160), title);
}

// Shared: show a dialog with multiple clickable links (used for multi-kid cover/book links).
// links = [{ label: "Couverture 1 – Yassine", url: "https://..." }, ...]
// Items with empty url are shown as disabled/error text.
function showMultiLinkDialog(title, links) {
  var linksHtml = "";
  for (var i = 0; i < links.length; i++) {
    var l = links[i];
    var safeLabel = String(l.label || "").replace(/</g, "&lt;").replace(/"/g, "&quot;");
    if (l.url) {
      var safeUrl = l.url.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
      linksHtml += "<p style='margin:8px 0;'><a href=\"" + safeUrl + "\" target=\"_blank\" style='color:#1967d2;text-decoration:underline;font-size:14px;'>" + safeLabel + "</a></p>";
    } else {
      linksHtml += "<p style='margin:8px 0;color:#999;font-size:13px;'>" + safeLabel + "</p>";
    }
  }
  var html = "<!DOCTYPE html><html><head><meta charset='utf-8'><style>body{font-family:sans-serif;padding:16px;} a{word-break:break-all;}</style></head><body>" +
    "<p><strong>Cliquez sur un lien pour ouvrir l'app :</strong></p>" + linksHtml +
    "<p style='margin-top:14px;font-size:12px;color:#666;'>Fermez avec le X après avoir ouvert les liens.</p></body></html>";
  var height = 120 + links.length * 40;
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(480).setHeight(height), title);
}

// WhatsApp: open wa.me link with prefilled message; dialog auto-opens the link in a new tab, and shows the link as fallback.
function showWhatsAppDialog(waUrl, instructionText) {
  var safeUrl = waUrl.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  var safeText = (instructionText || "Ouverture de WhatsApp…").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  var urlJs = waUrl.replace(/\\/g, "\\\\").replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/"/g, "\\\"");
  var html = "<!DOCTYPE html><html><head><meta charset='utf-8'><style>body{font-family:sans-serif;padding:16px;} p{margin:0 0 10px 0;} a{color:#1967d2;text-decoration:underline;word-break:break-all;}</style></head><body><p><strong>" + safeText + "</strong></p><p><a id=\"walink\" href=\"" + safeUrl + "\" target=\"_blank\">Ouvrir WhatsApp</a></p><p style='margin-top:14px;font-size:12px;color:#666;'>Si WhatsApp ne s'est pas ouvert, cliquez sur le lien ci-dessus. Fermez cette fenêtre ensuite.</p><script>var u = \"" + urlJs + "\"; setTimeout(function() { window.open(u, '_blank'); }, 100);<\/script></body></html>";
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(420).setHeight(140), "WhatsApp");
}

function kidsOpenWhatsApp(phone, text) {
  var url = "https://wa.me/" + phone + "?text=" + encodeURIComponent(text || "");
  showWhatsAppDialog(url, "Ouverture de WhatsApp avec le message prérempli…");
}

function openWhatsAppNRP1() { kidsOpenWhatsAppForRow(1); }
function openWhatsAppNRP2() { kidsOpenWhatsAppForRow(2); }
function openWhatsAppNRP3() { kidsOpenWhatsAppForRow(3); }

function kidsOpenWhatsAppForRow(relanceNum) {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss ? ss.getActiveSheet() : null;
  if (!sheet || sheet.getName() !== "kids_orders") {
    ui.alert("Ouvrez l'onglet kids_orders et sélectionnez une ligne.");
    return;
  }
  var range = sheet.getActiveRange();
  if (!range) { ui.alert("Sélectionnez une cellule de la ligne."); return; }
  var rowIndex = range.getRow();
  if (rowIndex === 1) { ui.alert("Sélectionnez une ligne de données (pas l'en-tête)."); return; }
  runWhatsAppNRP(sheet, rowIndex, relanceNum);
}

function runWhatsAppNRP(sheet, rowIndex, relanceNum) {
  var ui = SpreadsheetApp.getUi();
  var phone = kidsGetPhoneFromRow(sheet, rowIndex);
  if (!phone) { ui.alert("Téléphone manquant ou invalide pour cette ligne."); return; }
  var rowValues = sheet.getRange(rowIndex, 1, rowIndex, KIDS_ORDERS_COLS).getValues()[0];
  var key = "message_whatsapp_nrp_" + relanceNum;
  var template = getReferenceText(key) || PropertiesService.getScriptProperties().getProperty("CONFIRM_MSG_NRP") || REFERENCE_DEFAULTS[key];
  var text = kidsGetTemplateReplaced(template, rowValues);
  kidsOpenWhatsApp(phone, text);
  var col = relanceNum === 1 ? KIDS_COL_RELANCE_1 : (relanceNum === 2 ? KIDS_COL_RELANCE_2 : KIDS_COL_RELANCE_3);
  sheet.getRange(rowIndex, col).setValue(kidsFormatTrackingDate());
}

function openWhatsAppSuccessPreview() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss ? ss.getActiveSheet() : null;
  if (!sheet || sheet.getName() !== "kids_orders") {
    ui.alert("Ouvrez l'onglet kids_orders et sélectionnez une ligne.");
    return;
  }
  var range = sheet.getActiveRange();
  if (!range) { ui.alert("Sélectionnez une cellule de la ligne."); return; }
  var rowIndex = range.getRow();
  if (rowIndex === 1) { ui.alert("Sélectionnez une ligne de données (pas l'en-tête)."); return; }
  runWhatsAppSuccess(sheet, rowIndex);
}

function runWhatsAppSuccess(sheet, rowIndex) {
  var ui = SpreadsheetApp.getUi();
  var phone = kidsGetPhoneFromRow(sheet, rowIndex);
  if (!phone) { ui.alert("Téléphone manquant ou invalide pour cette ligne."); return; }
  var rowValues = sheet.getRange(rowIndex, 1, rowIndex, KIDS_ORDERS_COLS).getValues()[0];
  var template = getReferenceText("message_succes") || PropertiesService.getScriptProperties().getProperty("CONFIRM_MSG_SUCCESS") || PropertiesService.getScriptProperties().getProperty("CONFIRM_MSG_PREVIEW") || REFERENCE_DEFAULTS["message_succes"];
  var text = kidsGetTemplateReplaced(template, rowValues);
  kidsOpenWhatsApp(phone, text);
  var cov1 = rowValues[KIDS_COL_COUVERTURE_1 - 1] ? String(rowValues[KIDS_COL_COUVERTURE_1 - 1]).trim() : "";
  var cov2 = rowValues[KIDS_COL_COUVERTURE_2 - 1] ? String(rowValues[KIDS_COL_COUVERTURE_2 - 1]).trim() : "";
  var cov3 = rowValues[KIDS_COL_COUVERTURE_3 - 1] ? String(rowValues[KIDS_COL_COUVERTURE_3 - 1]).trim() : "";
  var coverUrl = cov1 || cov2 || cov3;
  if (coverUrl) {
    showClickableLinkDialog("Image couverture", coverUrl, "Cliquez pour voir la couverture. Puis clic droit sur l'image → Copier l'image, et collez dans WhatsApp (Ctrl+V).");
  } else {
    ui.alert("Aucune couverture pour cette ligne. Générez d'abord la couverture via la colonne Couv / Livre.");
  }
}

// Set kids_orders header row to match KIDS_ORDERS_HEADERS (29 columns).
function migrerColonnesKidsOrders() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("kids_orders");
  if (!sheet) {
    ui.alert("Onglet kids_orders introuvable.");
    return;
  }
  sheet.getRange(1, 1, 1, KIDS_ORDERS_HEADERS.length).setValues([KIDS_ORDERS_HEADERS]);
  ui.alert("En-têtes mis à jour (" + KIDS_ORDERS_COLS + " colonnes).");
}

// --- GET: webhook (updateRow) + openApp (column O link) + form submission (data param) ---
function doGet(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var params = e && e.parameter ? e.parameter : {};
    if (params.action === "openApp") {
      return ContentService.createTextOutput("Utilisez la colonne O (liste « Ouvrir l'app ») dans l'onglet kids_orders pour afficher le lien dans une fenêtre.").setMimeType(ContentService.MimeType.TEXT);
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
      var sheet = spread.getSheetByName(sheetName) || spread.getSheets()[0];
      var colStatus = (sheetName === "kids_orders") ? KIDS_COL_STATUS_LIVRE : COL_STATUS_LIVRE;
      var colCover = (sheetName === "kids_orders" && coverColumnParam) ? parseInt(coverColumnParam, 10) : (sheetName === "kids_orders" ? KIDS_COL_COUVERTURE_1 : COL_COUVERTURE);
      if (status) sheet.getRange(rowIndex, colStatus).setValue(status);
      // For kids_orders, column W is now a Book checkbox — skip writing PDF URL there
      if (pdfUrl && sheetName !== "kids_orders") {
        var colPdf = COL_LIEN_PDF;
        sheet.getRange(rowIndex, colPdf).setValue(pdfUrl);
      }
      if (coverUrl) sheet.getRange(rowIndex, colCover).setValue(coverUrl);
      return ContentService.createTextOutput(JSON.stringify({ result: "success" })).setMimeType(ContentService.MimeType.JSON);
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

// Returns HTML so the form page can show success/error via postMessage (iframe).
function ramadanFormResponse(result, errorMsg) {
  var err = (errorMsg || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "\\\"").replace(/\n/g, " ");
  var payload = result === "success"
    ? "{ type: 'ramadan-form', result: 'success' }"
    : "{ type: 'ramadan-form', result: 'error', error: '" + err + "' }";
  var html = "<!DOCTYPE html><html><head><meta charset='utf-8'></head><body><script>try { window.parent.postMessage(" + payload + ", '*'); } catch (e) { }<\/script><p>" + (result === "success" ? "OK" : "Error") + "</p></body></html>";
  return ContentService.createTextOutput(html).setMimeType(ContentService.MimeType.HTML);
}

// --- POST: form submission (accepts JSON body or application/x-www-form-urlencoded with "data" field) ---
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
        Logger.log("doPost: JSON parse failed - " + parseErr.toString() + " raw length " + raw.length);
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

// --- ROUTE form to kids/ramadan or lovers handler ---
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

// Resolve which spreadsheet to use: script property SPREADSHEET_ID, then FALLBACK, then active sheet.
// If SPREADSHEET_ID is set but invalid (e.g. typo like "ł"), we now try FALLBACK so orders still land in the "old" sheet.
function getSpreadsheet() {
  var id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id || id.length < 10) id = typeof FALLBACK_SPREADSHEET_ID !== "undefined" ? FALLBACK_SPREADSHEET_ID : "";
  if (id && id.length > 10) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (e) {
      Logger.log("getSpreadsheet openById failed for id: " + e.toString());
      // Try fallback so form POSTs still write somewhere (e.g. "old" sheet) when property has a typo.
      if (typeof FALLBACK_SPREADSHEET_ID !== "undefined" && FALLBACK_SPREADSHEET_ID && FALLBACK_SPREADSHEET_ID !== id) {
        try {
          return SpreadsheetApp.openById(FALLBACK_SPREADSHEET_ID);
        } catch (e2) {
          Logger.log("getSpreadsheet fallback openById also failed: " + e2.toString());
        }
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

// Run once from Script Editor (with the correct spreadsheet open) to save its ID so form POSTs can write to it.
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

// --- Reference sheet: editable WhatsApp message texts (keys in col A, text in col B) ---
var REFERENCE_DEFAULTS = {
  "message_whatsapp_nrp_1": "Bonjour {{nom}}, nous avons bien reçu votre commande. Pouvez-vous nous confirmer ?",
  "message_whatsapp_nrp_2": "Bonjour {{nom}}, nous vous relançons pour confirmer votre commande. Pouvez-vous nous confirmer ?",
  "message_whatsapp_nrp_3": "Bonjour {{nom}}, dernière relance pour confirmer votre commande. Merci de nous confirmer.",
  "message_succes": "Bonjour {{nom}}, voici un aperçu de votre couverture. Merci de nous confirmer si tout est bon."
};

function getOrCreateReferenceSheet() {
  // Use getActiveSpreadsheet() so this works inside onEdit (simple triggers can't use openById)
  var ss = SpreadsheetApp.getActiveSpreadsheet() || getSpreadsheet();
  if (!ss) return null;
  var sheet = ss.getSheetByName("reference");
  if (!sheet) {
    sheet = ss.insertSheet("reference");
  }
  // Always ensure headers exist
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 2).setValues([["clé", "texte"]]);
  }
  // Build map of existing keys
  var existing = {};
  if (sheet.getLastRow() > 1) {
    var existingData = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
    for (var i = 0; i < existingData.length; i++) {
      if (existingData[i][0]) existing[String(existingData[i][0]).trim()] = { row: i + 2, text: String(existingData[i][1]).trim() };
    }
  }
  // Add or fill empty defaults
  var keys = ["message_whatsapp_nrp_1", "message_whatsapp_nrp_2", "message_whatsapp_nrp_3", "message_succes"];
  for (var j = 0; j < keys.length; j++) {
    var key = keys[j];
    if (!existing[key]) {
      var nextRow = sheet.getLastRow() + 1;
      sheet.getRange(nextRow, 1, 1, 2).setValues([[key, REFERENCE_DEFAULTS[key]]]);
    } else if (!existing[key].text) {
      sheet.getRange(existing[key].row, 2).setValue(REFERENCE_DEFAULTS[key]);
    }
  }
  return sheet;
}

function getReferenceText(key) {
  var sheet = getOrCreateReferenceSheet();
  if (!sheet) return REFERENCE_DEFAULTS[key] || null;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] != null && String(data[i][0]).trim() === key) {
      var text = data[i][1];
      if (text != null && String(text).trim().length > 0) return String(text).trim();
      return REFERENCE_DEFAULTS[key] || null;
    }
  }
  return REFERENCE_DEFAULTS[key] || null;
}

// --- Get or create "kids_orders" sheet. Uses 29 columns; header order in KIDS_ORDERS_HEADERS. ---
function getOrCreateKidsOrdersSheet() {
  var ss = getSpreadsheet();
  if (!ss) {
    throw new Error("No spreadsheet. Bind this script to the sheet, or set Script Property SPREADSHEET_ID to your sheet ID.");
  }
  var sheet = ss.getSheetByName("kids_orders");
  if (!sheet) {
    sheet = ss.insertSheet("kids_orders");
  }
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() < KIDS_ORDERS_HEADERS.length) {
    sheet.getRange(1, 1, 1, KIDS_ORDERS_HEADERS.length).setValues([KIDS_ORDERS_HEADERS]);
  }
  return sheet;
}

function applyActionColumnValidation(sheet) {
  if (!sheet || sheet.getName() !== "kids_orders") return;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var ruleApp = SpreadsheetApp.newDataValidation().requireValueInList(["—", "Ouvrir l'app"], true).setAllowInvalid(false).build();
  sheet.getRange(2, KIDS_COL_APP, lastRow, KIDS_COL_APP).setDataValidation(ruleApp);
  if (sheet.getLastColumn() < 32) return;
  var ruleCouv = SpreadsheetApp.newDataValidation().requireValueInList(["—", "Générer couverture", "Créer livre"], true).setAllowInvalid(false).build();
  sheet.getRange(2, 32, lastRow, 32).setDataValidation(ruleCouv);
  var ruleCheckbox = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  sheet.getRange(2, 33, lastRow, 36).setDataValidation(ruleCheckbox);
  var checkboxRange = sheet.getRange(2, 33, lastRow, 36);
  var vals = checkboxRange.getValues();
  for (var r = 0; r < vals.length; r++) {
    for (var c = 0; c < vals[r].length; c++) {
      if (vals[r][c] === "" || vals[r][c] === null) vals[r][c] = false;
    }
  }
  checkboxRange.setValues(vals);
}

function applyActionColumnValidationForRow(sheet, rowIndex) {
  if (!sheet || sheet.getName() !== "kids_orders" || rowIndex < 2) return;
  var ruleApp = SpreadsheetApp.newDataValidation().requireValueInList(["—", "Ouvrir l'app"], true).setAllowInvalid(false).build();
  sheet.getRange(rowIndex, KIDS_COL_APP).setDataValidation(ruleApp).setValue("—");
  if (sheet.getLastColumn() < 32) return;
  var ruleCouv = SpreadsheetApp.newDataValidation().requireValueInList(["—", "Générer couverture", "Créer livre"], true).setAllowInvalid(false).build();
  var ruleCheckbox = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  sheet.getRange(rowIndex, 32).setDataValidation(ruleCouv).setValue("—");
  sheet.getRange(rowIndex, 33, rowIndex, 36).setDataValidation(ruleCheckbox).setValues([[false, false, false, false]]);
}

function cleanupExtraColumnValidation() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("kids_orders");
  if (!sheet) { Logger.log("kids_orders not found"); return; }
  SpreadsheetApp.getActiveSpreadsheet().toast("kids_orders utilise " + KIDS_ORDERS_COLS + " colonnes. Aucun nettoyage nécessaire.", "✅ OK", 4);
}

// Run once from Script Editor: Run > setupColumnODropdown. Adds "Ouvrir l'app" dropdown to column O (O2:O) on kids_orders. Click a cell, choose "Ouvrir l'app" → popup + app opens in new tab.
function setupColumnODropdown() {
  var ss = (typeof getSpreadsheet === "function" ? getSpreadsheet() : null) || SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    SpreadsheetApp.getUi().alert("Ouvrez d'abord le tableau ou définissez SPREADSHEET_ID.");
    return;
  }
  var sheet = ss.getSheetByName("kids_orders");
  if (!sheet) {
    SpreadsheetApp.getUi().alert("Onglet kids_orders introuvable.");
    return;
  }
  var lastRow = Math.max(sheet.getLastRow(), 2);
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(["—", "Ouvrir l'app"], true).setAllowInvalid(false).build();
  sheet.getRange(2, KIDS_COL_APP, lastRow, KIDS_COL_APP).setDataValidation(rule);
  sheet.getRange(2, KIDS_COL_APP, lastRow, KIDS_COL_APP).clearContent();
  if (SpreadsheetApp.getUi()) SpreadsheetApp.getUi().alert("Colonne O : menu « — » / « Ouvrir l'app » appliqué de O2 à O" + lastRow + ". Cliquez une cellule, choisissez « Ouvrir l'app » → popup + ouverture de l'app.");
  else Logger.log("Colonne O dropdown appliqué de O2 à O" + lastRow);
}

// --- openApp: called from column O HYPERLINK (action=openApp&sheetName=kids_orders&rowIndex=N). Returns HTML redirect or link. ---
function handleOpenApp(params) {
  var spreadsheetId = params.spreadsheetId || PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID") || (typeof FALLBACK_SPREADSHEET_ID !== "undefined" ? FALLBACK_SPREADSHEET_ID : "");
  var sheetName = params.sheetName || "kids_orders";
  var rowIndex = parseInt(params.rowIndex, 10);
  if (!spreadsheetId || !rowIndex || rowIndex < 2) {
    return ContentService.createTextOutput(htmlOpenAppPage(null, "Paramètres manquants (spreadsheetId ou rowIndex). Vérifiez l'URL.")).setMimeType(ContentService.MimeType.HTML);
  }
  var backendUrl = PropertiesService.getScriptProperties().getProperty("BACKEND_URL");
  var appUrl = PropertiesService.getScriptProperties().getProperty("APP_URL");
  if (!backendUrl || !appUrl) {
    return ContentService.createTextOutput(htmlOpenAppPage(null, "BACKEND_URL ou APP_URL manquant. Définissez-les dans Propriétés du script.")).setMimeType(ContentService.MimeType.HTML);
  }
  var spread;
  try {
    spread = SpreadsheetApp.openById(spreadsheetId);
  } catch (openErr) {
    return ContentService.createTextOutput(htmlOpenAppPage(null, "Tableur introuvable: " + openErr.toString())).setMimeType(ContentService.MimeType.HTML);
  }
  var sheet = spread.getSheetByName(sheetName);
  if (!sheet) {
    return ContentService.createTextOutput(htmlOpenAppPage(null, "Onglet \"" + sheetName + "\" introuvable.")).setMimeType(ContentService.MimeType.HTML);
  }
  if (sheetName !== "kids_orders") {
    return ContentService.createTextOutput(htmlOpenAppPage(null, "openApp pris en charge uniquement pour kids_orders.")).setMimeType(ContentService.MimeType.HTML);
  }
  var rowValues = sheet.getRange(rowIndex, 1, rowIndex, KIDS_ORDERS_COLS).getValues()[0];
  var photo1Url = rowValues[KIDS_COL_PHOTO1 - 1] ? String(rowValues[KIDS_COL_PHOTO1 - 1]).trim() : "";
  var photo2Url = rowValues[KIDS_COL_PHOTO2 - 1] ? String(rowValues[KIDS_COL_PHOTO2 - 1]).trim() : "";
  var photo3Url = rowValues[KIDS_COL_PHOTO3 - 1] ? String(rowValues[KIDS_COL_PHOTO3 - 1]).trim() : "";
  var cov1 = rowValues[KIDS_COL_COUVERTURE_1 - 1] ? String(rowValues[KIDS_COL_COUVERTURE_1 - 1]).trim() : "";
  var cov2 = rowValues[KIDS_COL_COUVERTURE_2 - 1] ? String(rowValues[KIDS_COL_COUVERTURE_2 - 1]).trim() : "";
  var cov3 = rowValues[KIDS_COL_COUVERTURE_3 - 1] ? String(rowValues[KIDS_COL_COUVERTURE_3 - 1]).trim() : "";
  var coverIndex = 0;
  var kidBase64 = "";
  if (!cov1 && photo1Url) {
    coverIndex = 1;
    kidBase64 = fetchDrivePhotoAsBase64(photo1Url);
  } else if (cov1 && !cov2 && photo2Url) {
    coverIndex = 2;
    kidBase64 = fetchDrivePhotoAsBase64(photo2Url);
  } else if (cov1 && cov2 && !cov3 && photo3Url) {
    coverIndex = 3;
    kidBase64 = fetchDrivePhotoAsBase64(photo3Url);
  }
  if (!coverIndex || !kidBase64) {
    var msg = (cov1 && cov2 && cov3)
      ? "Les trois couvertures pour cette ligne sont déjà générées."
      : "Pour la prochaine couverture, une photo enfant est requise (Photo enfant " + (cov1 && !cov2 ? "2" : cov2 ? "3" : "1") + ").";
    return ContentService.createTextOutput(htmlOpenAppPage(null, msg)).setMimeType(ContentService.MimeType.HTML);
  }
  var coverColumn = KIDS_COL_COUVERTURE_1 + coverIndex - 1;
  var webhookSecret = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET") || "";
  var webhookUrl = PropertiesService.getScriptProperties().getProperty("WEBHOOK_URL") || "";
  if (!webhookUrl) {
    try { webhookUrl = ScriptApp.getService().getUrl() || ""; } catch (e) {}
  }
  var baseUrl = backendUrl.replace(/\/createBook\/?$/, "").replace(/\/$/, "");
  var prepareUrl = baseUrl + "/sheet/prepareCover";
  var payload = {
    spreadsheetId: spreadsheetId,
    sheetName: "kids_orders",
    rowIndex: rowIndex,
    outputFolderId: PDF_OUTPUT_FOLDER_ID,
    webhookUrl: webhookUrl,
    webhookSecret: webhookSecret,
    type: "ramadan",
    coverColumn: coverColumn,
    row: {
      date: rowValues[0],
      buyerName: rowValues[KIDS_COL_NOM - 1],
      phone: rowValues[2],
      pack: rowValues[3],
      price: rowValues[4],
      prenoms: rowValues[KIDS_COL_PRENOMS - 1],
      ages: rowValues[KIDS_COL_AGES - 1] != null ? String(rowValues[KIDS_COL_AGES - 1]).trim() : "",
      genres: rowValues[KIDS_COL_GENRES - 1] != null ? String(rowValues[KIDS_COL_GENRES - 1]).trim() : "",
      langues: rowValues[8],
      themes: rowValues[9],
      status: rowValues[KIDS_COL_STATUS_LIVRE - 1],
      child1PhotoUrl: photo1Url,
      child2PhotoUrl: photo2Url,
      child3PhotoUrl: photo3Url,
      child1PhotoBase64: coverIndex === 1 ? kidBase64 : "",
      child2PhotoBase64: coverIndex === 2 ? kidBase64 : "",
      child3PhotoBase64: coverIndex === 3 ? kidBase64 : "",
      coverImageBase64: ""
    }
  };
  try {
    var resp = UrlFetchApp.fetch(prepareUrl, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      fetchTimeoutSeconds: 60
    });
    var code = resp.getResponseCode();
    var body = resp.getContentText();
    if (code >= 200 && code < 300) {
      var data = JSON.parse(body || "{}");
      var sessionId = data.sessionId;
      if (sessionId) {
        var openUrl = appUrl.replace(/\/$/, "") + "?fromSheet=" + sessionId + "&template=ramadan";
        return ContentService.createTextOutput(htmlOpenAppPage(openUrl, null)).setMimeType(ContentService.MimeType.HTML);
      }
    }
    return ContentService.createTextOutput(htmlOpenAppPage(null, "Erreur serveur (" + code + "): " + (body || "pas de sessionId"))).setMimeType(ContentService.MimeType.HTML);
  } catch (fetchErr) {
    return ContentService.createTextOutput(htmlOpenAppPage(null, "Erreur: " + fetchErr.toString())).setMimeType(ContentService.MimeType.HTML);
  }
}

function htmlOpenAppPage(appUrl, errorMsg) {
  var title = "Ouvrir l'app";
  if (errorMsg) {
    return "<!DOCTYPE html><html><head><meta charset='utf-8'><style>body{font-family:sans-serif;padding:20px;max-width:520px;} .err{color:#c00;} a{color:#1967d2;}</style></head><body><h2>" + title + "</h2><p class='err'>" + escapeHtml(errorMsg) + "</p><p><a href='javascript:window.close()'>Fermer</a></p></body></html>";
  }
  var safeUrl = escapeHtml(appUrl);
  var urlJs = appUrl.replace(/\\/g, "\\\\").replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/'/g, "\\'").replace(/"/g, "\\\"");
  return "<!DOCTYPE html><html><head><meta charset='utf-8'><meta http-equiv='refresh' content='0;url=" + safeUrl + "'><style>body{font-family:sans-serif;padding:20px;max-width:560px;} p{margin:10px 0;} .btn{display:inline-block;padding:12px 20px;background:#1967d2;color:#fff!important;text-decoration:none;border-radius:6px;margin:10px 0;} .btn:hover{background:#1557b0;} a{color:#1967d2;word-break:break-all;}</style></head><body><h2>" + title + "</h2><p>Redirection vers l'app…</p><p><a id='autolink' class='btn' href=\"" + safeUrl + "\" target='_blank'>Ouvrir l'app</a></p><p style='font-size:14px;color:#666;'>Si rien ne se passe, cliquez sur le bouton ci‑dessus.</p><script>(function(){ var u=\"" + urlJs + "\"; try { window.location.href=u; } catch(e) {} setTimeout(function(){ try { document.getElementById('autolink').click(); } catch(e) {} }, 150); })();<\/script></body></html>";
}

function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// --- RAMADAN form → "kids_orders" sheet (29 columns; each field in the right place) ---
function processRamadanSubmission(data) {
  var sheet;
  try {
    sheet = getOrCreateKidsOrdersSheet();
  } catch (sheetErr) {
    Logger.log("processRamadanSubmission getOrCreateKidsOrdersSheet: " + sheetErr.toString());
    throw sheetErr;
  }
  var dateStr = data.date ? (function() {
    try {
      var d = new Date(data.date);
      return Utilities.formatDate(d, "Africa/Casablanca", "dd/MM/yyyy HH:mm:ss");
    } catch (err) {
      return Utilities.formatDate(new Date(), "Africa/Casablanca", "dd/MM/yyyy HH:mm:ss");
    }
  })() : Utilities.formatDate(new Date(), "Africa/Casablanca", "dd/MM/yyyy HH:mm:ss");
  var buyerName = (data.buyer && data.buyer.name) ? String(data.buyer.name) : (data.buyerName || data.nom || "");
  var phoneRaw = (data.buyer && data.buyer.phone) ? String(data.buyer.phone) : (data.phone || data.tel || "");
  var phone = phoneRaw ? phoneRaw.replace(/^([0-9])/, "'$1") : "";
  var quantity = data.pack != null ? data.pack : (data.quantity != null ? data.quantity : "");
  var totalPrice = (data.totalPrice != null ? String(data.totalPrice) : (data.prix || "299 DH"));
  var prenomsArr = [], agesArr = [], genresArr = [], languesArr = [], themesArr = [];
  if (data.books && Array.isArray(data.books)) {
    for (var i = 0; i < data.books.length; i++) {
      var b = data.books[i];
      var nameVal = b.kidName != null ? b.kidName : (b.name != null ? b.name : null);
      var ageVal = b.kidAge != null ? b.kidAge : (b.age != null ? b.age : null);
      var genderVal = b.kidGender != null ? b.kidGender : (b.gender != null ? b.gender : null);
      if (nameVal != null) prenomsArr.push(String(nameVal));
      if (ageVal != null) agesArr.push(String(ageVal));
      if (genderVal != null) genresArr.push(String(genderVal));
      if (b.language != null) languesArr.push(String(b.language));
      if (b.style != null) themesArr.push(String(b.style));
    }
  }
  var prenoms = prenomsArr.length ? prenomsArr.join(", ") : ((data.child && data.child.name != null) ? String(data.child.name) : (data.prenoms || ""));
  var ages = agesArr.length ? agesArr.join(", ") : ((data.child && data.child.age != null) ? String(data.child.age) : (data.ages || ""));
  var genres = genresArr.length ? genresArr.join(", ") : ((data.child && data.child.gender != null) ? String(data.child.gender) : (data.genres || ""));
  var langues = languesArr.length ? languesArr.join(", ") : (data.langues || "Français");
  var themes = themesArr.length ? themesArr.join(", ") : (data.themes || "");
  var eventId = (data.tracking && data.tracking.eventId) ? String(data.tracking.eventId) : "ramadan_" + new Date().getTime();
  var safeName = (buyerName || "Inconnu").replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 30);
  var photo1Url = "";
  var photo2Url = "";
  var photo3Url = "";
  try {
    if (data.childPhotoBase64 && data.childPhotoBase64.length > 100) {
      photo1Url = saveImageToDrive(data.childPhotoBase64, "ENFANT1_" + safeName + "_" + eventId, FOLDER_ID) || "";
    }
  } catch (e1) { Logger.log("processRamadanSubmission photo1: " + e1.toString()); }
  try {
    if (data.child2PhotoBase64 && data.child2PhotoBase64.length > 100) {
      photo2Url = saveImageToDrive(data.child2PhotoBase64, "ENFANT2_" + safeName + "_" + eventId, FOLDER_ID) || "";
    }
  } catch (e2) { Logger.log("processRamadanSubmission photo2: " + e2.toString()); }
  try {
    if (data.child3PhotoBase64 && data.child3PhotoBase64.length > 100) {
      photo3Url = saveImageToDrive(data.child3PhotoBase64, "ENFANT3_" + safeName + "_" + eventId, FOLDER_ID) || "";
    }
  } catch (e3) { Logger.log("processRamadanSubmission photo3: " + e3.toString()); }
  var row = [
    dateStr, buyerName, phone, quantity, totalPrice, prenoms, ages, genres, langues, themes,
    "Nouveau", "", "", "", "",
    photo1Url, photo2Url, photo3Url,
    "", "", "", "Nouveau", "", "", "", "", "", "",
    data.adresse || ""
  ];
  try {
    sheet.appendRow(row);
    applyActionColumnValidationForRow(sheet, sheet.getLastRow());
  } catch (appendErr) {
    Logger.log("processRamadanSubmission appendRow: " + appendErr.toString());
    throw appendErr;
  }
}

// --- KIDS form → "kids_orders" sheet (29 columns A–AC) ---
function processKidsSubmission(data) {
  var sheet;
  try {
    sheet = getOrCreateKidsOrdersSheet();
  } catch (sheetErr) {
    Logger.log("processKidsSubmission getOrCreateKidsOrdersSheet: " + sheetErr.toString());
    throw sheetErr;
  }
  var dateStr = data.timestamp ? (function() {
    try {
      var d = new Date(data.timestamp);
      return Utilities.formatDate(d, "Africa/Casablanca", "dd/MM/yyyy HH:mm:ss");
    } catch (err) {
      return Utilities.formatDate(new Date(), "Africa/Casablanca", "dd/MM/yyyy HH:mm:ss");
    }
  })() : Utilities.formatDate(new Date(), "Africa/Casablanca", "dd/MM/yyyy HH:mm:ss");
  var buyerName = (data.buyer && data.buyer.name) ? String(data.buyer.name) : (data.buyerName || data.nom || "");
  var phoneRaw = (data.buyer && data.buyer.phone) ? String(data.buyer.phone) : (data.phone || data.tel || "");
  var phone = phoneRaw ? phoneRaw.replace(/^([0-9])/, "'$1") : "";
  var quantity = data.package != null ? data.package : (data.pack != null ? data.pack : (data.quantity != null ? data.quantity : ""));
  var totalPrice = (data.totalPrice != null ? String(data.totalPrice) : (data.prix || "299 DH"));
  var prenomsArr = [], agesArr = [], genresArr = [], languesArr = [], themesArr = [];
  if (data.books && Array.isArray(data.books)) {
    for (var i = 0; i < data.books.length; i++) {
      var b = data.books[i];
      if (b.kidName != null) prenomsArr.push(String(b.kidName));
      if (b.kidAge != null) agesArr.push(String(b.kidAge));
      if (b.kidGender != null) genresArr.push(String(b.kidGender));
      if (b.language != null) languesArr.push(String(b.language));
      if (b.theme != null) themesArr.push(String(b.theme));
    }
  }
  var prenoms = prenomsArr.join(", ") || (data.prenoms || "");
  var ages = agesArr.join(", ") || (data.ages || "");
  var genres = genresArr.join(", ") || (data.genres || "");
  var langues = languesArr.join(", ") || (data.langues || "Français");
  var themes = themesArr.join(", ") || (data.themes || "");
  var photo1Url = "", photo2Url = "", photo3Url = "";
  var eventId = (data.tracking && data.tracking.eventId) ? String(data.tracking.eventId) : "kids_" + new Date().getTime();
  var safeName = (buyerName || "Inconnu").replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 30);
  try {
    if (data.childPhotoBase64 && data.childPhotoBase64.length > 100) {
      photo1Url = saveImageToDrive(data.childPhotoBase64, "ENFANT1_" + safeName + "_" + eventId, FOLDER_ID) || "";
    }
  } catch (e1) {}
  try {
    if (data.child2PhotoBase64 && data.child2PhotoBase64.length > 100) {
      photo2Url = saveImageToDrive(data.child2PhotoBase64, "ENFANT2_" + safeName + "_" + eventId, FOLDER_ID) || "";
    }
  } catch (e2) {}
  try {
    if (data.child3PhotoBase64 && data.child3PhotoBase64.length > 100) {
      photo3Url = saveImageToDrive(data.child3PhotoBase64, "ENFANT3_" + safeName + "_" + eventId, FOLDER_ID) || "";
    }
  } catch (e3) {}
  var row = [
    dateStr, buyerName, phone, quantity, totalPrice, prenoms, ages, genres, langues, themes,
    "Nouveau", "", "", "", "",
    photo1Url, photo2Url, photo3Url,
    "", "", "", "Nouveau", "", "", "", "", "", "",
    data.adresse || ""
  ];
  try {
    sheet.appendRow(row);
    applyActionColumnValidationForRow(sheet, sheet.getLastRow());
  } catch (appendErr) {
    Logger.log("processKidsSubmission appendRow: " + appendErr.toString());
    throw appendErr;
  }
}

// Run from Script Editor to verify "kids_orders" sheet is writable (View > Executions to see logs).
function testKidsOrdersWrite() {
  var sheet = getOrCreateKidsOrdersSheet();
  var testRow = [Utilities.formatDate(new Date(), "Africa/Casablanca", "dd/MM/yyyy HH:mm:ss"), "Test Nom", "'0612345678", 1, "299 DH", "Test Prénoms", "6", "Garçon", "Français", "disney", "Nouveau", "", "", "", "", "", "", "", "", "", "", "Nouveau", "", "", "", "", "", "", "Adresse test"];
  sheet.appendRow(testRow);
  Logger.log("OK: test row appended to kids_orders (29 cols A–AC)");
}

// --- SAVE ORDER TO SHEET (lovers only) ---
function processFormSubmission(data) {
  var doc = getSpreadsheet();
  var sheet = doc.getSheetByName("lovers_orders") || doc.getSheets()[0];
  var date = Utilities.formatDate(new Date(), "Africa/Casablanca", "dd/MM/yyyy HH:mm:ss");
  var bookName = "Inconnu";
  if (data.book.id == 1) bookName = "Raisons d'Aimer";
  else if (data.book.id == 2) bookName = "Années d'Amour";
  else if (data.book.id == 3) bookName = "Liste de Rêves";
  else if (data.book.id == 4) bookName = "100% Sur Mesure";
  var recipientFr = (data.recipient === "HER") ? "Elle" : "Lui";
  var langMap = { "fr": "Français", "ar": "Arabe", "en": "Anglais" };
  var langFr = langMap[data.book.lang] || data.book.lang;
  var optionsList = Array.isArray(data.book.options) ? data.book.options.join(", ") : (data.book.options || "");
  var totalPrice = 299;
  if (data.book.id == 4) totalPrice += 49;
  if (data.extras.giftwrap) totalPrice += 19;
  var himPhotoUrl = saveImageToDrive(data.partner1.photo, "LUI_" + data.buyer.name + "_" + data.tracking.eventId, FOLDER_ID);
  var herPhotoUrl = saveImageToDrive(data.partner2.photo, "ELLE_" + data.buyer.name + "_" + data.tracking.eventId, FOLDER_ID);
  var row = [
    date, data.buyer.name, "'" + data.buyer.phone, bookName, recipientFr,
    data.partner1.name, data.partner1.age, data.partner2.name, data.partner2.age,
    langFr, data.book.style, data.book.years || "", data.book.customTitle || "", data.book.customNote || "",
    optionsList, data.extras.giftwrap ? "OUI" : "NON", totalPrice + " DH", "Nouveau",
    himPhotoUrl, herPhotoUrl,
    "", "", "Nouveau", ""
  ];
  sheet.appendRow(row);
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
    Logger.log("saveImageToDrive: " + e.toString());
    return "Erreur: " + e.toString();
  }
}

function sendToMetaCAPI(data, price) {
  try {
    var url = "https://graph.facebook.com/v19.0/" + PIXEL_ID + "/events?access_token=" + ACCESS_TOKEN;
    var cleanPhone = data.buyer.phone ? data.buyer.phone.replace(/\D/g, '') : "";
    var names = data.buyer.name.trim().split(" ");
    var fn = names[0];
    var ln = names.length > 1 ? names[names.length - 1] : "";
    var payload = {
      data: [{
        event_name: "Lead",
        event_time: Math.floor(new Date().getTime() / 1000),
        event_source_url: data.tracking.pageUrl,
        event_id: data.tracking.eventId,
        action_source: "website",
        user_data: { ph: [sha256(cleanPhone)], fn: [sha256(fn)], ln: [sha256(ln)], client_user_agent: data.tracking.userAgent, fbp: data.tracking.fbp, fbc: data.tracking.fbc },
        custom_data: { currency: "MAD", value: price, content_name: "Livre Magique: " + data.book.id, recipient: data.recipient }
      }]
    };
    UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true });
  } catch (e) {
    Logger.log("CAPI: " + e.toString());
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
    var byteStr = byte.toString(16);
    if (byteStr.length == 1) byteStr = "0" + byteStr;
    txt += byteStr;
  }
  return txt;
}

function testDriveAccess() {
  try {
    var folder = Drive.Files.get(FOLDER_ID);
    Logger.log("OK: " + folder.title);
    return "Success! Check the logs.";
  } catch (e) {
    Logger.log("ERROR: " + e.toString());
    return "Error: " + e.toString();
  }
}
