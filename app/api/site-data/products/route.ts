import { NextResponse } from 'next/server';
import { q, hasDb } from '@/lib/server/db';
import { rateLimit, clientIp, PUBLIC_READ_NETWORK_LIMIT } from '@/lib/server/ratelimit';
import { cached } from '@/lib/server/microcache';

// Public, read-only view of active shop products — the single DB-backed
// source app/_components/V25App.tsx bridges into window.__UGT_PRODUCTS for
// the v25 template's shop grid (see public/v25-template.html PRODUCTS).
// Only active=true rows are ever returned (a retired product id stays in the
// products table forever so past orders/receipts still resolve its name —
// see lib/server/catalog.ts orderLines — it just stops appearing here).
//
// Every page load fetches this, so it is cached in-isolate for 60s with
// request coalescing (lib/server/microcache.ts). Without that, a thousand
// simultaneous arrivals are coalesced into one SELECT for one shared answer.
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
      const rows = await q<any>(
        `SELECT p.id, p.name, p.price, p.image, p.category, p.description,
                COALESCE(
                  jsonb_agg(jsonb_build_object('label',v.label,'priceAdjustment',v.price_adjustment,'sku',v.sku)
                    ORDER BY v.label) FILTER (WHERE v.id IS NOT NULL),
                  '[]'::jsonb
                ) AS variants
         FROM products p
         LEFT JOIN merch_variants v ON v.product_id=p.id AND v.active=true
         WHERE p.active
         GROUP BY p.id, p.name, p.price, p.image, p.category, p.description
         ORDER BY p.id`,
      );
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        price: Number(r.price),
        image: r.image || '',
        category: r.category || '',
        description: r.description || '',
        variants: Array.isArray(r.variants) ? r.variants.map((v: any) => ({
          label: String(v.label || ''),
          priceAdjustment: Number(v.priceAdjustment || 0),
          sku: String(v.sku || ''),
        })).filter((v: any) => v.label) : [],
      }));
    });
    return NextResponse.json({ ok: true, products }, { headers: CACHE_HEADERS });
  } catch {
    return NextResponse.json({ ok: true, products: [] });
  }
}
