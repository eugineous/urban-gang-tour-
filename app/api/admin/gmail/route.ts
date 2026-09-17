import { NextResponse } from 'next/server';
import { gmailConnection, removeGmailConnection } from '@/lib/server/gmail';
import { hasPerm, isAdmin, isSuperAdmin } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import { hasDb, q } from '@/lib/server/db';

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasPerm(req, 'bookings') && !hasPerm(req, 'comms')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await gmailConnection()) });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error).slice(0, 120) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isSuperAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
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

