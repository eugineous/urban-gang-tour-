import { NextResponse } from 'next/server';
import { isAdmin, hasPerm } from '@/lib/server/session';
import { ensureDocgenSchema, listDocuments } from '@/lib/server/docgen';

// GET /api/admin/docs/list -> recent documents (serial, type, issued_to,
// status, created_at, pdf_url). Roles: documents perm (super_admin passes).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<NextResponse> {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasPerm(req, 'documents')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  try {
    await ensureDocgenSchema();
  } catch {
    return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  }

  try {
    const docs = await listDocuments(50);
    const rows = docs.map((d) => ({
      id: d.id, serial: d.serial, type: d.type, issued_to: d.issued_to, event: d.event,
      status: d.status, created_at: d.created_at, pdf_url: d.pdf_url, png_url: d.png_url,
      void_reason: d.void_reason,
    }));
    return NextResponse.json({ rows });
  } catch (e) {
    return NextResponse.json({ error: (e as Error)?.message || 'list_failed' }, { status: 500 });
  }
}
