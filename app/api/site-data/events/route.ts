import { NextResponse } from 'next/server';
import { q, hasDb } from '@/lib/server/db';
import { rateLimit, clientIp, PUBLIC_READ_NETWORK_LIMIT } from '@/lib/server/ratelimit';
import { cached } from '@/lib/server/microcache';
import { PUBLIC_EVENT_STATUSES, isEventSellable } from '@/lib/server/event-lifecycle';
import { resolveManyEventTruths, type EventTruth } from '@/lib/server/event-truth';

// Public, read-only view of tour events (ticketed concerts, school tour
// stops, past-client showcase) — the single DB-backed source
// app/_components/V25App.tsx bridges into window.__UGT_EVENTS for the v25
// template's MAIN_EVENTS/STOPS/WORKS (see public/v25-template.html).
//
// Roles: public (anon). Only status IN ('published','completed') rows are
// ever returned — draft and cancelled events never leak here, matching the
// admin Events tool's soft-delete convention (cancel keeps the row for order
// history but hides it from every public surface). Queried fresh on every
// request (no in-memory cache) so an admin add/edit is visible immediately,
// same as the live-add verification this migration shipped with; the
// Cache-Control header is what keeps repeat-fetch cost down at the edge.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function publicRow(r: any, truth?: EventTruth) {
  const tiers = typeof r.tiers === 'string' ? JSON.parse(r.tiers) : r.tiers || [];
  return {
    id: r.id,
    kind: r.kind,
    name: r.name,
    // r.event_date is already a plain 'YYYY-MM-DD' string — the query below
    // casts event_date::text so it never round-trips through pg's
    // local-midnight Date parsing (see lib/server/db.ts).
    eventDate: r.event_date || null,
    dateLabel: r.date_label || '',
    eventTime: r.event_time || '',
    venue: r.venue || '',
    city: r.city || '',
    accent: r.accent || '',
    image: r.image || '',
    description: r.description || '',
    tiers,
    logo: r.logo || '',
    testimonial: r.testimonial || '',
    priority: Number(r.priority) || 0,
    status: r.status,
    // Whether a checkout may take money for a TICKET to this event right
    // now — one implementation, in lib/server/event-lifecycle.ts. A published
    // school stop is deliberately NOT sellable: its status is 'published'
    // only because that is what makes it visible.
    // Ticketed rows use the availability resolver (status, sale window and
    // tracked capacity). Non-ticketed rows are never purchasable.
    sellable: r.kind === 'ticketed'
      ? truth?.isSellable === true
      : isEventSellable({ status: r.status, kind: r.kind, tiers }),
  };
}

const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' };

export async function GET(req: Request) {
  // Loose: a public read that every page load makes, and a whole venue shares
  // one IP. The strict budget is per-device — see ratelimit.ts.
  if (!rateLimit('site-events:' + clientIp(req), 60, 60_000, req, PUBLIC_READ_NETWORK_LIMIT)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  const kind = new URL(req.url).searchParams.get('kind');
  if (kind && !['ticketed', 'school', 'past'].includes(kind)) {
    return NextResponse.json({ error: 'invalid_kind' }, { status: 400 });
  }
  if (!hasDb()) return NextResponse.json({ ok: true, events: [] }, { headers: CACHE_HEADERS });
  try {
    // Cached per `kind` in-isolate with request coalescing: this is the
    // heaviest of the four per-page-load reads and the answer is the same for
    // everyone. See lib/server/microcache.ts.
    const events = await cached(`site-events:${kind || 'all'}`, 60_000, async () => {
      const cols = `id, slug, kind, name, event_date::text AS event_date, date_label, event_time, venue, city, accent, image, description, tiers, logo, testimonial, priority, status`;
      const rows = kind
        ? await q<any>(
            `SELECT ${cols} FROM tour_events WHERE kind=$1 AND status = ANY($2) ORDER BY priority DESC, event_date ASC NULLS LAST`,
            [kind, [...PUBLIC_EVENT_STATUSES]]
          )
        : await q<any>(
            `SELECT ${cols} FROM tour_events WHERE status = ANY($1) ORDER BY priority DESC, event_date ASC NULLS LAST`,
            [[...PUBLIC_EVENT_STATUSES]]
          );
      const truths = await resolveManyEventTruths(
        rows.filter((row: { kind: string }) => row.kind === 'ticketed').map((row: { slug?: string }) => row.slug || ''),
      );
      const truthBySlug = new Map(truths.map((truth) => [truth.slug, truth]));
      return rows.map((row) => publicRow(row, truthBySlug.get(row.slug)));
    });
    return NextResponse.json({ ok: true, events }, { headers: CACHE_HEADERS });
  } catch {
    // DB hiccup — the desktop bridge renders an explicit unpublished state,
    // so an empty list is safe and never revives stale event details.
    return NextResponse.json({ ok: true, events: [] });
  }
}
