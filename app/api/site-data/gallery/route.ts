import { NextResponse } from 'next/server';
import { q, db } from '@/lib/server/db';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { ensureGallerySeeded } from '@/lib/server/gallery';

// Public, read-only view of the gallery photo wall — the single DB-backed
// source app/_components/V25App.tsx bridges into window.__UGT_GALLERY for
// the v25 template's this.GALLERY (see public/v25-template.html). Only rows
// in gallery_photos are ever returned, ordered by sort_order (admin drag/
// move-order), so a re-order is live for every visitor within the cache
// window below.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!rateLimit('site-gallery:' + clientIp(req), 30, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  if (!db()) {
    return NextResponse.json(
      { ok: true, photos: [] },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' } }
    );
  }
  try {
    await ensureGallerySeeded();
    const rows = await q<any>(`SELECT id, url, caption, category, sort_order FROM gallery_photos ORDER BY sort_order ASC, id ASC`);
    const photos = rows.map((r) => ({
      id: r.id,
      url: r.url || '',
      caption: r.caption || '',
      category: r.category || '',
      sortOrder: Number(r.sort_order) || 0,
    }));
    return NextResponse.json(
      { ok: true, photos },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' } }
    );
  } catch {
    // DB hiccup — the template's window.__UGT_GALLERY bridge falls back to
    // its frozen literal, so an empty list here is safe, never a broken page.
    return NextResponse.json({ ok: true, photos: [] });
  }
}
