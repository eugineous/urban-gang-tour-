import { NextResponse } from 'next/server';
import { gmailConnection, removeGmailConnection } from '@/lib/server/gmail';
import { isSuperAdmin, verifyAdminSession } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import { hasDb, q } from '@/lib/server/db';

export async function GET(req: Request) {
  // The connected account is a full mailbox, not a booking-only mailbox.
  // Booking staff have the scoped booking reply route instead, and comms staff
  // have the broadcast route, so neither needs unrestricted inbox visibility.
  if (!(await verifyAdminSession(req)) || !isSuperAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    return NextResponse.json({ ok: true, ...(await gmailConnection()) });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error).slice(0, 120) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await verifyAdminSession(req)) || !isSuperAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  try {
    await removeGmailConnection();
    if (hasDb()) {
      await q(`INSERT INTO audit_log (actor, action, detail) VALUES ('admin','disconnect_gmail','{}'::jsonb)`);
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error).slice(0, 120) }, { status: 500 });
  }
}

