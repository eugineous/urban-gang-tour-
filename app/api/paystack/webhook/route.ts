import { NextResponse, after } from 'next/server';
import crypto from 'crypto';
import { alertCritical } from '@/lib/server/alert';
import { sendReceiptEmail } from '@/lib/server/receipt-email';

// Paystack webhook. Signature: x-paystack-signature = HMAC-SHA512(raw body)
// keyed with the secret key. charge.success flips the ledger row (order id
// is the transaction reference) to paid. Always answer 200 fast on handled
// or ignored events so Paystack does not retry forever.

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const raw = await req.text();
  if (!secret) return new NextResponse('not configured', { status: 503 });

  const sig = req.headers.get('x-paystack-signature') || '';
  const expected = crypto.createHmac('sha512', secret).update(raw).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return new NextResponse('bad signature', { status: 400 });
  }

  let event: any;
  try { event = JSON.parse(raw); } catch { return new NextResponse('ok', { status: 200 }); }

  if (event?.event === 'charge.success') {
    const ref = String(event.data?.reference || '');
    if (/^ORD-[A-Z0-9-]{4,40}$/.test(ref)) {
      try {
        const { q, db } = await import('@/lib/server/db');
        if (db()) {
          const rows = await q(
            `UPDATE orders SET status='paid' WHERE id=$1 AND status IN ('pending','failed') RETURNING *`,
            [ref]
          );
          if (rows.length) {
            await q(`INSERT INTO audit_log (actor, action, detail) VALUES ('paystack','order_paid',$1)`,
              [JSON.stringify({ id: ref, channel: event.data?.channel, amount: (event.data?.amount || 0) / 100 })]);
            console.log('[paystack] order paid', ref);
            // branded receipt email - fire-and-forget after the ack
            const paidRow = rows[0];
            if (paidRow?.email) after(() => sendReceiptEmail(paidRow));
          } else {
            console.log('[paystack] charge.success for unknown/settled ref', ref);
          }
        }
      } catch (e: any) {
        console.error('[paystack-webhook]', e);
        await alertCritical('Paystack payment reconciliation failed', `ref ${ref}: ${String(e?.message || e)}`);
      }
    }
  } else if (event?.event === 'charge.failed') {
    const ref = String(event.data?.reference || '');
    if (/^ORD-[A-Z0-9-]{4,40}$/.test(ref)) {
      try {
        const { q, db } = await import('@/lib/server/db');
        if (db()) await q(`UPDATE orders SET status='failed' WHERE id=$1 AND status='pending'`, [ref]);
      } catch { /* logged path only */ }
    }
  }

  return new NextResponse('ok', { status: 200 });
}
