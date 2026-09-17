import { NextResponse } from 'next/server';
import { listGmailMessages, markGmailMessageRead, sendGmailMessage } from '@/lib/server/gmail';
import { adminActor, hasPerm, isAdmin } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import { hasDb, q } from '@/lib/server/db';

function allowed(req: Request): boolean {
  return isAdmin(req) && (hasPerm(req, 'bookings') || hasPerm(req, 'comms'));
}

export async function GET(req: Request) {
  if (!allowed(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const url = new URL(req.url);
  const raw = (url.searchParams.get('q') || '').trim();
  const query = raw ? `in:inbox newer_than:1y ${raw}` : 'in:inbox newer_than:30d';
  try {
    const messages = await listGmailMessages(query, 30);
    return NextResponse.json({ ok: true, messages });
  } catch (error: any) {
    const message = String(error?.message || error).slice(0, 120);
    const status = message === 'gmail_not_connected' ? 409 : message === 'gmail_reconnect_required' ? 401 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  if (!allowed(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const allowedFields = new Set(['messageId', 'threadId', 'to', 'subject', 'body', 'inReplyTo', 'references']);
  if (Object.keys(body).some((key) => !allowedFields.has(key))) {
    return NextResponse.json({ error: 'unexpected_fields' }, { status: 400 });
  }
  const to = String(body.to || '').trim();
  const subject = String(body.subject || '').trim();
  const text = String(body.body || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to) || to.length > 200) {
    return NextResponse.json({ error: 'invalid_recipient' }, { status: 400 });
  }
  if (!subject || subject.length > 200 || !text || text.length > 10_000) {
    return NextResponse.json({ error: 'invalid_message' }, { status: 400 });
  }
  try {
    const sent = await sendGmailMessage({
      to,
      subject,
      body: text,
      threadId: typeof body.threadId === 'string' ? body.threadId : undefined,
      inReplyTo: typeof body.inReplyTo === 'string' ? body.inReplyTo : undefined,
      references: typeof body.references === 'string' ? body.references : undefined,
    });
    if (body.messageId) await markGmailMessageRead(String(body.messageId));
    if (hasDb()) {
      await q(
        `INSERT INTO audit_log (actor, action, detail) VALUES ($1,'gmail_reply',$2)`,
        [adminActor(req), JSON.stringify({ to, subject, gmailMessageId: sent.id })],
      );
    }
    return NextResponse.json({ ok: true, ...sent });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error).slice(0, 120) }, { status: 502 });
  }
}

