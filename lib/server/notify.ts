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
import { sendWhatsAppText, isWhatsAppConfigured } from '../whatsapp';
import {escapeEmailHtml,renderEmailLetterhead,renderEmailRows} from './email-letterhead';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function esc(s: string): string {
  return escapeEmailHtml(s);
}

function fmtKes(n: number): string {
  return 'KES ' + Number(n || 0).toLocaleString('en-US');
}

async function settingValue(key: string): Promise<unknown> {
  const rows = await q(`SELECT value FROM settings WHERE key=$1`, [key]);
  return rows[0]?.value;
}

// Notification delivery is opt-in twice: its individual toggle must be on and
// an owner must explicitly save a recipient. Never silently route customer or
// school information to a compiled-in personal address.
async function notifyRecipient(): Promise<string | null> {
  try {
    if (db()) {
      const v = await settingValue('notify_email');
      // settings.value is JSONB; a stored string arrives already parsed, but
      // strip stray quotes defensively (matches lib/server/alert.ts).
      const s = String(v ?? '').replace(/^"|"$/g, '').trim();
      if (EMAIL_RE.test(s)) return s;
    }
  } catch { /* fall through to no recipient */ }
  return null;
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
  if (!to) {
    console.warn('[notify] skipped: notify_email is not configured');
    return false;
  }
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

// Sends a WhatsApp message to the admin's own number (META_WA_SELF /
// WHATSAPP_SELF). Requires the WhatsApp Cloud API to be configured
// (WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID). Silently skips and
// logs when either condition is unmet — never throws.
async function notifyViaWhatsApp(body: string): Promise<void> {
  try {
    const adminTo = process.env.META_WA_SELF || process.env.WHATSAPP_SELF || '';
    if (!isWhatsAppConfigured() || !adminTo) {
      return;
    }
    // Strip non-digits from the number before sending (E.164 without plus)
    const to = adminTo.replace(/\D/g, '');
    if (!to) return;
    const result = await sendWhatsAppText(to, body);
    if (result.ok) {
    } else {
      console.warn('[notify:wa] failed:', result.error);
    }
  } catch (e) {
    console.error('[notify:wa] error', e);
  }
}

// All routine notifications share one responsive letterhead. Extra message
// content is pre-escaped by callers; metadata rows are escaped in the renderer.
function card(title: string, rows: [string, string][], extra?: string): string {
  return renderEmailLetterhead({title,eyebrow:'Control Room notification',
    contentHtml:renderEmailRows(rows)+(extra?`<div style="margin-top:20px;font-size:14px;line-height:1.65;white-space:pre-wrap;word-break:break-word">${extra}</div>`:''),
  });
}

function textLines(title: string, rows: [string, string][], extra?: string): string {
  return `${title}\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}${extra ? `\n\n${extra}` : ''}\n\nTime: ${new Date().toISOString()}\nSource: urbangangtour.co.ke`;
}

export type NewSignupRow = { id: string | number; email?: string | null; phone?: string | null; name?: string | null };

export async function notifyNewSignup(user: NewSignupRow): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_new_signup'))) {
      return;
    }
    const rows: [string, string][] = [['Name', user.name || ''], ['Email', user.email || ''], ['Phone', user.phone || '']];
    const ok = await sendNotify(
      `New account: ${user.name || user.email || user.phone || user.id}`,
      card('New Account', rows),
      textLines('New account created', rows)
    );
  } catch (e) {
    console.error('[notify] new-signup error', e);
  }
}

export type AdminLoginEvent = { email: string; method: 'google' | 'access_code'; scope: string; ip?: string };

export async function notifyAdminLogin(ev: AdminLoginEvent): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_admin_login'))) {
      return;
    }
    const rows: [string, string][] = [['Method', ev.method], ['Email', ev.email || '(access code)'], ['Scope', ev.scope], ['IP', ev.ip || '']];
    const ok = await sendNotify(
      `Control Room sign-in: ${ev.email || 'access code'}`,
      card('Control Room Sign-In', rows),
      textLines('Control Room sign-in', rows)
    );
  } catch (e) {
    console.error('[notify] admin-login error', e);
  }
}

export type FailedAdminLoginEvent = { method: 'google' | 'access_code'; reason: string; ip?: string; email?: string };

export async function notifyFailedAdminLogin(ev: FailedAdminLoginEvent): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_failed_admin_login'))) {
      return;
    }
    const rows: [string, string][] = [['Method', ev.method], ['Reason', ev.reason], ['Email tried', ev.email || ''], ['IP', ev.ip || '']];
    const ok = await sendNotify(
      `Failed Control Room sign-in attempt (${ev.method})`,
      card('Failed Sign-In Attempt', rows),
      textLines('Failed Control Room sign-in attempt', rows)
    );
  } catch (e) {
    console.error('[notify] failed-admin-login error', e);
  }
}

export type PostPublishedRow = { slug: string; headline: string; section?: string };

export async function notifyPostPublished(post: PostPublishedRow): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_post_published'))) {
      return;
    }
    const rows: [string, string][] = [['Headline', post.headline], ['Section', post.section || ''], ['URL', `https://urbangangtour.co.ke/blog/${post.slug}`]];
    const ok = await sendNotify(
      `Post published: ${post.headline}`,
      card('Blog Post Published', rows),
      textLines('Blog post published', rows)
    );
  } catch (e) {
    console.error('[notify] post-published error', e);
  }
}

export async function notifyNewSubscriber(email: string): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_new_subscriber'))) {
      return;
    }
    const rows: [string, string][] = [['Email', email]];
    const ok = await sendNotify(
      `New newsletter subscriber: ${email}`,
      card('New Newsletter Subscriber', rows),
      textLines('New newsletter subscriber', rows)
    );
  } catch (e) {
    console.error('[notify] new-subscriber error', e);
  }
}

