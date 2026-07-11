import { NextResponse } from 'next/server';
import { q, db } from '@/lib/server/db';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { ensureCatalogSeeded } from '@/lib/server/catalog';

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

function publicRow(r: any) {
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
    tiers: typeof r.tiers === 'string' ? JSON.parse(r.tiers) : r.tiers || [],
    logo: r.logo || '',
    testimonial: r.testimonial || '',
    priority: Number(r.priority) || 0,
    status: r.status,
  };
}

export async function GET(req: Request) {
  if (!rateLimit('site-events:' + clientIp(req), 30, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  const kind = new URL(req.url).searchParams.get('kind');
  if (kind && !['ticketed', 'school', 'past'].includes(kind)) {
    return NextResponse.json({ error: 'invalid_kind' }, { status: 400 });
  }
  if (!db()) return NextResponse.json({ ok: true, events: [] }, { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' } });
  try {
    await ensureCatalogSeeded();
    const cols = `id, kind, name, event_date::text AS event_date, date_label, event_time, venue, city, accent, image, description, tiers, logo, testimonial, priority, status`;
    const rows = kind
      ? await q<any>(
          `SELECT ${cols} FROM tour_events WHERE kind=$1 AND status = ANY($2) ORDER BY priority DESC, event_date ASC NULLS LAST`,
          [kind, ['published', 'completed']]
        )
      : await q<any>(
          `SELECT ${cols} FROM tour_events WHERE status = ANY($1) ORDER BY priority DESC, event_date ASC NULLS LAST`,
          [['published', 'completed']]
        );
    return NextResponse.json(
      { ok: true, events: rows.map(publicRow) },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' } }
    );
  } catch {
    // DB hiccup — the template's window.__UGT_EVENTS bridge falls back to its
    // frozen literal, so an empty list here is safe, never a broken page.
    return NextResponse.json({ ok: true, events: [] });
  }
}
