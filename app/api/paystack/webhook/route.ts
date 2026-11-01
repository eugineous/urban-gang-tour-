import { NextResponse, after } from "next/server";
import crypto from "crypto";
import { alertCritical } from "@/lib/server/alert";
import { notifyPaymentSuccess } from "@/lib/server/notify";
import { RECOVERABLE_PAYMENT_STATUSES } from "@/lib/server/payment-status";
import { settlePaystackOrder, processPaymentEffects } from '@/lib/server/payment-effects';

// Paystack webhook. Signature: x-paystack-signature = HMAC-SHA512(raw body)
// keyed with the secret key. charge.success flips the ledger row (order id
// is the transaction reference) to paid. Acknowledge ignored/handled events;
// retryable ledger failures must return 503 so the provider can redeliver.

export const runtime = "nodejs";

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
    const ref = event.data?.reference;
    const amountSubunit = event.data?.amount;
    const amountKes = amountSubunit / 100;

    if (
      typeof ref === "string" && /^ORD-[A-Z0-9-]{4,40}$/.test(ref) &&
      event.data?.currency === "KES" && event.data?.status === "success" &&
      Number.isSafeInteger(amountSubunit) &&
      amountSubunit > 0 &&
      Number.isSafeInteger(amountKes)
    ) {
      try {
        const { q, hasDb } = await import("@/lib/server/db");
        if (hasDb()) {
          const paidRow = await settlePaystackOrder({ orderId: ref, reference: ref, amountKes });
          if (paidRow) {
            // Customer consequences are already durable in the settlement
            // statement. after() only accelerates them; cron recovers a crash.
            after(async () => {
                await processPaymentEffects(4, paidRow.id).catch(() => console.error('[paystack-effects] deferred_drain_failed'));
                // Owner notices are existing best effort, not replayable
                // customer effects. Do not duplicate WhatsApp on retries.
                await notifyPaymentSuccess({
                  gateway: "paystack",
                  orderId: paidRow.id,
                  amount: paidRow.total,
                });
                // Best-effort audit follows customer consequences so an audit
                // outage cannot delay acknowledgement or fulfilment.
                await q(
                  `INSERT INTO audit_log (actor, action, detail) VALUES ('paystack','order_paid',$1)`,
                  [JSON.stringify({ id: ref, channel: event.data?.channel, amount: amountKes })],
                ).catch(()=>console.error('[paystack-audit] audit_unavailable'));
              });
          }
        } else return new NextResponse("ledger unavailable", { status: 503 });
      } catch {
        console.error('[paystack-webhook] durable_settlement_unavailable');
        after(async () => {
          await alertCritical(
            "Paystack payment reconciliation failed",
            'A signed payment event could not commit its ledger and durable customer effects. Provider redelivery remains retryable.',
          ).catch(() => {});
        });
        return new NextResponse("ledger unavailable", { status: 503 });
      }
    }
  } else if (event?.event === "charge.failed") {
    const ref = event.data?.reference;
    const amountSubunit = event.data?.amount;
    const amountKes = amountSubunit / 100;
    if (typeof ref === "string" && /^ORD-[A-Z0-9-]{4,40}$/.test(ref)
      && event.data?.currency === "KES" && Number.isSafeInteger(amountSubunit)
      && amountSubunit > 0 && Number.isSafeInteger(amountKes)) {
      try {
        const { q, hasDb } = await import("@/lib/server/db");
        if (hasDb()) {
          // A failed charge does not prove the hosted session is no longer
          // payable. Retain its reference and inventory hold for verification.
          await q(
            `UPDATE orders SET status='reconciling'
             WHERE id=$1 AND status = ANY($3) AND total=$2
               AND pay_method='card' AND paystack_ref=$1`,
            [ref, amountKes, RECOVERABLE_PAYMENT_STATUSES],
          );
        } else return new NextResponse("ledger unavailable", { status: 503 });
      } catch {
        console.error('[paystack-webhook] ledger_unavailable');
        return new NextResponse("ledger unavailable", { status: 503 });
      }
    }
  }

  return new NextResponse("ok", { status: 200 });
}
