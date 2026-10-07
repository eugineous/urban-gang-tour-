import { NextResponse } from 'next/server';
import { mediaPut, mediaConfigured } from '@/lib/server/media';
import { hasPerm, verifyAdminSession } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';

// Authenticated image upload to durable KV. Scope and origin checks precede
// reading bytes. Clients retain progress and the same URL response contract.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 8 * 1024 * 1024; // 8MB cap - enforced for real here (unlike
// a presigned URL, the file passes through this handler, so the byte count
// actually received can be checked, not just a client-declared size).

function hasExpectedImageSignature(buf: Buffer, contentType: string): boolean {
  if (contentType === 'image/jpeg') return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (contentType === 'image/png') return buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (contentType === 'image/webp') return buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP';
  return false;
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await verifyAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasPerm(request, 'gallery')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!requireOrigin(request)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!mediaConfigured()) return NextResponse.json({ error: 'media_not_configured' }, { status: 503 });

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
    if (!hasExpectedImageSignature(buf, contentType)) {
      return NextResponse.json({ error: 'invalid_image_bytes' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'read_failed' }, { status: 400 });
  }

  try {
    const { url } = await mediaPut(pathname, buf, { contentType });
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json({ error: (error as Error)?.message || 'upload_failed' }, { status: 502 });
  }
}
