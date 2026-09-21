// Payment reconciliation sweep — recovery for callbacks that never arrive.
// M-Pesa: Daraja stkpushquery by CheckoutRequestID (authoritative ResultCode).
// Paystack: transaction/verify by reference. Every write is idempotent
// (WHERE status IN pending/unknown/reconciling + amount match) so the sweep
// can never double-fulfil or fight a live callback. Paid rows mint tickets
// exactly once via ensureTickets' advisory lock, same as the webhooks.
import { q, hasDb } from './db';
import { stkPushQuery } from './mpesa';
import { paystackVerify, paystackConfigured } from './paystack';
import { consumeReservation, releaseReservation } from './ticket-inventory';
import { amountsMatch } from './payment-status';

/** Pure mapping: Daraja ResultCode -> ledger status. Unit-testable. */
export function decideMpesaOutcome(resultCode: number): 'paid' | 'declined' | 'timed_out' | 'unknown' {
  if (resultCode === 0) return 'paid';
  // 1032 cancelled by user, 1 insufficient balance, 1037 timeout twice etc.
  if (resultCode === 1032 || resultCode === 1) return 'declined';
  if (resultCode === 2001 || resultCode === 1037 || resultCode === 1025) return 'timed_out';
  return 'unknown';
}

export interface ReconcileOutcome {
  checked: number;
  paid: string[];
  failed: string[];
  stillPending: string[];
  skipped: string[];
}

export async function reconcileStuckOrders(limit = 25): Promise<ReconcileOutcome> {
  const out: ReconcileOutcome = { checked: 0, paid: [], failed: [], stillPending: [], skipped: [] };
  if (!hasDb()) return out;
  const rows = await q<{
    id: string; total: number; status: string; mpesa_ref: string | null; paystack_ref: string | null; pay_method: string | null;
  }>(
    `SELECT id, total, status, mpesa_ref,
            NULLIF(paystack_ref,'') AS paystack_ref,
            NULLIF(pay_method,'') AS pay_method
       FROM orders
      WHERE status IN ('pending','unknown','reconciling')
        AND created_at < now() - interval '20 minutes'
      ORDER BY created_at ASC LIMIT $1`,
    [limit],
  ).catch(() => [] as any[]);
  for (const o of rows) {
    out.checked++;
    try {
      if (o.mpesa_ref) {
        const qr = await stkPushQuery(o.mpesa_ref);
        if (!qr.ok) {
          if (qr.reason === 'not_configured') { out.skipped.push(o.id); continue; }
          out.stillPending.push(o.id);
          continue;
        }
        const next = decideMpesaOutcome(qr.resultCode);
        if (next === 'paid') {
          if (qr.amount !== undefined && !amountsMatch(o.total, qr.amount)) {
            await q(`UPDATE orders SET status='reconciling' WHERE id=$1`, [o.id]);
            out.stillPending.push(o.id);
            continue;
          }
          const paid = await q(
            `UPDATE orders SET status='paid', mpesa_receipt=COALESCE(mpesa_receipt,$2)
              WHERE id=$1 AND status IN ('pending','unknown','reconciling') RETURNING *`,
            [o.id, qr.receipt || ''],
          );
          if (paid.length) {
            const { ensureTickets } = await import('./tickets');
            await consumeReservation(o.id).catch(() => {});
            await ensureTickets(paid[0]).catch(() => {});
            await q(`INSERT INTO audit_log (actor, action, detail) VALUES ('reconcile','order_paid',$1)`, [
              JSON.stringify({ id: o.id, via: 'stkpushquery', receipt: qr.receipt || '' }),
            ]).catch(() => {});
            out.paid.push(o.id);
          } else out.stillPending.push(o.id);
        } else if (next === 'declined' || next === 'timed_out') {
          const target = next === 'declined' ? 'declined' : 'timed_out';
          const failed = await q(
            `UPDATE orders SET status=$2
              WHERE id=$1 AND status IN ('pending','unknown','reconciling') RETURNING id`,
            [o.id, target],
          );
          if (failed.length) {
            await releaseReservation(o.id).catch(() => {});
            out.failed.push(o.id);
          } else out.stillPending.push(o.id);
        } else {
          await q(`UPDATE orders SET status='unknown' WHERE id=$1 AND status='pending'`, [o.id]).catch(() => {});
          out.stillPending.push(o.id);
        }
      } else if (o.paystack_ref && paystackConfigured()) {
        const v = await paystackVerify(o.paystack_ref);
        if (!v.ok) { out.stillPending.push(o.id); continue; }
        if (v.paid && amountsMatch(o.total, v.amountKes)) {
          const paid = await q(
            `UPDATE orders SET status='paid' WHERE id=$1 AND status IN ('pending','unknown','reconciling') RETURNING *`,
            [o.id],
          );
          if (paid.length) {
            const { ensureTickets } = await import('./tickets');
            await consumeReservation(o.id).catch(() => {});
            await ensureTickets(paid[0]).catch(() => {});
            out.paid.push(o.id);
          } else out.stillPending.push(o.id);
        } else if (v.paid) {
          await q(`UPDATE orders SET status='reconciling' WHERE id=$1`, [o.id]).catch(() => {});
          out.stillPending.push(o.id);
        } else out.stillPending.push(o.id);
      } else {
        out.skipped.push(o.id);
      }
    } catch {
      out.stillPending.push(o.id);
    }
  }
  return out;
}
