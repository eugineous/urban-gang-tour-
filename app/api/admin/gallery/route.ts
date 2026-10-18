import { NextResponse } from 'next/server';
import {revalidatePath} from 'next/cache';
import {invalidate} from '@/lib/server/microcache';
import { q, hasDb } from '@/lib/server/db';
import { mediaGet, isMediaUrl } from '@/lib/server/media';
import {ensureMediaLibrarySchema} from '@/lib/server/media-library';
import { hasPerm, isSuperAdmin, adminActor, verifyAdminSession } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import { ensureOpsSchema, opsAudit } from '@/lib/server/ops';
import {POST as mutateLibrary} from '../media-library/route';
import {readJsonObject} from '@/lib/server/json-body';

// Authenticated gallery management. Upload bytes are stored before captions
// and publication state are registered here.
//
// gallery_photos.id is a plain integer SERIAL (matches the table's
// pre-existing production shape — see lib/server/ops.ts's note above the
// CREATE TABLE), so every id here is parsed/bound as a number, not a string.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers:{'Cache-Control':'private, no-store'} });
}
function saved(data:unknown){
  invalidate('site-gallery');
  try{revalidatePath('/gallery')}catch{/* outside a Next request during tests */}
  return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}});
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
  if (!hasDb()) return bad('db_not_configured', 503);
  try {
    await ensureMediaLibrarySchema();
    const rows = await q(`SELECT id, url, caption, category, alt_text, width, height, published, sort_order, created_at, version FROM gallery_photos WHERE removed_at IS NULL ORDER BY published ASC, sort_order ASC, id ASC`);
    return NextResponse.json({ ok: true, rows, capabilities: { publish: isSuperAdmin(req) } },{headers:{'Cache-Control':'private, no-store'}});
  } catch {
    return bad('server_error', 500);
  }
}

export async function POST(req: Request) {
  if (!(await verifyAdminSession(req))) return bad('unauthorized', 401);
  if (!hasPerm(req, 'gallery')) return bad('forbidden', 403);
  if (!requireOrigin(req)) return bad('bad_origin', 403);
  if (!hasDb()) return bad('db_not_configured', 503);
  const parsed=await readJsonObject(req,4096);
  if(!parsed.ok)return bad(parsed.error,parsed.status);
  const body=parsed.value;
  const kind = s(body?.kind, 40);
  const d = (body.data&&typeof body.data==='object'?body.data:{}) as Record<string,unknown>;
  // A photographer can safely add and prepare a private asset. A public
  // release, permanent removal or public-order change is owner review, not
  // an accidental consequence of a limited gallery role.
  if (['publish', 'delete', 'reorder'].includes(kind) && !isSuperAdmin(req)) {
    return bad('super_admin_review_required', 403);
  }
  // Old open tabs must not bypass the library's version checks or audit trail.
  if(['update','publish','delete'].includes(kind)){
    const id=intId(d.id);
    if(!id)return bad('missing_id');
    if(!Number.isSafeInteger(d.version)||Number(d.version)<1)return bad('refresh_media_library',409);
    if(kind==='publish'&&typeof d.published!=='boolean')return bad('invalid_publish_state');
    const action=kind==='update'?'photo.save':kind==='delete'?'photo.trash':d.published?'photo.publish':'photo.unpublish';
    const headers=new Headers(req.headers);headers.delete('content-length');headers.set('content-type','application/json');
    return mutateLibrary(new Request(new URL('/api/admin/media-library',req.url),{method:'POST',headers,body:JSON.stringify({action,id,version:d.version,...(kind==='update'?{caption:d.caption,category:d.category,altText:d.altText}:{})})}));
  }
  // Public ordering is unchanged. Unversioned legacy reorder requests cannot
  // be allowed to overwrite newer photo versions one row at a time.
  if(kind==='reorder')return bad('refresh_media_library',409);
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
          `INSERT INTO gallery_photos (url, caption, category, width, height, sort_order) VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (url) DO UPDATE SET url=EXCLUDED.url RETURNING *`,
          [url, caption, category, width, height, sortOrder]
        );
        await opsAudit('gallery.upload', { id: row[0]?.id, actor: adminActor(req) });
        return saved({ ok: true, row: row[0] });
      }
      default:
        return bad('unknown_kind');
    }
  } catch {
    return bad('server_error', 500);
  }
}
