import { NextResponse } from 'next/server';
import { q, db } from '@/lib/server/db';
import { isAdmin } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';

// POST /api/admin/broadcast  {subject, body}
// Admin-only. Emails every newsletter subscriber via Resend (RESEND_API_KEY).
// Contract: 200 {ok,sent} | 400 invalid | 401 not admin | 403 bad origin | 503 email/db not configured
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  const { subject, body } = await req.json().catch(() => ({}));
  if (typeof subject !== 'string' || subject.length < 2 || subject.length > 200) return NextResponse.json({ error: 'invalid_subject' }, { status: 400 });
  if (typeof body !== 'string' || body.length < 2 || body.length > 20000) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'email_not_configured', hint: 'Set RESEND_API_KEY in Vercel, or use the CSV export.' }, { status: 503 });
  }
  const subs = await q(`SELECT email FROM subscribers`);
  const from = process.env.BOOKINGS_FROM || 'news@urbangangtour.co.ke';
  let sent = 0;
  // batches of 50 recipients per request (Resend limit-friendly)
  for (let i = 0; i < subs.length; i += 50) {
    const batch = subs.slice(i, i + 50).map((s: any) => s.email);
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: from, bcc: batch, subject, text: body + '\n\n—\nUrban Gang Tour · urbangangtour.co.ke\nUnsubscribe: reply STOP' }),
      });
      if (r.ok) sent += batch.length;
    } catch { /* count only confirmed batches */ }
  }
  return NextResponse.json({ ok: true, sent, total: subs.length });
}
