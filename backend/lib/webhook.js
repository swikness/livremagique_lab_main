/**
 * Call GAS webhook to update sheet row (Status livre + Lien PDF).
 */
export async function callWebhook(webhookUrl, webhookSecret, spreadsheetId, rowIndex, status, pdfUrl) {
  if (!webhookUrl || !spreadsheetId || !rowIndex) return;
  const url = new URL(webhookUrl);
  url.searchParams.set('action', 'updateRow');
  url.searchParams.set('token', webhookSecret || '');
  url.searchParams.set('spreadsheetId', spreadsheetId);
  url.searchParams.set('rowIndex', String(rowIndex));
  if (status) url.searchParams.set('status', status);
  if (pdfUrl) url.searchParams.set('pdfUrl', pdfUrl);

  const res = await fetch(url.toString(), { method: 'GET' });
  const text = await res.text();
  if (!res.ok) {
    console.error('Webhook failed:', res.status, text);
    return;
  }
  console.log('Webhook success:', text);
}
