/**
 * Backend API: POST /createBook — receive row from GAS, run Gemini pipeline, build 32-page PDF, upload PDF to Drive folder, update sheet via webhook with PDF link.
 * Sheet-to-app: POST /sheet/prepare, GET /sheet/session/:id, POST /uploadPdf for app review flow.
 * OAuth: GET /auth/drive and /auth/drive/callback to get a refresh token for Drive uploads (personal account).
 */
import crypto from 'crypto';
import express from 'express';
import multer from 'multer';
import { google } from 'googleapis';
import { mapRowToUserInput, mapRamadanRowToUserInput } from './lib/mapRowToUserInput.js';
import { generateStoryPlan, generateSceneImage } from './lib/gemini.js';
import { uploadPdf, uploadImage } from './lib/drive.js';
import { buildPdf } from './lib/pdf.js';
import { callWebhook } from './lib/webhook.js';

const DRIVE_SCOPE = ['https://www.googleapis.com/auth/drive.file'];

// In-memory session store for sheet-to-app flow (sessionId -> { row, ..., createdAt })
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour
const sheetSessions = new Map();

function purgeExpiredSessions() {
  const now = Date.now();
  for (const [id, data] of sheetSessions.entries()) {
    if (now - data.createdAt > SESSION_TTL_MS) sheetSessions.delete(id);
  }
}

const app = express();
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json({ limit: '50mb' }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

// --- OAuth: one-time flow to get refresh token for Drive (personal account) ---
app.get('/auth/drive', (req, res) => {
  const baseUrl = process.env.BACKEND_PUBLIC_URL || (req.protocol + '://' + req.get('host'));
  const redirectUri = baseUrl.replace(/\/$/, '') + '/auth/drive/callback';
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(500).send('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in env. Add redirect URI in Google Console: ' + redirectUri);
  }
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const url = oauth2.generateAuthUrl({
    scope: DRIVE_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  });
  res.redirect(url);
});

