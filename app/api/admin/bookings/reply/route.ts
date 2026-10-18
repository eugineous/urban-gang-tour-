import { NextResponse } from 'next/server';
import { hasDb, q, qSchema } from '@/lib/server/db';
import {gmailConnection} from '@/lib/server/gmail';
import {GmailSendUncertain,sendGmailOnce} from '@/lib/server/gmail-send-attempt';
import { adminActor, hasPerm, isAdmin, verifyAdminSession } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';

let ready: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (!hasDb()) return Promise.reject(new Error('db_not_configured'));
  if (!ready) {
    ready = qSchema(`
      CREATE TABLE IF NOT EXISTS booking_replies (
        id BIGSERIAL PRIMARY KEY,
        booking_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        recipient TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        gmail_message_id TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_booking_replies_booking ON booking_replies (booking_id, created_at DESC);
      ALTER TABLE booking_replies ADD COLUMN IF NOT EXISTS request_key TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_reply_request ON booking_replies(request_key);
    `).then(() => undefined).catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

async function canUse(req: Request): Promise<boolean> {
  return (await verifyAdminSession(req)) && isAdmin(req) && hasPerm(req, 'bookings');
}

export async function GET(req: Request) {
  if (!(await canUse(req))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const id = new URL(req.url).searchParams.get('id') || '';
  if (!/^B-[A-Z0-9-]{4,40}$/i.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  try {
    await ensureSchema();
    const replies = await q(
      `SELECT id, booking_id, sender, recipient, subject, body, gmail_message_id, created_at
       FROM booking_replies WHERE booking_id=$1 ORDER BY created_at ASC`,
      [id],
    );
    return NextResponse.json({ ok: true, replies });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error).slice(0, 120) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await canUse(req))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  const payload = await req.json().catch(() => ({}));
  if(!payload||typeof payload!=='object'||Array.isArray(payload))return NextResponse.json({error:'invalid_message'},{status:400});
  const allowed = new Set(['id', 'subject', 'body','requestId']);
  if (Object.keys(payload).some((key) => !allowed.has(key))) {
    return NextResponse.json({ error: 'unexpected_fields' }, { status: 400 });
  }
  const id = String(payload.id || '');
  const subject = String(payload.subject || '').trim();
  const body = String(payload.body || '').trim();
  if (!/^B-[A-Z0-9-]{4,40}$/i.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  if (!subject || subject.length > 200 || /[\r\n]/.test(subject)|| !body || body.length > 10_000 ||typeof payload.requestId!=='string'||!/^[A-Za-z0-9_-]{32,128}$/.test(payload.requestId)) {
    return NextResponse.json({ error: 'invalid_message' }, { status: 400 });
  }
  try {
    await ensureSchema();
    const rows = await q<any>(`SELECT id, name, email FROM bookings WHERE id=$1`, [id]);
    if (!rows.length) return NextResponse.json({ error: 'booking_not_found' }, { status: 404 });
    const booking = rows[0];
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(booking.email || ''))) {
      return NextResponse.json({ error: 'booking_has_no_valid_email' }, { status: 400 });
    }
    if(!(await gmailConnection()).connected)return NextResponse.json({error:'gmail_not_connected'},{status:409});
    const actor = adminActor(req);
    const sent = await sendGmailOnce(actor,payload.requestId,{to:booking.email,subject,body});
    await q(
      `INSERT INTO booking_replies (booking_id, sender, recipient, subject, body, gmail_message_id,request_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(request_key) DO NOTHING`,
      [id, actor, booking.email, subject, body, sent.id,sent.requestKey],
    );
    await q(`UPDATE bookings SET status='replied' WHERE id=$1 AND status IN ('new','review')`, [id]);
    await q(
      `INSERT INTO audit_log (actor, action, detail) VALUES ($1,'booking_reply',$2)`,
      [actor, JSON.stringify({ bookingId: id, to: booking.email, gmailMessageId: sent.id })],
    );
    return NextResponse.json({ok:true,id:sent.id,accepted:true,deduped:sent.deduped});
  } catch (error: any) {
    if(error instanceof GmailSendUncertain)return NextResponse.json({ok:false,error:'gmail_send_outcome_unknown'},{status:202});
    if(error?.message==='reply_details_changed')return NextResponse.json({error:'reply_details_changed'},{status:409});
    const message = String(error?.message || error).slice(0, 120);
    const status = message === 'gmail_not_connected' ? 409 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

