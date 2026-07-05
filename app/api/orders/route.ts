import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/orders";
import { findCatalogItemLive } from "@/lib/catalog-store";
import { normalizeMsisdn } from "@/lib/mpesa";

// Creates a pending order. The price is looked up server-side from the
// catalog by key - a client can only choose WHAT to buy, never HOW MUCH it
// costs, so a tampered request can't undercharge itself.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const { kind, eventKey, itemKey, qty, variant, phone, buyerName, buyerEmail } = body;
  if (kind !== "ticket" && kind !== "merch") {
    return NextResponse.json({ error: "kind must be 'ticket' or 'merch'" }, { status: 400 });
  }
  const quantity = Number(qty) || 1;
  if (quantity < 1 || quantity > 20) {
    return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
  }

  const item = await findCatalogItemLive(kind, eventKey ?? null, itemKey);
  if (!item) return NextResponse.json({ error: "Unknown item" }, { status: 400 });

  const msisdn = normalizeMsisdn(String(phone || ""));
  if (!msisdn) {
    return NextResponse.json({ error: "Enter a valid Safaricom number, e.g. 0712345678" }, { status: 400 });
  }

  try {
    const order = await createOrder({
      kind,
      items: [{ key: item.key, name: item.name, qty: quantity, unitPriceKes: item.priceKes, variant }],
      phone: msisdn,
      buyerName,
      buyerEmail,
    });
    return NextResponse.json({ orderId: order.id, totalKes: order.totalKes });
  } catch (err) {
    console.error("Failed to create order:", err);
    return NextResponse.json({ error: "Couldn't start your order, try again in a moment" }, { status: 500 });
  }
}
