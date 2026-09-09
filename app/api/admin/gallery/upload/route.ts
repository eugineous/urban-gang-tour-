import { NextResponse } from 'next/server';
import { r2Put, r2Configured } from '@/lib/server/r2';
import { isAdmin, hasPerm } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';

// Proxy upload for gallery photos: the browser POSTs the file straight to
// this route (see lib/client/r2-upload.ts's upload()), which writes it to R2
// via the native binding (env.UGT_UPLOADS, see lib/server/r2.ts) and returns
// the public URL. Replaces the old @vercel/blob/client handleUpload() token
// handshake (Vercel-only) and, before that, an R2 S3-API presigned-URL
// version — presigning turned out to require R2 API credentials
// (accessKeyId/secretAccessKey) even from inside a Worker, which this app
// deliberately never holds; the binding has zero credentials but also no
// presign capability, so the file now takes one extra hop through this
// Worker instead of going straight from the browser to storage. Fine for an
// admin-only, low-traffic upload path.
//
// Roles: admin only. Gated the same way as every other admin mutation
// (isAdmin cookie session + same-origin), checked before any bytes are read.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 8 * 1024 * 1024; // 8MB cap - enforced for real here (unlike
// a presigned URL, the file passes through this handler, so the byte count
// actually received can be checked, not just a client-declared size).

export async function POST(request: Request): Promise<NextResponse> {
  if (!isAdmin(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasPerm(request, 'gallery')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!requireOrigin(request)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!r2Configured()) return NextResponse.json({ error: 'r2_not_configured' }, { status: 503 });

  const pathname = new URL(request.url).searchParams.get('pathname') || '';
  if (!pathname.startsWith('gallery/')) {
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
