import { NextResponse } from 'next/server';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';

// Public order status poll for the checkout STK-waiting panels.
// Roles: public (anon). The unguessable ORD- id is the bearer token; the
// response NEVER includes name/email/phone (see CLAUDE.md privacy rules).
// GET /api/orders/status?id=ORD-... ->
//   { status, total, receipt, method, created_at }
// receipt is only revealed once the order is paid (M-Pesa receipt, Paystack
// reference or Stripe payment intent, depending on the rail).

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ID_RE = /^ORD-[A-Z0-9-]{4,40}$/;

export async function GET(req: Request) {
  if (!rateLimit('status:' + clientIp(req), 30, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  const id = new URL(req.url).searchParams.get('id') || '';
  if (!ID_RE.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const { q, db } = await import('@/lib/server/db');
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  let rows: any[];
  try {
    rows = await q(`SELECT * FROM orders WHERE id=$1`, [id]);
  } catch (e: any) {
    console.error('[order-status]', e);
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  }
  if (!rows.length) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const o = rows[0];
  const paid = o.status === 'paid';
  // pay_method / paystack_ref / stripe_payment_intent are added lazily by the
  // card routes' ensureColumns; SELECT * keeps this endpoint tolerant of both
  // schema generations.
  const receipt = paid
    ? String(o.mpesa_receipt || o.paystack_ref || o.stripe_payment_intent || '')
    : '';
  return NextResponse.json(
    {
      status: String(o.status || 'pending'),
      total: Number(o.total) || 0,
      receipt,
      method: String(o.pay_method || 'mpesa'),
      created_at: o.created_at,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
