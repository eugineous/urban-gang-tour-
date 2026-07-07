/**
 * POST /api/tickets/confirm
 *
 * Called after a successful M-Pesa STK push to store a ticket order in Redis.
 * The existing /api/mpesa/stkpush polls for payment confirmation; once confirmed,
 * the client (or checkout.js) calls this endpoint to persist the ticket order.
 *
 * Body: { eventSlug, tierId, buyerPhone, amount, mpesaRef, eventName, tierLabel }
 */
export const dynamic = "force-dynamic";

import redis from "@/lib/redis";
import { generateTicketCode } from "@/lib/ticket-code";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { eventSlug, tierId, buyerPhone, amount, mpesaRef, eventName, tierLabel } = body;

  if (!eventSlug || !tierId || !buyerPhone || !amount) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Generate unique ticket code — retry up to 5 times to guarantee uniqueness
  let ticketCode;
  let attempts = 0;
  while (attempts < 5) {
    const candidate = generateTicketCode();
    const existing = await redis.get(`ugt:orders:${candidate}`).catch(() => null);
    if (!existing) {
      ticketCode = candidate;
      break;
    }
    attempts++;
  }

  if (!ticketCode) {
    return Response.json({ error: "Could not generate unique ticket code" }, { status: 503 });
  }

  const order = {
    ticketCode,
    type: "ticket",
    eventSlug,
    tierId,
    eventName: eventName || eventSlug,
    tierLabel: tierLabel || tierId,
    buyerPhone,
    amount: Number(amount),
    status: "paid",
    mpesaRef: mpesaRef || null,
    timestamp: new Date().toISOString(),
  };

  try {
    const orderKey = `ugt:orders:${ticketCode}`;
    await redis.set(orderKey, JSON.stringify(order));
    await redis.sadd("ugt:orders:index", orderKey);

    // Increment the sold count on the ticket tier
    const eventKey = `ugt:events:${eventSlug}`;
    const eventData = await redis.get(eventKey);
    if (eventData) {
      const event = typeof eventData === "object" ? eventData : JSON.parse(eventData);
      if (Array.isArray(event.ticketTiers)) {
        event.ticketTiers = event.ticketTiers.map((tier) => {
          if (tier.id === tierId) {
            return { ...tier, sold: (Number(tier.sold ?? 0) + 1) };
          }
          return tier;
        });
        event.updatedAt = new Date().toISOString();
        await redis.set(eventKey, JSON.stringify(event));
      }
    }

    return Response.json({ ticketCode, status: "paid" });
  } catch (err) {
    return Response.json({ error: "Failed to save order" }, { status: 503 });
  }
}
