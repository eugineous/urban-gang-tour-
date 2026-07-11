// Routine, opt-in owner notifications for new orders and new bookings - a
// SEPARATE concern from lib/server/alert.ts, which is reserved exclusively
// for critical-path failures (payment reconciliation, ledger writes,
// webhook signature bursts). Mixing routine "something happened" emails
// into that path would bury real alerts in noise, so this module is its
// own thing with its own settings keys and its own OFF-by-default toggles.
//
// notifyNewOrder / notifyNewBooking never throw - a failed notification
// must never break the request that raised it - and always log one
// `[notify]` line describing what happened (sent, skipped, or failed).
import { q, db } from './db';

const FALLBACK_EMAIL = 'euginemicah@gmail.com'; // same fallback lib/server/alert.ts uses
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function esc(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtKes(n: number): string {
  return 'KES ' + Number(n || 0).toLocaleString('en-US');
}

async function settingValue(key: string): Promise<unknown> {
  const rows = await q(`SELECT value FROM settings WHERE key=$1`, [key]);
  return rows[0]?.value;
}

// settings key 'notify_email' - falls back to the alert_email fallback
// address when unset or invalid, same convention as alertRecipient().
async function notifyRecipient(): Promise<string> {
  try {
    if (db()) {
      const v = await settingValue('notify_email');
      // settings.value is JSONB; a stored string arrives already parsed, but
      // strip stray quotes defensively (matches lib/server/alert.ts).
      const s = String(v ?? '').replace(/^"|"$/g, '').trim();
      if (EMAIL_RE.test(s)) return s;
    }
  } catch { /* fall through to fallback */ }
  return FALLBACK_EMAIL;
}

async function notifyEnabled(key: string): Promise<boolean> {
  try {
    if (!db()) return false;
    return (await settingValue(key)) === true;
  } catch {
    return false;
  }
}

async function sendNotify(subject: string, html: string, text: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  const to = await notifyRecipient();
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.BOOKINGS_FROM || 'alerts@urbangangtour.co.ke',
      to,
      subject: subject.slice(0, 200),
      html,
      text,
    }),
  });
  if (!res.ok) {
    console.error('[notify] resend', res.status, (await res.text().catch(() => '')).slice(0, 300));
    return false;
  }
  return true;
}

export type NewOrderRow = {
  id: string;
  total: number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
};

export async function notifyNewOrder(order: NewOrderRow): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_new_order'))) {
      console.log('[notify] new-order skipped (toggle off):', order.id);
      return;
    }
    const subject = `New order: ${fmtKes(order.total)}`;
    const text = `New order ${order.id}\nTotal: ${fmtKes(order.total)}\nStatus: ${order.status || 'pending'}\nCustomer: ${order.name || ''}\nPhone: ${order.phone || ''}\nEmail: ${order.email || ''}\n\nTime: ${new Date().toISOString()}\nSource: urbangangtour.co.ke`;
    const html = `
<div style="font-family:'Space Grotesk',Arial,sans-serif;max-width:480px;margin:0 auto;border:2px solid #111;border-radius:12px;overflow:hidden">
  <div style="background:#111;color:#FFD400;padding:14px 18px;font-weight:900;text-transform:uppercase;letter-spacing:.04em">Urban Gang Tour - New Order</div>
  <div style="padding:18px">
    <p style="margin:0 0 8px;font-size:15px"><b>${esc(order.id)}</b> &middot; ${esc(fmtKes(order.total))}</p>
    <table cellpadding="0" cellspacing="0" style="font-size:13px;color:#333">
      <tr><td style="padding:2px 8px 2px 0;color:#666">Status</td><td>${esc(order.status || 'pending')}</td></tr>
      <tr><td style="padding:2px 8px 2px 0;color:#666">Customer</td><td>${esc(order.name || '')}</td></tr>
      <tr><td style="padding:2px 8px 2px 0;color:#666">Phone</td><td>${esc(order.phone || '')}</td></tr>
      <tr><td style="padding:2px 8px 2px 0;color:#666">Email</td><td>${esc(order.email || '')}</td></tr>
    </table>
  </div>
</div>`;
    const ok = await sendNotify(subject, html, text);
    console.log('[notify]', ok ? 'new-order sent:' : 'new-order failed:', order.id);
  } catch (e) {
    console.error('[notify] new-order error', e);
  }
}

export type NewBookingRow = {
  id: string;
  name: string;
  org?: string | null;
  email?: string | null;
  phone?: string | null;
  type: string;
  message?: string | null;
};

export async function notifyNewBooking(booking: NewBookingRow): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_new_booking'))) {
      console.log('[notify] new-booking skipped (toggle off):', booking.id);
      return;
    }
    const subject = `New booking: ${booking.name}`;
    const text = `New booking ${booking.id}\nType: ${booking.type}\nName: ${booking.name}\nOrg: ${booking.org || ''}\nEmail: ${booking.email || ''}\nPhone: ${booking.phone || ''}\n\n${booking.message || ''}\n\nTime: ${new Date().toISOString()}\nSource: urbangangtour.co.ke`;
    const html = `
<div style="font-family:'Space Grotesk',Arial,sans-serif;max-width:480px;margin:0 auto;border:2px solid #111;border-radius:12px;overflow:hidden">
  <div style="background:#111;color:#FFD400;padding:14px 18px;font-weight:900;text-transform:uppercase;letter-spacing:.04em">Urban Gang Tour - New Booking</div>
  <div style="padding:18px">
    <p style="margin:0 0 8px;font-size:15px"><b>${esc(booking.name)}</b> &middot; ${esc(booking.type)}</p>
    <table cellpadding="0" cellspacing="0" style="font-size:13px;color:#333">
      <tr><td style="padding:2px 8px 2px 0;color:#666">Org</td><td>${esc(booking.org || '')}</td></tr>
      <tr><td style="padding:2px 8px 2px 0;color:#666">Email</td><td>${esc(booking.email || '')}</td></tr>
      <tr><td style="padding:2px 8px 2px 0;color:#666">Phone</td><td>${esc(booking.phone || '')}</td></tr>
    </table>
    ${booking.message ? `<p style="margin:12px 0 0;font-size:13px;color:#333;white-space:pre-wrap">${esc(booking.message).slice(0, 1000)}</p>` : ''}
  </div>
</div>`;
    const ok = await sendNotify(subject, html, text);
    console.log('[notify]', ok ? 'new-booking sent:' : 'new-booking failed:', booking.id);
  } catch (e) {
    console.error('[notify] new-booking error', e);
  }
}
