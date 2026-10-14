import { NextResponse } from 'next/server';
import { q, hasDb } from '@/lib/server/db';
import { rateLimit, clientIp, PUBLIC_READ_NETWORK_LIMIT } from '@/lib/server/ratelimit';
import { cached } from '@/lib/server/microcache';

// The browser news rail consumes this read-only feed. It intentionally returns
// only articles whose Content desk publication date has arrived. Drafts,
// queued stories, and old template copy never enter the public runtime.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' };

export async function GET(req: Request) {
  if (!rateLimit('site-posts:' + clientIp(req), 60, 60_000, req, PUBLIC_READ_NETWORK_LIMIT)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  if (!hasDb()) return NextResponse.json({ ok: true, posts: [] }, { headers: CACHE_HEADERS });
  try {
    const posts = await cached('site-posts', 60_000, async () => {
      const rows = await q<any>(
        `SELECT slug, headline, section, image, dek, date::text AS date
         FROM posts
         WHERE published AND date <= CURRENT_DATE
         ORDER BY date DESC, slug ASC`
      );
      return rows.map((row) => ({
        id: String(row.slug),
        headline: String(row.headline || ''),
        date: String(row.date || '').slice(0, 10),
        section: String(row.section || 'News'),
        img: String(row.image || '/assets/poster.png'),
        dek: String(row.dek || ''),
      })).filter((post) => post.id && post.headline && /^\d{4}-\d{2}-\d{2}$/.test(post.date));
    });
    return NextResponse.json({ ok: true, posts }, { headers: CACHE_HEADERS });
  } catch {
    return NextResponse.json({ ok: true, posts: [] }, { headers: CACHE_HEADERS });
  }
}
