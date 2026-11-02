import { NextResponse, after } from "next/server";
import type Stripe from "stripe";
import { alertCritical } from "@/lib/server/alert";
import { stripe } from "@/lib/server/stripe";
import {
  notifyPaymentSuccess,
  notifyPaymentFailure,
} from "@/lib/server/notify";
import { settleStripeOrder, processPaymentEffects } from '@/lib/server/payment-effects';
import { RECOVERABLE_PAYMENT_STATUSES } from "@/lib/server/payment-status";

// Stripe webhook (server-to-server; signature-verified, so no Origin check —
// same exemption class as /api/mpesa/callback). Registered in the Stripe
// dashboard for: checkout.session.completed, payment_intent.succeeded,
// payment_intent.payment_failed. Reconciles the order ledger via
// metadata.order_id. Verified settlement storage failures remain retryable;
// optional notices/audit cannot prevent the durable fulfillment enqueue.

export const runtime = "nodejs";

let columnsReady = false;
async function ensureColumns(
  q: (sql: string, params?: any[]) => Promise<any[]>,
) {
  if (columnsReady) return;
  await q(
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS pay_method TEXT DEFAULT 'mpesa'`,
  );
  await q(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session TEXT`);
  await q(
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent TEXT`,
  );
  columnsReady = true;
}

export async function POST(req: Request) {
  const s = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s || !secret)
    return NextResponse.json(
      { error: "webhook_not_configured" },
      { status: 503 },
    );

  // Signature is computed over the RAW body — never parse before verifying.
  const payload = await req.text();
  const sig = req.headers.get("stripe-signature") || "";
  let event: Stripe.Event;
  try {
    event = s.webhooks.constructEvent(payload, sig, secret);
  } catch (e: any) {
    console.error(
      "[stripe-webhook] bad signature:",
      String(e?.message || e).slice(0, 200),
    );
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id || "";
      const pi =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || "";
      console.log(
        "[stripe-webhook]",
        JSON.stringify({
          type: event.type,
          order: orderId,
          session: session.id,
        }),
      );
      const amountSubunit = Number(session.amount_total);
      const amountKes = amountSubunit / 100;
      if (
        /^ORD-[A-Z0-9-]{4,40}$/.test(orderId) &&
        /^cs_[A-Za-z0-9_]{1,200}$/.test(session.id) &&
        /^pi_[A-Za-z0-9_]{1,200}$/.test(pi) &&
        session.payment_status === "paid" &&
        String(session.currency || "").toLowerCase() === "kes" &&
        Number.isSafeInteger(amountSubunit) &&
        amountSubunit > 0 &&
        Number.isSafeInteger(amountKes)
      ) {
        try {
          const { q, hasDb } = await import("@/lib/server/db");
          if (hasDb()) {
            await ensureColumns(q);
            const paidRow = await settleStripeOrder({ orderId, sessionId: session.id, paymentIntentId: pi, amountKes });
            if (paidRow) {
              after(async () => {
                await Promise.allSettled([
                  processPaymentEffects(4, paidRow.id).catch(() => console.error('[stripe-effects] deferred_drain_failed')),
                  notifyPaymentSuccess({ gateway: 'stripe', orderId: paidRow.id, amount: paidRow.total }),
                  q(`INSERT INTO audit_log (actor, action, detail) VALUES ($1,$2,$3)`, [
                    'stripe', 'order_paid', JSON.stringify({ order_id: orderId, session: session.id, payment_intent: pi, amount_total: session.amount_total }),
                  ]).catch(() => console.error('[stripe-audit] audit_unavailable')),
                ]);
              });
            }
          } else return NextResponse.json({ error: 'ledger_unavailable' }, { status: 503 });
        } catch {
          console.error('[stripe-webhook] durable_settlement_unavailable');
          after(async () => {
            await alertCritical('Stripe payment reconciliation failed', 'A signed paid checkout could not commit its ledger and durable customer effects. Provider redelivery remains retryable.').catch(() => {});
          });
          return NextResponse.json({ error: 'ledger_unavailable' }, { status: 503 });
        }
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata?.order_id || "";
      console.log(
        "[stripe-webhook]",
        JSON.stringify({ type: event.type, order: orderId, intent: intent.id }),
      );
      const amountSubunit = Number(intent.amount);
      const amountKes = amountSubunit / 100;
      if (/^ORD-[A-Z0-9-]{4,40}$/.test(orderId) && /^pi_[A-Za-z0-9_]{1,200}$/.test(intent.id)
        && String(intent.currency || '').toLowerCase() === 'kes'
        && Number.isSafeInteger(amountSubunit) && amountSubunit > 0 && Number.isSafeInteger(amountKes)) {
        try {
          const { q, hasDb } = await import("@/lib/server/db");
          if (hasDb()) {
            await ensureColumns(q);
            const rows = await q(
              // One declined intent does not close its hosted checkout. Only
              // a stored exact intent can associate this event with the order;
              // unbound metadata is ignored until session completion verifies it.
              `UPDATE orders SET status='reconciling'
               WHERE id=$1 AND status = ANY($2) AND stripe_payment_intent=$3
                 AND pay_method='card' AND total=$4 AND status<>'reconciling'
               RETURNING id, total`,
              [orderId, RECOVERABLE_PAYMENT_STATUSES, intent.id, amountKes],
            );
            if (rows[0])
              after(async () => {
                await notifyPaymentFailure({
                  gateway: "stripe",
                  orderId: rows[0].id,
                  amount: rows[0].total,
                  reason:
                    'A card attempt failed; hosted checkout remains unconfirmed. ' + (intent.last_payment_error?.message || 'payment_failed'),
                });
              });
          }
        } catch (e: any) {
          console.error("[stripe-webhook]", e); // failure record only - no money moved
        }
      }
    } else {
      // payment_intent.succeeded etc: checkout.session.completed is the source
      // of truth for fulfilment; acknowledge and move on.
      console.log("[stripe-webhook] ignored", event.type);
    }
  } catch (e: any) {
    // never let a handler bug turn into endless Stripe retries
    console.error("[stripe-webhook]", e);
  }
  return NextResponse.json({ received: true });
}
