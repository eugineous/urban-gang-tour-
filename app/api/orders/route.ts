import { NextResponse, after } from "next/server";
import { randomUUID } from "crypto";
import { serverTotalWithPromos } from "@/lib/server/catalog";
import { recordPromoCodeUse } from "@/lib/server/promos";
import {
  rateLimit,
  clientIp,
  PURCHASE_NETWORK_LIMIT,
} from "@/lib/server/ratelimit";
import { mpesaConfigured, stkPush, normalizePhone } from "@/lib/server/mpesa";
import { sameOrigin } from "@/lib/server/origin";
import { alertCritical } from "@/lib/server/alert";
import { notifyNewOrder } from "@/lib/server/notify";
import { applyVerifiedMerchVariants } from "@/lib/server/merch-variants";
import { assertMerchStockAvailable } from "@/lib/server/inventory";
import { parseTierInventory, assertTicketAvailable, holdTickets, releaseReservation } from "@/lib/server/ticket-inventory";
import {recordOrderReferral} from '@/lib/server/affiliate-program';
import {ensureCustomerAccountSchema,validatedCurrentBuyer} from '@/lib/server/customer-account';
import {resolveCheckoutFulfillment,ensureCheckoutFulfillmentSchema,saveCheckoutFulfillment} from '@/lib/server/checkout-fulfillment';
import { q, hasDb } from "@/lib/server/db";
import { resolveEventTruth } from "@/lib/server/event-truth";

const seen = new Map<string, { id: string; ts: number }>(); // short-lived retry guard
const IDEMPOTENCY_TTL_MS = 10 * 60_000;

