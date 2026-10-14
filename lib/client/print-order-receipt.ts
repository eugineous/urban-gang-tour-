type ReceiptOrder = {
  id: unknown; created_at: unknown; name?: unknown; email?: unknown;
  phone?: unknown; status?: unknown; mpesa_receipt?: unknown; total: unknown; items?: unknown;
};

/** Order data is text, never markup. Print in a separate document without scripts. */
export function printOrderReceipt(order: ReceiptOrder) {
  const popup = window.open('', '_blank');
  if (!popup) return;
  popup.opener = null;
  const doc = popup.document;
  doc.title = 'Receipt ' + String(order.id);
  doc.body.replaceChildren();
  doc.body.style.cssText = 'font-family:sans-serif;max-width:560px;margin:40px auto;padding:20px';
  function text(tag: string, value: unknown, parent: HTMLElement = doc.body) {
    const el = doc.createElement(tag);
    el.textContent = String(value ?? '');
    parent.append(el);
    return el;
  }
  text('h2', 'Urban Gang Tour — Receipt');
  for (const [label, value] of [
    ['Order', order.id], ['Date', new Date(String(order.created_at)).toLocaleString()],
    ['Customer', [order.name, order.email, order.phone].filter(Boolean).join(' · ')],
    ['Status', order.status], ['M-Pesa receipt', order.mpesa_receipt],
  ]) if (value) text('p', label + ': ' + String(value));
  let items: unknown = order.items;
  try { if (typeof items === 'string') items = JSON.parse(items); } catch { items = []; }
  const table = doc.createElement('table');
  table.style.cssText = 'border-collapse:collapse;width:100%';
  doc.body.append(table);
  const heading = text('tr', '', table);
  text('th', 'Item', heading); text('th', 'Qty', heading);
  for (const item of Array.isArray(items) ? items : []) {
    const row = text('tr', '', table);
    text('td', item?.id, row); text('td', item?.qty, row);
  }
  text('h3', 'Total: KES ' + Number(order.total).toLocaleString('en-KE'));
  text('p', 'admin@urbangangtour.co.ke · Nairobi, Kenya');
  popup.focus();
  popup.print();
}
