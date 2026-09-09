import { NextResponse } from 'next/server';
import { rateLimit, clientIp, PUBLIC_READ_NETWORK_LIMIT } from '@/lib/server/ratelimit';
import { cached } from '@/lib/server/microcache';
import { getActivePromos } from '@/lib/server/promos';

// Public, read-only view of currently-active shop promos. Powers the
// sitewide PromoBanner and the shop's client-side price overlay. Exposes
// ONLY intentionally-public fields: never max_uses/uses/id/starts_on/code —
// a promo code is only ever validated server-side at checkout
// (lib/server/promos.ts validatePromoCode), never revealed here even for a
// promo that requires one (hasCode just flags that a code exists).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Loose: a public read that every page load makes, and a whole venue shares
  // one IP. The strict budget is per-device — see ratelimit.ts.
  if (!rateLimit('promos:' + clientIp(req), 60, 60_000, req, PUBLIC_READ_NETWORK_LIMIT)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  let promos: Awaited<ReturnType<typeof getActivePromos>> = [];
  try {
    // Cached in-isolate with request coalescing: this fires on every page load
    // and the answer is identical for everyone. See lib/server/microcache.ts.
    promos = await cached('active-promos', 60_000, getActivePromos);
  } catch {
    // db not configured or a transient error — the banner/overlay just hide
    promos = [];
  }
  const rows = promos.map((p) => ({
    name: p.name,
    discountType: p.promo_type,
    discount: p.discount,
    bannerText: p.banner_text,
    productIds: p.product_ids,
    endsOn: p.ends_on,
    hasCode: !!p.code,
  }));
  return NextResponse.json(
    { ok: true, promos: rows },
    { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' } }
  );
}
