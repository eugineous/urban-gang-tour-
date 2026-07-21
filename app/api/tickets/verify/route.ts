import { NextResponse, after } from 'next/server';
import { isAdmin, hasPerm } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { codeAuthentic, getTicket, getEventName, getEventMeta } from '@/lib/server/tickets';
import { q, db } from '@/lib/server/db';
import { notifyTicketScan } from '@/lib/server/notify';

// Gate check-in. Roles: any admin session (super_admin or crew_admin) that
// carries the 'gate_scanner' perm - the /admin/gate scanner runs on the same
// ugt_admin session as the Control Room, but a crew_admin must be explicitly
// granted gate_scanner to use it (super_admin always has it, as with every
// module). See app/admin/gate/GateApp.tsx and CLAUDE.md's gate-scanner
// design note for why this stays on the admin session rather than a
// separate lightweight credential. Atomically flips used_at exactly once
// per code and audit-logs every scan (valid, used and invalid alike).
// POST {code} -> { result: 'valid'|'used'|'invalid', ticket?, usedAt?, reason? }

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function ticketPayload(t: { event_id: string; tier_name: string; holder: string; position: number; of_count: number; marketplace_event_id?: string | null }) {
  const [event, meta] = await Promise.all([getEventName(t.event_id, t.marketplace_event_id), getEventMeta(t.event_id, t.marketplace_event_id)]);
  return {
    event,
    eventDate: meta ? `${meta.date} ${meta.time}` : '',
    tier: t.tier_name,
    holder: t.holder || '',
    position: t.position,
    ofCount: t.of_count,
  };
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasPerm(req, 'gate_scanner')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!rateLimit('gate:' + clientIp(req), 120, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  for (const k of Object.keys(body || {})) {
    if (k !== 'code') return NextResponse.json({ error: `unexpected_field:${k}` }, { status: 400 });
  }
  const code = String(body?.code || '').trim().toUpperCase().slice(0, 40);

  const audit = async (result: string, extra: Record<string, unknown> = {}) => {
    try {
      await q(`INSERT INTO audit_log (actor, action, detail) VALUES ('gate','ticket_scan',$1)`, [
        JSON.stringify({ code, result, ...extra }),
      ]);
    } catch { /* audit must never break the gate */ }
  };

  // Offline-verifiable format + HMAC tag - forged codes stop here.
  if (!codeAuthentic(code)) {
    await audit('invalid', { reason: 'bad_code' });
    return NextResponse.json({ result: 'invalid', reason: 'bad_code' });
  }

  try {
    // Atomic single-use flip: only succeeds while unused AND the order is paid.
    const rows = await q(
      `UPDATE tickets SET used_at=now(), used_by='gate'
        WHERE code=$1 AND used_at IS NULL
          AND EXISTS (SELECT 1 FROM orders o WHERE o.id=tickets.order_id AND o.status IN ('paid','fulfilled'))
        RETURNING *`,
      [code]
    );
    if (rows.length) {
      const t = rows[0];
      await audit('valid', { order_id: t.order_id });
      const payload = await ticketPayload(t);
      after(() => notifyTicketScan({ code, event: payload.event, holder: payload.holder }));
      return NextResponse.json({ result: 'valid', ticket: payload, usedAt: t.used_at });
    }

    // Distinguish already-used / unpaid / unknown.
    const t = await getTicket(code);
    if (!t) {
      await audit('invalid', { reason: 'not_found' });
      return NextResponse.json({ result: 'invalid', reason: 'not_found' });
    }
    if (t.used_at) {
      await audit('used', { order_id: t.order_id, used_at: t.used_at });
      return NextResponse.json({ result: 'used', ticket: await ticketPayload(t), usedAt: t.used_at });
    }
    await audit('invalid', { reason: 'order_not_paid', order_id: t.order_id });
    return NextResponse.json({ result: 'invalid', reason: 'order_not_paid' });
  } catch (e: any) {
    console.error('[ticket-verify]', e);
    return NextResponse.json({ error: 'verify_failed' }, { status: 500 });
  }
}
