import { NextResponse } from 'next/server';
import { serverTotalWithPromos, TICKET_TIERS } from '@/lib/server/catalog';
import { recordPromoCodeUse } from '@/lib/server/promos';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { mpesaConfigured, stkPush, normalizePhone } from '@/lib/server/mpesa';
import { sameOrigin } from '@/lib/server/origin';
import { alertCritical } from '@/lib/server/alert';

const seen = new Map<string, { id: string; ts: number }>(); // idempotency

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!rateLimit(clientIp(req), 8, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const allowed = new Set(['items', 'ticket', 'name', 'email', 'phone', 'idempotencyKey', 'promoCode']);
  for (const k of Object.keys(body)) {
    if (!allowed.has(k)) return NextResponse.json({ error: `unexpected_field:${k}` }, { status: 400 });
  }
  const { items, ticket, name, email, phone, idempotencyKey, promoCode } = body;
  if (promoCode !== undefined && (typeof promoCode !== 'string' || promoCode.length > 60)) {
    return NextResponse.json({ error: 'invalid_promo_code' }, { status: 400 });
  }
  if ((items === undefined) === (ticket === undefined)) {
    // exactly one of items (merch) or ticket (event) must be present
    return NextResponse.json({ error: 'items_or_ticket' }, { status: 400 });
  }

  // orderItems is what gets persisted; total (and every unit price) comes
  // ONLY from the server — never trust a client-sent price. appliedPromoCode
  // is set when a buyer-supplied promoCode actually won a line's discount,
  // so its usage counter is recorded once (after the order is durably
  // created), not on every checkout attempt.
  let orderItems: { id: string; qty: number; name?: string; unit?: number }[];
  let total: number;
  let appliedPromoCode: { promoId: number; promoName: string } | null = null;

  if (ticket !== undefined) {
    if (!ticket || typeof ticket !== 'object' || Array.isArray(ticket)) {
      return NextResponse.json({ error: 'invalid_ticket' }, { status: 400 });
    }
    for (const k of Object.keys(ticket)) {
      if (k !== 'eventId' && k !== 'tier' && k !== 'qty') {
        return NextResponse.json({ error: `unexpected_field:ticket.${k}` }, { status: 400 });
      }
    }
    const ev = typeof ticket.eventId === 'string' ? TICKET_TIERS[ticket.eventId] : undefined;
    if (!ev) return NextResponse.json({ error: 'unknown_event' }, { status: 400 });
    if (!Number.isInteger(ticket.tier) || ticket.tier < 0 || ticket.tier >= ev.tiers.length) {
      return NextResponse.json({ error: 'invalid_tier' }, { status: 400 });
    }
    if (!Number.isInteger(ticket.qty) || ticket.qty < 1 || ticket.qty > 20) {
      return NextResponse.json({ error: 'invalid_qty' }, { status: 400 });
    }
    const tier = ev.tiers[ticket.tier];
    total = tier.price * ticket.qty;
    orderItems = [{ id: 'ticket:' + ticket.eventId + ':' + ticket.tier, qty: ticket.qty, name: ev.name + ' - ' + tier.name }];
  } else {
    if (!Array.isArray(items) || items.length === 0 || items.length > 30) return NextResponse.json({ error: 'invalid_items' }, { status: 400 });
    for (const it of items) {
      if (!it || typeof it !== 'object' || Array.isArray(it)) {
        return NextResponse.json({ error: 'invalid_item' }, { status: 400 });
      }
      for (const k of Object.keys(it)) {
        if (k !== 'id' && k !== 'qty') return NextResponse.json({ error: `unexpected_field:items.${k}` }, { status: 400 });
      }
      if (typeof it.id !== 'string' || !Number.isInteger(it.qty) || it.qty < 1 || it.qty > 20) {
        return NextResponse.json({ error: 'invalid_item' }, { status: 400 });
      }
    }
    try {
      const priced = await serverTotalWithPromos(items, promoCode);
      total = priced.total;
      orderItems = priced.lines.map((l) => ({ id: l.id, qty: l.qty, name: l.name, unit: l.unit }));
      appliedPromoCode = priced.appliedPromoCode;
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
  }
  if (typeof name !== 'string' || name.length < 2 || name.length > 100) return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
  const emailStr = typeof email === 'string' && email ? email : '';
  if (emailStr && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailStr)) return NextResponse.json({ error: 'invalid_email' }, { status: 400 }); // email OPTIONAL: guests pay via M-Pesa with phone only
  const msisdn = normalizePhone(String(phone || ''));
  if (!msisdn) return NextResponse.json({ error: 'invalid_phone_use_254' }, { status: 400 });

  // idempotency: same key within 10 min returns the same order id
  if (typeof idempotencyKey === 'string' && idempotencyKey) {
    const prev = seen.get(idempotencyKey);
    if (prev && Date.now() - prev.ts < 600_000) return NextResponse.json({ ok: true, id: prev.id, deduped: true });
  }

  const id = 'ORD-' + Date.now().toString(36).toUpperCase();
  if (typeof idempotencyKey === 'string' && idempotencyKey) seen.set(idempotencyKey, { id, ts: Date.now() });
  console.log('[order]', JSON.stringify({ id, items: orderItems, total, name, email: emailStr, msisdn }));

  // persist order (ledger for admin reconciliation)
  try {
    const { q, db } = await import('@/lib/server/db');
    if (db()) {
      await q(
        `INSERT INTO orders (id, items, total, name, email, phone) VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, JSON.stringify(orderItems), total, name, emailStr, msisdn]
      );
      // Order is now durably created — safe to count the code redemption.
      // Never on a failed/aborted attempt, only here.
      if (appliedPromoCode) await recordPromoCodeUse(appliedPromoCode.promoId);
    }
  } catch (e: any) {
    // ledger write failed while the payment flow continues - reconcile manually
    console.error('[order-db]', e);
    await alertCritical('Order creation DB write failed', `order ${id} total ${total} phone ${msisdn}: ${String(e?.message || e)}`);
  }

  if (!mpesaConfigured()) {
    return NextResponse.json(
      { ok: false, id, total, payment: 'not_configured', hint: 'Set MPESA_* env vars in Vercel to activate live STK push.' },
      { status: 503 }
    );
  }
  try {
    const stk = await stkPush(msisdn, total, id, 'UrbanGang');
    // remember Daraja's CheckoutRequestID so the callback can mark this order paid
    try {
      const { q, db } = await import('@/lib/server/db');
      if (db() && stk?.CheckoutRequestID) {
        await q(`UPDATE orders SET mpesa_ref=$2 WHERE id=$1`, [id, stk.CheckoutRequestID]);
      }
    } catch { /* non-fatal */ }
    return NextResponse.json({ ok: true, id, total, stk });
  } catch (e: any) {
    return NextResponse.json({ ok: false, id, total, error: 'stk_failed', detail: String(e.message).slice(0, 200) }, { status: 502 });
  }
}
