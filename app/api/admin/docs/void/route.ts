import { NextResponse } from 'next/server';
import { isAdmin, hasPerm, adminActor } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import { ensureDocgenSchema, voidDocument, docgenAudit } from '@/lib/server/docgen';

// POST /api/admin/docs/void {serial, reason} -> sets status='void'.
// Documents are immutable: a correction is a brand new generate, never an
// edit. Voiding only flips status + records the reason. Roles: documents perm
// (super_admin passes). Audit-logged.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasPerm(req, 'documents')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const serial = String(body?.serial || '').slice(0, 60);
  const reason = String(body?.reason || '').slice(0, 300);
  if (!serial) return NextResponse.json({ error: 'missing_serial' }, { status: 400 });

  try {
    await ensureDocgenSchema();
  } catch {
    return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  }

  try {
    const rec = await voidDocument(serial, reason);
    if (!rec) return NextResponse.json({ error: 'not_found_or_already_void' }, { status: 404 });
    await docgenAudit(adminActor(req), 'docs.void', { serial, reason });
    return NextResponse.json({ ok: true, serial: rec.serial, status: rec.status });
  } catch (e) {
    return NextResponse.json({ error: (e as Error)?.message || 'void_failed' }, { status: 500 });
  }
}
