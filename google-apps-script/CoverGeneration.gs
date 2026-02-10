// --- CONFIGURATION ---
// 1. YOUR PIXEL ID
var PIXEL_ID = "1869022517306441";

// 2. YOUR SYSTEM USER ACCESS TOKEN (Keep this secret)
var ACCESS_TOKEN = "EAACopQs0dlwBQuZCsmmLnjJpgZCU1XJxv0J7kSEas9A3acmTzu2Bu3sfklnSxs8vvZCL6iCYM5cpb7lAjobZAzp3UsR7BCAUJFm2J2nqxJwnyojnWnRZCNkjUy1HWvS6pqcff9kr4VrESwJT7rcGLFiv9sZCygpLcaeXtxImgTxZAyoroIfYgh7hKoDkZBTGj0vc9QZDZD";

// 3. YOUR GOOGLE DRIVE FOLDER ID (Where photos will be saved)
var FOLDER_ID = "1h0BPEP6IQWczNJC2TQ-x4ztlLnMpgYht";

// NEW: Handle GET requests (CORS workaround)
function doGet(e) {
    var lock = LockService.getScriptLock();
    lock.tryLock(10000);

    try {
        // Check if data parameter exists
        if (!e || !e.parameter || !e.parameter.data) {
            Logger.log("ERROR: No data parameter received");
            return ContentService.createTextOutput("error");
        }

        // Decode base64 payload
        var payloadB64 = e.parameter.data;
        var payloadStr = decodeURIComponent(escape(Utilities.newBlob(Utilities.base64Decode(payloadB64)).getDataAsString()));
        Logger.log("Received data: " + payloadStr.substring(0, 200));
        
        var data = JSON.parse(payloadStr);

        // Process the data (same logic as doPost)
        processFormSubmission(data);

        // Return 1x1 transparent GIF to satisfy image request
        var gif = Utilities.base64Decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
        return ContentService.createTextOutput().setMimeType(ContentService.MimeType.PNG).setContent(gif);

    } catch (e) {
        Logger.log("ERROR in doGet: " + e.toString());
        Logger.log("Stack trace: " + e.stack);
        return ContentService.createTextOutput("error");
    } finally {
        lock.releaseLock();
    }
}

