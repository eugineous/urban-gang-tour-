import { NextResponse } from 'next/server';
import { PRICES, serverTotalWithPromos } from '@/lib/server/catalog';
import { recordPromoCodeUse } from '@/lib/server/promos';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { sameOrigin } from '@/lib/server/origin';
import { alertCritical } from '@/lib/server/alert';
import { stripe, stripeConfigured } from '@/lib/server/stripe';

// Card checkout (Stripe Checkout Session). Public (anon) create, rate-limited.
// Prices come ONLY from lib/server/catalog.ts — the browser sends ids+qty.
// Order row is written BEFORE the Stripe session so the webhook always has a
// ledger row to reconcile against (metadata.order_id).

export const runtime = 'nodejs';

const SUCCESS_URL = 'https://urbangangtour.co.ke/pay/success?session_id={CHECKOUT_SESSION_ID}';
const CANCEL_URL = 'https://urbangangtour.co.ke/shop';
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

let columnsReady = false;
async function ensureColumns(q: (sql: string, params?: any[]) => Promise<any[]>) {
  if (columnsReady) return;
  await q(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS pay_method TEXT DEFAULT 'mpesa'`);
  await q(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session TEXT`);
  await q(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent TEXT`);
  columnsReady = true;
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!rateLimit(clientIp(req), 8, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  // Strict schema: {items:[{id,qty}], email?, promoCode?} — reject anything else.
  const allowed = new Set(['items', 'email', 'promoCode']);
  for (const k of Object.keys(body)) {
    if (!allowed.has(k)) return NextResponse.json({ error: `unexpected_field:${k}` }, { status: 400 });
  }
  const { items, email, promoCode } = body;
  if (promoCode !== undefined && (typeof promoCode !== 'string' || promoCode.length > 60)) {
    return NextResponse.json({ error: 'invalid_promo_code' }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
    return NextResponse.json({ error: 'invalid_items' }, { status: 400 });
  }
  for (const it of items) {
    if (!it || typeof it !== 'object' || Array.isArray(it)) {
      return NextResponse.json({ error: 'invalid_item' }, { status: 400 });
    }
    for (const k of Object.keys(it)) {
      if (k !== 'id' && k !== 'qty') return NextResponse.json({ error: `unexpected_field:items.${k}` }, { status: 400 });
    }
    if (typeof it.id !== 'string' || !PRICES[it.id]) {
      return NextResponse.json({ error: 'unknown_product' }, { status: 400 });
    }
    if (!Number.isInteger(it.qty) || it.qty < 1 || it.qty > 20) {
      return NextResponse.json({ error: 'invalid_item' }, { status: 400 });
    }
  }
  const emailStr = typeof email === 'string' && email ? email.trim() : '';
  if (email !== undefined && typeof email !== 'string') {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (emailStr && (emailStr.length > 200 || !EMAIL_RE.test(emailStr))) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  if (!stripeConfigured()) return NextResponse.json({ error: 'card_not_configured' }, { status: 503 });

  let total: number;
  let lines: { id: string; qty: number; name: string; unit: number }[];
  let appliedPromoCode: { promoId: number; promoName: string } | null;
  try {
    const priced = await serverTotalWithPromos(
      items.map((it: any) => ({ id: it.id, qty: it.qty })),
      promoCode
    );
    total = priced.total;
    lines = priced.lines.map((l) => ({ id: l.id, qty: l.qty, name: l.name, unit: l.unit }));
    appliedPromoCode = priced.appliedPromoCode;
  } catch (e: any) { return NextResponse.json({ error: String(e.message) }, { status: 400 }); }

  // Same id shape as the M-Pesa ledger, plus entropy so parallel card
  // checkouts in the same millisecond can't collide on the primary key.
  const id = 'ORD-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();

  // The webhook can only reconcile a row that exists — no ledger, no charge.
  try {
    const { q, db } = await import('@/lib/server/db');
    if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
    await ensureColumns(q);
    await q(
      `INSERT INTO orders (id, items, total, name, email, phone, status, pay_method)
       VALUES ($1,$2,$3,$4,$5,$6,'pending','card')`,
      [id, JSON.stringify(lines), total, '', emailStr, '']
    );
    // Order is now durably created — safe to count the code redemption.
    if (appliedPromoCode) await recordPromoCodeUse(appliedPromoCode.promoId);
  } catch (e: any) {
    console.error('[stripe-checkout-db]', e);
    await alertCritical('Card order ledger write failed', `order ${id} total ${total}: ${String(e?.message || e)}`);
    return NextResponse.json({ error: 'order_create_failed' }, { status: 500 });
  }

  try {
    const s = stripe()!;
    const session = await s.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: lines.map((l) => ({
          quantity: l.qty,
          price_data: {
            currency: 'kes',
            unit_amount: l.unit * 100, // discounted KES -> cents (never the raw catalog price)
            product_data: { name: l.name },
          },
        })),
        metadata: { order_id: id },
        payment_intent_data: { metadata: { order_id: id } },
        client_reference_id: id,
        ...(emailStr ? { customer_email: emailStr } : {}),
        success_url: SUCCESS_URL,
        cancel_url: CANCEL_URL,
      },
      // Retries of this order id reuse the same Stripe session — no double charge.
      { idempotencyKey: `ugt-checkout-${id}` }
    );

    try {
      const { q } = await import('@/lib/server/db');
      await q(`UPDATE orders SET stripe_session=$2 WHERE id=$1`, [id, session.id]);
    } catch (e: any) {
      // non-fatal: metadata.order_id still reconciles the webhook
      console.error('[stripe-checkout-db]', e);
    }

    console.log('[stripe-checkout]', JSON.stringify({ id, total, session: session.id }));
    return NextResponse.json({ ok: true, id, total, url: session.url });
  } catch (e: any) {
    console.error('[stripe-checkout]', e);
    try {
      const { q } = await import('@/lib/server/db');
      await q(`UPDATE orders SET status='failed' WHERE id=$1 AND status='pending'`, [id]);
    } catch { /* non-fatal */ }
    return NextResponse.json({ error: 'stripe_failed' }, { status: 502 });
  }
}
