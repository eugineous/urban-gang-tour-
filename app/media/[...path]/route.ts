import { mediaGet, mediaKey } from '@/lib/server/media';
import { hasPerm, verifyAdminSession } from '@/lib/server/session';
import { currentApprovedOrganizer } from '@/lib/server/organizer-session';
import { hasDb, q } from '@/lib/server/db';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { cached } from '@/lib/server/microcache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path: string[] }> };

async function serve(req: Request, context: Context, head = false): Promise<Response> {
  if (!rateLimit('media:' + clientIp(req), 240, 60_000, req)) return new Response('Too many requests', { status: 429 });
  const { path } = await context.params;
  const url = '/media/' + path.join('/');
  const key = mediaKey(url);
  if (!key) return new Response('Not found', { status: 404 });
  const [scope, owner] = key.split('/');
  let privateAsset = scope === 'documents';
  try {
    if (scope === 'documents') {
      if (!(await verifyAdminSession(req)) || !hasPerm(req, 'documents')) return new Response('Unauthorized', { status: 401 });
    } else if (scope === 'gallery') {
      const admin = await verifyAdminSession(req);
      if (admin && hasPerm(req, 'gallery')) privateAsset = true;
      else {
        if (!hasDb()) return new Response('Not found', { status: 404 });
        const rows = await cached('media-gallery:' + url, 1000, () => q(`SELECT 1 FROM gallery_photos WHERE url=$1 AND published=true LIMIT 1`, [url]));
        if (!rows.length) return new Response('Not found', { status: 404 });
      }
    } else if (scope === 'organizer-events') {
      let published = false;
      if (hasDb()) {
        const rows = await cached('media-event:' + url, 1000, () => q(`SELECT 1 FROM marketplace_events WHERE image=$1 AND status IN ('published','completed') LIMIT 1`, [url]));
        published = rows.length > 0;
      }
      if (!published) {
        const admin = await verifyAdminSession(req);
        if (!(admin && hasPerm(req, 'marketplace'))) {
          const access = await currentApprovedOrganizer(req);
          if (!access.organizer || access.organizer.id !== owner) return new Response('Not found', { status: 404 });
        }
        privateAsset = true;
      }
    }
    const asset = await mediaGet(url);
    if (!asset) return new Response('Not found', { status: 404 });
    const etag = '"' + key.split('/').at(-2) + '"';
    const headers: Record<string, string> = {
      'Content-Type': asset.metadata.contentType,
      'Content-Length': String(asset.value.byteLength),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': privateAsset ? 'private, no-store' : 'public, max-age=60',
      'ETag': etag,
      'Vary': 'Cookie',
      'Content-Disposition': `${scope === 'documents' ? 'attachment' : 'inline'}; filename="${path.at(-1)}"`,
    };
    if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });
    return new Response(head ? null : asset.value, { headers });
  } catch {
    return new Response('Media temporarily unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
export const GET = (req: Request, context: Context) => serve(req, context);
export const HEAD = (req: Request, context: Context) => serve(req, context, true);
