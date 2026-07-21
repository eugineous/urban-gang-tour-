import { NextResponse, after } from 'next/server';
import { q, db } from '@/lib/server/db';
import { alertCritical } from '@/lib/server/alert';
import { sendReceiptEmail } from '@/lib/server/receipt-email';
import { ensureTickets } from '@/lib/server/tickets';
import { notifyPaymentSuccess, notifyPaymentFailure } from '@/lib/server/notify';

// Daraja payment result callback: reconcile the order ledger.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cb = body?.Body?.stkCallback;
    console.log('[mpesa-callback]', JSON.stringify({
      CheckoutRequestID: cb?.CheckoutRequestID,
      ResultCode: cb?.ResultCode,
      ResultDesc: cb?.ResultDesc,
    }));
    if (db() && cb?.CheckoutRequestID) {
      try {
        if (cb.ResultCode === 0) {
          const items = cb?.CallbackMetadata?.Item || [];
          const receipt = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value || '';
          const rows = await q(
            `UPDATE orders SET status='paid', mpesa_receipt=$2 WHERE mpesa_ref=$1 RETURNING *`,
            [cb.CheckoutRequestID, String(receipt)]
          );
          // mint e-tickets, then the branded receipt email (which links them) -
          // fire-and-forget after the ack, never blocking Daraja's timeout
          const paidRow = rows[0];
          if (paidRow) after(async () => {
            try { await ensureTickets(paidRow); } catch (e) { console.error('[tickets-mint]', e); }
            if (paidRow.email) await sendReceiptEmail(paidRow);
            await notifyPaymentSuccess({ gateway: 'mpesa', orderId: paidRow.id, amount: paidRow.total });
          });
        } else {
          const failedRows = await q(`UPDATE orders SET status='failed' WHERE mpesa_ref=$1 AND status='pending' RETURNING id, total`, [cb.CheckoutRequestID]);
          if (failedRows[0]) after(() => notifyPaymentFailure({ gateway: 'mpesa', orderId: failedRows[0].id, amount: failedRows[0].total, reason: cb.ResultDesc }));
        }
      } catch (e: any) {
        // a real Daraja result failed to reconcile - the ledger is now stale
        await alertCritical(
          'M-Pesa callback processing failed',
          `CheckoutRequestID ${cb.CheckoutRequestID} ResultCode ${cb.ResultCode}: ${String(e?.message || e)}`
        );
      }
    }
  } catch { /* malformed payload - always ack so Daraja doesn't retry forever */ }
  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}
