import { NextResponse } from 'next/server';
import { q } from '@/lib/server/db';
import { currentApprovedOrganizer } from '@/lib/server/organizer-session';
import { sameOrigin } from '@/lib/server/origin';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { ensureOpsSchema } from '@/lib/server/ops';
import { freeMarketplaceEventId } from '@/lib/server/marketplace';
import { parseOrganizerEventPatch, validateOrganizerEvent } from '@/lib/server/organizer-event-validation';

// Organizer's own events: list (GET) + submit new (POST). Every query is
// scoped to the logged-in organizer's id — an organizer can never read or
// write another organizer's event through this route.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const access = await currentApprovedOrganizer(req);
  if (!access.organizer) return NextResponse.json({ error: access.error }, { status: access.status });
  const org = access.organizer;
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
  const access = await currentApprovedOrganizer(req);
  if (!access.organizer) return NextResponse.json({ error: access.error }, { status: access.status });
  const org = access.organizer;
  if (!sameOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!rateLimit('org-event-create:' + clientIp(req), 15, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const parsed = parseOrganizerEventPatch(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const event = validateOrganizerEvent(parsed.patch);
  if (!event.ok) return NextResponse.json({ error: event.error }, { status: 400 });

  try {
    await ensureOpsSchema();
    const id = await freeMarketplaceEventId(event.value.name);
    const row = await q(
      `INSERT INTO marketplace_events (id, organizer_id, name, event_date, venue, city, description, image, tiers, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending_review') RETURNING *`,
      [
        id,
        org.id,
        event.value.name,
        event.value.eventDate,
        event.value.venue,
        event.value.city,
        event.value.description,
        event.value.image,
        JSON.stringify(event.value.tiers),
      ]
    );
    await q(`INSERT INTO audit_log (actor, action, detail) VALUES ($1,'marketplace.event.submit',$2)`, [org.id, JSON.stringify({ id, name: event.value.name })]);
    return NextResponse.json({ ok: true, row: row[0] });
  } catch (e: any) {
    console.error('[organizer-events-create]', e);
    return NextResponse.json({ error: 'create_failed' }, { status: 500 });
  }
}
