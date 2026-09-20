// Critical-path alerting. alertCritical(subject, detail) always logs with an
// [ALERT] prefix (Vercel log search target) and, when RESEND_API_KEY is set,
// emails an explicitly configured alert_email recipient, or the Control Room
// notification recipient when that is the only owner inbox configured.
// Never throws - a failed alert must never break the request that raised it.
// Reserved for genuinely critical paths (payment reconciliation, order ledger
// writes, webhook signature-failure bursts). Do not wire into routine errors.
import { q, hasDb } from './db';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function alertRecipient(): Promise<string | null> {
  try {
    if (hasDb()) {
      const rows = await q(`SELECT key, value FROM settings WHERE key IN ('alert_email','notify_email')`);
      // settings.value is JSONB; a stored string arrives already parsed. A
      // dedicated critical-alert inbox wins, otherwise reuse the inbox the
      // owner deliberately saved for Control Room notifications.
      const values = new Map(rows.map((row: any) => [String(row.key), String(row.value ?? '').replace(/^"|"$/g, '').trim()]));
      for (const key of ['alert_email', 'notify_email']) {
        const value = values.get(key) || '';
        if (EMAIL_RE.test(value)) return value;
      }
    }
  } catch { /* fall through to no recipient */ }
  return null;
}

export async function alertCritical(subject: string, detail: string): Promise<void> {
  try {
    console.error('[ALERT]', subject, '::', String(detail).slice(0, 1000));
    if (!process.env.RESEND_API_KEY) return;
    const to = await alertRecipient();
    if (!to) {
      console.error('[ALERT] email delivery skipped: alert_email is not configured');
      return;
    }
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
