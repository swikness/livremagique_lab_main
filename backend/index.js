/**
 * Backend API: POST /createBook — receive row from GAS, run Gemini pipeline, create Drive folder, upload cover then scene images (cropped left/right) one by one, update sheet via webhook.
 */
import express from 'express';
import sharp from 'sharp';
import { mapRowToUserInput } from './lib/mapRowToUserInput.js';
import { generateStoryPlan, generateSceneImage } from './lib/gemini.js';
import { createFolder, uploadImage } from './lib/drive.js';
import { callWebhook } from './lib/webhook.js';

function base64ToBuffer(dataUrl) {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  return Buffer.from(base64, 'base64');
}

function getMimeFromDataUrl(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:')) return 'image/png';
  const match = dataUrl.match(/^data:([^;]+);/);
  return (match && match[1]) || 'image/png';
}

const app = express();
app.use(express.json({ limit: '50mb' }));

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

  // 1. Upload cover (page 01)
  try {
    const coverBuf = base64ToBuffer(coverBase64);
    const coverMime = getMimeFromDataUrl(coverBase64);
    await uploadImage(bookFolderId, coverBuf, 'page-01.png', coverMime);
  } catch (e) {
    console.error('Upload cover error:', e);
    await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'Erreur', null);
    return res.status(500).json({ error: 'Cover upload failed: ' + e.message });
  }

  // 2. Scenes 1–15: generate, crop left/right, upload two images each (pages 02–31)
  for (let i = 1; i <= 15; i++) {
    const scene = plan.scenes[i];
    try {
      const imageUrl = await generateSceneImage(scene, style, coverBase64, null, null);
      scene.imageUrl = imageUrl;
      scene.aspectRatio = '16:9';
    } catch (e) {
      console.error(`generateSceneImage ${i} error:`, e);
      await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'Erreur', null);
      return res.status(500).json({ error: `Image ${i} failed: ` + e.message });
    }

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

  // 3. Generate and upload back cover (scene 16 → page 32)
  const backScene = plan.scenes[16];
  try {
    const backUrl = await generateSceneImage(backScene, style, coverBase64, null, null);
    backScene.imageUrl = backUrl;
  } catch (e) {
    console.error('generateSceneImage back cover error:', e);
    await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'Erreur', null);
    return res.status(500).json({ error: 'Back cover failed: ' + e.message });
  }
  try {
    const backBuf = base64ToBuffer(backScene.imageUrl);
    const backMime = getMimeFromDataUrl(backScene.imageUrl);
    await uploadImage(bookFolderId, backBuf, 'page-32.png', backMime);
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
