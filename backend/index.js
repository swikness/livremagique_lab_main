/**
 * Backend API: POST /createBook — receive row from GAS, run Gemini pipeline, build PDF, upload to Drive, update sheet via webhook.
 */
import express from 'express';
import { mapRowToUserInput } from './lib/mapRowToUserInput.js';
import { generateStoryPlan, generateSceneImage } from './lib/gemini.js';
import { buildPdf } from './lib/pdf.js';
import { uploadPdf } from './lib/drive.js';
import { callWebhook } from './lib/webhook.js';

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
  const isRTL = (userInput.language || '').toLowerCase() === 'arabic';

  // Scene 0 = front cover from sheet (do not regenerate)
  plan.scenes[0].imageUrl = coverBase64;

  // Scenes 1-16: generate with cover as sole character reference
  for (let i = 1; i < plan.scenes.length; i++) {
    try {
      const scene = plan.scenes[i];
      const imageUrl = await generateSceneImage(
        scene,
        style,
        coverBase64,
        null,
        null
      );
      scene.imageUrl = imageUrl;
      if (i >= 1 && i <= 15) {
        scene.aspectRatio = '16:9';
      }
    } catch (e) {
      console.error(`generateSceneImage ${i} error:`, e);
      await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'Erreur', null);
      return res.status(500).json({ error: `Image ${i} failed: ` + e.message });
    }
  }

  let pdfBuffer;
  try {
    pdfBuffer = await buildPdf(plan, row.buyerName || 'Livre', isRTL);
  } catch (e) {
    console.error('buildPdf error:', e);
    await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'Erreur', null);
    return res.status(500).json({ error: 'PDF build failed: ' + e.message });
  }

  let pdfUrl;
  try {
    const fileName = `${(row.buyerName || 'Livre').replace(/\s+/g, '-')}-Magical-Book-32Pages.pdf`;
    pdfUrl = await uploadPdf(pdfBuffer, outputFolderId, fileName);
  } catch (e) {
    console.error('uploadPdf error:', e);
    await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'Erreur', null);
    return res.status(500).json({ error: 'Drive upload failed: ' + e.message });
  }

  try {
    await callWebhook(webhookUrl, webhookSecret, spreadsheetId, safeRowIndex, 'Généré', pdfUrl);
  } catch (e) {
    console.warn('Webhook "Généré" failed:', e.message);
  }

  res.status(200).json({ success: true, pdfUrl });
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Livre Magique backend listening on port ${port}`);
});
