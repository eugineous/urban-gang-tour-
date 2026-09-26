import { NextResponse, after } from "next/server";
import crypto from "crypto";
import { alertCritical } from "@/lib/server/alert";
import { sendReceiptEmail } from "@/lib/server/receipt-email";
import { ensureTickets } from "@/lib/server/tickets";
import {
  notifyPaymentSuccess,
  notifyPaymentFailure,
} from "@/lib/server/notify";
import { recordPaidMerchOrder } from "@/lib/server/inventory";
import { RECOVERABLE_PAYMENT_STATUSES } from "@/lib/server/payment-status";

// Paystack webhook. Signature: x-paystack-signature = HMAC-SHA512(raw body)
// keyed with the secret key. charge.success flips the ledger row (order id
// is the transaction reference) to paid. Always answer 200 fast on handled
// or ignored events so Paystack does not retry forever.

export const runtime = "nodejs";

// In-process idempotency guard: prevents the same event from being processed
// twice within the worker lifetime. Paystack sends each event at least once;
// a DB-level unique constraint on event_id is the durable solution.
const processed = new Set<string>();
const PROCESSED_MAX = 10_000;

function markProcessed(id: string) {
  if (processed.size >= PROCESSED_MAX) processed.clear();
  processed.add(id);
}
function wasProcessed(id: string) {
  return processed.has(id);
}

export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const raw = await req.text();
  if (!secret) return new NextResponse("not configured", { status: 503 });

  const sig = req.headers.get("x-paystack-signature") || "";
  const expected = crypto
    .createHmac("sha512", secret)
    .update(raw)
    .digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return new NextResponse("bad signature", { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return new NextResponse("ok", { status: 200 });
  }

  if (event?.event === "charge.success") {
    const ref = String(event.data?.reference || "");
    const amountSubunit = Number(event.data?.amount);
    const amountKes = amountSubunit / 100;
    const eventId = String(event.data?.id || ref);

    if (
      /^ORD-[A-Z0-9-]{4,40}$/.test(ref) &&
      Number.isSafeInteger(amountSubunit) &&
      amountSubunit > 0 &&
      Number.isSafeInteger(amountKes)
    ) {
      // Idempotency: skip if we have already processed this exact event.
      if (wasProcessed(eventId)) {
        console.log("[paystack] duplicate event skipped", eventId);
        return new NextResponse("ok", { status: 200 });
      }

      try {
        const { q, db } = await import("@/lib/server/db");
        if (db()) {
          const rows = await q(
            `UPDATE orders SET status='paid'
             WHERE id=$1
               AND status = ANY($3) AND total=$2
             RETURNING *`,
            [ref, amountKes, RECOVERABLE_PAYMENT_STATUSES],
          );
          if (rows.length) {
            markProcessed(eventId);
            await q(
              `INSERT INTO audit_log (actor, action, detail) VALUES ('paystack','order_paid',$1)`,
              [
                JSON.stringify({
                  id: ref,
                  channel: event.data?.channel,
                  amount: (event.data?.amount || 0) / 100,
                }),
              ],
            );
            console.log("[paystack] order paid", ref);
            // mint e-tickets, then the branded receipt email (which links them)
            // - fire-and-forget after the ack
            const paidRow = rows[0];
            if (paidRow)
              after(async () => {
                try {
                  const { consumeReservation } = await import("@/lib/server/ticket-inventory");
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
                  gateway: "paystack",
                  orderId: paidRow.id,
                  amount: paidRow.total,
                });
              });
          } else {
            console.log(
              "[paystack] charge.success for unknown/settled ref",
              ref,
            );
          }
        }
      } catch (e: any) {
        console.error("[paystack-webhook]", e);
        await alertCritical(
          "Paystack payment reconciliation failed",
          `ref ${ref}: ${String(e?.message || e)}`,
        );
      }
    }
  } else if (event?.event === "charge.failed") {
    const ref = String(event.data?.reference || "");
    if (/^ORD-[A-Z0-9-]{4,40}$/.test(ref)) {
      try {
        const { q, db } = await import("@/lib/server/db");
        if (db()) {
          const rows = await q(
            `UPDATE orders SET status='failed' WHERE id=$1 AND status = ANY($2) RETURNING id, total`,
            [ref, RECOVERABLE_PAYMENT_STATUSES],
          );
          if (rows[0])
            after(async () => {
              try {
                const { releaseReservation } = await import("@/lib/server/ticket-inventory");
                await releaseReservation(rows[0].id);
              } catch { /* hold expires on its own */ }
              await notifyPaymentFailure({
                gateway: "paystack",
                orderId: rows[0].id,
                amount: rows[0].total,
                reason: "charge.failed",
              });
            });
        }
      } catch {
        /* logged path only */
      }
    }
  }

  return new NextResponse("ok", { status: 200 });
}
