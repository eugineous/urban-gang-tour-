import { NextResponse } from 'next/server';
import { q, db } from '@/lib/server/db';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { ensureCatalogSeeded } from '@/lib/server/catalog';

// Public, read-only view of active shop products — the single DB-backed
// source app/_components/V25App.tsx bridges into window.__UGT_PRODUCTS for
// the v25 template's shop grid (see public/v25-template.html PRODUCTS).
// Only active=true rows are ever returned (a retired product id stays in the
// products table forever so past orders/receipts still resolve its name —
// see lib/server/catalog.ts orderLines — it just stops appearing here).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!rateLimit('site-products:' + clientIp(req), 30, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  if (!db()) return NextResponse.json({ ok: true, products: [] }, { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' } });
  try {
    await ensureCatalogSeeded();
    const rows = await q<any>(`SELECT id, name, price, image, category, description FROM products WHERE active ORDER BY id`);
    const products = rows.map((r) => ({
      id: r.id, name: r.name, price: Number(r.price), image: r.image || '', category: r.category || '', description: r.description || '',
    }));
    return NextResponse.json(
      { ok: true, products },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' } }
    );
  } catch {
    return NextResponse.json({ ok: true, products: [] });
  }
}
