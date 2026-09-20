import { NextResponse } from 'next/server';
import { q } from '@/lib/server/db';
import { currentApprovedOrganizer } from '@/lib/server/organizer-session';
import { sameOrigin } from '@/lib/server/origin';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { ensureOpsSchema } from '@/lib/server/ops';
import {
  OrganizerEventPatch,
  OrganizerTier,
  parseOrganizerEventPatch,
  validateOrganizerEvent,
} from '@/lib/server/organizer-event-validation';

// Single event: GET (own only) and POST update. Editing rules (see
// app/organizer/events/[id]/edit/page.tsx and CLAUDE.md's marketplace spec):
//   - draft / pending_review / rejected: full edit, any field.
//   - published with zero tickets sold yet: full edit, any field, then a
//     material change returns to review before remaining public.
//   - published with >=1 ticket sold: name/description/image only — event
//     date, venue, city and tiers are locked (no retroactive changes to
//     something a buyer already paid for). Name, description and image edits
//     remain live because they cannot change the ticket terms.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function ownEvent(id: string, organizerId: string) {
  const rows = await q<any>(`SELECT * FROM marketplace_events WHERE id=$1 AND organizer_id=$2`, [id, organizerId]);
  return rows[0] || null;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await currentApprovedOrganizer(req);
  if (!access.organizer) return NextResponse.json({ error: access.error }, { status: access.status });
  const org = access.organizer;
  await ensureOpsSchema();
  const { id } = await params;
  const ev = await ownEvent(id, org.id);
  if (!ev) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const sold = await q<{ n: string }>(`SELECT COUNT(*)::text AS n FROM tickets WHERE marketplace_event_id=$1`, [id]);
  return NextResponse.json({ ok: true, row: ev, ticketsSold: Number(sold[0]?.n || 0) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await currentApprovedOrganizer(req);
  if (!access.organizer) return NextResponse.json({ error: access.error }, { status: access.status });
  const org = access.organizer;
  if (!sameOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!rateLimit('org-event-edit:' + clientIp(req), 20, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
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
    const parsed = parseOrganizerEventPatch(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    if (!Object.keys(parsed.patch).length)
      return NextResponse.json({ error: 'no_event_changes' }, { status: 400 });

    const soldRow = await q<{ n: string }>(`SELECT COUNT(*)::text AS n FROM tickets WHERE marketplace_event_id=$1`, [id]);
    const ticketsSold = Number(soldRow[0]?.n || 0);
    const locked = ev.status === 'published' && ticketsSold > 0;

    const lockedFields = ['eventDate', 'venue', 'city', 'tiers'];
    if (locked && lockedFields.some((field) => field in parsed.patch)) {
      return NextResponse.json({ error: 'locked_after_sales' }, { status: 400 });
    }

    let storedTiers: unknown = ev.tiers;
    if (typeof storedTiers === 'string') {
      try { storedTiers = JSON.parse(storedTiers); } catch { storedTiers = []; }
    }
    // Values read from the legacy JSON column are deliberately treated as
    // untrusted below. validateOrganizerEvent performs the runtime shape
    // check before anything is written back to the catalog.
    const stored: OrganizerEventPatch = {
      name: String(ev.name || ''),
      eventDate: ev.event_date ? String(ev.event_date).slice(0, 10) : '',
      venue: String(ev.venue || ''),
      city: String(ev.city || ''),
      description: String(ev.description || ''),
      image: String(ev.image || ''),
      tiers: storedTiers as OrganizerTier[],
    };
    const candidate = validateOrganizerEvent({ ...stored, ...parsed.patch });
    if (!candidate.ok) return NextResponse.json({ error: candidate.error }, { status: 400 });
    const value = candidate.value;
    const materialChanged =
      value.eventDate !== stored.eventDate ||
      value.venue !== stored.venue ||
      value.city !== stored.city ||
      JSON.stringify(value.tiers) !== JSON.stringify(storedTiers);

    // Any material change to a public event returns to review, even before a
    // ticket sells. Once tickets have sold, those fields are locked entirely;
    // cosmetic edits can remain live because they cannot change what was sold.
    const nextStatus =
      ev.status === 'draft' || ev.status === 'rejected' || ev.status === 'pending_review' ||
      (ev.status === 'published' && materialChanged)
        ? 'pending_review'
        : ev.status;

    const row = await q(
      `UPDATE marketplace_events SET name=$1, event_date=$2, venue=$3, city=$4, description=$5, image=$6, tiers=$7, status=$8, rejection_reason='', updated_at=now()
       WHERE id=$9 RETURNING *`,
      [
        value.name,
        value.eventDate,
        value.venue,
        value.city,
        value.description,
        value.image,
        JSON.stringify(value.tiers),
        nextStatus,
        id,
      ]
    );
    await q(`INSERT INTO audit_log (actor, action, detail) VALUES ($1,'marketplace.event.edit',$2)`, [org.id, JSON.stringify({ id, locked })]);
    return NextResponse.json({ ok: true, row: row[0] });
  } catch (e: any) {
    console.error('[organizer-event-edit]', e);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}
