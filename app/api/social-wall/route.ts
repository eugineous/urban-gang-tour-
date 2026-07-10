import { NextResponse } from 'next/server';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { getIgWall } from '@/lib/server/social-wall';

// GET /api/social-wall -> { urls: [...] }
// Roles: public (anon), read-only. Serves ONLY the admin-curated list of public
// Instagram post URLs (settings key 'ig_wall') — no PII, no user data.
export async function GET(req: Request) {
  if (!rateLimit('wall:' + clientIp(req), 30, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  const urls = await getIgWall(); // tolerates db()==null -> []
  return NextResponse.json(
    { urls },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
  );
}
