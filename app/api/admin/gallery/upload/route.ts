import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { isAdmin } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';

// Client-token handshake for direct-to-Vercel-Blob gallery uploads. The
// admin Gallery UI calls @vercel/blob/client's upload() with
// handleUploadUrl pointing here; upload() itself POSTs the file straight to
// Blob storage, never through this (or any) Next.js function — so an 8MB
// photo never has to fit inside a Vercel serverless function's request body
// limit. This route only ever issues a short-lived, scoped client token; it
// never sees the file bytes.
//
// Roles: admin only. Gated the same way as every other admin mutation
// (isAdmin cookie session + same-origin), checked before a token is ever
// generated.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 8 * 1024 * 1024; // 8MB cap

export async function POST(request: Request): Promise<NextResponse> {
  if (!isAdmin(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!requireOrigin(request)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith('gallery/')) {
          throw new Error('invalid_pathname');
        }
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({}),
        };
      },
      // Not relied upon for correctness: this webhook target has to be
      // publicly reachable by Vercel's Blob service, which a local dev
      // server (even one running against pulled production env vars) is
      // not. The gallery_photos row is created deterministically by the
      // client's follow-up POST /api/admin/gallery {kind:'upload'} call once
      // upload() resolves with the final Blob URL (see app/admin/ops/
      // Gallery.tsx) — that path works identically in dev and prod.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error)?.message || 'upload_failed' }, { status: 400 });
  }
}