app.get('/auth/drive/callback', async (req, res) => {
  const baseUrl = process.env.BACKEND_PUBLIC_URL || (req.protocol + '://' + req.get('host'));
  const redirectUri = baseUrl.replace(/\/$/, '') + '/auth/drive/callback';
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('Missing code');
  }
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  try {
    const { tokens } = await oauth2.getToken(code);
    const refreshToken = tokens.refresh_token;
    if (!refreshToken) {
      return res.status(400).send('No refresh_token. Revoke app access at myaccount.google.com/permissions and try again with prompt=consent.');
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
      <h1>Drive OAuth done</h1>
      <p>Add this to Railway (or your env) as <strong>DRIVE_REFRESH_TOKEN</strong>:</p>
      <textarea readonly style="width:100%;height:120px;font-family:monospace">${refreshToken}</textarea>
      <p>Then remove GOOGLE_SERVICE_ACCOUNT_JSON if you had it. Redeploy and run "Créer le livre" again.</p>
    `);
  } catch (e) {
    console.error('OAuth callback error:', e);
    res.status(500).send('Error: ' + e.message);
  }
});

// --- Sheet-to-app: prepare session (GAS opens app with sessionId) ---
app.post('/sheet/prepare', (req, res) => {
  const { row, outputFolderId, spreadsheetId, rowIndex, webhookUrl, webhookSecret } = req.body || {};
  if (!row || !outputFolderId || !spreadsheetId || rowIndex == null) {
    return res.status(400).json({
      error: 'Missing required fields: row, outputFolderId, spreadsheetId, rowIndex',
    });
  }
  if (!row.coverImageBase64) {
    return res.status(400).json({
      error: 'Missing coverImageBase64 (front cover from sheet column V).',
    });
  }
  const safeRowIndex = parseInt(rowIndex, 10);
  if (safeRowIndex < 2) {
    return res.status(400).json({ error: 'rowIndex must be >= 2' });
  }
  let userInput;
  let theme;
  try {
    const mapped = mapRowToUserInput(row);
    userInput = mapped.userInput;
    theme = mapped.theme;
  } catch (e) {
    return res.status(400).json({ error: 'Invalid row data: ' + e.message });
  }
  purgeExpiredSessions();
  const sessionId = crypto.randomUUID();
  const name1 = (row.partner1Name || 'Lui').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
  const name2 = (row.partner2Name || 'Elle').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
  const buyerName = (row.buyerName || `${name1}-${name2}`).replace(/[^a-zA-Z0-9\-_\s]/g, '').trim() || 'Livre';
  sheetSessions.set(sessionId, {
    row,
    outputFolderId,
    spreadsheetId,
    rowIndex: safeRowIndex,
    webhookUrl: webhookUrl || '',
    webhookSecret: webhookSecret || '',
    userInput,
    theme,
    coverBase64: row.coverImageBase64,
    buyerName,
    createdAt: Date.now(),
  });
  res.status(200).json({ sessionId });
});

// --- Sheet-to-app: prepare cover-only session (no existing cover required) ---
app.post('/sheet/prepareCover', (req, res) => {
  const { row, outputFolderId, spreadsheetId, rowIndex, webhookUrl, webhookSecret, type, sheetName } = req.body || {};
  if (!row || !outputFolderId || !spreadsheetId || rowIndex == null) {
    return res.status(400).json({
      error: 'Missing required fields: row, outputFolderId, spreadsheetId, rowIndex',
    });
  }
  const safeRowIndex = parseInt(rowIndex, 10);
  if (safeRowIndex < 2) {
    return res.status(400).json({ error: 'rowIndex must be >= 2' });
  }
  const isRamadan = type === 'ramadan';
  let userInput;
  let theme;
  if (isRamadan) {
    try {
      const mapped = mapRamadanRowToUserInput(row);
      userInput = mapped.userInput;
      theme = mapped.theme;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid Ramadan row data: ' + e.message });
    }
  } else {
    try {
      const mapped = mapRowToUserInput(row);
      userInput = mapped.userInput;
      theme = mapped.theme;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid row data: ' + e.message });
    }
  }
  purgeExpiredSessions();
  const sessionId = crypto.randomUUID();
  const effectiveSheetName = sheetName || (isRamadan ? 'kids_orders' : 'lovers_orders');
  const buyerName = (row.buyerName || (isRamadan ? String(row.prenoms || 'Enfant').split(/[,;]/)[0].trim() || 'Livre' : 'Livre'))
    .replace(/[^a-zA-Z0-9\-_\s]/g, '').trim() || 'Livre';
  const sessionPayload = {
    row,
    outputFolderId,
    spreadsheetId,
    rowIndex: safeRowIndex,
    webhookUrl: webhookUrl || '',
    webhookSecret: webhookSecret || '',
    userInput,
    theme,
    coverBase64: null,
    coverOnly: true,
    buyerName,
    sessionType: isRamadan ? 'ramadan' : 'lovers',
    sheetName: effectiveSheetName,
    createdAt: Date.now(),
  };
  sheetSessions.set(sessionId, sessionPayload);
  res.status(200).json({ sessionId });
});

// --- Sheet-to-app: fetch session (app loads with ?fromSheet=sessionId) ---
app.get('/sheet/session/:id', (req, res) => {
  purgeExpiredSessions();
  const data = sheetSessions.get(req.params.id);
  if (!data) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }
  const payload = {
    userInput: data.userInput,
    theme: data.theme,
    coverBase64: data.coverBase64,
    coverOnly: data.coverOnly || false,
    outputFolderId: data.outputFolderId,
    spreadsheetId: data.spreadsheetId,
    rowIndex: data.rowIndex,
    webhookUrl: data.webhookUrl,
    webhookSecret: data.webhookSecret,
    buyerName: data.buyerName,
    sessionType: data.sessionType || 'lovers',
    sheetName: data.sheetName || 'lovers_orders',
  };
  if (data.sessionType === 'ramadan' && data.row) {
    payload.row = data.row;
  }
  res.status(200).json(payload);
});

app.post('/createBook', async (req, res) => {
  const {
    spreadsheetId,
    rowIndex,
    outputFolderId,
    webhookUrl,
    webhookSecret,
    row,
  } = req.body || {};

  if (!row || !outputFolderId || !spreadsheetId || rowIndex == null) {
    return res.status(400).json({
      error: 'Missing required fields: row, outputFolderId, spreadsheetId, rowIndex',
    });
  }
  if (!row.coverImageBase64) {
    return res.status(400).json({
      error: 'Missing coverImageBase64 (front cover from sheet column V).',
    });
  }

  const safeRowIndex = parseInt(rowIndex, 10);
  if (safeRowIndex < 2) {
    return res.status(400).json({ error: 'rowIndex must be >= 2' });
  }

  try {
    await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'En cours', null);
  } catch (e) {
    console.warn('Webhook "En cours" failed:', e.message);
  }

  let userInput;
  let theme;
  try {
    const mapped = mapRowToUserInput(row);
    userInput = mapped.userInput;
    theme = mapped.theme;
    userInput.theme = theme;
  } catch (e) {
    console.error('mapRowToUserInput error:', e);
    await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'Erreur', null);
    return res.status(400).json({ error: 'Invalid row data: ' + e.message });
  }

  let plan;
  try {
    plan = await generateStoryPlan(userInput);
  } catch (e) {
    console.error('generateStoryPlan error:', e);
    await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'Erreur', null);
    return res.status(500).json({ error: 'Story plan failed: ' + e.message });
  }

  const coverBase64 = row.coverImageBase64;
  const style = userInput.style;
  // Two reference photos for better character consistency (same as app). Fallback to cover if only one ref.
  const mainCharacterPhoto = row.himPhotoBase64 || userInput.photoBase64 || coverBase64;
  const partnerPhoto = row.herPhotoBase64 || userInput.partnerPhotoBase64 || null;

  // Scene 0 = front cover from sheet (do not regenerate)
  plan.scenes[0].imageUrl = coverBase64;

  const name1 = (row.partner1Name || 'Lui').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
  const name2 = (row.partner2Name || 'Elle').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');

  // Scenes 1–15: generate (no verification)
  for (let i = 1; i <= 15; i++) {
    const scene = plan.scenes[i];
    try {
      scene.imageUrl = await generateSceneImage(scene, style, mainCharacterPhoto, partnerPhoto, null);
    } catch (e) {
      console.error(`generateSceneImage ${i} error:`, e);
      await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'Erreur', null);
      return res.status(500).json({ error: `Image ${i} failed: ` + e.message });
    }
    scene.aspectRatio = '16:9';
  }

  // Back cover (scene 16)
  const backScene = plan.scenes[16];
  const backLogoBase64 = row.logoBase64 || null;
  try {
    backScene.imageUrl = await generateSceneImage(backScene, style, mainCharacterPhoto, partnerPhoto, backLogoBase64);
  } catch (e) {
    console.error('generateSceneImage back cover error:', e);
    await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'Erreur', null);
    return res.status(500).json({ error: 'Back cover failed: ' + e.message });
  }

  // Build 32-page PDF and upload to Drive
  const buyerName = (row.buyerName || `${name1}-${name2}`).replace(/[^a-zA-Z0-9\-_\s]/g, '').trim() || 'Livre';
  const pdfFileName = `Livre-${name1}-${name2}.pdf`;
  const isRTL = userInput.language === 'Arabic';
  let pdfUrl;
  try {
    const pdfBuffer = await buildPdf(plan, buyerName, isRTL);
    pdfUrl = await uploadPdf(pdfBuffer, outputFolderId, pdfFileName);
  } catch (e) {
    console.error('buildPdf or uploadPdf error:', e);
    await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'Erreur', null);
    return res.status(500).json({ error: 'PDF build or upload failed: ' + e.message });
  }

  try {
    await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'Généré', pdfUrl);
  } catch (e) {
    console.warn('Webhook "Généré" failed:', e.message);
  }

  res.status(200).json({ success: true, pdfUrl });
});

// --- Sheet-to-app: app uploads built PDF, backend uploads to Drive and updates sheet ---
app.post('/uploadPdf', upload.single('file'), async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ error: 'Missing PDF file' });
  }
  const { folderId, spreadsheetId, rowIndex, webhookUrl, webhookSecret, buyerName, sheetName } = req.body || {};
  if (!folderId || !spreadsheetId || rowIndex == null) {
    return res.status(400).json({
      error: 'Missing required fields: folderId, spreadsheetId, rowIndex',
    });
  }
  const safeRowIndex = parseInt(rowIndex, 10);
  if (safeRowIndex < 2) {
    return res.status(400).json({ error: 'rowIndex must be >= 2' });
  }
  const fileName = (buyerName && typeof buyerName === 'string')
    ? `${String(buyerName).replace(/[^a-zA-Z0-9\-_\s]/g, '').trim() || 'Livre'}.pdf`
    : 'Livre-Magique.pdf';
  let pdfUrl;
  try {
    pdfUrl = await uploadPdf(req.file.buffer, folderId, fileName);
  } catch (e) {
    console.error('uploadPdf error:', e);
    return res.status(500).json({ error: 'Drive upload failed: ' + e.message });
  }
  try {
    await callWebhook(webhookUrl || '', webhookSecret || '', spreadsheetId, safeRowIndex, 'Généré', pdfUrl, null, sheetName);
  } catch (e) {
    console.warn('Webhook failed:', e.message);
  }
  res.status(200).json({ success: true, pdfUrl });
});

// --- Sheet-to-app: app uploads generated cover image, backend uploads to Drive and updates sheet col V ---
app.post('/uploadCover', upload.single('file'), async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ error: 'Missing cover image file' });
  }
  const { folderId, spreadsheetId, rowIndex, webhookUrl, webhookSecret, buyerName, sheetName } = req.body || {};
  if (!folderId || !spreadsheetId || rowIndex == null) {
    return res.status(400).json({
      error: 'Missing required fields: folderId, spreadsheetId, rowIndex',
    });
  }
  const safeRowIndex = parseInt(rowIndex, 10);
  if (safeRowIndex < 2) {
    return res.status(400).json({ error: 'rowIndex must be >= 2' });
  }
  const baseName = (buyerName && typeof buyerName === 'string')
    ? String(buyerName).replace(/[^a-zA-Z0-9\-_\s]/g, '').trim() || 'Couverture'
    : 'Couverture';
  const fileName = `${baseName}-cover.png`;
  const mimeType = req.file.mimetype || 'image/png';
  let coverUrl;
  try {
    coverUrl = await uploadImage(folderId, req.file.buffer, fileName, mimeType);
  } catch (e) {
    console.error('uploadImage (cover) error:', e);
    return res.status(500).json({ error: 'Drive upload failed: ' + e.message });
  }
  try {
    await callWebhook(webhookUrl || '', webhookSecret || '', spreadsheetId, safeRowIndex, null, null, coverUrl, sheetName);
  } catch (e) {
    console.warn('Webhook (cover) failed:', e.message);
  }
  res.status(200).json({ success: true, coverUrl });
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Livre Magique backend listening on port ${port}`);
});
