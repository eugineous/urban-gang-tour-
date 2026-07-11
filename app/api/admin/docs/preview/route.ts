import { NextResponse } from 'next/server';
import { isAdmin, hasPerm } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import { ensureDocgenSchema, isDocType, preparePayload, renderDoc } from '@/lib/server/docgen';

// POST /api/admin/docs/preview {type, payload} -> {html, computed}
// Fills the brand template with server-computed values using a PROVISIONAL
// serial ('PREVIEW') so NO real serial is ever consumed on preview. Only
// /generate burns a serial. Roles: documents perm (super_admin passes).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasPerm(req, 'documents')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const { type, payload } = body || {};
  if (!isDocType(type)) return NextResponse.json({ error: 'bad_doc_type' }, { status: 400 });

  try {
    await ensureDocgenSchema();
  } catch {
    return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  }

  try {
    const prepared = preparePayload(type, payload);
    const html = await renderDoc(type, prepared.payload, 'PREVIEW');
    return NextResponse.json({ html, computed: prepared.computed });
  } catch (e) {
    return NextResponse.json({ error: (e as Error)?.message || 'preview_failed' }, { status: 400 });
  }
}