// Handle POST requests from sendBeacon / no-cors fetch
function doPost(e) {
    var lock = LockService.getScriptLock();
    lock.tryLock(10000);

    try {
        var data;
        
        // Try to parse from postData.contents first
        if (e && e.postData && e.postData.contents) {
            Logger.log("Received POST data: " + e.postData.contents.substring(0, 200));
            data = JSON.parse(e.postData.contents);
        }
        // Fallback: try to read from parameter (for some edge cases)
        else if (e && e.parameter && e.parameter.data) {
            Logger.log("Received data from parameter");
            data = JSON.parse(e.parameter.data);
        }
        else {
            Logger.log("ERROR: No POST data received. Request: " + JSON.stringify(e));
            return ContentService.createTextOutput(JSON.stringify({ 
                "result": "error", 
                "error": "No POST data received" 
            })).setMimeType(ContentService.MimeType.JSON);
        }

        processFormSubmission(data);

        return ContentService.createTextOutput(JSON.stringify({ 
            "result": "success"
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (e) {
        Logger.log("ERROR in doPost: " + e.toString());
        Logger.log("Stack trace: " + e.stack);
        return ContentService.createTextOutput(JSON.stringify({ 
            "result": "error", 
            "error": e.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    } finally {
        lock.releaseLock();
    }
}

// --- MAIN PROCESSING FUNCTION ---
function processFormSubmission(data) {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheets()[0];

    // --- 1. PREPARE DATA ---

    // A. Timezone Fix (Morocco GMT+1)
    var date = Utilities.formatDate(new Date(), "Africa/Casablanca", "dd/MM/yyyy HH:mm:ss");

    // B. Book Name Logic
    var bookName = "Inconnu";
    if (data.book.id == 1) bookName = "Raisons d'Aimer";
    else if (data.book.id == 2) bookName = "Années d'Amour";
    else if (data.book.id == 3) bookName = "Liste de Rêves";
    else if (data.book.id == 4) bookName = "100% Sur Mesure";

    // C. Recipient Logic
    var recipientFr = (data.recipient === "HER") ? "Elle" : "Lui";

    // D. Language Logic
    var langMap = { "fr": "Français", "ar": "Arabe", "en": "Anglais" };
    var langFr = langMap[data.book.lang] || data.book.lang;

    // E. Options List Formatting
    var optionsList = "";
    if (Array.isArray(data.book.options)) {
        optionsList = data.book.options.join(", ");
    } else {
        optionsList = data.book.options;
    }

    // F. Price Calculation
    var totalPrice = 299; // Base Price
    if (data.book.id == 4) totalPrice += 49; // Custom Book Surcharge
    if (data.extras.giftwrap) totalPrice += 19; // Giftwrap Surcharge

    // G. Save Photos to Drive
    var himPhotoUrl = saveImageToDrive(data.partner1.photo, "LUI_" + data.buyer.name + "_" + data.tracking.eventId, FOLDER_ID);
    var herPhotoUrl = saveImageToDrive(data.partner2.photo, "ELLE_" + data.buyer.name + "_" + data.tracking.eventId, FOLDER_ID);

    // --- 2. SAVE TO SHEET ---
    var row = [
        date,
        data.buyer.name,
        "'" + data.buyer.phone,
        bookName,
        recipientFr,
        data.partner1.name,
        data.partner1.age,
        data.partner2.name,
        data.partner2.age,
        langFr,
        data.book.style,
        data.book.years || "",
        data.book.customTitle || "",
        data.book.customNote || "",
        optionsList,
        data.extras.giftwrap ? "OUI" : "NON",
        totalPrice + " DH",
        "Nouveau",
        himPhotoUrl,
        herPhotoUrl
    ];

    sheet.appendRow(row);
    Logger.log("Row appended successfully");

    // --- 3. SEND TO FACEBOOK CAPI ---
    if (data.tracking) {
        sendToMetaCAPI(data, totalPrice);
    }
}

// --- HELPER: SAVE IMAGE TO DRIVE (Using Advanced Drive Service) ---
function saveImageToDrive(base64String, fileName, folderId) {
    if (!base64String || base64String.length < 100) return ""; // Return empty if no photo

    try {
        Logger.log("Attempting to save file: " + fileName);
        
        // Extract content type and decode base64
        var contentType = base64String.substring(5, base64String.indexOf(';'));
        var bytes = Utilities.base64Decode(base64String.substr(base64String.indexOf('base64,') + 7));
        var blob = Utilities.newBlob(bytes, contentType, fileName);

        // Use Advanced Drive Service (Drive API v2)
        var file = Drive.Files.insert(
            {
                title: fileName,
                parents: [{id: folderId}],
                mimeType: contentType
            },
            blob
        );
        
        // Make file viewable by anyone with link
        Drive.Permissions.insert(
            {
                role: 'reader',
                type: 'anyone',
                withLink: true
            },
            file.id
        );

        var fileUrl = "https://drive.google.com/file/d/" + file.id + "/view";
        Logger.log("File created successfully: " + fileUrl);
        return fileUrl;
        
    } catch (e) {
        Logger.log("ERROR in saveImageToDrive: " + e.toString());
        return "Erreur: " + e.toString();
    }
}

// --- HELPER: FACEBOOK CAPI ---
function sendToMetaCAPI(data, price) {
    try {
        var url = "https://graph.facebook.com/v19.0/" + PIXEL_ID + "/events?access_token=" + ACCESS_TOKEN;

        var cleanPhone = data.buyer.phone ? data.buyer.phone.replace(/\D/g, '') : "";
        var phoneHash = sha256(cleanPhone);

        var names = data.buyer.name.trim().split(" ");
        var fn = names[0];
        var ln = names.length > 1 ? names[names.length - 1] : "";

        var payload = {
            "data": [
                {
                    "event_name": "Lead",
                    "event_time": Math.floor(new Date().getTime() / 1000),
                    "event_source_url": data.tracking.pageUrl,
                    "event_id": data.tracking.eventId,
                    "action_source": "website",
                    "user_data": {
                        "ph": [phoneHash],
                        "fn": [sha256(fn)],
                        "ln": [sha256(ln)],
                        "client_user_agent": data.tracking.userAgent,
                        "fbp": data.tracking.fbp,
                        "fbc": data.tracking.fbc
                    },
                    "custom_data": {
                        "currency": "MAD",
                        "value": price,
                        "content_name": "Livre Magique: " + data.book.id,
                        "recipient": data.recipient
                    }
                }
            ]
        };

        var options = {
            "method": "post",
            "contentType": "application/json",
            "payload": JSON.stringify(payload),
            "muteHttpExceptions": true
        };

        UrlFetchApp.fetch(url, options);
        Logger.log("CAPI event sent successfully");

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
        var byteStr = byte.toString(16);
        if (byteStr.length == 1) byteStr = "0" + byteStr;
        txt += byteStr;
    }
    return txt;
}

// --- TEST FUNCTION FOR AUTHORIZATION ---
function testDriveAccess() {
    try {
        // Use Advanced Drive Service
        var folder = Drive.Files.get(FOLDER_ID);
        Logger.log("✅ SUCCESS! Folder name: " + folder.title);
        Logger.log("✅ Folder URL: https://drive.google.com/drive/folders/" + folder.id);
        Logger.log("✅ Drive access is working correctly!");
        return "Success! Check the logs.";
    } catch (e) {
        Logger.log("❌ ERROR: " + e.toString());
        Logger.log("This means Drive permissions are not properly authorized.");
        return "Error: " + e.toString();
    }
}
