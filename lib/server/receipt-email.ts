// Branded receipt email, sent via Resend REST (domain verified) once an order
// is marked paid. Called fire-and-forget from the three paid paths (M-Pesa
// callback, Paystack webhook, Stripe webhook) and ONLY when the order row has
// an email. Never throws - a failed receipt email must never break payment
// reconciliation.
import { orderLines } from './catalog';
import { ticketsForOrder, type TicketRow } from './tickets';
import { getMarketplaceEventById } from './marketplace';
import { renderReceiptPdf, renderTicketPdf } from '@/lib/tickets/pdf';
import { getLogoDataUri } from '@/lib/ops/pdf';

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
  marketplace_event_id?: string | null;
};

export async function sendReceiptEmail(order: OrderRow): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY) return;
    const to = String(order?.email || '').trim();
    if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return;

    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const lines = orderLines(items);
    const isComp = order.pay_method === 'comp';
    const method = isComp ? 'Complimentary (no charge)' : order.pay_method === 'card' ? 'Card' : 'M-Pesa';
    const receipt = String(order.mpesa_receipt || order.paystack_ref || order.stripe_payment_intent || '');
    const when = eatDateTime(new Date());
    const link = `${SITE}/receipt/${encodeURIComponent(order.id)}`;
    const phone = maskPhone(String(order.phone || ''));

    // e-tickets: minted before this email fires on every paid path, so a paid
    // ticket order lists its per-ticket links here. Never blocks the receipt.
    let tickets: TicketRow[] = [];
    if (order.status === 'paid' || order.status === 'fulfilled') {
      try { tickets = await ticketsForOrder(order.id); } catch { /* receipt still goes out */ }
    }

    // Marketplace order: still on UGT letterhead (UGT processed the payment)
    // but clearly labelled as sold on behalf of the third-party organizer —
    // never let a buyer think UGT itself is running the show.
    let presentedBy: string | null = null;
    if (order.marketplace_event_id) {
      try {
        const ev = await getMarketplaceEventById(order.marketplace_event_id);
        presentedBy = ev?.organizer_business_name || null;
      } catch { /* receipt still goes out */ }
    }
    const presentedByHtml = presentedBy
      ? `<tr><td style="padding:3px 0">Presented by</td><td align="right" style="padding:3px 0;color:#111">${esc(presentedBy)} (via UGT Marketplace)</td></tr>`
      : '';
    const ticketsHtml = tickets.length
      ? `
      <div style="margin-top:20px;background:#111111;border:2px solid #111111;border-radius:14px;overflow:hidden">
        <div style="padding:14px 16px 4px;font-family:Arial Black,Arial,sans-serif;font-weight:900;font-size:14px;color:#FFD400;text-transform:uppercase;letter-spacing:.04em">Your E-Tickets</div>
        <div style="padding:2px 16px 6px;font-size:12px;color:#bbbbbb;line-height:1.6">One QR ticket per person - open each link, screenshot it, or forward it to whoever is coming with you. It gets scanned once at the gate.</div>
        ${tickets
          .map(
            (t) => `
        <div style="padding:10px 16px;border-top:1px dashed #444444">
          <a href="${SITE}/t/${encodeURIComponent(t.code)}" style="color:#21C7E6;text-decoration:none;font-weight:700;font-size:13px">Ticket ${t.position} of ${t.of_count} &middot; ${esc(t.tier_name)} &rarr;</a>
          <div style="font-family:Courier New,monospace;font-size:11px;letter-spacing:.08em;color:#999999;margin-top:2px">${esc(t.code)}</div>
        </div>`
          )
          .join('')}
        <div style="padding:14px 16px;border-top:1px dashed #444444;text-align:center">
          <a href="${SITE}/tickets/${encodeURIComponent(order.id)}" style="display:inline-block;background:#FFD400;color:#111111;text-decoration:none;font-family:Arial Black,Arial,sans-serif;font-weight:900;font-size:13px;padding:11px 20px;border-radius:10px;text-transform:uppercase">View your tickets</a>
        </div>
      </div>`
      : '';

    // Comp orders carry the REAL tier price on the item line (so the ticket
    // looks identical to a paid one at the gate) but the order total is 0 -
    // showing the real per-line price here would read as a fake nonzero
    // charge, so comp orders show FREE on every line instead.
    const rows = lines
      .map(
        (l) => `
        <tr>
          <td style="padding:9px 0;border-bottom:1px dashed #ccc;font-size:14px;color:#111">${esc(l.name)} &times; ${l.qty}</td>
          <td align="right" style="padding:9px 0;border-bottom:1px dashed #ccc;font-size:14px;font-weight:700;color:#111">${isComp ? 'FREE' : esc(fmtKes(l.total))}</td>
        </tr>`
      )
      .join('');

    const html = `
<div style="margin:0;padding:24px 12px;background:#f4f1ea;font-family:'Space Grotesk',Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:3px solid #111111;border-radius:18px;overflow:hidden">
    <div style="background:#111111;padding:22px 26px">
      <div style="font-family:Arial Black,Arial,sans-serif;font-weight:900;letter-spacing:.04em;font-size:13px;color:#FFD400;text-transform:uppercase">Urban Gang Tour</div>
      <div style="font-family:Arial Black,Arial,sans-serif;font-weight:900;font-size:24px;color:#ffffff;text-transform:uppercase;margin-top:4px">Official Receipt${isComp ? ' &middot; Complimentary' : ''}</div>
    </div>
    <div style="height:5px;background:#E6218C"></div>
    <div style="padding:24px 26px">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#555">
        <tr><td style="padding:3px 0">Receipt / Order No.</td><td align="right" style="padding:3px 0;font-weight:700;color:#111">${esc(order.id)}</td></tr>
        ${receipt ? `<tr><td style="padding:3px 0">Payment confirmation</td><td align="right" style="padding:3px 0;font-weight:700;color:#111">${esc(receipt)}</td></tr>` : ''}
        <tr><td style="padding:3px 0">Date</td><td align="right" style="padding:3px 0;color:#111">${esc(when)}</td></tr>
        <tr><td style="padding:3px 0">Payment method</td><td align="right" style="padding:3px 0;color:#111">${esc(method)}</td></tr>
        ${phone ? `<tr><td style="padding:3px 0">Phone</td><td align="right" style="padding:3px 0;color:#111">${esc(phone)}</td></tr>` : ''}
        ${presentedByHtml}
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px">${rows}</table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;background:#FFD400;border:2px solid #111111;border-radius:10px">
        <tr>
          <td style="padding:12px 14px;font-family:Arial Black,Arial,sans-serif;font-weight:900;font-size:14px;color:#111;text-transform:uppercase">${isComp ? 'Complimentary' : 'Total'}</td>
          <td align="right" style="padding:12px 14px;font-family:Arial Black,Arial,sans-serif;font-weight:900;font-size:19px;color:#111">${isComp ? 'KES 0' : esc(fmtKes(order.total))}</td>
        </tr>
      </table>
      ${isComp ? '<div style="margin-top:8px;font-size:11.5px;color:#8a6d1a">Issued free of charge by Urban Gang Tour admin. This is not a paid transaction - KES 0 due.</div>' : ''}
      ${ticketsHtml}
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

    // Attach real PDF copies (receipt always; a PDF per ticket when the
    // order has ticket lines) rather than only linking to the web pages -
    // additive to the HTML body above, which keeps working even if an email
    // client strips attachments. A PDF build failure must never block the
    // receipt email itself.
    const attachments: { filename: string; content: string }[] = [];
    try {
      const logo = await getLogoDataUri();
      const receiptBuf = await renderReceiptPdf(
        order,
        logo,
        phone,
        tickets.map((t) => ({ code: t.code, position: t.position, ofCount: t.of_count, tierName: t.tier_name }))
      );
      attachments.push({ filename: `UGT-Receipt-${order.id}.pdf`, content: receiptBuf.toString('base64') });
      for (const t of tickets) {
        const tBuf = await renderTicketPdf({
          code: t.code, eventId: t.event_id, tierName: t.tier_name, holder: t.holder,
          position: t.position, ofCount: t.of_count, createdAt: t.created_at, orderId: t.order_id,
          payMethod: order.pay_method || '', marketplaceEventId: t.marketplace_event_id, logo,
        });
        attachments.push({ filename: `UGT-Ticket-${t.code}.pdf`, content: tBuf.toString('base64') });
      }
    } catch (e) {
      console.error('[receipt-email-pdf]', e);
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to,
        subject: `Your receipt ${order.id} - Urban Gang Tour`,
        html,
        ...(attachments.length ? { attachments } : {}),
      }),
    });
    if (!res.ok) console.error('[receipt-email] resend', res.status, (await res.text()).slice(0, 300));
    else console.log('[receipt-email] sent', order.id);
  } catch (e) {
    console.error('[receipt-email]', e);
  }
}
