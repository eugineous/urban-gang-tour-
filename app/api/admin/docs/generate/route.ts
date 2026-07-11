import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { isAdmin, hasPerm, adminActor } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import {
  ensureDocgenSchema, isDocType, preparePayloadFull, insertDocument, setDocumentAssets,
  getDocumentById, renderDoc, docgenAudit, DOC_TYPES,
} from '@/lib/server/docgen';

// POST /api/admin/docs/generate. Two phases on one endpoint - the real serial
// must be baked into the rendered pixels (so the QR points at the right verify
// URL), but the client can't know the serial until it is reserved, and we do
// NOT run headless Chrome on the server. So:
//
//  Phase 1 (reserve): body {type, payload}
//    -> server recomputes ALL totals/words (client numbers never trusted),
//       atomically bumps the next real serial and inserts the immutable record
//       (a failed insert rolls the serial back, so numbering stays gapless),
//       and returns {id, serial, html, filename} - html filled with the REAL
//       serial + QR for the client to rasterise.
//
//  Phase 2 (attach): body {id, pdfBase64, pngBase64}
//    -> uploads the client-rendered pdf/png to Vercel Blob and idempotently
//       sets pdf_url/png_url on the reserved record. Returns {pdf_url, png_url}.
//
// Roles: documents perm (super_admin passes). Audit-logged on reserve.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 15 * 1024 * 1024; // 15MB ceiling per asset

function decodeBase64(v: unknown, kind: string): Buffer {
  if (typeof v !== 'string' || v.length < 32) throw new Error('missing_' + kind);
  const b64 = v.includes(',') ? v.slice(v.indexOf(',') + 1) : v;
  const buf = Buffer.from(b64, 'base64');
  if (buf.length === 0) throw new Error('empty_' + kind);
  if (buf.length > MAX_BYTES) throw new Error('too_large_' + kind);
  return buf;
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasPerm(req, 'documents')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  try {
    await ensureDocgenSchema();
  } catch {
    return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  }

  const attach = typeof body?.id === 'string' && (body?.pdfBase64 || body?.pngBase64);
  return attach ? phaseAttach(req, body) : phaseReserve(req, body);
}

async function phaseReserve(req: Request, body: any): Promise<NextResponse> {
  const { type, payload } = body || {};
  if (!isDocType(type)) return NextResponse.json({ error: 'bad_doc_type' }, { status: 400 });

  let prepared;
  try {
    prepared = await preparePayloadFull(type, payload);
  } catch (e) {
    // Validation / business-rule failure (e.g. a required field, or the
    // under-18 talent release with no guardian block). Fail CLOSED before any
    // serial is reserved - a clean 400 so the UI shows the reason.
    return NextResponse.json({ error: (e as Error)?.message || 'invalid_payload' }, { status: 400 });
  }
  const def = DOC_TYPES[type];
  let rec: { id: string; serial: string };
  try {
    rec = await insertDocument({
      type,
      payload: prepared.payload,
      issued_to: prepared.issued_to,
      event: prepared.event,
      pdf_url: '',
      png_url: '',
      created_by: adminActor(req),
    });
  } catch (e) {
    return NextResponse.json({ error: 'insert_failed', detail: (e as Error)?.message }, { status: 500 });
  }

  let html = '';
  try {
    html = await renderDoc(type, prepared.payload, rec.serial);
  } catch (e) {
    return NextResponse.json({ error: 'render_failed', detail: (e as Error)?.message }, { status: 500 });
  }

  await docgenAudit(adminActor(req), 'docs.generate', { serial: rec.serial, type, issued_to: prepared.issued_to });
  const filename = `${rec.serial}-${def.code}-${prepared.slug}.pdf`;
  return NextResponse.json({ ok: true, phase: 'reserved', id: rec.id, serial: rec.serial, html, filename });
}

async function phaseAttach(req: Request, body: any): Promise<NextResponse> {
  const id = String(body.id).slice(0, 60);
  let pdfBuf: Buffer, pngBuf: Buffer;
  try {
    pdfBuf = decodeBase64(body.pdfBase64, 'pdf');
    pngBuf = decodeBase64(body.pngBase64, 'png');
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const existing = await getDocumentById(id);
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (existing.pdf_url) {
    return NextResponse.json({ ok: true, phase: 'attached', id, serial: existing.serial, pdf_url: existing.pdf_url, png_url: existing.png_url });
  }

  let pdf_url = '', png_url = '';
  try {
    const slug = (existing.issued_to || existing.type).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'doc';
    const base = `documents/${existing.type}/${existing.serial}-${slug}`;
    const up = await Promise.all([
      put(`${base}.pdf`, pdfBuf, { access: 'public', contentType: 'application/pdf', addRandomSuffix: true }),
      put(`${base}.png`, pngBuf, { access: 'public', contentType: 'image/png', addRandomSuffix: true }),
    ]);
    pdf_url = up[0].url;
    png_url = up[1].url;
  } catch (e) {
    return NextResponse.json({ error: 'blob_upload_failed', detail: (e as Error)?.message }, { status: 502 });
  }

  const rec = await setDocumentAssets(id, pdf_url, png_url);
  return NextResponse.json({ ok: true, phase: 'attached', id, serial: rec?.serial, pdf_url: rec?.pdf_url || pdf_url, png_url: rec?.png_url || png_url });
}
