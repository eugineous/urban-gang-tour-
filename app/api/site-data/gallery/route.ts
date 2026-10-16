import { NextResponse } from 'next/server';
import { hasDb } from '@/lib/server/db';
import { rateLimit, clientIp, PUBLIC_READ_NETWORK_LIMIT } from '@/lib/server/ratelimit';
import {publishedGallery} from '@/lib/server/published-gallery';
import { GALLERY_ARCHIVE } from '@/lib/gallery-archive';

// Published-only gallery DTO. The page uses the same reader, with five-second
// coalescing and a fifteen-second absolute stale fallback limit. No retired
// frontend bridge or intermediary cache is needed to display admin uploads.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET(req: Request) {
  // Loose: a public read that every page load makes, and a whole venue shares
  // one IP. The strict budget is per-device — see ratelimit.ts.
  if (!rateLimit('site-gallery:' + clientIp(req), 60, 60_000, req, PUBLIC_READ_NETWORK_LIMIT)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  if (!hasDb()) {
    return NextResponse.json({ ok: true, source: 'archive', photos: GALLERY_ARCHIVE }, { headers: CACHE_HEADERS });
  }
  try {
    const photos = await publishedGallery();
    return NextResponse.json({ ok: true, source: 'published', photos }, { headers: CACHE_HEADERS });
  } catch {
    // DB hiccup: the desktop and mobile clients render their explicit empty
    // gallery state. Do not revive retired photos from a static fallback.
    return NextResponse.json({ ok: true, photos: [] });
  }
}
