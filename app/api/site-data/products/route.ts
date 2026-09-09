import { NextResponse } from 'next/server';
import { q, hasDb } from '@/lib/server/db';
import { rateLimit, clientIp, PUBLIC_READ_NETWORK_LIMIT } from '@/lib/server/ratelimit';
import { cached } from '@/lib/server/microcache';
import { ensureCatalogSeeded } from '@/lib/server/catalog';

// Public, read-only view of active shop products — the single DB-backed
// source app/_components/V25App.tsx bridges into window.__UGT_PRODUCTS for
// the v25 template's shop grid (see public/v25-template.html PRODUCTS).
// Only active=true rows are ever returned (a retired product id stays in the
// products table forever so past orders/receipts still resolve its name —
// see lib/server/catalog.ts orderLines — it just stops appearing here).
//
// Every page load fetches this, so it is cached in-isolate for 60s with
// request coalescing (lib/server/microcache.ts). Without that, a thousand
// simultaneous arrivals were a thousand SELECTs plus a thousand
// ensureCatalogSeeded() calls for one answer that is the same for everyone.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' };

export async function GET(req: Request) {
  // Loose: this is a public read that every page load makes, and a whole
  // school shares one IP. The strict budget is per-device — see ratelimit.ts.
  if (!rateLimit('site-products:' + clientIp(req), 60, 60_000, req, PUBLIC_READ_NETWORK_LIMIT)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  if (!hasDb()) return NextResponse.json({ ok: true, products: [] }, { headers: CACHE_HEADERS });
  try {
    const products = await cached('site-products', 60_000, async () => {
      await ensureCatalogSeeded();
      const rows = await q<any>(
        `SELECT id, name, price, image, category, description FROM products WHERE active ORDER BY id`,
      );
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        price: Number(r.price),
        image: r.image || '',
        category: r.category || '',
        description: r.description || '',
      }));
    });
    return NextResponse.json({ ok: true, products }, { headers: CACHE_HEADERS });
  } catch {
    return NextResponse.json({ ok: true, products: [] });
  }
}
