import { NextResponse } from 'next/server';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { sameOrigin } from '@/lib/server/origin';
import { alertCritical } from '@/lib/server/alert';
import { paystackConfigured, paystackInit } from '@/lib/server/paystack';
import { getMarketplaceEventById, getCommissionPercent, computeSplit, ensureMarketplaceColumns } from '@/lib/server/marketplace';

// Third-party marketplace checkout. Card-only via Paystack (no M-Pesa
// equivalent for a live, per-transaction organizer split — stated limitation,
// not an oversight; see the build report). Prices are ALWAYS re-read from
// marketplace_events.tiers here — a client-sent price is never trusted, same
// rule as every other checkout route in this codebase. The order is written
// with a live-computed commission/organizer split BEFORE the Paystack call so
// the ledger always reconciles even if Paystack never redirects back.
//
// The split itself is enforced by Paystack: `subaccount` + `transaction_charge`
// on /transaction/initialize (see lib/server/paystack.ts's header comment for
// the exact verified field semantics) — transaction_charge is recomputed from
// the CURRENT admin-editable commission percent on every single checkout, so
// changing the setting takes effect on the very next sale, not retroactively.

export const runtime = 'nodejs';

const CALLBACK_URL = 'https://urbangangtour.co.ke/pay/success';
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!rateLimit('mkt-checkout:' + clientIp(req), 8, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  if (!paystackConfigured()) return NextResponse.json({ error: 'card_not_configured' }, { status: 503 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const allowed = new Set(['eventId', 'tier', 'qty', 'name', 'email']);
  for (const k of Object.keys(body)) {
    if (!allowed.has(k)) return NextResponse.json({ error: `unexpected_field:${k}` }, { status: 400 });
  }
  const { eventId, tier, qty, name, email } = body;

  if (typeof eventId !== 'string' || !eventId.startsWith('mkt-') || eventId.length > 80) {
    return NextResponse.json({ error: 'invalid_event' }, { status: 400 });
  }
  if (!Number.isInteger(tier) || tier < 0 || tier > 11) {
    return NextResponse.json({ error: 'invalid_tier' }, { status: 400 });
  }
  if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
    return NextResponse.json({ error: 'invalid_qty' }, { status: 400 });
  }
  if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100) {
    return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
  }
  const emailStr = typeof email === 'string' && email ? email.trim() : '';
  if (email !== undefined && typeof email !== 'string') return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  if (emailStr && (emailStr.length > 200 || !EMAIL_RE.test(emailStr))) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  let event;
  try {
    event = await getMarketplaceEventById(eventId);
  } catch (e: any) {
    if (String(e?.message) === 'db_not_configured') return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  }
  if (!event || event.status !== 'published') return NextResponse.json({ error: 'unknown_event' }, { status: 400 });
  // An event can only go live once its organizer is approved (see the admin
  // approval flow), but re-check here too — an organizer suspended AFTER
  // publishing an event must not keep selling.
  if (event.organizer_status !== 'approved') return NextResponse.json({ error: 'organizer_not_approved' }, { status: 400 });
  if (!event.organizer_subaccount_code) {
    // Should never happen (approval requires a working subaccount) but this
    // is real third-party money — never fall back to charging without a
    // configured split.
    await alertCritical('Marketplace checkout blocked: no subaccount', `event ${eventId} organizer ${event.organizer_id}`);
    return NextResponse.json({ error: 'organizer_payout_not_configured' }, { status: 503 });
  }
  const tierRow = event.tiers[tier];
  if (!tierRow) return NextResponse.json({ error: 'invalid_tier' }, { status: 400 });

  const total = tierRow.price * qty;
  const commissionPercent = await getCommissionPercent();
  const { commissionAmount, organizerAmount } = computeSplit(total, commissionPercent);

  const id = 'ORD-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
  const orderItems = [{ id: `ticket:${eventId}:${tier}`, qty, name: `${event.name} - ${tierRow.name}`, unit: tierRow.price }];

  try {
    const { q, db } = await import('@/lib/server/db');
    if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
    await ensureMarketplaceColumns();
    await q(
      `INSERT INTO orders (id, items, total, name, email, phone, status, pay_method, paystack_ref, source, organizer_id, marketplace_event_id, commission_amount, organizer_amount)
       VALUES ($1,$2,$3,$4,$5,'','pending','card',$1,'marketplace',$6,$7,$8,$9)`,
      [id, JSON.stringify(orderItems), total, name.trim(), emailStr, event.organizer_id, eventId, commissionAmount, organizerAmount]
    );
  } catch (e: any) {
    console.error('[marketplace-checkout-db]', e);
    await alertCritical('Marketplace order ledger write failed', `order ${id} event ${eventId} total ${total}: ${String(e?.message || e)}`);
    return NextResponse.json({ error: 'order_create_failed' }, { status: 500 });
  }

  const payerEmail = emailStr || `guest+${id.toLowerCase()}@urbangangtour.co.ke`;
  const r = await paystackInit({
    email: payerEmail,
    amountKes: total,
    reference: id,
    callbackUrl: `${CALLBACK_URL}?ref=${id}`,
    metadata: { order_id: id, marketplace_event_id: eventId, organizer_id: event.organizer_id },
    subaccountCode: event.organizer_subaccount_code,
    transactionChargeKes: commissionAmount,
    bearer: 'account', // UGT eats Paystack's own processing fee — see lib/server/paystack.ts header
  });

  // Auditable: log the exact payload sent to Paystack's initialize endpoint,
  // split config included, so a real transaction can be traced end to end.
  console.log('[marketplace-checkout] paystack request', JSON.stringify({ id, eventId, organizerId: event.organizer_id, commissionPercent, commissionAmount, organizerAmount, payload: r.requestPayload }));

  if (!r.ok || !r.url) {
    console.error('[marketplace-checkout]', r.error);
    try {
      const { q } = await import('@/lib/server/db');
      await q(`UPDATE orders SET status='failed' WHERE id=$1 AND status='pending'`, [id]);
    } catch { /* non-fatal */ }
    return NextResponse.json({ error: 'paystack_failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, id, total, url: r.url });
}
