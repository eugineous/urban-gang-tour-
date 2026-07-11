import { NextResponse, after } from 'next/server';
import type Stripe from 'stripe';
import { alertCritical } from '@/lib/server/alert';
import { stripe } from '@/lib/server/stripe';
import { sendReceiptEmail } from '@/lib/server/receipt-email';

// Stripe webhook (server-to-server; signature-verified, so no Origin check —
// same exemption class as /api/mpesa/callback). Registered in the Stripe
// dashboard for: checkout.session.completed, payment_intent.succeeded,
// payment_intent.payment_failed. Reconciles the order ledger via
// metadata.order_id and always 200-acks handled/ignored events quickly.

export const runtime = 'nodejs';

let columnsReady = false;
async function ensureColumns(q: (sql: string, params?: any[]) => Promise<any[]>) {
  if (columnsReady) return;
  await q(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS pay_method TEXT DEFAULT 'mpesa'`);
  await q(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session TEXT`);
  await q(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent TEXT`);
  columnsReady = true;
}

export async function POST(req: Request) {
  const s = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s || !secret) return NextResponse.json({ error: 'webhook_not_configured' }, { status: 503 });

  // Signature is computed over the RAW body — never parse before verifying.
  const payload = await req.text();
  const sig = req.headers.get('stripe-signature') || '';
  let event: Stripe.Event;
  try {
    event = s.webhooks.constructEvent(payload, sig, secret);
  } catch (e: any) {
    console.error('[stripe-webhook] bad signature:', String(e?.message || e).slice(0, 200));
    return NextResponse.json({ error: 'bad_signature' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id || '';
      const pi = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || '';
      console.log('[stripe-webhook]', JSON.stringify({ type: event.type, order: orderId, session: session.id }));
      if (orderId) {
        try {
          const { q, db } = await import('@/lib/server/db');
          if (db()) {
            await ensureColumns(q);
            const rows = await q(
              `UPDATE orders SET status='paid', stripe_payment_intent=$2,
                 stripe_session=COALESCE(NULLIF(stripe_session,''), $3)
               WHERE id=$1 RETURNING *`,
              [orderId, pi, session.id]
            );
            if (rows.length === 0) {
              await alertCritical(
                'Stripe payment with no matching order',
                `checkout.session.completed for order ${orderId} (session ${session.id}) matched no ledger row`
              );
            } else {
              await q(
                `INSERT INTO audit_log (actor, action, detail) VALUES ($1,$2,$3)`,
                ['stripe', 'order_paid', JSON.stringify({ order_id: orderId, session: session.id, payment_intent: pi, amount_total: session.amount_total })]
              );
              // branded receipt email - fire-and-forget after the ack
              const paidRow = rows[0];
              if (paidRow?.email) after(() => sendReceiptEmail(paidRow));
            }
          }
        } catch (e: any) {
          // a real Stripe payment failed to reconcile - the ledger is now stale
          await alertCritical(
            'Stripe webhook processing failed',
            `order ${orderId} session ${session.id}: ${String(e?.message || e)}`
          );
        }
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata?.order_id || '';
      console.log('[stripe-webhook]', JSON.stringify({ type: event.type, order: orderId, intent: intent.id }));
      if (orderId) {
        try {
          const { q, db } = await import('@/lib/server/db');
          if (db()) {
            await ensureColumns(q);
            await q(`UPDATE orders SET status='failed' WHERE id=$1 AND status='pending'`, [orderId]);
          }
        } catch (e: any) {
          console.error('[stripe-webhook]', e); // failure record only - no money moved
        }
      }
    } else {
      // payment_intent.succeeded etc: checkout.session.completed is the source
      // of truth for fulfilment; acknowledge and move on.
      console.log('[stripe-webhook] ignored', event.type);
    }
  } catch (e: any) {
    // never let a handler bug turn into endless Stripe retries
    console.error('[stripe-webhook]', e);
  }
  return NextResponse.json({ received: true });
}
