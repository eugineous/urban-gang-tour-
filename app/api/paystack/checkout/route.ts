import { NextResponse } from 'next/server';
import { PRICES, serverTotalWithPromos } from '@/lib/server/catalog';
import { recordPromoCodeUse } from '@/lib/server/promos';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { sameOrigin } from '@/lib/server/origin';
import { alertCritical } from '@/lib/server/alert';
import { paystackConfigured, paystackInit } from '@/lib/server/paystack';

// Card checkout via Paystack (KES, Kenyan settlement). Mirrors the Stripe
// route: strict schema, prices ONLY from lib/server/catalog.ts, ledger row
// written before the processor call so the webhook always reconciles.

export const runtime = 'nodejs';

const CALLBACK_URL = 'https://urbangangtour.co.ke/pay/success';
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

let columnsReady = false;
async function ensureColumns(q: (sql: string, params?: any[]) => Promise<any[]>) {
  if (columnsReady) return;
  await q(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS pay_method TEXT DEFAULT 'mpesa'`);
  await q(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS paystack_ref TEXT`);
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

  if (!paystackConfigured()) return NextResponse.json({ error: 'card_not_configured' }, { status: 503 });

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

  const id = 'ORD-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();

  try {
    const { q, db } = await import('@/lib/server/db');
    if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
    await ensureColumns(q);
    await q(
      `INSERT INTO orders (id, items, total, name, email, phone, status, pay_method, paystack_ref)
       VALUES ($1,$2,$3,$4,$5,$6,'pending','card',$1)`,
      [id, JSON.stringify(lines), total, '', emailStr, '']
    );
    // Order is now durably created — safe to count the code redemption.
    if (appliedPromoCode) await recordPromoCodeUse(appliedPromoCode.promoId);
  } catch (e: any) {
    console.error('[paystack-checkout-db]', e);
    await alertCritical('Card order ledger write failed', `order ${id} total ${total}: ${String(e?.message || e)}`);
    return NextResponse.json({ error: 'order_create_failed' }, { status: 500 });
  }

  // Paystack requires a customer email; guests get a routable per-order alias.
  const payerEmail = emailStr || `guest+${id.toLowerCase()}@urbangangtour.co.ke`;
  const r = await paystackInit({
    email: payerEmail,
    amountKes: total,
    reference: id,
    callbackUrl: `${CALLBACK_URL}?ref=${id}`,
    metadata: { order_id: id },
  });
  if (!r.ok || !r.url) {
    console.error('[paystack-checkout]', r.error);
    try {
      const { q } = await import('@/lib/server/db');
      await q(`UPDATE orders SET status='failed' WHERE id=$1 AND status='pending'`, [id]);
    } catch { /* non-fatal */ }
    return NextResponse.json({ error: 'paystack_failed' }, { status: 502 });
  }

  console.log('[paystack-checkout]', JSON.stringify({ id, total }));
  return NextResponse.json({ ok: true, id, total, url: r.url });
}
