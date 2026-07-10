import { NextResponse } from 'next/server';

// Daraja payment result callback. Logs the result; wire to DB when provisioned.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cb = body?.Body?.stkCallback;
    console.log('[mpesa-callback]', JSON.stringify({
      MerchantRequestID: cb?.MerchantRequestID,
      ResultCode: cb?.ResultCode,
      ResultDesc: cb?.ResultDesc,
    }));
  } catch { /* always ack so Daraja doesn't retry forever */ }
  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}
