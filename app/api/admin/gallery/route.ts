import { NextResponse } from 'next/server';
import { q, db } from '@/lib/server/db';
import { mediaDel, mediaGet, isMediaUrl } from '@/lib/server/media';
import { hasPerm, isSuperAdmin, adminActor, verifyAdminSession } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import { ensureOpsSchema, opsAudit } from '@/lib/server/ops';

// Authenticated gallery management. Upload bytes are stored before captions
// and publication state are registered here.
//
// gallery_photos.id is a plain integer SERIAL (matches the table's
// pre-existing production shape — see lib/server/ops.ts's note above the
// CREATE TABLE), so every id here is parsed/bound as a number, not a string.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function s(v: unknown, max = 300): string {
  return String(v ?? '').slice(0, max);
}

function intId(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function imageDimension(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n <= 12_000 ? n : null;
}

export async function GET(req: Request) {
  if (!(await verifyAdminSession(req))) return bad('unauthorized', 401);
  if (!hasPerm(req, 'gallery')) return bad('forbidden', 403);
  if (!db()) return bad('db_not_configured', 503);
  try {
    await ensureOpsSchema();
    const rows = await q(`SELECT id, url, caption, category, alt_text, width, height, published, sort_order, created_at FROM gallery_photos ORDER BY published ASC, sort_order ASC, id ASC`);
    return NextResponse.json({ ok: true, rows, capabilities: { publish: isSuperAdmin(req) } });
  } catch {
    return bad('server_error', 500);
  }
}

export async function POST(req: Request) {
  if (!(await verifyAdminSession(req))) return bad('unauthorized', 401);
  if (!hasPerm(req, 'gallery')) return bad('forbidden', 403);
  if (!requireOrigin(req)) return bad('bad_origin', 403);
  if (!db()) return bad('db_not_configured', 503);
  let body: any;
  try { body = await req.json(); } catch { return bad('invalid_json'); }
  const kind = s(body?.kind, 40);
  const d = body?.data ?? {};
  // A photographer can safely add and prepare a private asset. A public
  // release, permanent removal or public-order change is owner review, not
  // an accidental consequence of a limited gallery role.
  if (['publish', 'delete', 'reorder'].includes(kind) && !isSuperAdmin(req)) {
    return bad('super_admin_review_required', 403);
  }
  try {
    await ensureOpsSchema();
    switch (kind) {
      // Only register an existing owned gallery upload.
      case 'upload': {
        const url = s(d.url, 600);
        if (!url || !isMediaUrl(url) || !url.startsWith('/media/gallery/') || !(await mediaGet(url))) return bad('invalid_url');
        const caption = s(d.caption, 300);
        const category = s(d.category, 120);
        const width = imageDimension(d.width);
        const height = imageDimension(d.height);
        const next = await q<{ next: number }>(`SELECT COALESCE(MAX(sort_order),0)+10 AS next FROM gallery_photos`);
        const sortOrder = Number(next[0]?.next) || 10;
        const row = await q(
          `INSERT INTO gallery_photos (url, caption, category, width, height, sort_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [url, caption, category, width, height, sortOrder]
        );
        await opsAudit('gallery.upload', { id: row[0]?.id, actor: adminActor(req) });
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'update': {
        const id = intId(d.id);
        if (!id) return bad('missing_id');
        const caption = s(d.caption, 300);
        const category = s(d.category, 120);
        const altText = s(d.altText, 300);
        const row = await q(`UPDATE gallery_photos SET caption=$1, category=$2, alt_text=$3 WHERE id=$4 RETURNING *`, [caption, category, altText, id]);
        if (!row.length) return bad('not_found', 404);
        await opsAudit('gallery.update', { id, actor: adminActor(req) });
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'publish': {
        const id = intId(d.id);
        if (!id || typeof d.published !== 'boolean') return bad('invalid_publish_state');
        const row = await q(
          `UPDATE gallery_photos SET published=$1
            WHERE id=$2 AND ($1=false OR (btrim(caption)<>'' AND btrim(category)<>'' AND btrim(alt_text)<>''))
          RETURNING *`,
          [d.published, id],
        );
        if (!row.length) {
          const exists = await q(`SELECT 1 FROM gallery_photos WHERE id=$1`, [id]);
          return exists.length ? bad('publication_metadata_required') : bad('not_found', 404);
        }
        await opsAudit('gallery.publish', { id, published: d.published, actor: adminActor(req) });
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'reorder': {
        const ids: number[] = Array.isArray(d.ids) ? d.ids.map((x: unknown) => intId(x)).filter((x: number | null): x is number => x !== null).slice(0, 500) : [];
        if (!ids.length) return bad('missing_ids');
        const published = await q<{ id: number }>(`SELECT id FROM gallery_photos WHERE published=true ORDER BY sort_order ASC, id ASC`);
        const known = new Set(published.map((row) => Number(row.id)));
        if (ids.length !== published.length || ids.some((id) => !known.has(id)) || new Set(ids).size !== ids.length) {
          return bad('published_order_required');
        }
        for (let i = 0; i < ids.length; i++) {
          await q(`UPDATE gallery_photos SET sort_order=$1 WHERE id=$2`, [(i + 1) * 10, ids[i]]);
        }
        await opsAudit('gallery.reorder', { ids, actor: adminActor(req) });
        return NextResponse.json({ ok: true });
      }
      case 'delete': {
        const id = intId(d.id);
        if (!id) return bad('missing_id');
        const existing = await q<{ url: string }>(`SELECT url FROM gallery_photos WHERE id=$1`, [id]);
        if (!existing.length) return bad('not_found', 404);
        const url = existing[0].url || '';
        // Remove owned media first; failure leaves the record retryable.
        if (isMediaUrl(url)) {
          try {
            await mediaDel(url);
          } catch {
            return bad('blob_delete_failed', 502);
          }
        }
        await q(`DELETE FROM gallery_photos WHERE id=$1`, [id]);
        await opsAudit('gallery.delete', { id, actor: adminActor(req) });
        return NextResponse.json({ ok: true });
      }
      default:
        return bad('unknown_kind');
    }
  } catch {
    return bad('server_error', 500);
  }
}
