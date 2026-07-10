// Critical-path alerting. alertCritical(subject, detail) always logs with an
// [ALERT] prefix (Vercel log search target) and, when RESEND_API_KEY is set,
// emails the owner: settings key 'alert_email' when present, else the fallback.
// Never throws - a failed alert must never break the request that raised it.
// Reserved for genuinely critical paths (payment reconciliation, order ledger
// writes, webhook signature-failure bursts). Do not wire into routine errors.
import { q, db } from './db';

const FALLBACK_EMAIL = 'euginemicah@gmail.com';
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function alertRecipient(): Promise<string> {
  try {
    if (db()) {
      const rows = await q(`SELECT value FROM settings WHERE key='alert_email'`);
      // settings.value is JSONB; a stored string arrives already parsed
      const v = String(rows[0]?.value ?? '').replace(/^"|"$/g, '').trim();
      if (EMAIL_RE.test(v)) return v;
    }
  } catch { /* fall through to fallback */ }
  return FALLBACK_EMAIL;
}

export async function alertCritical(subject: string, detail: string): Promise<void> {
  try {
    console.error('[ALERT]', subject, '::', String(detail).slice(0, 1000));
    if (!process.env.RESEND_API_KEY) return;
    const to = await alertRecipient();
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.BOOKINGS_FROM || 'alerts@urbangangtour.co.ke',
        to,
        subject: `[UGT ALERT] ${subject}`.slice(0, 200),
        text: `${subject}\n\n${String(detail).slice(0, 4000)}\n\nTime: ${new Date().toISOString()}\nSource: urbangangtour.co.ke`,
      }),
    });
  } catch (e) {
    console.error('[ALERT] delivery failed:', e);
  }
}
