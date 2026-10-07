import { NextResponse } from 'next/server';
import { mediaPut, mediaConfigured } from '@/lib/server/media';
import { hasPerm, verifyAdminSession } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';

// Authenticated image upload to durable KV. Scope and origin checks precede
// reading bytes. Clients retain progress and the same URL response contract.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 8 * 1024 * 1024; // 8MB cap - enforced for real (the file
// passes through this handler, so the actual byte count received is checked).

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await verifyAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasPerm(request, 'documents')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!requireOrigin(request)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!mediaConfigured()) return NextResponse.json({ error: 'media_not_configured' }, { status: 503 });

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
    const { url } = await mediaPut(pathname, buf, { contentType });
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json({ error: (error as Error)?.message || 'upload_failed' }, { status: 502 });
  }
}
