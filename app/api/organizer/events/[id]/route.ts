import { NextResponse } from 'next/server';
import { q, db } from '@/lib/server/db';
import { currentOrganizer } from '@/lib/server/organizer-session';
import { sameOrigin } from '@/lib/server/origin';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { ensureOpsSchema } from '@/lib/server/ops';

// Single event: GET (own only) and POST update. Editing rules (see
// app/organizer/events/[id]/edit/page.tsx and CLAUDE.md's marketplace spec):
//   - draft / pending_review / rejected: full edit, any field.
//   - published with zero tickets sold yet: full edit, any field.
//   - published with >=1 ticket sold: name/description/image only — event
//     date, venue, city and tiers are locked (no retroactive changes to
//     something a buyer already paid for). An edit here re-submits a
//     published event for review only if tiers/date/venue actually changed
//     (name/description/image edits on a live event apply immediately).

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function s(v: unknown, max = 300): string {
  return String(v ?? '').trim().slice(0, max);
}
function dateOrNull(v: unknown): string | null {
  const t = String(v ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

async function ownEvent(id: string, organizerId: string) {
  const rows = await q<any>(`SELECT * FROM marketplace_events WHERE id=$1 AND organizer_id=$2`, [id, organizerId]);
  return rows[0] || null;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const org = currentOrganizer(req);
  if (!org) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  await ensureOpsSchema();
  const { id } = await params;
  const ev = await ownEvent(id, org.id);
  if (!ev) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const sold = await q<{ n: string }>(`SELECT COUNT(*)::text AS n FROM tickets WHERE marketplace_event_id=$1`, [id]);
  return NextResponse.json({ ok: true, row: ev, ticketsSold: Number(sold[0]?.n || 0) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const org = currentOrganizer(req);
  if (!org) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!rateLimit('org-event-edit:' + clientIp(req), 20, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  await ensureOpsSchema();

  const { id } = await params;
  try {
    const ev = await ownEvent(id, org.id);
    if (!ev) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (ev.status === 'cancelled' || ev.status === 'completed') {
      return NextResponse.json({ error: 'event_closed' }, { status: 400 });
    }

    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
    const allowed = new Set(['name', 'eventDate', 'venue', 'city', 'description', 'image', 'tiers']);
    for (const k of Object.keys(body || {})) {
      if (!allowed.has(k)) return NextResponse.json({ error: `unexpected_field:${k}` }, { status: 400 });
    }

    const soldRow = await q<{ n: string }>(`SELECT COUNT(*)::text AS n FROM tickets WHERE marketplace_event_id=$1`, [id]);
    const ticketsSold = Number(soldRow[0]?.n || 0);
    const locked = ev.status === 'published' && ticketsSold > 0;

    const name = s(body.name, 200) || ev.name;
    const description = body.description !== undefined ? s(body.description, 2000) : ev.description;
    const image = body.image !== undefined ? s(body.image, 400) : ev.image;

    let eventDate = ev.event_date;
    let venue = ev.venue;
    let city = ev.city;
    // ev.tiers comes back from the SELECT as an already-parsed JS array (pg
    // auto-parses jsonb columns) — it must be re-stringified before going
    // back into a jsonb parameter, otherwise node-pg serializes a raw JS
    // array as a Postgres ARRAY literal instead of JSON text and the UPDATE
    // fails with "invalid input syntax for type json" (caught in testing).
    let tiers = JSON.stringify(ev.tiers);
    if (!locked) {
      if (body.eventDate !== undefined) eventDate = dateOrNull(body.eventDate);
      if (body.venue !== undefined) venue = s(body.venue, 300);
      if (body.city !== undefined) city = s(body.city, 100);
      if (body.tiers !== undefined) {
        const tiersIn = Array.isArray(body.tiers) ? body.tiers : [];
        const parsed = tiersIn
          .slice(0, 12)
          .map((t: any) => ({ name: s(t?.name, 60), price: Math.max(0, Math.round(Number(t?.price) || 0)) }))
          .filter((t: any) => t.name);
        if (!parsed.length) return NextResponse.json({ error: 'missing_tiers' }, { status: 400 });
        tiers = JSON.stringify(parsed);
      }
    } else if (body.eventDate !== undefined || body.venue !== undefined || body.city !== undefined || body.tiers !== undefined) {
      return NextResponse.json({ error: 'locked_after_sales' }, { status: 400 });
    }

    // A draft/rejected event edited and re-saved goes back into the review
    // queue; a published event with no sales yet stays published (its live
    // edits take effect immediately, matching tour_events' own convention);
    // a published event that IS locked only changed non-locked cosmetic
    // fields, so its status is untouched either way.
    const nextStatus = ev.status === 'draft' || ev.status === 'rejected' || ev.status === 'pending_review' ? 'pending_review' : ev.status;

    const row = await q(
      `UPDATE marketplace_events SET name=$1, event_date=$2, venue=$3, city=$4, description=$5, image=$6, tiers=$7, status=$8, rejection_reason='', updated_at=now()
       WHERE id=$9 RETURNING *`,
      [name, eventDate, venue, city, description, image, tiers, nextStatus, id]
    );
    await q(`INSERT INTO audit_log (actor, action, detail) VALUES ($1,'marketplace.event.edit',$2)`, [org.id, JSON.stringify({ id, locked })]);
    return NextResponse.json({ ok: true, row: row[0] });
  } catch (e: any) {
    console.error('[organizer-event-edit]', e);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}
