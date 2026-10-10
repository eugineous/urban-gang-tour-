import { NextResponse } from 'next/server';
import { q, hasDb } from '@/lib/server/db';
import { adminActor, isAdmin, isSuperAdmin, verifyAdminSession } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import {marketingRecipients} from '@/lib/server/marketing-preferences';
import {EVENT_INTERESTS} from '@/lib/server/engagement';

// POST /api/admin/broadcast  {subject, body}
// Owner-only, because a newsletter is a permanent external delivery to every
// subscriber. Comms staff can draft copy and export the list, but a forged
// request must not send a full audience broadcast.
// Contract: 200 {ok,sent} | 400 invalid | 401 not admin | 403 forbidden/bad origin | 503 email/db not configured
export async function POST(req: Request) {
  if (!(await verifyAdminSession(req))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!isSuperAdmin(req)) return NextResponse.json({ error: 'owner_approval_required' }, { status: 403 });
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  const payload = await req.json().catch(() => ({}));
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).some(k=>!['subject','body','confirmation','interest'].includes(k))) return NextResponse.json({error:'invalid_request'},{status:400});
  const { subject, body, confirmation, interest } = payload;
  if (interest !== undefined && !EVENT_INTERESTS.includes(interest)) return NextResponse.json({error:'invalid_interest'},{status:400});
  if (confirmation !== 'send_newsletter') return NextResponse.json({ error: 'confirmation_required' }, { status: 400 });
  if (typeof subject !== 'string' || subject.length < 2 || subject.length > 200) return NextResponse.json({ error: 'invalid_subject' }, { status: 400 });
  if (typeof body !== 'string' || body.length < 2 || body.length > 20000) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  if (!hasDb()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'email_not_configured', hint: 'Configure the Cloudflare Worker email provider, or use the CSV export.' }, { status: 503 });
  }
  const subs = await marketingRecipients(interest || null);
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
  try {
    await q(`INSERT INTO audit_log (actor, action, detail) VALUES ($1,'newsletter_broadcast',$2)`, [
      adminActor(req),
      JSON.stringify({ sent, total: subs.length, subject_length: subject.length, body_length: body.length, interest: interest || null }),
    ]);
  } catch {
    // An audit failure cannot safely undo a delivery that has already happened.
  }
  return NextResponse.json({ ok: true, sent, total: subs.length });
}
