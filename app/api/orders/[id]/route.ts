import { NextRequest, NextResponse } from "next/server";
import { getOrder } from "@/lib/orders";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  // Minimal shape for the checkout poller - never leak the phone number back
  // to whatever is polling from the client.
  return NextResponse.json({
    id: order.id,
    status: order.status,
    totalKes: order.totalKes,
    mpesaReceiptNumber: order.status === "paid" ? order.mpesaReceiptNumber : undefined,
  });
}
