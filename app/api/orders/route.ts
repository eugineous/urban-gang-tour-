import { NextResponse } from 'next/server';
import { serverTotal } from '@/lib/server/catalog';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { mpesaConfigured, stkPush, normalizePhone } from '@/lib/server/mpesa';

const seen = new Map<string, { id: string; ts: number }>(); // idempotency

export async function POST(req: Request) {
  if (!rateLimit(clientIp(req), 8, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const allowed = new Set(['items', 'name', 'email', 'phone', 'idempotencyKey']);
  for (const k of Object.keys(body)) {
    if (!allowed.has(k)) return NextResponse.json({ error: `unexpected_field:${k}` }, { status: 400 });
  }
  const { items, name, email, phone, idempotencyKey } = body;
  if (!Array.isArray(items) || items.length === 0 || items.length > 30) return NextResponse.json({ error: 'invalid_items' }, { status: 400 });
  for (const it of items) {
    if (typeof it?.id !== 'string' || !Number.isInteger(it?.qty) || it.qty < 1 || it.qty > 20) {
      return NextResponse.json({ error: 'invalid_item' }, { status: 400 });
    }
  }
  if (typeof name !== 'string' || name.length < 2 || name.length > 100) return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
  const emailStr = typeof email === 'string' && email ? email : '';
  if (emailStr && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailStr)) return NextResponse.json({ error: 'invalid_email' }, { status: 400 }); // email OPTIONAL: guests pay via M-Pesa with phone only
  const msisdn = normalizePhone(String(phone || ''));
  if (!msisdn) return NextResponse.json({ error: 'invalid_phone_use_254' }, { status: 400 });

  // idempotency: same key within 10 min returns the same order id
  if (typeof idempotencyKey === 'string' && idempotencyKey) {
    const prev = seen.get(idempotencyKey);
    if (prev && Date.now() - prev.ts < 600_000) return NextResponse.json({ ok: true, id: prev.id, deduped: true });
  }

  let total: number;
  try { total = serverTotal(items); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }

  const id = 'ORD-' + Date.now().toString(36).toUpperCase();
  if (typeof idempotencyKey === 'string' && idempotencyKey) seen.set(idempotencyKey, { id, ts: Date.now() });
  console.log('[order]', JSON.stringify({ id, items, total, name, email: emailStr, msisdn }));

  // persist order (ledger for admin reconciliation)
  try {
    const { q, db } = await import('@/lib/server/db');
    if (db()) {
      await q(
        `INSERT INTO orders (id, items, total, name, email, phone) VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, JSON.stringify(items), total, name, emailStr, msisdn]
      );
    }
  } catch (e) { console.error('[order-db]', e); }

  if (!mpesaConfigured()) {
    return NextResponse.json(
      { ok: false, id, total, payment: 'not_configured', hint: 'Set MPESA_* env vars in Vercel to activate live STK push.' },
      { status: 503 }
    );
  }
  try {
    const stk = await stkPush(msisdn, total, id, 'UrbanGang');
    // remember Daraja's CheckoutRequestID so the callback can mark this order paid
    try {
      const { q, db } = await import('@/lib/server/db');
      if (db() && stk?.CheckoutRequestID) {
        await q(`UPDATE orders SET mpesa_ref=$2 WHERE id=$1`, [id, stk.CheckoutRequestID]);
      }
    } catch { /* non-fatal */ }
    return NextResponse.json({ ok: true, id, total, stk });
  } catch (e: any) {
    return NextResponse.json({ ok: false, id, total, error: 'stk_failed', detail: String(e.message).slice(0, 200) }, { status: 502 });
  }
}
