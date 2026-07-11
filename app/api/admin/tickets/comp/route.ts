import { NextResponse } from 'next/server';
import { isAdmin, adminActor } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { q, db } from '@/lib/server/db';
import { TICKET_TIERS } from '@/lib/server/catalog';
import { ensureTickets } from '@/lib/server/tickets';
import { sendReceiptEmail } from '@/lib/server/receipt-email';

// Admin-only complimentary (free) tickets. Only an authenticated admin can
// call this - it mints real, gate-valid tickets (identical in every way to a
// paid order: same event/tier/holder, same signed TKT- codes, same
// verification path) on a synthetic order with total=0 and pay_method='comp'.
// Every issuance is audit-logged with a required reason for accountability.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return bad('unauthorized', 401);
  if (!requireOrigin(req)) return bad('bad_origin', 403);
  if (!rateLimit('comp:' + clientIp(req), 20, 60_000)) return bad('too_many_requests', 429);
  if (!db()) return bad('db_not_configured', 503);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad('invalid_json');
  }
  const allowed = new Set(['eventId', 'tier', 'qty', 'holderName', 'holderEmail', 'holderPhone', 'reason']);
  for (const k of Object.keys(body || {})) {
    if (!allowed.has(k)) return bad(`unexpected_field:${k}`);
  }
  const { eventId, tier, qty, holderName, holderEmail, holderPhone, reason } = body || {};

  // Validate exactly like the real ticket purchase flow (/api/orders).
  const ev = typeof eventId === 'string' ? TICKET_TIERS[eventId] : undefined;
  if (!ev) return bad('unknown_event');
  if (!Number.isInteger(tier) || tier < 0 || tier >= ev.tiers.length) return bad('invalid_tier');
  if (!Number.isInteger(qty) || qty < 1 || qty > 20) return bad('invalid_qty');
  if (typeof holderName !== 'string' || holderName.trim().length < 2 || holderName.length > 100) {
    return bad('invalid_holder_name');
  }
  const emailStr = typeof holderEmail === 'string' ? holderEmail.trim() : '';
  if (emailStr && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailStr)) return bad('invalid_email');
  const phoneStr = typeof holderPhone === 'string' ? holderPhone.trim().slice(0, 30) : '';
  if (typeof reason !== 'string' || reason.trim().length < 4 || reason.length > 300) return bad('invalid_reason');

  const tierInfo = ev.tiers[tier];
  const name = holderName.trim();
  const reasonTrim = reason.trim();
  // Item line is identical in shape to a real purchase's - the resulting
  // ticket must be indistinguishable from a paid one at the gate.
  const orderItems = [{ id: `ticket:${eventId}:${tier}`, qty, name: `${ev.name} - ${tierInfo.name}` }];
  const id = 'ORD-' + Date.now().toString(36).toUpperCase();
  const actor = adminActor(req);

  try {
    // Self-heal, same convention as the card checkout routes.
    await q(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS pay_method TEXT DEFAULT 'mpesa'`);
    await q(
      `INSERT INTO orders (id, items, total, name, email, phone, status, pay_method)
       VALUES ($1,$2,0,$3,$4,$5,'paid','comp')`,
      [id, JSON.stringify(orderItems), name, emailStr, phoneStr]
    );
  } catch (e: any) {
    console.error('[comp-ticket-order]', e);
    return bad('order_write_failed', 500);
  }

  await q(
    `INSERT INTO audit_log (actor, action, detail) VALUES ($1,'comp_ticket_issued',$2)`,
    [actor, JSON.stringify({ order_id: id, eventId, tier: tierInfo.name, qty, holderName: name, holderEmail: emailStr || null, reason: reasonTrim })]
  ).catch((e) => console.error('[comp-ticket-audit]', e));

  let tickets: { code: string; position: number; ofCount: number }[] = [];
  try {
    const orderRow = { id, items: orderItems, total: 0, name, email: emailStr, phone: phoneStr, status: 'paid' };
    const minted = await ensureTickets(orderRow);
    tickets = minted.map((t) => ({ code: t.code, position: t.position, ofCount: t.of_count }));
  } catch (e) {
    console.error('[comp-ticket-mint]', e);
  }

  if (emailStr) {
    // Fire-and-forget, same as every other paid path - a failed email must
    // never fail the API response (the order + tickets already exist).
    sendReceiptEmail({
      id, items: orderItems, total: 0, name, email: emailStr, phone: phoneStr,
      status: 'paid', pay_method: 'comp',
    }).catch((e) => console.error('[comp-ticket-email]', e));
  }

  return NextResponse.json({
    ok: true,
    id,
    receiptUrl: `/receipt/${encodeURIComponent(id)}`,
    ticketsUrl: `/tickets/${encodeURIComponent(id)}`,
    tickets: tickets.map((t) => ({ code: t.code, position: t.position, ofCount: t.ofCount, url: `/t/${encodeURIComponent(t.code)}` })),
  });
}
