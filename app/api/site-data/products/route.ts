import { NextResponse } from 'next/server';
import { hasDb } from '@/lib/server/db';
import { rateLimit, clientIp, PUBLIC_READ_NETWORK_LIMIT } from '@/lib/server/ratelimit';
import { readPublicProducts, publicCatalogDatabaseDiagnostic } from '@/lib/server/public-products';

// Public native catalog. Preserve retired products for historical receipts.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The query is coalesced inside the Worker. A separate HTTP stale snapshot
// must not keep withdrawn merchandise visible after its retirement.
const CACHE_HEADERS = { 'Cache-Control': 'no-store', 'Cloudflare-CDN-Cache-Control': 'no-store' };

export async function GET(req: Request) {
  // Loose: this is a public read that every page load makes, and a whole
  // school shares one IP. The strict budget is per-device — see ratelimit.ts.
  if (!rateLimit('site-products:' + clientIp(req), 60, 60_000, req, PUBLIC_READ_NETWORK_LIMIT)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  if (!hasDb()) return NextResponse.json({ error: 'catalog_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  try {
    const products = await readPublicProducts();
    return NextResponse.json({ ok: true, products }, { headers: CACHE_HEADERS });
  } catch (error) {
    // Fixed category, validated SQLSTATE and optional HTTP status only; never
    // raw driver messages, SQL, connection strings or customer records.
    console.error('public_catalog_read_failed', publicCatalogDatabaseDiagnostic(error));
    return NextResponse.json({ error: 'catalog_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
