import { NextResponse } from 'next/server';
import { q, db } from '@/lib/server/db';
import { del } from '@vercel/blob';
import { isAdmin, hasPerm, adminActor } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import { ensureOpsSchema, opsAudit } from '@/lib/server/ops';
import { ensureGallerySeeded } from '@/lib/server/gallery';

// Admin gallery photo CRUD: list, finalize an upload (the file itself is
// already in Vercel Blob by the time this is called — see
// app/api/admin/gallery/upload/route.ts for the client-token handshake),
// reorder, caption/category edit, delete. Roles: admin only (isAdmin cookie
// session) + same-origin (requireOrigin) on every mutation, matching
// app/api/admin/ops/route.ts's conventions exactly.
//
// gallery_photos.id is a plain integer SERIAL (matches the table's
// pre-existing production shape — see lib/server/ops.ts's note above the
// CREATE TABLE), so every id here is parsed/bound as a number, not a string.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Only accept URLs that actually live in our Vercel Blob store as an
// "upload" — never let the browser hand us an arbitrary URL to store as if
// it were an uploaded file (CLAUDE.md: schema-based input validation, never
// trust the browser).
const BLOB_URL_RE = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i;

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

export async function GET(req: Request) {
  if (!isAdmin(req)) return bad('unauthorized', 401);
  if (!hasPerm(req, 'gallery')) return bad('forbidden', 403);
  if (!db()) return bad('db_not_configured', 503);
  try {
    await ensureOpsSchema();
    await ensureGallerySeeded();
    const rows = await q(`SELECT id, url, caption, category, sort_order, created_at FROM gallery_photos ORDER BY sort_order ASC, id ASC`);
    return NextResponse.json({ ok: true, rows });
  } catch {
    return bad('server_error', 500);
  }
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return bad('unauthorized', 401);
  if (!hasPerm(req, 'gallery')) return bad('forbidden', 403);
  if (!requireOrigin(req)) return bad('bad_origin', 403);
  if (!db()) return bad('db_not_configured', 503);
  let body: any;
  try { body = await req.json(); } catch { return bad('invalid_json'); }
  const kind = s(body?.kind, 40);
  const d = body?.data ?? {};
  try {
    await ensureOpsSchema();
    await ensureGallerySeeded();
    switch (kind) {
      // Finalize a photo already uploaded straight to Vercel Blob from the
      // browser (see the admin Gallery UI's use of @vercel/blob/client's
      // upload()). We only ever write the resulting Blob URL, never accept
      // raw file bytes on this route.
      case 'upload': {
        const url = s(d.url, 600);
        if (!url || !BLOB_URL_RE.test(url)) return bad('invalid_url');
        const caption = s(d.caption, 300);
        const category = s(d.category, 120);
        const next = await q<{ next: number }>(`SELECT COALESCE(MAX(sort_order),0)+10 AS next FROM gallery_photos`);
        const sortOrder = Number(next[0]?.next) || 10;
        const row = await q(
          `INSERT INTO gallery_photos (url, caption, category, sort_order) VALUES ($1,$2,$3,$4) RETURNING *`,
          [url, caption, category, sortOrder]
        );
        await opsAudit('gallery.upload', { id: row[0]?.id, actor: adminActor(req) });
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'update': {
        const id = intId(d.id);
        if (!id) return bad('missing_id');
        const caption = s(d.caption, 300);
        const category = s(d.category, 120);
        const row = await q(`UPDATE gallery_photos SET caption=$1, category=$2 WHERE id=$3 RETURNING *`, [caption, category, id]);
        if (!row.length) return bad('not_found', 404);
        await opsAudit('gallery.update', { id, actor: adminActor(req) });
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'reorder': {
        const ids = Array.isArray(d.ids) ? d.ids.map((x: unknown) => intId(x)).filter((x: number | null): x is number => x !== null).slice(0, 500) : [];
        if (!ids.length) return bad('missing_ids');
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
        // Only ever call Blob's del() on rows that actually live in Blob —
        // seeded rows point at public/assets/ (a repo file, not Blob) and
        // must never be passed to del(). If the Blob delete fails, bail
        // before touching the DB row so retrying the delete stays safe.
        if (BLOB_URL_RE.test(url)) {
          try {
            await del(url);
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
