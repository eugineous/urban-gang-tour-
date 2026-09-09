import { NextResponse } from 'next/server';
import { rateLimit, clientIp, PUBLIC_READ_NETWORK_LIMIT } from '@/lib/server/ratelimit';

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
  // Every buyer polls this every ~6s while their M-Pesa prompt is open, so at
  // a packed event it is the busiest endpoint on the site. Per device rather
  // than per IP: a thousand people on one venue wifi were sharing a single
  // 30-per-minute budget, which capped the whole hall at five concurrent
  // checkouts. See lib/server/ratelimit.ts.
  // Network budget sized from the actual peak: 1000 buyers each polling every
  // ~6s while their M-Pesa prompt is open is ~10,000 requests a minute off one
  // venue IP. The default backstop (40x the device budget) would have rejected
  // most of them, so this uses the large public-read allowance instead. The
  // lookup itself is a single primary-key SELECT.
  if (!rateLimit('status:' + clientIp(req), 30, 60_000, req, PUBLIC_READ_NETWORK_LIMIT)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  const id = new URL(req.url).searchParams.get('id') || '';
  if (!ID_RE.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  // hasDb(), not db(): the latter built a throwaway Pool on every poll purely
  // to test whether DATABASE_URL was set.
  const { q, hasDb } = await import('@/lib/server/db');
  if (!hasDb()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

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
