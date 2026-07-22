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

// Shared card renderer for every notification below - the two originals
// above (new order/booking) predate this and keep their own inline markup;
// no need to churn working code just to dedupe it.
function card(title: string, rows: [string, string][], extra?: string): string {
  return `
<div style="font-family:'Space Grotesk',Arial,sans-serif;max-width:480px;margin:0 auto;border:2px solid #111;border-radius:12px;overflow:hidden">
  <div style="background:#111;color:#FFD400;padding:14px 18px;font-weight:900;text-transform:uppercase;letter-spacing:.04em">Urban Gang Tour &middot; ${esc(title)}</div>
  <div style="padding:18px">
    <table cellpadding="0" cellspacing="0" style="font-size:13px;color:#333;width:100%">
      ${rows.map(([k, v]) => `<tr><td style="padding:2px 10px 2px 0;color:#666;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="word-break:break-word">${esc(v)}</td></tr>`).join('')}
    </table>
    ${extra ? `<div style="margin-top:12px;font-size:13px;color:#333;white-space:pre-wrap">${extra}</div>` : ''}
  </div>
</div>`;
}

function textLines(title: string, rows: [string, string][], extra?: string): string {
  return `${title}\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}${extra ? `\n\n${extra}` : ''}\n\nTime: ${new Date().toISOString()}\nSource: urbangangtour.co.ke`;
}

export type NewSignupRow = { id: string | number; email?: string | null; phone?: string | null; name?: string | null };

export async function notifyNewSignup(user: NewSignupRow): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_new_signup'))) {
      console.log('[notify] new-signup skipped (toggle off):', user.id);
      return;
    }
    const rows: [string, string][] = [['Name', user.name || ''], ['Email', user.email || ''], ['Phone', user.phone || '']];
    const ok = await sendNotify(
      `New account: ${user.name || user.email || user.phone || user.id}`,
      card('New Account', rows),
      textLines('New account created', rows)
    );
    console.log('[notify]', ok ? 'new-signup sent:' : 'new-signup failed:', user.id);
  } catch (e) {
    console.error('[notify] new-signup error', e);
  }
}

export type AdminLoginEvent = { email: string; method: 'google' | 'access_code'; scope: string; ip?: string };

export async function notifyAdminLogin(ev: AdminLoginEvent): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_admin_login'))) {
      console.log('[notify] admin-login skipped (toggle off):', ev.email || ev.method);
      return;
    }
    const rows: [string, string][] = [['Method', ev.method], ['Email', ev.email || '(access code)'], ['Scope', ev.scope], ['IP', ev.ip || '']];
    const ok = await sendNotify(
      `Control Room sign-in: ${ev.email || 'access code'}`,
      card('Control Room Sign-In', rows),
      textLines('Control Room sign-in', rows)
    );
    console.log('[notify]', ok ? 'admin-login sent:' : 'admin-login failed:', ev.email || ev.method);
  } catch (e) {
    console.error('[notify] admin-login error', e);
  }
}

export type FailedAdminLoginEvent = { method: 'google' | 'access_code'; reason: string; ip?: string; email?: string };

export async function notifyFailedAdminLogin(ev: FailedAdminLoginEvent): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_failed_admin_login'))) {
      console.log('[notify] failed-admin-login skipped (toggle off):', ev.reason);
      return;
    }
    const rows: [string, string][] = [['Method', ev.method], ['Reason', ev.reason], ['Email tried', ev.email || ''], ['IP', ev.ip || '']];
    const ok = await sendNotify(
      `Failed Control Room sign-in attempt (${ev.method})`,
      card('Failed Sign-In Attempt', rows),
      textLines('Failed Control Room sign-in attempt', rows)
    );
    console.log('[notify]', ok ? 'failed-admin-login sent:' : 'failed-admin-login failed:', ev.reason);
  } catch (e) {
    console.error('[notify] failed-admin-login error', e);
  }
}

export type PostPublishedRow = { slug: string; headline: string; section?: string };

export async function notifyPostPublished(post: PostPublishedRow): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_post_published'))) {
      console.log('[notify] post-published skipped (toggle off):', post.slug);
      return;
    }
    const rows: [string, string][] = [['Headline', post.headline], ['Section', post.section || ''], ['URL', `https://urbangangtour.co.ke/blog/${post.slug}`]];
    const ok = await sendNotify(
      `Post published: ${post.headline}`,
      card('Blog Post Published', rows),
      textLines('Blog post published', rows)
    );
    console.log('[notify]', ok ? 'post-published sent:' : 'post-published failed:', post.slug);
  } catch (e) {
    console.error('[notify] post-published error', e);
  }
}

export async function notifyNewSubscriber(email: string): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_new_subscriber'))) {
      console.log('[notify] new-subscriber skipped (toggle off):', email);
      return;
    }
    const rows: [string, string][] = [['Email', email]];
    const ok = await sendNotify(
      `New newsletter subscriber: ${email}`,
      card('New Newsletter Subscriber', rows),
      textLines('New newsletter subscriber', rows)
    );
    console.log('[notify]', ok ? 'new-subscriber sent:' : 'new-subscriber failed:', email);
  } catch (e) {
    console.error('[notify] new-subscriber error', e);
  }
}

export type NewReviewRow = { product: string; author: string; rating: number; body: string };

