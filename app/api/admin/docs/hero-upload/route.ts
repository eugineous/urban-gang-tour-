import { NextResponse } from 'next/server';
import { r2Put, r2Configured } from '@/lib/server/r2';
import { isAdmin, hasPerm } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';

// Proxy upload for promo hero/partner images: the browser POSTs the file
// straight to this route (see lib/client/r2-upload.ts's upload()), which
// writes it to R2 via the native binding (env.UGT_UPLOADS, see
// lib/server/r2.ts) and returns the public URL. This is the SAME pattern the
// gallery uses (app/api/admin/gallery/upload/route.ts) - see that file's
// header comment for why this proxies through the Worker instead of a
// direct-to-storage presigned PUT (R2 presigned URLs still require R2 API
// credentials even from a Worker; the binding has none, by design).
//
// Two prefixes are allowed:
//   promo-hero/    - a hero image cropped into a template's photo slot(s)
//   promo-partner/ - a custom partner logo added to the managed library
//
// Roles: documents perm (super_admin passes), same-origin, checked before
// any bytes are read. Mirrors the gallery route's gate exactly, only the
// perm key (documents vs gallery) and the pathname prefix differ.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 8 * 1024 * 1024; // 8MB cap - enforced for real (the file
// passes through this handler, so the actual byte count received is checked).

export async function POST(request: Request): Promise<NextResponse> {
  if (!isAdmin(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasPerm(request, 'documents')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!requireOrigin(request)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!r2Configured()) return NextResponse.json({ error: 'r2_not_configured' }, { status: 503 });

  const pathname = new URL(request.url).searchParams.get('pathname') || '';
  if (!pathname.startsWith('promo-hero/') && !pathname.startsWith('promo-partner/')) {
    return NextResponse.json({ error: 'invalid_pathname' }, { status: 400 });
  }
  const contentType = (request.headers.get('content-type') || '').split(';')[0].trim();
  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'invalid_content_type' }, { status: 400 });
  }

  let buf: Buffer;
  try {
    const arrayBuf = await request.arrayBuffer();
    if (arrayBuf.byteLength === 0 || arrayBuf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'invalid_size' }, { status: 400 });
    }
    buf = Buffer.from(arrayBuf);
  } catch {
    return NextResponse.json({ error: 'read_failed' }, { status: 400 });
  }

  try {
    const { url } = await r2Put(pathname, buf, { contentType });
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json({ error: (error as Error)?.message || 'upload_failed' }, { status: 502 });
  }
}
