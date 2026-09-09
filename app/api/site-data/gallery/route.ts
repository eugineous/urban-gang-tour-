import { NextResponse } from 'next/server';
import { q, hasDb } from '@/lib/server/db';
import { rateLimit, clientIp, PUBLIC_READ_NETWORK_LIMIT } from '@/lib/server/ratelimit';
import { cached } from '@/lib/server/microcache';
import { ensureGallerySeeded } from '@/lib/server/gallery';

// Public, read-only view of the gallery photo wall — the single DB-backed
// source app/_components/V25App.tsx bridges into window.__UGT_GALLERY for
// the v25 template's this.GALLERY (see public/v25-template.html). Only rows
// in gallery_photos are ever returned, ordered by sort_order (admin drag/
// move-order), so a re-order is live for every visitor within the cache
// window below.
//
// Cached in-isolate for 60s with request coalescing — see
// lib/server/microcache.ts for why a plain TTL is not enough under load.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' };

export async function GET(req: Request) {
  // Loose: a public read that every page load makes, and a whole venue shares
  // one IP. The strict budget is per-device — see ratelimit.ts.
  if (!rateLimit('site-gallery:' + clientIp(req), 60, 60_000, req, PUBLIC_READ_NETWORK_LIMIT)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  if (!hasDb()) {
    return NextResponse.json({ ok: true, photos: [] }, { headers: CACHE_HEADERS });
  }
  try {
    const photos = await cached('site-gallery', 60_000, async () => {
      await ensureGallerySeeded();
      const rows = await q<any>(
        `SELECT id, url, caption, category, sort_order FROM gallery_photos ORDER BY sort_order ASC, id ASC`,
      );
      return rows.map((r) => ({
        id: r.id,
        url: r.url || '',
        caption: r.caption || '',
        category: r.category || '',
        sortOrder: Number(r.sort_order) || 0,
      }));
    });
    return NextResponse.json({ ok: true, photos }, { headers: CACHE_HEADERS });
  } catch {
    // DB hiccup — the template's window.__UGT_GALLERY bridge falls back to
    // its frozen literal, so an empty list here is safe, never a broken page.
    return NextResponse.json({ ok: true, photos: [] });
  }
}
