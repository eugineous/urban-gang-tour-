import { NextResponse, after } from 'next/server';
import { q, hasDb } from '@/lib/server/db';
import { alertCritical } from '@/lib/server/alert';
import { sendReceiptEmail } from '@/lib/server/receipt-email';
import { ensureTickets } from '@/lib/server/tickets';
import { notifyPaymentSuccess, notifyPaymentFailure } from '@/lib/server/notify';
import { recordPaidMerchOrder } from '@/lib/server/inventory';
import { consumeReservation, releaseReservation } from '@/lib/server/ticket-inventory';
import { RECOVERABLE_PAYMENT_STATUSES, amountsMatch } from '@/lib/server/payment-status';
import { stkPushQuery } from '@/lib/server/mpesa';
import { decideMpesaOutcome } from '@/lib/server/reconcile';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';

// Daraja does not sign STK callbacks. A callback is only a wake-up signal:
// authenticate the outcome with Daraja before changing payment/inventory truth.
// ACK first so provider/network latency cannot make Daraja retry the hook.
export async function POST(req: Request) {
  const accepted = () => NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  if (!hasDb() || !rateLimit('mpesa-callback:' + clientIp(req), 3000, 60_000)) return accepted();
  try {
    const raw = await req.text();
    if (raw.length > 16000) return accepted();
    const cb = JSON.parse(raw)?.Body?.stkCallback;
    if (typeof cb?.CheckoutRequestID !== 'string' ||
        !/^[A-Za-z0-9_-]{1,100}$/.test(cb.CheckoutRequestID)) return accepted();
    const reference: string = cb.CheckoutRequestID;
    const metadata = Array.isArray(cb.CallbackMetadata?.Item) ? cb.CallbackMetadata.Item : [];
    const callbackReceipt = metadata.find((i: any) => i?.Name === 'MpesaReceiptNumber')?.Value;
    const callbackAmount = metadata.find((i: any) => i?.Name === 'Amount')?.Value;

    after(async () => {
      try {
        // Unknown or settled references never trigger provider queries or fulfilment.
        const orders = await q<{ id: string; total: number }>(
          'SELECT id,total FROM orders WHERE mpesa_ref=$1 AND status = ANY($2)',
          [reference, RECOVERABLE_PAYMENT_STATUSES],
        );
        if (!orders.length) return;
        const verified = await stkPushQuery(reference);
        const outcome = verified.ok ? decideMpesaOutcome(verified.resultCode) : 'unknown';
        if (!verified.ok || outcome === 'unknown') {
          await q("UPDATE orders SET status='reconciling' WHERE mpesa_ref=$1 AND status = ANY($2)", [reference, RECOVERABLE_PAYMENT_STATUSES]);
          return; // The scheduled reconciliation sweep will retry.
        }
        if (outcome === 'paid') {
          const receipt = verified.receipt || (cb.ResultCode === 0 ? callbackReceipt : '');
          const amount = verified.amount ?? (cb.ResultCode === 0 ? callbackAmount : undefined);
          if (!amountsMatch(orders[0].total, amount) ||
              typeof receipt !== 'string' || !/^[A-Z0-9]{5,20}$/.test(receipt) ||
              (verified.amount !== undefined && callbackAmount !== undefined && !amountsMatch(verified.amount, callbackAmount)) ||
              (verified.receipt && callbackReceipt && verified.receipt !== callbackReceipt)) {
            await q("UPDATE orders SET status='reconciling' WHERE mpesa_ref=$1 AND status = ANY($2)", [reference, RECOVERABLE_PAYMENT_STATUSES]);
            await alertCritical('M-Pesa confirmed outcome needs reconciliation', `CheckoutRequestID ${reference}: receipt or amount was missing or inconsistent`);
            return;
          }
          const rows = await q(
            `UPDATE orders SET status='paid', mpesa_receipt=$2
             WHERE mpesa_ref=$1 AND status = ANY($3) AND total=$4 RETURNING *`,
            [reference, receipt, RECOVERABLE_PAYMENT_STATUSES, Number(amount)],
          );
          const paid = rows[0];
          if (!paid) return; // Atomic state predicate prevents duplicate fulfilment.
          await consumeReservation(paid.id).catch(e => console.error('[ticket-reservation]', e));
          await recordPaidMerchOrder(paid).catch(e => console.error('[merch-inventory]', e));
          await ensureTickets(paid).catch(e => console.error('[tickets-mint]', e));
          if (paid.email) await sendReceiptEmail(paid);
          await notifyPaymentSuccess({ gateway: 'mpesa', orderId: paid.id, amount: paid.total });
        } else {
          const rows = await q(
            'UPDATE orders SET status=$2 WHERE mpesa_ref=$1 AND status = ANY($3) RETURNING id,total',
            [reference, outcome, RECOVERABLE_PAYMENT_STATUSES],
          );
          if (!rows[0]) return;
          await releaseReservation(rows[0].id).catch(() => {});
          await notifyPaymentFailure({ gateway: 'mpesa', orderId: rows[0].id, amount: rows[0].total, reason: verified.resultDesc });
        }
      } catch (error) {
        await alertCritical('M-Pesa callback verification failed', `CheckoutRequestID ${reference}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  } catch { /* Invalid callbacks cannot change the ledger. */ }
  return accepted();
}
