import { NextResponse } from 'next/server';
import { q, hasDb } from '@/lib/server/db';
import { rateLimit, clientIp, PUBLIC_READ_NETWORK_LIMIT } from '@/lib/server/ratelimit';
import { ensureOpsSchema } from '@/lib/server/ops';
import { cached } from '@/lib/server/microcache';

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
    const products = await cached('site-products', 60_000, async () => {
      await ensureOpsSchema();
      const rows = await q<any>(
        `SELECT p.id, p.name, p.price, p.image, p.category, p.description,
                CASE WHEN p.inventory_tracked THEN (SELECT COALESCE(SUM(quantity),0)::int FROM merch_inventory_moves WHERE product_id=p.id) ELSE NULL END AS stock,
                COALESCE(
                  jsonb_agg(jsonb_build_object('label',v.label,'priceAdjustment',v.price_adjustment,'sku',v.sku,'stock',(SELECT CASE WHEN COUNT(*)>0 THEN COALESCE(SUM(quantity),0)::int ELSE NULL END FROM merch_inventory_moves WHERE variant_id=v.id))
                    ORDER BY v.label) FILTER (WHERE v.id IS NOT NULL),
                  '[]'::jsonb
                ) AS variants
         FROM products p
         LEFT JOIN merch_variants v ON v.product_id=p.id AND v.active=true
         WHERE p.active
         GROUP BY p.id, p.name, p.price, p.image, p.category, p.description, p.inventory_tracked
         ORDER BY p.id`,
      );
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        price: Number(r.price),
        stock: r.stock===null||r.stock===undefined?null:Math.max(0,Number(r.stock)),
        image: r.image || '',
        category: r.category || '',
        description: r.description || '',
        variants: Array.isArray(r.variants) ? r.variants.map((v: any) => ({
          label: String(v.label || ''),
          priceAdjustment: Number(v.priceAdjustment || 0),
          sku: String(v.sku || ''),
          stock: v.stock===null||v.stock===undefined?null:Math.max(0,Number(v.stock)),
        })).filter((v: any) => v.label) : [],
      }));
    });
    return NextResponse.json({ ok: true, products }, { headers: CACHE_HEADERS });
  } catch {
    return NextResponse.json({ error: 'catalog_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
