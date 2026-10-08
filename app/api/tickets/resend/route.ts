import { NextResponse } from 'next/server';
import { q, db } from '@/lib/server/db';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { sameOrigin } from '@/lib/server/origin';
import { sendReceiptEmail } from '@/lib/server/receipt-email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Buyer ticket retrieval: re-sends the receipt + ticket links for a paid
// order. The caller must prove ownership with the exact order id AND the
// contact (email or phone) recorded on the order. Always 200 — unknown ids
// and mismatched contacts are indistinguishable (no enumeration), and only
// paid/fulfilled orders can produce tickets.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!rateLimit('ticket-resend:' + clientIp(req), 5, 60_000, req)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const id = typeof body?.orderId === 'string' ? body.orderId.trim().slice(0, 60) : '';
  const contact = typeof body?.contact === 'string' ? body.contact.trim().toLowerCase().slice(0, 200) : '';
  if (!id || !contact) return NextResponse.json({ ok: true });
  try {
    const rows = await q<any>(`SELECT * FROM orders WHERE id=$1`, [id]);
    const order = rows[0];
    const matches =
      order &&
      (order.status === 'paid' || order.status === 'fulfilled') &&
      order.email &&
      (String(order.email).toLowerCase() === contact || String(order.phone || '') === contact.replace(/\D/g, ''));
    if (matches) await sendReceiptEmail(order, "resend-" + Math.floor(Date.now() / 60000));
  } catch (e) {
    console.error('[ticket-resend]', e);
  }
  return NextResponse.json({ ok: true });
}