export async function notifyNewReview(rev: NewReviewRow): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_new_review'))) {
      console.log('[notify] new-review skipped (toggle off):', rev.product);
      return;
    }
    const rows: [string, string][] = [
      ['Product', rev.product],
      ['Author', rev.author],
      ['Rating', `${rev.rating}/5`],
      ['Status', 'Pending — approve in Control Room to publish'],
    ];
    const ok = await sendNotify(
      `New product review (${rev.rating}/5): ${rev.product}`,
      card('New Product Review', rows, esc(rev.body).slice(0, 1000)),
      textLines('New product review', rows, rev.body)
    );
    console.log('[notify]', ok ? 'new-review sent:' : 'new-review failed:', rev.product);
  } catch (e) {
    console.error('[notify] new-review error', e);
  }
}

export type NewOrganizerRow = { businessName: string; contactName?: string | null; email: string; phone?: string | null };

export async function notifyNewOrganizer(org: NewOrganizerRow): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_new_organizer'))) {
      console.log('[notify] new-organizer skipped (toggle off):', org.email);
      return;
    }
    const rows: [string, string][] = [
      ['Business', org.businessName],
      ['Contact', org.contactName || ''],
      ['Email', org.email],
      ['Phone', org.phone || ''],
      ['Status', 'Pending — approve in Control Room before they can sell'],
    ];
    const ok = await sendNotify(
      `New marketplace organizer application: ${org.businessName}`,
      card('New Marketplace Organizer', rows),
      textLines('New marketplace organizer application', rows)
    );
    console.log('[notify]', ok ? 'new-organizer sent:' : 'new-organizer failed:', org.email);
  } catch (e) {
    console.error('[notify] new-organizer error', e);
  }
}

export type NewSubmissionRow = { name: string; school?: string | null; title: string; pitch?: string | null };

export async function notifyNewSubmission(sub: NewSubmissionRow): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_new_submission'))) {
      console.log('[notify] new-submission skipped (toggle off):', sub.title);
      return;
    }
    const rows: [string, string][] = [['Name', sub.name], ['School', sub.school || ''], ['Title', sub.title]];
    const ok = await sendNotify(
      `New story pitch: ${sub.title}`,
      card('New Story Pitch (Newsroom)', rows, sub.pitch ? esc(sub.pitch).slice(0, 1000) : undefined),
      textLines('New story pitch', rows, sub.pitch || '')
    );
    console.log('[notify]', ok ? 'new-submission sent:' : 'new-submission failed:', sub.title);
  } catch (e) {
    console.error('[notify] new-submission error', e);
  }
}

export type PaymentEvent = { gateway: 'mpesa' | 'paystack' | 'stripe'; orderId: string; amount?: number; reason?: string };

export async function notifyPaymentSuccess(ev: PaymentEvent): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_payment_success'))) {
      console.log('[notify] payment-success skipped (toggle off):', ev.orderId);
      return;
    }
    const rows: [string, string][] = [['Gateway', ev.gateway], ['Order', ev.orderId], ['Amount', ev.amount ? fmtKes(ev.amount) : '']];
    const ok = await sendNotify(
      `Payment received: ${ev.orderId}`,
      card('Payment Received', rows),
      textLines('Payment received', rows)
    );
    console.log('[notify]', ok ? 'payment-success sent:' : 'payment-success failed:', ev.orderId);
  } catch (e) {
    console.error('[notify] payment-success error', e);
  }
}

export async function notifyPaymentFailure(ev: PaymentEvent): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_payment_failure'))) {
      console.log('[notify] payment-failure skipped (toggle off):', ev.orderId);
      return;
    }
    const rows: [string, string][] = [['Gateway', ev.gateway], ['Order', ev.orderId], ['Reason', ev.reason || '']];
    const ok = await sendNotify(
      `Payment failed: ${ev.orderId}`,
      card('Payment Failed', rows),
      textLines('Payment failed', rows)
    );
    console.log('[notify]', ok ? 'payment-failure sent:' : 'payment-failure failed:', ev.orderId);
  } catch (e) {
    console.error('[notify] payment-failure error', e);
  }
}

export type TicketScanRow = { code: string; event?: string; holder?: string };

export async function notifyTicketScan(t: TicketScanRow): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_ticket_scan'))) {
      console.log('[notify] ticket-scan skipped (toggle off):', t.code);
      return;
    }
    const rows: [string, string][] = [['Ticket', t.code], ['Event', t.event || ''], ['Holder', t.holder || '']];
    const ok = await sendNotify(
      `Ticket scanned at gate: ${t.code}`,
      card('Ticket Scanned At Gate', rows),
      textLines('Ticket scanned at gate', rows)
    );
    console.log('[notify]', ok ? 'ticket-scan sent:' : 'ticket-scan failed:', t.code);
  } catch (e) {
    console.error('[notify] ticket-scan error', e);
  }
}

export type WhatsAppMessageEvent = { from: string; text: string };

export async function notifyWhatsAppMessage(ev: WhatsAppMessageEvent): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_whatsapp_message'))) {
      console.log('[notify] whatsapp-message skipped (toggle off):', ev.from);
      return;
    }
    const rows: [string, string][] = [['From', ev.from]];
    const ok = await sendNotify(
      `WhatsApp message from ${ev.from}`,
      card('New WhatsApp Message', rows, esc(ev.text).slice(0, 1000)),
      textLines('New WhatsApp message', rows, ev.text)
    );
    console.log('[notify]', ok ? 'whatsapp-message sent:' : 'whatsapp-message failed:', ev.from);
  } catch (e) {
    console.error('[notify] whatsapp-message error', e);
  }
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
