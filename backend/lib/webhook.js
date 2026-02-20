/**
 * Call GAS webhook to update sheet row (Status livre + Lien PDF + optional Couverture link).
 * @param {string} [sheetName] - e.g. 'kids_orders' for Ramadan; default 'lovers_orders'
 * @param {number} [coverColumn] - e.g. 15, 16, 17 for kids_orders Couverture 1/2/3
 */
export async function callWebhook(webhookUrl, webhookSecret, spreadsheetId, rowIndex, status, pdfUrl, coverUrl, sheetName, coverColumn) {
  if (!webhookUrl || !spreadsheetId || !rowIndex) return;
  const url = new URL(webhookUrl);
  url.searchParams.set('action', 'updateRow');
  url.searchParams.set('token', webhookSecret || '');
  url.searchParams.set('spreadsheetId', spreadsheetId);
  url.searchParams.set('rowIndex', String(rowIndex));
  if (sheetName) url.searchParams.set('sheetName', sheetName);
  if (coverColumn != null) url.searchParams.set('coverColumn', String(coverColumn));
  if (status) url.searchParams.set('status', status);
  if (pdfUrl) url.searchParams.set('pdfUrl', pdfUrl);
  if (coverUrl) url.searchParams.set('coverUrl', coverUrl);

  const res = await fetch(url.toString(), { method: 'GET' });
  const text = await res.text();
  if (!res.ok) {
    console.error('Webhook failed:', res.status, text);
    return;
  }
  console.log('Webhook success:', text);
}
