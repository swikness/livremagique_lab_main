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

// Root: so visiting the backend URL in a browser shows something instead of blank / "Cannot GET /"
app.get('/', (req, res) => {
  res.type('html').send(`
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Livre Magique Lab API</title></head>
<body style="font-family:system-ui;background:#0f172a;color:#e2e8f0;min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0;">
  <div style="text-align:center;padding:2rem;">
    <h1 style="color:#fbbf24;">Livre Magique Lab API</h1>
    <p>Backend is running. Use the app at your Vercel frontend URL.</p>
    <p style="color:#94a3b8;font-size:0.9rem;"><a href="/health" style="color:#38bdf8;">/health</a> · Sheet session &amp; webhook endpoints are available for the frontend.</p>
  </div>
</body></html>
  `);
});

// --- OAuth: one-time flow to get refresh token for Drive (personal account) ---
app.get('/auth/drive', (req, res) => {
