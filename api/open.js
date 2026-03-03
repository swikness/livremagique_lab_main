/**
 * GET /api/open?sheet=kids_orders&row=2
 * Fetches the GAS URL with format=json to get redirectUrl, then redirects the browser.
 * Use this in the sheet formula so the link opens on Vercel and the user is redirected to the app (no raw HTML from GAS).
 */
const GAS_EXEC_URL = process.env.GAS_EXEC_URL || '';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const sheet = req.query.sheet || 'kids_orders';
  const row = req.query.row;
  const rowIndex = parseInt(row, 10);
  if (!row || !rowIndex || rowIndex < 2) {
    return res.status(400).json({ error: 'Missing or invalid row. Use ?sheet=kids_orders&row=2' });
  }
  if (!GAS_EXEC_URL || !GAS_EXEC_URL.includes('/exec')) {
    return res.status(500).json({ error: 'GAS_EXEC_URL not configured. Set it in Vercel env vars.' });
  }
  const baseUrl = GAS_EXEC_URL.replace(/\/$/, '').split('?')[0];
  const gasUrl = `${baseUrl}?action=openApp&sheetName=${encodeURIComponent(sheet)}&rowIndex=${rowIndex}&format=json`;
  try {
    const r = await fetch(gasUrl, { redirect: 'follow' });
    const text = await r.text();
    if (!r.ok) {
      return res.status(502).send(`Script error (${r.status}): ${text.slice(0, 200) || r.status}`);
    }
    if (!text || text.trim().startsWith('<')) {
      return res.status(502).send(
        'Script returned HTML instead of JSON. Check: 1) GAS_EXEC_URL is the full exec URL (ends with /exec). 2) In Apps Script, doGet reads the "format" parameter and returns JSON when format=json. 3) Redeploy the script after changes.'
      );
    }
    const data = JSON.parse(text);
    const redirectUrl = data && data.redirectUrl;
    if (!redirectUrl || typeof redirectUrl !== 'string') {
      return res.status(502).send('Script did not return redirectUrl');
    }
    return res.redirect(302, redirectUrl);
  } catch (e) {
    return res.status(502).send(`Error: ${e.message || 'Failed to fetch script'}`);
  }
}
