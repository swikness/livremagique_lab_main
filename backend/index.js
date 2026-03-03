/**
 * Backend for Livre Magique: sheet session API (prepare / prepareCover / session) + health.
 * GAS calls POST /sheet/prepare or POST /sheet/prepareCover; app loads GET /sheet/session/:id.
 */
import express from 'express';
import multer from 'multer';
import { mapRowToUserInput, mapRamadanRowToUserInput } from './lib/mapRowToUserInput.js';
import { uploadPdf, uploadImage } from './lib/drive.js';
import { callWebhook } from './lib/webhook.js';

const app = express();

// CORS: allow frontend (Vercel, localhost) to call this backend
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '50mb' })); // row can contain base64 images

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const PORT = Number(process.env.PORT) || 8080;

// In-memory session store: sessionId -> session object (what GET /sheet/session/:id returns)
const sessions = new Map();

function generateSessionId() {
  return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 11);
}

// POST /sheet/prepare — "Ouvrir dans l'app" (review flow with existing cover)
app.post('/sheet/prepare', (req, res) => {
  try {
    const {
      spreadsheetId,
      sheetName,
      rowIndex,
      outputFolderId,
      webhookUrl,
      webhookSecret,
      row,
    } = req.body || {};

    if (!spreadsheetId || !rowIndex || row == null) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Missing spreadsheetId, rowIndex, or row',
      });
    }

    const { userInput, theme } = mapRowToUserInput(row);
    const coverBase64 = (row && row.coverImageBase64) ? String(row.coverImageBase64) : null;

    const session = {
      userInput,
      theme: theme || userInput.theme,
      coverBase64,
      coverOnly: false,
      outputFolderId: outputFolderId || '',
      spreadsheetId,
      rowIndex: Number(rowIndex),
      webhookUrl: webhookUrl || '',
      webhookSecret: webhookSecret || '',
      buyerName: (row && row.buyerName) ? String(row.buyerName) : 'Livre',
      sheetName: sheetName || 'lovers_orders',
      row,
    };

    const sessionId = generateSessionId();
    sessions.set(sessionId, session);

    return res.status(200).json({ sessionId });
  } catch (err) {
    console.error('POST /sheet/prepare error:', err);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: err.message || 'Application failed to respond',
    });
  }
});

// POST /sheet/prepareCover — "Générer la couverture" (lovers or kids/Ramadan)
app.post('/sheet/prepareCover', (req, res) => {
  try {
    const {
      spreadsheetId,
      sheetName,
      rowIndex,
      outputFolderId,
      webhookUrl,
      webhookSecret,
      type,
      coverColumn,
      row,
    } = req.body || {};

    if (!spreadsheetId || !rowIndex || row == null) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Missing spreadsheetId, rowIndex, or row',
      });
    }

    const isRamadan = type === 'ramadan' || (sheetName && String(sheetName).toLowerCase() === 'kids_orders');
    const { userInput, theme } = isRamadan
      ? mapRamadanRowToUserInput(row)
      : mapRowToUserInput(row);

    const coverBase64 = (row && row.coverImageBase64) ? String(row.coverImageBase64) : null;

    const session = {
      userInput,
      theme: theme || userInput.theme,
      coverBase64,
      coverOnly: true,
      outputFolderId: outputFolderId || '',
      spreadsheetId,
      rowIndex: Number(rowIndex),
      webhookUrl: webhookUrl || '',
      webhookSecret: webhookSecret || '',
      buyerName: (row && (row.buyerName != null)) ? String(row.buyerName) : 'Livre',
      sessionType: isRamadan ? 'ramadan' : undefined,
      sheetName: sheetName || (isRamadan ? 'kids_orders' : 'lovers_orders'),
      coverColumn: coverColumn != null ? Number(coverColumn) : undefined,
      row,
    };

    const sessionId = generateSessionId();
    sessions.set(sessionId, session);

    return res.status(200).json({ sessionId });
  } catch (err) {
    console.error('POST /sheet/prepareCover error:', err);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: err.message || 'Application failed to respond',
    });
  }
});

// GET /sheet/session/:id — app loads session when opening ?fromSheet=sessionId
app.get('/sheet/session/:id', (req, res) => {
  try {
    const sessionId = req.params.id;
    if (!sessionId) {
      return res.status(400).json({ status: 'error', message: 'Missing session id' });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ status: 'error', message: 'Session expired or not found' });
    }

    return res.status(200).json(session);
  } catch (err) {
    console.error('GET /sheet/session error:', err);
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Application failed to respond',
    });
  }
});

// POST /uploadCover — upload generated cover PNG to Drive and notify GAS webhook
app.post('/uploadCover', upload.single('file'), async (req, res) => {
  try {
    const { folderId, spreadsheetId, rowIndex, webhookUrl, webhookSecret, buyerName, sheetName, coverColumn } = req.body || {};
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!folderId) return res.status(400).json({ error: 'Missing folderId' });
    if (!spreadsheetId || !rowIndex) return res.status(400).json({ error: 'Missing spreadsheetId or rowIndex' });

    const fileName = `${buyerName || 'Couverture'}-cover.png`;
    const coverUrl = await uploadImage(folderId, req.file.buffer, fileName, req.file.mimetype || 'image/png');

    await callWebhook(
      webhookUrl,
      webhookSecret,
      spreadsheetId,
      Number(rowIndex),
      null,
      null,
      coverUrl,
      sheetName,
      coverColumn != null ? Number(coverColumn) : undefined
    );

    return res.status(200).json({ coverUrl });
  } catch (err) {
    console.error('POST /uploadCover error:', err);
    return res.status(500).json({ error: err.message || 'Upload cover failed' });
  }
});

// POST /uploadPdf — upload generated PDF to Drive and notify GAS webhook
app.post('/uploadPdf', upload.single('file'), async (req, res) => {
  try {
    const { folderId, spreadsheetId, rowIndex, webhookUrl, webhookSecret, buyerName, sheetName } = req.body || {};
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!folderId) return res.status(400).json({ error: 'Missing folderId' });
    if (!spreadsheetId || !rowIndex) return res.status(400).json({ error: 'Missing spreadsheetId or rowIndex' });

    const fileName = `${buyerName || 'Livre'}.pdf`;
    const pdfUrl = await uploadPdf(req.file.buffer, folderId, fileName);

    await callWebhook(
      webhookUrl,
      webhookSecret,
      spreadsheetId,
      Number(rowIndex),
      'PDF Prêt',
      pdfUrl,
      null,
      sheetName,
      undefined
    );

    return res.status(200).json({ pdfUrl });
  } catch (err) {
    console.error('POST /uploadPdf error:', err);
    return res.status(500).json({ error: err.message || 'Upload PDF failed' });
  }
});

// GET /health — for probes and debugging
app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Livre Magique backend listening on port', PORT);
});
