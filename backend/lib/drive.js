/**
 * Upload PDF buffer to Google Drive folder. Uses service account (GOOGLE_APPLICATION_CREDENTIALS or DRIVE_SERVICE_ACCOUNT_JSON).
 */
import { google } from 'googleapis';
import { readFileSync } from 'fs';
import path from 'path';
import { Readable } from 'stream';

function getAuth() {
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const jsonPath = process.env.DRIVE_SERVICE_ACCOUNT_JSON;
  const jsonString = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  let key;
  if (jsonString && jsonString.trim()) {
    key = JSON.parse(jsonString.trim());
  } else if (jsonPath) {
    key = JSON.parse(readFileSync(path.resolve(process.cwd(), jsonPath), 'utf8'));
  } else if (credsPath) {
    key = JSON.parse(readFileSync(path.resolve(credsPath), 'utf8'));
  } else {
    throw new Error('Set GOOGLE_SERVICE_ACCOUNT_JSON (JSON string), GOOGLE_APPLICATION_CREDENTIALS, or DRIVE_SERVICE_ACCOUNT_JSON for Drive upload');
  }
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  return auth;
}

/**
 * @param {Buffer} pdfBuffer
 * @param {string} folderId - Drive folder ID
 * @param {string} fileName - e.g. "Livre-Magique-John-Doe.pdf"
 * @returns {Promise<string>} view URL of the uploaded file
 */
export async function uploadPdf(pdfBuffer, folderId, fileName) {
  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });

  // supportsAllDrives: true so uploads work when folder is in a Shared Drive (service accounts have no personal quota)
  const res = await drive.files.create({
    requestBody: {
      name: fileName || 'Livre-Magique.pdf',
      parents: [folderId],
    },
    media: {
      mimeType: 'application/pdf',
      body: Readable.from(pdfBuffer),
    },
    supportsAllDrives: true,
  });

  const fileId = res.data.id;
  if (!fileId) throw new Error('Drive upload did not return file id');

  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
    supportsAllDrives: true,
  });

  return `https://drive.google.com/file/d/${fileId}/view`;
}
