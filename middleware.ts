import { NextRequest, NextResponse } from 'next/server';
import { hasDb, q } from '@/lib/server/db';

// Backward-compatible redirect: old /events/{id} URLs forward to the canonical
// /events/{slug} so existing bookmarks and indexed links never 404.
// Only runs for /events/{something} paths that are NOT /events itself.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const match = /^\/events\/([a-z0-9-]{1,80})$/i.exec(pathname);
  if (!match) return NextResponse.next();

  const slugOrId = match[1];

  // If it's already a valid slug, let it through to the [slug] route.
  // We only redirect when the path segment is NOT a slug but IS an id.
  // Heuristic: slugs are lowercase-hyphenated; ids may be anything else.
  // We check the DB: if a tour_events row has this slug, pass through.
  if (hasDb()) {
    try {
      const rows = await q<{ slug: string }>(
        `SELECT slug FROM tour_events WHERE slug=$1 LIMIT 1`,
        [slugOrId]
      );
      if (rows[0]) return NextResponse.next(); // it's a valid slug, let [slug] handle it
      // Not a slug — try to find by id and redirect
      const idRows = await q<{ slug: string }>(
        `SELECT slug FROM tour_events WHERE id=$1 AND slug != '' LIMIT 1`,
        [slugOrId]
      );
      if (idRows[0]) {
        const url = req.nextUrl.clone();
        url.pathname = `/events/${idRows[0].slug}`;
        return NextResponse.redirect(url, 301);
      }
    } catch {
      // DB unavailable — let it through to [slug] which will 404 gracefully
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/events/:path*',
};
