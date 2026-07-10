import { NextResponse } from 'next/server';
import { q, db } from '@/lib/server/db';

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
      if (cb.ResultCode === 0) {
        const items = cb?.CallbackMetadata?.Item || [];
        const receipt = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value || '';
        await q(`UPDATE orders SET status='paid', mpesa_receipt=$2 WHERE mpesa_ref=$1`, [cb.CheckoutRequestID, String(receipt)]);
      } else {
        await q(`UPDATE orders SET status='failed' WHERE mpesa_ref=$1 AND status='pending'`, [cb.CheckoutRequestID]);
      }
    }
  } catch { /* always ack so Daraja doesn't retry forever */ }
  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}
