import { NextRequest, NextResponse } from "next/server";
import { parseStkCallback, type StkCallback } from "@/lib/mpesa";
import { getOrderByCheckoutRequestId, markOrderPaid, markOrderFailed } from "@/lib/orders";
import { sendOrderConfirmation, sendSaleNotification } from "@/lib/gmail";

// Public webhook - Safaricom calls this directly with no session, so it must
// stay out of the admin-auth middleware. Safaricom retries on non-200, so we
// always return 200 once the payload is parsed, even if the order lookup
// fails downstream (logged instead, not surfaced as an HTTP error).
export async function POST(req: NextRequest) {
  const payload = (await req.json().catch(() => null)) as StkCallback | null;
  if (!payload?.Body?.stkCallback) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  const result = parseStkCallback(payload);
  const order = await getOrderByCheckoutRequestId(result.checkoutRequestId);
  if (!order) {
    console.error("M-Pesa callback for unknown checkoutRequestId", result.checkoutRequestId);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  if (result.success && result.mpesaReceiptNumber) {
    const paidOrder = await markOrderPaid(order.id, result.mpesaReceiptNumber);
    if (paidOrder) {
      try {
        await sendSaleNotification(paidOrder);
        if (paidOrder.buyerEmail) await sendOrderConfirmation(paidOrder);
      } catch (err) {
        console.error("Post-payment email failed", err);
      }
    }
  } else {
    await markOrderFailed(order.id, result.resultDesc);
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
