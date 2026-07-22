import { NextResponse, after } from 'next/server';
import { q, db } from '@/lib/server/db';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { sameOrigin } from '@/lib/server/origin';
import { getProducts } from '@/lib/server/catalog';
import { notifyNewReview } from '@/lib/server/notify';

// Public product reviews.
// GET ?product=<id> — approved reviews + aggregate for one catalog product.
// POST — queue a review for moderation (approved=false). Nothing appears on
// the site or in the shop JSON-LD until an admin approves it, so the
// aggregateRating Google sees is always real, moderated data.

export async function GET(req: Request) {
  if (!rateLimit('revg:' + clientIp(req), 30, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  const product = new URL(req.url).searchParams.get('product') || '';
  const catalogPrices = await getProducts();
  if (!catalogPrices[product]) return NextResponse.json({ error: 'unknown_product' }, { status: 400 });
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  try {
    const rows = await q<{ author: string; rating: number; body: string; created_at: string }>(
      `SELECT author, rating, body, created_at FROM product_reviews
       WHERE product_id = $1 AND approved ORDER BY created_at DESC LIMIT 50`,
      [product]
    );
    const aggregate = rows.length
      ? {
          ratingValue: Math.round((rows.reduce((s, r) => s + r.rating, 0) / rows.length) * 10) / 10,
          reviewCount: rows.length,
        }
      : null;
    return NextResponse.json({ ok: true, reviews: rows, aggregate });
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message).slice(0, 200) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!rateLimit('rev:' + clientIp(req), 5, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  // strict schema: reject unexpected fields
  const allowed = new Set(['product_id', 'author', 'rating', 'body']);
  for (const k of Object.keys(body)) {
    if (!allowed.has(k)) return NextResponse.json({ error: `unexpected_field:${k}` }, { status: 400 });
  }
  const { product_id, author, rating, body: text } = body;
  const catalogPrices = await getProducts();
  if (typeof product_id !== 'string' || !catalogPrices[product_id]) return NextResponse.json({ error: 'invalid_product' }, { status: 400 });
  if (typeof author !== 'string' || author.trim().length < 2 || author.length > 60) return NextResponse.json({ error: 'invalid_author' }, { status: 400 });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: 'invalid_rating' }, { status: 400 });
  if (typeof text !== 'string' || text.trim().length < 5 || text.length > 1000) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  try {
    await q(
      `INSERT INTO product_reviews (product_id, author, rating, body, approved)
       VALUES ($1,$2,$3,$4,false)`,
      [product_id, author.trim(), rating, text.trim()]
    );
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message).slice(0, 200) }, { status: 500 });
  }
  // Ping the owner so a queued review gets moderated promptly (it stays
  // hidden until approved, so this is the only signal it arrived).
  after(() => notifyNewReview({ product: product_id, author: author.trim(), rating, body: text.trim() }));
  return NextResponse.json({ ok: true, pending: true });
}
