import { NextRequest, NextResponse } from "next/server";
import { getOrder, attachCheckoutRequest } from "@/lib/orders";
import { initiateStkPush } from "@/lib/mpesa";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const orderId = body?.orderId;
  if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

  const order = await getOrder(orderId);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "pending") {
    return NextResponse.json({ error: `Order is already ${order.status}` }, { status: 409 });
  }

  const origin = req.nextUrl.origin;
  try {
    const result = await initiateStkPush({
      phone: order.phone,
      amountKes: order.totalKes,
      accountReference: `UGT-${order.id.slice(0, 8)}`,
      transactionDesc: order.kind === "ticket" ? "UGT Ticket" : "UGT Merch",
      callbackUrl: `${origin}/api/mpesa/callback`,
    });
    await attachCheckoutRequest(order.id, {
      checkoutRequestId: result.checkoutRequestId,
      merchantRequestId: result.merchantRequestId,
    });
    return NextResponse.json({ checkoutRequestId: result.checkoutRequestId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to start M-Pesa payment" },
      { status: 502 }
    );
  }
}
