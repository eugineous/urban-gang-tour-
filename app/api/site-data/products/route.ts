import { NextResponse } from 'next/server';
import { hasDb } from '@/lib/server/db';
import { rateLimit, clientIp, PUBLIC_READ_NETWORK_LIMIT } from '@/lib/server/ratelimit';
import { readPublicProducts, publicCatalogDatabaseErrorCode } from '@/lib/server/public-products';

// Public native catalog. Preserve retired products for historical receipts.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' };

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
    // Only a validated SQLSTATE is logged: never raw driver messages, SQL,
    // connection strings, credentials or customer records.
    console.error('public_catalog_read_failed', { code: publicCatalogDatabaseErrorCode(error) || 'unclassified' });
    return NextResponse.json({ error: 'catalog_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
