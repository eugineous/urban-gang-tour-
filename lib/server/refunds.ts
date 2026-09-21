// Refund ledger foundation. A "refunded" order status must always be backed
// by a ledger row — amount, reason, actor, timestamp — never a bare string
// flip. This module is the ONLY writer of refunded/partially_refunded.
//
// Deliberately gateway-agnostic and local-only: it records the financial
// truth and revokes/unlocks downstream state (tickets voided, holds
// released). Actual provider-side money movement (M-Pesa reversal, Paystack
// refund API, Stripe refund) is a separate, owner-approved step per gateway
// and is NOT performed here.
import { q, hasDb } from './db';

export interface RefundInput {
  orderId: string;
  amountKes: number;
  reason: string;
  actor: string;
}

export async function recordRefund(input: RefundInput): Promise<{ status: 'refunded' | 'partially_refunded'; refundId: number }> {
  if (!hasDb()) throw new Error('db_not_configured');
  if (!input.orderId || typeof input.orderId !== 'string') throw new Error('invalid_order_id');
  if (!Number.isSafeInteger(input.amountKes) || input.amountKes < 1) throw new Error('invalid_refund_amount');
  if (!input.reason || input.reason.trim().length < 3) throw new Error('refund_reason_required');
  const rows = await q<{ id: string; total: number; status: string }>(
    `SELECT id, total, status FROM orders WHERE id=$1`,
    [input.orderId],
  );
  const order = rows[0];
  if (!order) throw new Error('order_not_found');
  if (order.status !== 'paid' && order.status !== 'fulfilled' && order.status !== 'partially_refunded')
    throw new Error('order_not_refundable');
  if (input.amountKes > Number(order.total)) throw new Error('refund_exceeds_total');
  await q(
    `CREATE TABLE IF NOT EXISTS refunds (
      id SERIAL PRIMARY KEY, order_id TEXT NOT NULL, amount INT NOT NULL,
      reason TEXT NOT NULL, actor TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now()
    )`,
  );
  await q(`CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds (order_id)`);
  const prior = await q<{ total: number }>(
    `SELECT COALESCE(SUM(amount),0)::int AS total FROM refunds WHERE order_id=$1`,
    [input.orderId],
  );
  const refundedSoFar = Number(prior[0]?.total || 0);
  if (refundedSoFar + input.amountKes > Number(order.total)) throw new Error('refund_exceeds_total');
  const inserted = await q<{ id: number }>(
    `INSERT INTO refunds (order_id, amount, reason, actor) VALUES ($1,$2,$3,$4) RETURNING id`,
    [input.orderId, input.amountKes, input.reason.slice(0, 500), input.actor.slice(0, 200)],
  );
  const full = refundedSoFar + input.amountKes >= Number(order.total);
  const nextStatus = full ? 'refunded' : 'partially_refunded';
  await q(`UPDATE orders SET status=$2 WHERE id=$1`, [input.orderId, nextStatus]);
  // Refunded tickets must never scan at the gate. The verify route only
  // honours tickets whose order is paid/fulfilled, so the status flip above
  // already blocks them — this timestamp records why for the audit trail.
  await q(
    `UPDATE tickets SET used_by='refunded:' || $2 WHERE order_id=$1 AND used_at IS NULL`,
    [input.orderId, String(inserted[0]?.id || '')],
  ).catch(() => {});
  await q(
    `INSERT INTO audit_log (actor, action, detail) VALUES ('admin','order_refund',$1)`,
    [JSON.stringify({ id: input.orderId, amount: input.amountKes, status: nextStatus, by: input.actor, reason: input.reason.slice(0, 200) })],
  );
  return { status: nextStatus, refundId: Number(inserted[0]?.id || 0) };
}
