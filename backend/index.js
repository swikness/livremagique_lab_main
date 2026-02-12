/**
 * Backend API: POST /createBook — receive row from GAS, run Gemini pipeline, create Drive folder, upload cover then scene images (cropped left/right) one by one, update sheet via webhook.
 * OAuth: GET /auth/drive and /auth/drive/callback to get a refresh token for Drive uploads (personal account).
 */
import express from 'express';
import sharp from 'sharp';
import { google } from 'googleapis';
import { mapRowToUserInput } from './lib/mapRowToUserInput.js';
import { generateStoryPlan, generateSceneImage, verifySceneImage } from './lib/gemini.js';
import { createFolder, uploadImage } from './lib/drive.js';
import { callWebhook } from './lib/webhook.js';

const DRIVE_SCOPE = ['https://www.googleapis.com/auth/drive.file'];
const SCENE_VERIFY_MAX_RETRIES = 3;

function base64ToBuffer(dataUrl) {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  return Buffer.from(base64, 'base64');
}

function getMimeFromDataUrl(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:')) return 'image/png';
  const match = dataUrl.match(/^data:([^;]+);/);
  return (match && match[1]) || 'image/png';
}

/** Center-crop buffer to square (min(width,height) x min(width,height)). */
async function cropToSquare(buf) {
  const meta = await sharp(buf).metadata();
  const w = meta.width || 1;
  const h = meta.height || 1;
  if (w === h) return buf;
  const size = Math.min(w, h);
  const left = Math.floor((w - size) / 2);
  const top = Math.floor((h - size) / 2);
  return sharp(buf).extract({ left, top, width: size, height: size }).png().toBuffer();
}

const app = express();
app.use(express.json({ limit: '50mb' }));

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

  // Scene 0 = front cover from sheet (do not regenerate)
  plan.scenes[0].imageUrl = coverBase64;

  // Create folder: couple names (e.g. "Jean-Marie-Sophie" or "Livre-1234567890")
  const name1 = (row.partner1Name || 'Lui').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
  const name2 = (row.partner2Name || 'Elle').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
  const folderName = `${name1}-${name2}-${Date.now()}`;
  let bookFolderId;
  try {
    bookFolderId = await createFolder(outputFolderId, folderName);
  } catch (e) {
    console.error('createFolder error:', e);
    await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'Erreur', null);
    return res.status(500).json({ error: 'Drive folder create failed: ' + e.message });
  }
  const folderUrl = `https://drive.google.com/drive/folders/${bookFolderId}`;

  // 1. Upload cover (page 01) — crop to square before upload
  try {
    let coverBuf = base64ToBuffer(coverBase64);
    coverBuf = await cropToSquare(coverBuf);
    await uploadImage(bookFolderId, coverBuf, 'page-01.png', 'image/png');
  } catch (e) {
    console.error('Upload cover error:', e);
    await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'Erreur', null);
    return res.status(500).json({ error: 'Cover upload failed: ' + e.message });
  }

  // 2. Scenes 1–15: generate (up to 3 retries with verify), crop left/right, crop each to square, upload (pages 02–31)
  for (let i = 1; i <= 15; i++) {
    const scene = plan.scenes[i];
    let imageUrl = null;
    for (let attempt = 1; attempt <= SCENE_VERIFY_MAX_RETRIES; attempt++) {
      try {
        imageUrl = await generateSceneImage(scene, style, coverBase64, null, null);
        const ok = await verifySceneImage(imageUrl, coverBase64);
        if (ok) break;
        console.warn(`Scene ${i} verify failed (attempt ${attempt}/${SCENE_VERIFY_MAX_RETRIES}), retrying...`);
      } catch (e) {
        console.error(`generateSceneImage ${i} attempt ${attempt} error:`, e);
        if (attempt === SCENE_VERIFY_MAX_RETRIES) {
          await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'Erreur', null);
          return res.status(500).json({ error: `Image ${i} failed: ` + e.message });
        }
      }
    }
    if (!imageUrl) {
      await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'Erreur', null);
      return res.status(500).json({ error: `Image ${i} failed after ${SCENE_VERIFY_MAX_RETRIES} attempts` });
    }
    scene.imageUrl = imageUrl;
    scene.aspectRatio = '16:9';

    const sceneBuf = base64ToBuffer(scene.imageUrl);
    const { width, height } = await sharp(sceneBuf).metadata();
    const w = width || 1024;
    const h = height || 576;
    const halfW = Math.floor(w / 2);

    let leftBuf;
    let rightBuf;
    try {
      leftBuf = await sharp(sceneBuf).extract({ left: 0, top: 0, width: halfW, height: h }).png().toBuffer();
      rightBuf = await sharp(sceneBuf).extract({ left: halfW, top: 0, width: w - halfW, height: h }).png().toBuffer();
      leftBuf = await cropToSquare(leftBuf);
      rightBuf = await cropToSquare(rightBuf);
    } catch (e) {
      console.error(`Crop scene ${i} error:`, e);
      await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'Erreur', null);
      return res.status(500).json({ error: `Crop scene ${i} failed: ` + e.message });
    }

    const pageLeft = String(2 + (i - 1) * 2).padStart(2, '0');
    const pageRight = String(2 + (i - 1) * 2 + 1).padStart(2, '0');
    try {
      await uploadImage(bookFolderId, leftBuf, `page-${pageLeft}.png`, 'image/png');
      await uploadImage(bookFolderId, rightBuf, `page-${pageRight}.png`, 'image/png');
    } catch (e) {
      console.error(`Upload scene ${i} pages error:`, e);
      await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'Erreur', null);
      return res.status(500).json({ error: `Upload scene ${i} failed: ` + e.message });
    }
  }

  // 3. Generate and upload back cover (scene 16 → page 32) — up to 3 retries with verify, crop to square, optional logo
  const backScene = plan.scenes[16];
  const backLogoBase64 = row.logoBase64 || null;
  let backUrl = null;
  for (let attempt = 1; attempt <= SCENE_VERIFY_MAX_RETRIES; attempt++) {
    try {
      backUrl = await generateSceneImage(backScene, style, coverBase64, null, backLogoBase64);
      const ok = await verifySceneImage(backUrl, coverBase64);
      if (ok) break;
      console.warn(`Back cover verify failed (attempt ${attempt}/${SCENE_VERIFY_MAX_RETRIES}), retrying...`);
    } catch (e) {
      console.error('generateSceneImage back cover attempt', attempt, 'error:', e);
      if (attempt === SCENE_VERIFY_MAX_RETRIES) {
        await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'Erreur', null);
        return res.status(500).json({ error: 'Back cover failed: ' + e.message });
      }
    }
  }
  if (!backUrl) {
    await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'Erreur', null);
    return res.status(500).json({ error: 'Back cover failed after ' + SCENE_VERIFY_MAX_RETRIES + ' attempts' });
  }
  backScene.imageUrl = backUrl;
  try {
    let backBuf = base64ToBuffer(backScene.imageUrl);
    backBuf = await cropToSquare(backBuf);
    await uploadImage(bookFolderId, backBuf, 'page-32.png', 'image/png');
  } catch (e) {
    console.error('Upload back cover error:', e);
    await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'Erreur', null);
    return res.status(500).json({ error: 'Back cover upload failed: ' + e.message });
  }

  try {
    await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'Généré', folderUrl);
  } catch (e) {
    console.warn('Webhook "Généré" failed:', e.message);
  }

  res.status(200).json({ success: true, folderUrl });
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Livre Magique backend listening on port ${port}`);
});
