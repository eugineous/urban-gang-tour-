import { NextResponse } from 'next/server';
import { hasDb } from '@/lib/server/db';
import { rateLimit, clientIp, PUBLIC_READ_NETWORK_LIMIT } from '@/lib/server/ratelimit';
import {getBlogPosts} from '@/app/_lib/blog';

// The browser news rail consumes this read-only feed. It intentionally returns
// only articles whose Content desk publication date has arrived. Drafts,
// queued stories, and old template copy never enter the public runtime.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET(req: Request) {
  if (!rateLimit('site-posts:' + clientIp(req), 60, 60_000, req, PUBLIC_READ_NETWORK_LIMIT)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  if (!hasDb()) return NextResponse.json({ ok: true, posts: [] }, { headers: CACHE_HEADERS });
  try {
    const posts=(await getBlogPosts(true)).map(p=>({id:p.slug,headline:p.headline,date:p.datePublished.slice(0,10),section:p.section,img:p.image,dek:p.description}));
    return NextResponse.json({ ok: true, posts }, { headers: CACHE_HEADERS });
  } catch {
    return NextResponse.json({ ok: false, error: 'stories_temporarily_unavailable' }, { status: 503, headers: {'Cache-Control':'no-store','Retry-After':'5'} });
  }
}
