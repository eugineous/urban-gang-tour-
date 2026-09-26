import { NextResponse, after } from "next/server";
import { q, hasDb } from "@/lib/server/db";
import { alertCritical } from "@/lib/server/alert";
import { sendReceiptEmail } from "@/lib/server/receipt-email";
import { ensureTickets } from "@/lib/server/tickets";
import {
  notifyPaymentSuccess,
  notifyPaymentFailure,
} from "@/lib/server/notify";
import { recordPaidMerchOrder } from "@/lib/server/inventory";
import { consumeReservation, releaseReservation } from "@/lib/server/ticket-inventory";
import { RECOVERABLE_PAYMENT_STATUSES } from "@/lib/server/payment-status";

// Daraja payment result callback: reconcile the order ledger.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cb = body?.Body?.stkCallback;
    console.log(
      "[mpesa-callback]",
      JSON.stringify({
        CheckoutRequestID: cb?.CheckoutRequestID,
        ResultCode: cb?.ResultCode,
        ResultDesc: cb?.ResultDesc,
      }),
    );
    if (hasDb() && typeof cb?.CheckoutRequestID === "string") {
      try {
        if (cb.ResultCode === 0) {
          const items = cb?.CallbackMetadata?.Item || [];
          const receipt =
            items.find((i: any) => i.Name === "MpesaReceiptNumber")?.Value ||
            "";
          const callbackAmount = Number(
            items.find((i: any) => i.Name === "Amount")?.Value,
          );
          if (
            !String(receipt) ||
            !Number.isSafeInteger(callbackAmount) ||
            callbackAmount < 1
          ) {
            await alertCritical(
              "M-Pesa success callback was incomplete",
              `CheckoutRequestID ${cb.CheckoutRequestID} did not include a valid receipt and amount`,
            );
            return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
          }
          const rows = await q(
            `UPDATE orders SET status='paid', mpesa_receipt=$2
             WHERE mpesa_ref=$1 AND status = ANY($3) AND total=$4
             RETURNING *`,
            [cb.CheckoutRequestID, String(receipt), RECOVERABLE_PAYMENT_STATUSES, callbackAmount],
          );
          // mint e-tickets, then the branded receipt email (which links them) -
          // fire-and-forget after the ack, never blocking Daraja's timeout
          const paidRow = rows[0];
          if (paidRow)
            after(async () => {
              try {
                await consumeReservation(paidRow.id);
              } catch (e) {
                console.error("[ticket-reservation]", e);
              }
              try {
                await recordPaidMerchOrder(paidRow);
              } catch (e) {
                console.error("[merch-inventory]", e);
              }
              try {
                await ensureTickets(paidRow);
              } catch (e) {
                console.error("[tickets-mint]", e);
              }
              if (paidRow.email) await sendReceiptEmail(paidRow);
              await notifyPaymentSuccess({
                gateway: "mpesa",
                orderId: paidRow.id,
                amount: paidRow.total,
              });
            });
        } else {
          const failedRows = await q(
            `UPDATE orders SET status='failed' WHERE mpesa_ref=$1 AND status = ANY($2) RETURNING id, total`,
            [cb.CheckoutRequestID, RECOVERABLE_PAYMENT_STATUSES],
          );
          if (failedRows[0])
            after(async () => {
              try {
                await releaseReservation(failedRows[0].id);
              } catch { /* hold expires on its own */ }
              await notifyPaymentFailure({
                gateway: "mpesa",
                orderId: failedRows[0].id,
                amount: failedRows[0].total,
                reason: cb.ResultDesc,
              });
            });
        }
      } catch (e: any) {
        // a real Daraja result failed to reconcile - the ledger is now stale
        await alertCritical(
          "M-Pesa callback processing failed",
          `CheckoutRequestID ${cb.CheckoutRequestID} ResultCode ${cb.ResultCode}: ${String(e?.message || e)}`,
        );
      }
    }
  } catch {
    /* malformed payload - always ack so Daraja doesn't retry forever */
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