export type NewReviewRow = { product: string; author: string; rating: number; body: string };

export async function notifyNewReview(rev: NewReviewRow): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_new_review'))) {
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
  } catch (e) {
    console.error('[notify] new-review error', e);
  }
}

export type NewOrganizerRow = { businessName: string; contactName?: string | null; email: string; phone?: string | null };

export async function notifyNewOrganizer(org: NewOrganizerRow): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_new_organizer'))) {
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
  } catch (e) {
    console.error('[notify] new-organizer error', e);
  }
}

export type NewSubmissionRow = { name: string; school?: string | null; title: string; pitch?: string | null };

export async function notifyNewSubmission(sub: NewSubmissionRow): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_new_submission'))) {
      return;
    }
    const rows: [string, string][] = [['Name', sub.name], ['School', sub.school || ''], ['Title', sub.title]];
    const ok = await sendNotify(
      `New story pitch: ${sub.title}`,
      card('New Story Pitch (Newsroom)', rows, sub.pitch ? esc(sub.pitch).slice(0, 1000) : undefined),
      textLines('New story pitch', rows, sub.pitch || '')
    );
  } catch (e) {
    console.error('[notify] new-submission error', e);
  }
}

export type PaymentEvent = { gateway: 'mpesa' | 'paystack' | 'stripe'; orderId: string; amount?: number; reason?: string };

export async function notifyPaymentSuccess(ev: PaymentEvent): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_payment_success'))) {
      return;
    }
    const rows: [string, string][] = [['Gateway', ev.gateway], ['Order', ev.orderId], ['Amount', ev.amount ? fmtKes(ev.amount) : '']];
    const ok = await sendNotify(
      `Payment received: ${ev.orderId}`,
      card('Payment Received', rows),
      textLines('Payment received', rows)
    );
    await notifyViaWhatsApp(
      `✅ Payment confirmed: ${ev.orderId}\nGateway: ${ev.gateway}\nAmount: KES ${Number(ev.amount || 0).toLocaleString('en-US')}`
    );
  } catch (e) {
    console.error('[notify] payment-success error', e);
  }
}

export async function notifyPaymentFailure(ev: PaymentEvent): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_payment_failure'))) {
      return;
    }
    const rows: [string, string][] = [['Gateway', ev.gateway], ['Order', ev.orderId], ['Reason', ev.reason || '']];
    const ok = await sendNotify(
      `Payment failed: ${ev.orderId}`,
      card('Payment Failed', rows),
      textLines('Payment failed', rows)
    );
  } catch (e) {
    console.error('[notify] payment-failure error', e);
  }
}

export type TicketScanRow = { code: string; event?: string; holder?: string };

export async function notifyTicketScan(t: TicketScanRow): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_ticket_scan'))) {
      return;
    }
    const rows: [string, string][] = [['Ticket', t.code], ['Event', t.event || ''], ['Holder', t.holder || '']];
    const ok = await sendNotify(
      `Ticket scanned at gate: ${t.code}`,
      card('Ticket Scanned At Gate', rows),
      textLines('Ticket scanned at gate', rows)
    );
  } catch (e) {
    console.error('[notify] ticket-scan error', e);
  }
}

export type WhatsAppMessageEvent = { from: string; text: string };

export async function notifyWhatsAppMessage(ev: WhatsAppMessageEvent): Promise<void> {
  try {
    if (!(await notifyEnabled('notify_on_whatsapp_message'))) {
      return;
    }
    const rows: [string, string][] = [['From', ev.from]];
    const ok = await sendNotify(
      `WhatsApp message from ${ev.from}`,
      card('New WhatsApp Message', rows, esc(ev.text).slice(0, 1000)),
      textLines('New WhatsApp message', rows, ev.text)
    );
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
      return;
    }
    const subject = `New order: ${fmtKes(order.total)}`;
    const text = `New order ${order.id}\nTotal: ${fmtKes(order.total)}\nStatus: ${order.status || 'pending'}\nCustomer: ${order.name || ''}\nPhone: ${order.phone || ''}\nEmail: ${order.email || ''}\n\nTime: ${new Date().toISOString()}\nSource: urbangangtour.co.ke`;
    const html = card('New order',[
      ['Order reference',order.id],['Total',fmtKes(order.total)],['Status',order.status || 'pending'],
      ['Customer',order.name || ''],['Phone',order.phone || ''],['Email',order.email || ''],
    ]);
    const ok = await sendNotify(subject, html, text);
    await notifyViaWhatsApp(
      `🎟 New order: ${order.id}\nAmount: KES ${Number(order.total || 0).toLocaleString('en-US')}\nName: ${order.name || ''}\nPhone: ${order.phone || ''}`
    );
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
      return;
    }
    const subject = `New booking: ${booking.name}`;
    const text = `New booking ${booking.id}\nType: ${booking.type}\nName: ${booking.name}\nOrg: ${booking.org || ''}\nEmail: ${booking.email || ''}\nPhone: ${booking.phone || ''}\n\n${booking.message || ''}\n\nTime: ${new Date().toISOString()}\nSource: urbangangtour.co.ke`;
    const html = card('New booking enquiry',[
      ['Enquiry reference',booking.id],['Type',booking.type],['Name',booking.name],
      ['Organisation',booking.org || ''],['Email',booking.email || ''],['Phone',booking.phone || ''],
    ],booking.message?esc(booking.message).slice(0,1000):undefined);
    const ok = await sendNotify(subject, html, text);
  } catch (e) {
    console.error('[notify] new-booking error', e);
  }
}
