import { NextResponse, after } from 'next/server';
import { q, db } from '@/lib/server/db';
import { alertCritical } from '@/lib/server/alert';
import { sendReceiptEmail } from '@/lib/server/receipt-email';

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
          // branded receipt email - fire-and-forget after the ack, never blocking
          const paidRow = rows[0];
          if (paidRow?.email) after(() => sendReceiptEmail(paidRow));
        } else {
          await q(`UPDATE orders SET status='failed' WHERE mpesa_ref=$1 AND status='pending'`, [cb.CheckoutRequestID]);
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
