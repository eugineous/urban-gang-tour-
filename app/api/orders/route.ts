import { NextResponse, after } from "next/server";
import { randomUUID } from "crypto";
import { serverTotalWithPromos, getTicketTiers } from "@/lib/server/catalog";
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
  ]);
  for (const k of Object.keys(body)) {
    if (!allowed.has(k))
      return NextResponse.json(
        { error: `unexpected_field:${k}` },
        { status: 400 },
      );
  }
  const { items, ticket, name, email, phone, idempotencyKey, promoCode } = body;
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
    const ticketTiers = await getTicketTiers();
    const ev =
      typeof ticket.eventId === "string"
        ? ticketTiers[ticket.eventId]
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
    orderItems = [
      {
        id: "ticket:" + ticket.eventId + ":" + ticket.tier,
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
        hint: "Set MPESA_* env vars in Vercel to activate live STK push.",
      },
      { status: 503 },
    );
  }

  const id =
    "ORD-" +
    now.toString(36).toUpperCase() +
    randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
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
    await q(
      `INSERT INTO orders (id, items, total, name, email, phone) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, JSON.stringify(orderItems), total, name, emailStr, msisdn],
    );
    // Only a durable order can be retried or sent to a payment provider.
    if (seenKey) seen.set(seenKey, { id, ts: now });
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
