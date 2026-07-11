// Branded receipt email, sent via Resend REST (domain verified) once an order
// is marked paid. Called fire-and-forget from the three paid paths (M-Pesa
// callback, Paystack webhook, Stripe webhook) and ONLY when the order row has
// an email. Never throws - a failed receipt email must never break payment
// reconciliation.
import { orderLines } from './catalog';

const BIZ = {
  name: 'Urban Gang Tour',
  addr1: 'Chelezo Apartments, Kindaruma Road, Floor 15 Door 2',
  addr2: 'Kilimani, Nairobi',
  box: 'P.O. Box 6431 - 00622, Juja',
  phone: '+254 799 886247',
  email: 'admin@urbangangtour.co.ke',
  web: 'urbangangtour.co.ke',
};

const FROM = 'Urban Gang Tour <receipts@urbangangtour.co.ke>';
const SITE = 'https://urbangangtour.co.ke';

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtKes(n: number): string {
  return 'KES ' + Number(n || 0).toLocaleString('en-US');
}

export function maskPhone(p: string): string {
  const d = String(p || '').replace(/\D/g, '');
  if (d.length < 8) return '';
  return d.slice(0, 6) + '***' + d.slice(-2);
}

function eatDateTime(d: Date): string {
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' });
  return date + ', ' + time + ' EAT';
}

export type OrderRow = {
  id: string;
  items: any;
  total: number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  mpesa_receipt?: string | null;
  paystack_ref?: string | null;
  stripe_payment_intent?: string | null;
  pay_method?: string | null;
  created_at?: string | Date | null;
};

export async function sendReceiptEmail(order: OrderRow): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY) return;
    const to = String(order?.email || '').trim();
    if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return;

    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const lines = orderLines(items);
    const method = order.pay_method === 'card' ? 'Card' : 'M-Pesa';
    const receipt = String(order.mpesa_receipt || order.paystack_ref || order.stripe_payment_intent || '');
    const when = eatDateTime(new Date());
    const link = `${SITE}/receipt/${encodeURIComponent(order.id)}`;
    const phone = maskPhone(String(order.phone || ''));

    const rows = lines
      .map(
        (l) => `
        <tr>
          <td style="padding:9px 0;border-bottom:1px dashed #ccc;font-size:14px;color:#111">${esc(l.name)} &times; ${l.qty}</td>
          <td align="right" style="padding:9px 0;border-bottom:1px dashed #ccc;font-size:14px;font-weight:700;color:#111">${esc(fmtKes(l.total))}</td>
        </tr>`
      )
      .join('');

    const html = `
<div style="margin:0;padding:24px 12px;background:#f4f1ea;font-family:'Space Grotesk',Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:3px solid #111111;border-radius:18px;overflow:hidden">
    <div style="background:#111111;padding:22px 26px">
      <div style="font-family:Arial Black,Arial,sans-serif;font-weight:900;letter-spacing:.04em;font-size:13px;color:#FFD400;text-transform:uppercase">Urban Gang Tour</div>
      <div style="font-family:Arial Black,Arial,sans-serif;font-weight:900;font-size:24px;color:#ffffff;text-transform:uppercase;margin-top:4px">Official Receipt</div>
    </div>
    <div style="height:5px;background:#E6218C"></div>
    <div style="padding:24px 26px">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#555">
        <tr><td style="padding:3px 0">Receipt / Order No.</td><td align="right" style="padding:3px 0;font-weight:700;color:#111">${esc(order.id)}</td></tr>
        ${receipt ? `<tr><td style="padding:3px 0">Payment confirmation</td><td align="right" style="padding:3px 0;font-weight:700;color:#111">${esc(receipt)}</td></tr>` : ''}
        <tr><td style="padding:3px 0">Date</td><td align="right" style="padding:3px 0;color:#111">${esc(when)}</td></tr>
        <tr><td style="padding:3px 0">Payment method</td><td align="right" style="padding:3px 0;color:#111">${esc(method)}</td></tr>
        ${phone ? `<tr><td style="padding:3px 0">Phone</td><td align="right" style="padding:3px 0;color:#111">${esc(phone)}</td></tr>` : ''}
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px">${rows}</table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;background:#FFD400;border:2px solid #111111;border-radius:10px">
        <tr>
          <td style="padding:12px 14px;font-family:Arial Black,Arial,sans-serif;font-weight:900;font-size:14px;color:#111;text-transform:uppercase">Total</td>
          <td align="right" style="padding:12px 14px;font-family:Arial Black,Arial,sans-serif;font-weight:900;font-size:19px;color:#111">${esc(fmtKes(order.total))}</td>
        </tr>
      </table>
      <div style="text-align:center;margin-top:20px">
        <a href="${link}" style="display:inline-block;background:#E6218C;color:#ffffff;text-decoration:none;font-family:Arial Black,Arial,sans-serif;font-weight:900;font-size:14px;padding:13px 24px;border:2px solid #111111;border-radius:10px;text-transform:uppercase">View / print full receipt</a>
      </div>
    </div>
    <div style="border-top:2px dashed #cccccc;padding:16px 26px;font-size:11.5px;color:#666;line-height:1.7">
      <strong style="color:#111">${esc(BIZ.name)}</strong><br>
      ${esc(BIZ.addr1)}, ${esc(BIZ.addr2)}<br>
      ${esc(BIZ.box)} &middot; ${esc(BIZ.phone)}<br>
      ${esc(BIZ.email)} &middot; ${esc(BIZ.web)}
    </div>
    <div style="background:#111111;color:#FFD400;text-align:center;padding:12px;font-size:11px;letter-spacing:.06em;text-transform:uppercase">Thank you for supporting the culture</div>
  </div>
</div>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to,
        subject: `Your receipt ${order.id} - Urban Gang Tour`,
        html,
      }),
    });
    if (!res.ok) console.error('[receipt-email] resend', res.status, (await res.text()).slice(0, 300));
    else console.log('[receipt-email] sent', order.id);
  } catch (e) {
    console.error('[receipt-email]', e);
  }
}
