import { NextResponse } from 'next/server';
import { mediaPut, mediaConfigured } from '@/lib/server/media';
import { currentApprovedOrganizer } from '@/lib/server/organizer-session';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';

// Proxy upload for organizer event images. The browser POSTs the file bytes
// as the raw request body (Content-Type = file mime type) to this route,
// which stores it in Workers KV under the organizer scope and
// returns { ok: true, url }. Max 4 MB, images only. Rate limited to 5 per minute.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

function hasExpectedImageSignature(buf: Buffer, contentType: string): boolean {
  if (contentType === 'image/jpeg')
    return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (contentType === 'image/png')
    return (
      buf.length >= 8 &&
      buf
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  if (contentType === 'image/webp')
    return (
      buf.length >= 12 &&
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  // GIF: GIF87a or GIF89a
  if (contentType === 'image/gif')
    return buf.length >= 6 && buf.subarray(0, 6).toString('ascii').startsWith('GIF8');
  return false;
}

function sanitizeFilename(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, '-')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!rateLimit('org-img-upload:' + clientIp(req), 5, 60_000))
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });

  const access = await currentApprovedOrganizer(req);
  if (!access.organizer)
    return NextResponse.json({ error: access.error }, { status: access.status });

  if (!mediaConfigured())
    return NextResponse.json({ error: 'media_not_configured' }, { status: 503 });

  // Filename comes in via ?filename= query param (set by client-side uploader)
  const rawFilename =
    new URL(req.url).searchParams.get('filename') || `image-${Date.now()}.jpg`;
  const filename = sanitizeFilename(rawFilename);

  const contentType = (req.headers.get('content-type') || '').split(';')[0].trim();
  if (!ALLOWED_TYPES.includes(contentType))
    return NextResponse.json({ error: 'invalid_content_type' }, { status: 400 });

  let buf: Buffer;
  try {
    const arrayBuf = await req.arrayBuffer();
    if (arrayBuf.byteLength === 0 || arrayBuf.byteLength > MAX_BYTES)
      return NextResponse.json({ error: 'invalid_size' }, { status: 400 });
    buf = Buffer.from(arrayBuf);
    if (!hasExpectedImageSignature(buf, contentType))
      return NextResponse.json({ error: 'invalid_image_bytes' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'read_failed' }, { status: 400 });
  }

  try {
    const key = `organizer-events/${access.organizer.id}/${filename}`;
    const { url } = await mediaPut(key, buf, { contentType });
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error)?.message || 'upload_failed' },
      { status: 502 }
    );
  }
}