function pruneSeen(now: number) {
  for (const [key, value] of seen) {
    if (now - value.ts >= IDEMPOTENCY_TTL_MS) seen.delete(key);
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  // 8 per device per minute, with a wide per-network backstop underneath (see
  // lib/server/ratelimit.ts). This used to be 8 per IP, which meant a school
  // hall or a campus on one NAT — and Safaricom's CGNAT generally — got eight
  // ticket purchases a minute between everyone, and the rest were told to try
  // again later. One buyer still cannot open more than eight orders a minute.
  if (
    !rateLimit(
      "orders:" + clientIp(req),
      8,
      60_000,
      req,
      PURCHASE_NETWORK_LIMIT,
    )
  ) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const allowed = new Set([
    "items",
    "ticket",
    "name",
    "email",
    "phone",
    "idempotencyKey",
    "promoCode",
    "fulfillment",
    "referralCode",
  ]);
  for (const k of Object.keys(body)) {
    if (!allowed.has(k))
      return NextResponse.json(
        { error: `unexpected_field:${k}` },
        { status: 400 },
      );
  }
  const { items, ticket, name, email, phone, idempotencyKey, promoCode, fulfillment, referralCode } = body;
  if(referralCode!==undefined&&(typeof referralCode!=='string'||!/^[a-f0-9]{24}$/.test(referralCode)))return NextResponse.json({error:'invalid_referral_code'},{status:400});
  if (
    promoCode !== undefined &&
    (typeof promoCode !== "string" || promoCode.length > 60)
  ) {
    return NextResponse.json({ error: "invalid_promo_code" }, { status: 400 });
  }
  if ((items === undefined) === (ticket === undefined)) {
    // exactly one of items (merch) or ticket (event) must be present
    return NextResponse.json({ error: "items_or_ticket" }, { status: 400 });
  }

  // orderItems is what gets persisted; total (and every unit price) comes
  // ONLY from the server — never trust a client-sent price. appliedPromoCode
  // is set when a buyer-supplied promoCode actually won a line's discount,
  // so its usage counter is recorded once (after the order is durably
  // created), not on every checkout attempt.
  let orderItems: {
    id: string;
    qty: number;
    name?: string;
    unit?: number;
    variant?: string;
  }[];
  let total: number;
  let appliedPromoCode: { promoId: number; promoName: string } | null = null;

  if (ticket !== undefined) {
    if (!ticket || typeof ticket !== "object" || Array.isArray(ticket)) {
      return NextResponse.json({ error: "invalid_ticket" }, { status: 400 });
    }
    for (const k of Object.keys(ticket)) {
      if (k !== "eventId" && k !== "tier" && k !== "qty") {
        return NextResponse.json(
          { error: `unexpected_field:ticket.${k}` },
          { status: 400 },
        );
      }
    }
    const eventId = typeof ticket.eventId === "string" ? ticket.eventId : "";
    let event: { id: string; slug: string; name: string; tiers: unknown } | undefined;
    let truth: Awaited<ReturnType<typeof resolveEventTruth>>;
    try {
      const events = hasDb()
        ? await q<{ id: string; slug: string; name: string; tiers: unknown }>(
            `SELECT id, slug, name, tiers FROM tour_events
             WHERE id=$1 AND kind='ticketed' AND slug != '' LIMIT 1`,
            [eventId],
          )
        : [];
      event = events[0];
      truth = event ? await resolveEventTruth(event.slug) : null;
    } catch {
      return NextResponse.json({ error: "inventory_check_failed" }, { status: 503 });
    }
    const ev = event && truth?.isSellable
      ? { name: event.name, tiers: parseTierInventory(event.tiers) }
      : undefined;
    if (!ev)
      return NextResponse.json({ error: "unknown_event" }, { status: 400 });
    if (
      !Number.isInteger(ticket.tier) ||
      ticket.tier < 0 ||
      ticket.tier >= ev.tiers.length
    ) {
      return NextResponse.json({ error: "invalid_tier" }, { status: 400 });
    }
    if (!Number.isInteger(ticket.qty) || ticket.qty < 1 || ticket.qty > 20) {
      return NextResponse.json({ error: "invalid_qty" }, { status: 400 });
    }
    const tier = ev.tiers[ticket.tier];
    total = tier.price * ticket.qty;
    // Capacity guard: a capped tier must not oversell under concurrent
    // checkout. Capacity is optional — a tier without one sells without a
    // count check. remaining = capacity - sold(paid) - unexpired holds.
    try {
      if (hasDb()) {
        await assertTicketAvailable({
          eventId,
          tierIndex: ticket.tier,
          tier,
          qty: ticket.qty,
        });
      }
    } catch (e: any) {
      const msg = String(e?.message || "sold_out");
      if (["sold_out", "insufficient_inventory", "below_min", "above_min", "above_max", "invalid_qty"].includes(msg))
        return NextResponse.json({ error: msg }, { status: 409 });
      return NextResponse.json({ error: "inventory_check_failed" }, { status: 503 });
    }
    orderItems = [
      {
        id: "ticket:" + eventId + ":" + ticket.tier,
        qty: ticket.qty,
        name: ev.name + " - " + tier.name,
        unit: tier.price,
      },
    ];
  } else {
    if (!Array.isArray(items) || items.length === 0 || items.length > 30)
      return NextResponse.json({ error: "invalid_items" }, { status: 400 });
    for (const it of items) {
      if (!it || typeof it !== "object" || Array.isArray(it)) {
        return NextResponse.json({ error: "invalid_item" }, { status: 400 });
      }
      for (const k of Object.keys(it)) {
        if (k !== "id" && k !== "qty" && k !== "variant")
          return NextResponse.json(
            { error: `unexpected_field:items.${k}` },
            { status: 400 },
          );
      }
      if (
        typeof it.id !== "string" ||
        (it.variant !== undefined &&
          (typeof it.variant !== "string" || it.variant.length > 100)) ||
        !Number.isInteger(it.qty) ||
        it.qty < 1 ||
        it.qty > 20
      ) {
        return NextResponse.json({ error: "invalid_item" }, { status: 400 });
      }
    }
    try {
      const priced = await serverTotalWithPromos(items, promoCode);
      total = priced.total;
      orderItems = priced.lines.map((l) => ({
        id: l.id,
        qty: l.qty,
        name: l.name,
        unit: l.unit,
      }));
      const variants = await applyVerifiedMerchVariants(
        items,
        orderItems as {
          id: string;
          qty: number;
          name: string;
          unit: number;
          variant?: string;
        }[],
      );
      orderItems = variants.lines;
      total += variants.adjustment;
      await assertMerchStockAvailable(orderItems);
      appliedPromoCode = priced.appliedPromoCode;
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  }
  let resolvedFulfillment: ReturnType<typeof resolveCheckoutFulfillment> | undefined;
  try {
    if(ticket!==undefined&&fulfillment!==undefined)return NextResponse.json({error:'fulfillment_not_applicable'},{status:400});
    if(ticket===undefined){resolvedFulfillment=resolveCheckoutFulfillment(fulfillment);total+=resolvedFulfillment.fee;}
  } catch(e){return NextResponse.json({error:e instanceof Error?e.message:'invalid_fulfillment'},{status:400});}
  if (!Number.isSafeInteger(total) || total < 1) {
    return NextResponse.json({ error: "invalid_order_total" }, { status: 400 });
  }
  if (typeof name !== "string" || name.length < 2 || name.length > 100)
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  const emailStr = typeof email === "string" && email ? email : "";
  if (emailStr && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailStr))
    return NextResponse.json({ error: "invalid_email" }, { status: 400 }); // email OPTIONAL: guests pay via M-Pesa with phone only
  const msisdn = normalizePhone(String(phone || ""));
  if (!msisdn)
    return NextResponse.json(
      { error: "invalid_phone_use_254" },
      { status: 400 },
    );

  if (
    idempotencyKey !== undefined &&
    (typeof idempotencyKey !== "string" ||
      !/^[A-Za-z0-9_-]{8,128}$/.test(idempotencyKey))
  ) {
    return NextResponse.json({ error: "invalid_idempotency_key" }, { status: 400 });
  }

  // Idempotency keys are scoped to the buyer's normalised M-Pesa number, so
  // one browser cannot learn another buyer's pending order id by reusing a key.
  const seenKey = idempotencyKey ? `${msisdn}\u0000${idempotencyKey}` : "";
  const now = Date.now();
  pruneSeen(now);
  if (seenKey) {
    const prev = seen.get(seenKey);
    if (prev && now - prev.ts < IDEMPOTENCY_TTL_MS)
      return NextResponse.json({ ok: true, id: prev.id, deduped: true });
  }

  if (!mpesaConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        payment: "not_configured",
        hint: "Configure the MPESA_* Cloudflare Worker secrets to activate live STK push.",
      },
      { status: 503 },
    );
  }

  const id =
    "ORD-" +
    now.toString(36).toUpperCase() +
    randomUUID().replace(/-/g, "").slice(0, 24).toUpperCase();
  // persist order (ledger for admin reconciliation)
  try {
    // hasDb(), not db(): db() constructs a Pool, and this is only asking
    // whether DATABASE_URL exists. On the order path that was a throwaway
    // allocation per purchase. The write itself below goes over q(), which is
    // stateless HTTP - no connection is held, so concurrent buyers are not
    // capped by a Postgres connection limit.
    const { q, hasDb } = await import("@/lib/server/db");
    if (!hasDb())
      return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
    await ensureCustomerAccountSchema();
    if(resolvedFulfillment)await ensureCheckoutFulfillmentSchema();
    const buyer=await validatedCurrentBuyer(req);
    const owner=buyer&&Number.isSafeInteger(buyer.id)?await q('SELECT id FROM users WHERE id=$1',[buyer.id]):[];
    await q(
      `INSERT INTO orders (id, items, total, name, email, phone, user_id) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, JSON.stringify(orderItems), total, name, emailStr, msisdn,owner[0]?.id??null],
    );
    if(resolvedFulfillment)await saveCheckoutFulfillment(id,resolvedFulfillment);
    if(referralCode)try{await recordOrderReferral(id,referralCode,buyer?.id)}catch{console.error('[affiliate] attribution unavailable for order',id)}
    // Only a durable order can be retried or sent to a payment provider.
    if (seenKey) seen.set(seenKey, { id, ts: now });
    // Hold capped ticket inventory against this order so a second buyer
    // cannot take the same seats while STK is pending. Uncapped tiers and
    // merch skip this. The hold is consumed on paid, released on failure.
    if (ticket !== undefined) {
      try {
        await q(
          `CREATE TABLE IF NOT EXISTS ticket_reservations (
            id TEXT PRIMARY KEY, event_id TEXT NOT NULL, tier_index INT NOT NULL,
            qty INT NOT NULL, order_id TEXT NOT NULL, status TEXT DEFAULT 'held',
            expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ DEFAULT now()
          )`,
        );
        await holdTickets({ eventId: ticket.eventId, tierIndex: ticket.tier, qty: ticket.qty, orderId: id });
      } catch (e) {
        console.error("[ticket-hold]", e);
      }
    }
    // Order is now durably created — safe to count the code redemption.
    // Never on a failed/aborted attempt, only here.
    if (appliedPromoCode) await recordPromoCodeUse(appliedPromoCode.promoId);
    // Routine "new order" owner notification (opt-in, OFF by default) -
    // fires on checkout creation, not payment confirmation, so the owner
    // hears about a checkout starting even before M-Pesa confirms it.
    // Fire-and-forget: never blocks or fails the checkout response.
    after(() =>
      notifyNewOrder({
        id,
        total,
        name,
        email: emailStr,
        phone: msisdn,
        status: "pending",
      }),
    );
  } catch (e: any) {
    console.error("[order-db]", e);
    await alertCritical(
      "Order creation DB write failed",
      `order ${id} total ${total}: ${String(e?.message || e)}`,
    );
    return NextResponse.json({ error: "order_create_failed" }, { status: 500 });
  }

  try {
    const stk = await stkPush(msisdn, total, id, "UrbanGang");
    // A successful STK HTTP response is not payment confirmation. Store the
    // provider reference before acknowledging it to the browser, otherwise a
    // later callback could not be tied to the durable order ledger.
    try {
      const { q, hasDb } = await import("@/lib/server/db");
      if (!hasDb() || typeof stk?.CheckoutRequestID !== "string")
        throw new Error("missing_checkout_reference");
      const updated = await q(
        `UPDATE orders SET mpesa_ref=$2 WHERE id=$1 AND status='pending' RETURNING id`,
        [id, stk.CheckoutRequestID],
      );
      if (!updated.length) throw new Error("order_not_pending");
    } catch (e: any) {
      await alertCritical(
        "M-Pesa checkout reference was not recorded",
        `order ${id}: ${String(e?.message || e)}`,
      );
      return NextResponse.json(
        { ok: false, id, total, error: "payment_reference_unavailable" },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, id, total });
  } catch (e: any) {
    if (ticket !== undefined) {
      try { await releaseReservation(id); } catch { /* hold expires on its own */ }
    }
    return NextResponse.json(
      {
        ok: false,
        id,
        total,
        error: "stk_failed",
        detail: String(e.message).slice(0, 200),
      },
      { status: 502 },
    );
  }
}
