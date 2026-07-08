import { NextRequest, NextResponse } from "next/server";
import { parseStkCallback, type StkCallback } from "@/lib/mpesa";
import { getOrderByCheckoutRequestId, markOrderPaid, markOrderFailed } from "@/lib/orders";
import { sendOrderConfirmation, sendSaleNotification } from "@/lib/gmail";

const ACCEPTED = { ResultCode: 0, ResultDesc: "Accepted" };

// Public webhook - Safaricom calls this directly with no session, so it must
// stay out of the admin-auth middleware. Safaricom retries on non-200, so
// this must ALWAYS return 200 once it starts running, even if order lookup
// or storage throws downstream - the whole body is wrapped so a transient
// Redis blip retries via Safaricom's own mechanism instead of silently
// dropping a real, successful payment.
export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json().catch(() => null)) as StkCallback | null;
    if (!payload?.Body?.stkCallback) {
      return NextResponse.json(ACCEPTED);
    }

    const result = parseStkCallback(payload);
    const order = await getOrderByCheckoutRequestId(result.checkoutRequestId);
    if (!order) {
      console.error("M-Pesa callback for unknown checkoutRequestId", result.checkoutRequestId);
      return NextResponse.json(ACCEPTED);
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

    return NextResponse.json(ACCEPTED);
  } catch (err) {
    console.error("M-Pesa callback handler failed, Safaricom will retry:", err);
    return NextResponse.json(ACCEPTED);
  }
}
