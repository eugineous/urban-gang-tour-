import { NextResponse } from 'next/server';
import { mediaPut, mediaConfigured } from '@/lib/server/media';
import { hasPerm, verifyAdminSession } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import {readUploadBody,expectedMediaSignature} from '@/lib/server/upload-body';
import {rateLimit,clientIp} from '@/lib/server/ratelimit';

// Authenticated image upload to durable KV. Scope and origin checks precede
// reading bytes. Clients retain progress and the same URL response contract.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp','video/mp4'];
const MAX_BYTES = 8 * 1024 * 1024; // 8MB cap - enforced for real here (unlike
// a presigned URL, the file passes through this handler, so the byte count
// actually received can be checked, not just a client-declared size).

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await verifyAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasPerm(request, 'gallery')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!requireOrigin(request)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if(!rateLimit('gallery-upload:'+clientIp(request),20,60000))return NextResponse.json({error:'too_many_requests'},{status:429});
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
    const result=await readUploadBody(request,contentType==='video/mp4'?15*1024*1024:MAX_BYTES,contentType);
    if(!result.ok)return NextResponse.json({error:result.error},{status:result.status});
    buf = result.body;
    if (!expectedMediaSignature(buf, contentType)) {
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
