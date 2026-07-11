import { NextResponse } from 'next/server';
import { q, db } from '@/lib/server/db';
import { currentOrganizer } from '@/lib/server/organizer-session';
import { sameOrigin } from '@/lib/server/origin';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { ensureOpsSchema } from '@/lib/server/ops';
import { freeMarketplaceEventId } from '@/lib/server/marketplace';

// Organizer's own events: list (GET) + submit new (POST). Every query is
// scoped to the logged-in organizer's id — an organizer can never read or
// write another organizer's event through this route.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function s(v: unknown, max = 300): string {
  return String(v ?? '').trim().slice(0, max);
}
function dateOrNull(v: unknown): string | null {
  const t = String(v ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

export async function GET(req: Request) {
  const org = currentOrganizer(req);
  if (!org) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  try {
    await ensureOpsSchema();
    const rows = await q(
      `SELECT e.*, e.event_date::text AS event_date,
          (SELECT COUNT(*) FROM tickets t WHERE t.marketplace_event_id = e.id) AS tickets_sold,
          (SELECT COALESCE(SUM(o.total),0) FROM orders o WHERE o.marketplace_event_id = e.id AND o.status IN ('paid','fulfilled')) AS gross_revenue,
          (SELECT COALESCE(SUM(o.organizer_amount),0) FROM orders o WHERE o.marketplace_event_id = e.id AND o.status IN ('paid','fulfilled')) AS organizer_revenue
         FROM marketplace_events e WHERE e.organizer_id=$1 ORDER BY e.created_at DESC`,
      [org.id]
    );
    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    console.error('[organizer-events-list]', e);
    return NextResponse.json({ error: 'list_failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const org = currentOrganizer(req);
  if (!org) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!rateLimit('org-event-create:' + clientIp(req), 15, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const allowed = new Set(['name', 'eventDate', 'venue', 'city', 'description', 'image', 'tiers']);
  for (const k of Object.keys(body || {})) {
    if (!allowed.has(k)) return NextResponse.json({ error: `unexpected_field:${k}` }, { status: 400 });
  }
  const name = s(body.name, 200);
  if (!name) return NextResponse.json({ error: 'missing_name' }, { status: 400 });
  const tiersIn = Array.isArray(body.tiers) ? body.tiers : [];
  const tiers = tiersIn
    .slice(0, 12)
    .map((t: any) => ({ name: s(t?.name, 60), price: Math.max(0, Math.round(Number(t?.price) || 0)) }))
    .filter((t: any) => t.name);
  if (!tiers.length) return NextResponse.json({ error: 'missing_tiers' }, { status: 400 });

  try {
    await ensureOpsSchema();
    const id = await freeMarketplaceEventId(name);
    const row = await q(
      `INSERT INTO marketplace_events (id, organizer_id, name, event_date, venue, city, description, image, tiers, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending_review') RETURNING *`,
      [id, org.id, name, dateOrNull(body.eventDate), s(body.venue, 300), s(body.city, 100), s(body.description, 2000), s(body.image, 400), JSON.stringify(tiers)]
    );
    await q(`INSERT INTO audit_log (actor, action, detail) VALUES ($1,'marketplace.event.submit',$2)`, [org.id, JSON.stringify({ id, name })]);
    return NextResponse.json({ ok: true, row: row[0] });
  } catch (e: any) {
    console.error('[organizer-events-create]', e);
    return NextResponse.json({ error: 'create_failed' }, { status: 500 });
  }
}
