import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { isAdmin, hasPerm } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';

// Client-token handshake for direct-to-Vercel-Blob promo uploads. This is the
// SAME pattern the gallery uses (app/api/admin/gallery/upload/route.ts): the
// admin DocGen UI calls @vercel/blob/client's upload() with handleUploadUrl
// pointing here; upload() POSTs the file straight to Blob storage, never through
// this (or any) Next.js function - so a large hero image never has to fit inside
// a serverless function's request-body limit. This route only issues a
// short-lived, scoped client token; it never sees the file bytes.
//
// Two prefixes are allowed:
//   promo-hero/    - a hero image cropped into a template's photo slot(s)
//   promo-partner/ - a custom partner logo added to the managed library
//
// Roles: documents perm (super_admin passes), same-origin, checked before a
// token is ever generated. Mirrors the gallery route's gate exactly, only the
// perm key (documents vs gallery) and the pathname prefix differ.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 8 * 1024 * 1024; // 8MB cap

export async function POST(request: Request): Promise<NextResponse> {
  if (!isAdmin(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasPerm(request, 'documents')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
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
        if (!pathname.startsWith('promo-hero/') && !pathname.startsWith('promo-partner/')) {
          throw new Error('invalid_pathname');
        }
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({}),
        };
      },
      // The uploaded Blob URL is returned to the client by upload() itself and
      // then submitted with the promo payload on Generate; this webhook is not
      // relied upon for correctness (it is not publicly reachable from a local
      // dev server), matching the gallery route.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error)?.message || 'upload_failed' }, { status: 400 });
  }
}
