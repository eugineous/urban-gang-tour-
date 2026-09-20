import { NextResponse } from 'next/server';
import { isAdmin, hasPerm, adminActor } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import {
  ensureDocgenSchema, isDocType, preparePayload, insertDocumentsBatch,
  renderDoc, docgenAudit, DOC_TYPES, PreparedDoc,
} from '@/lib/server/docgen';

// POST /api/admin/docs/batch {type, rows:[{...fields}]} - the CSV-batch
// reserve phase. One certificate per row.
//
// Integrity contract (the reason this route exists rather than a client loop
// over /generate): serials must stay GAPLESS, so a batch that contains even
// one bad row must reserve ZERO serials. We therefore validate EVERY row
// first (preparePayload throws on a missing required field) and only start
// reserving once the whole batch is known-good. A row that fails returns
// {error:'row_invalid', row:<index>} and nothing is written.
//
// On success returns {docs:[{id, serial, html, filename}]} - one per row. The
// client then rasterises each html to PNG+PDF and attaches it via the existing
// /generate attach phase ({id, pdfBase64, pngBase64}), exactly like a single
// document. This route never touches Blob storage.
//
// Roles: documents perm (super_admin passes). Audit-logged on reserve.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ROWS = 300;

export async function POST(req: Request): Promise<NextResponse> {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasPerm(req, 'documents')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const { type, rows } = body || {};
  if (!isDocType(type)) return NextResponse.json({ error: 'bad_doc_type' }, { status: 400 });
  if (!Array.isArray(rows)) return NextResponse.json({ error: 'rows_not_array' }, { status: 400 });
  if (rows.length === 0) return NextResponse.json({ error: 'no_rows' }, { status: 400 });
  if (rows.length > MAX_ROWS) return NextResponse.json({ error: 'too_many_rows', max: MAX_ROWS }, { status: 400 });

  try {
    await ensureDocgenSchema();
  } catch {
    return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  }

  // Phase A - validate and pre-render ALL rows before reserving ANY serial. A
  // missing/broken template is handled just like a bad row, before numbering.
  const prepared: PreparedDoc[] = [];
  for (let i = 0; i < rows.length; i++) {
    try {
      const row = preparePayload(type, rows[i]);
      await renderDoc(type, row.payload, 'PREVIEW');
      prepared.push(row);
    } catch (e) {
      return NextResponse.json(
        { error: 'row_invalid', row: i, detail: (e as Error)?.message || 'invalid' },
        { status: 400 }
      );
    }
  }

  // Phase B - reserve the full serial run + immutable records in ONE database
  // transaction. A failure rolls back every row and every serial bump.
  const def = DOC_TYPES[type];
  const actor = adminActor(req);
  const docs: Array<{ id: string; serial: string; html: string; filename: string }> = [];
  let records: Array<{ id: string; serial: string }>;
  try {
    records = await insertDocumentsBatch(prepared.map((pr) => ({
      type, payload: pr.payload, issued_to: pr.issued_to, event: pr.event,
      pdf_url: '', png_url: '', created_by: actor,
    })));
  } catch (e) {
    return NextResponse.json({ error: 'insert_failed', detail: (e as Error)?.message }, { status: 500 });
  }
  for (let i = 0; i < prepared.length; i++) {
    const pr = prepared[i];
    const rec = records[i];
    let html = '';
    try {
      // Batch is only ever the certificate / quantity (single-page) types, so
      // renderDoc returns a string here; coerce defensively to stay type-safe.
      const rendered = await renderDoc(type, pr.payload, rec.serial);
      html = Array.isArray(rendered) ? rendered[0] : rendered;
    } catch (e) {
      return NextResponse.json(
        { error: 'render_failed', row: i, serial: rec.serial, detail: (e as Error)?.message, reserved: docs },
        { status: 500 }
      );
    }
    docs.push({ id: rec.id, serial: rec.serial, html, filename: `${rec.serial}-${def.code}-${pr.slug}.pdf` });
  }

  await docgenAudit(actor, 'docs.batch', { type, count: docs.length, serials: docs.map((d) => d.serial) });
  return NextResponse.json({ ok: true, count: docs.length, docs });
}
