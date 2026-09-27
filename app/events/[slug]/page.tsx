import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { JsonLd } from '@/app/_components/JsonLd';
import EventsAnalytics from '@/app/_components/EventsAnalytics';
import { SITE } from '@/lib/site';
import { hasDb, q } from '@/lib/server/db';
import { formatEventDate } from '@/lib/server/catalog';
import { PUBLIC_EVENT_STATUSES, isEventIndexable, eventSchemaStatus } from '@/lib/server/event-lifecycle';
import { matchEventRoute } from '@/lib/server/event-route';
import { resolveEventTruth } from '@/lib/server/event-truth';

// Event pages include sellability and Offer markup, so serve them on demand.
// This avoids a stale ISR page advertising a show after an authoritative
// lifecycle, sales-window or capacity change.
export const revalidate = 0;
export const dynamic = 'force-dynamic';

// Pre-generate published ticketed events for ISR. An unavailable database at
// build time yields no pre-generated pages (honest empty list); pages are then
// rendered on demand and cached for the revalidate window.
export async function generateStaticParams() {
  if (!hasDb()) return [];
  try {
    const rows = await q<{ slug: string }>(
      `SELECT slug FROM tour_events WHERE kind='ticketed' AND status='published' AND slug != ''`,
    );
    return rows.map((r) => ({ slug: r.slug }));
  } catch {
    return [];
  }
}

type Tier = { name: string; price: number };
type TicketedEvent = {
  id: string;
  slug: string;
  name: string;
  event_date: string;
  event_time: string;
  venue: string;
  city: string;
  accent: string;
  image: string;
  description: string;
  tiers: Tier[] | string;
  status: string;
  previous_start_at: string | null;
};

type RoutedEvent = { event: TicketedEvent; canonical: boolean };

const eventForPage = cache(async (slug: string): Promise<RoutedEvent | null> => {
  if (!/^[a-z0-9-]{1,80}$/.test(slug) || !hasDb()) return null;
  // Buyers holding tickets must still see what happened to their event, so
  // every PUBLIC lifecycle state renders here with truthful status UI —
  // only `published` is buyable (see isEventSellable). Drafts,
  // pending_review, archived and rejected rows stay invisible (404), per
  // Google's keep-the-event-and-flip-its-status rule.
  const rows = await q<TicketedEvent>(
    `SELECT id, slug, name, event_date::text AS event_date, event_time, venue, city, accent, image, description, tiers,
            status, previous_start_at::text AS previous_start_at
     FROM tour_events WHERE slug=$1 AND kind='ticketed' AND status = ANY($2) LIMIT 1`,
    [slug, [...PUBLIC_EVENT_STATUSES]]
  );
  const direct = rows[0];
  if (direct) return { event: direct, canonical: true };

  // Legacy ids are resolved only after canonical slug lookup fails. A blank
  // legacy slug intentionally remains a 404; inventing a redirect would hide
  // an operator migration problem and could expose a non-public record.
  const legacyRows = await q<TicketedEvent>(
    `SELECT id, slug, name, event_date::text AS event_date, event_time, venue, city, accent, image, description, tiers,
            status, previous_start_at::text AS previous_start_at
     FROM tour_events WHERE id=$1 AND slug != '' AND kind='ticketed' AND status = ANY($2) LIMIT 1`,
    [slug, [...PUBLIC_EVENT_STATUSES]],
  );
  const match = matchEventRoute(slug, null, legacyRows[0]);
  return match.kind === 'redirect' ? { event: match.event, canonical: false } : null;
});

function dateTime(event: TicketedEvent): string | null {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(event.event_time || '').trim());
  const date = String(event.event_date || '').slice(0, 10);
  if (!m || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  let hour = Number(m[1]) % 12;
  if (/pm/i.test(m[3])) hour += 12;
  return `${date}T${String(hour).padStart(2, '0')}:${m[2]}:00+03:00`;
}

function safeTiers(value: TicketedEvent['tiers']): Tier[] {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed)
      ? parsed.filter((tier) => typeof tier?.name === 'string' && Number.isFinite(Number(tier?.price)))
        .map((tier) => ({ name: tier.name, price: Math.max(0, Math.round(Number(tier.price))) }))
      : [];
  } catch {
    return [];
  }
}

function money(value: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await eventForPage(slug);
  if (!resolved) return {};
  const event = resolved.event;
  const path = `/events/${event.slug}`;
  const description = event.description || `${event.name} at ${event.venue}${event.city ? `, ${event.city}` : ''}.`;
  const indexable = isEventIndexable(event.status);
  return {
    title: `${event.name} | Urban Gang Tour`,
    description,
    alternates: { canonical: `${SITE.domain}${path}` },
    robots: indexable ? undefined : { index: false, follow: true },
    openGraph: { title: `${event.name} | Urban Gang Tour`, description, url: `${SITE.domain}${path}`, images: event.image ? [{ url: event.image }] : undefined },
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await eventForPage(slug);
  if (!resolved) notFound();
  if (!resolved.canonical) permanentRedirect(`/events/${resolved.event.slug}`);
  const event = resolved.event;
  const truth = await resolveEventTruth(event.slug);
  // A page may render public event information when availability lookup is
  // unavailable, but it must never claim tickets can be bought in that case.
  const availabilityKnown = truth !== null;
  const tiers = safeTiers(event.tiers);
  const startDate = dateTime(event);
  const path = `/events/${event.slug}`;
  const status = String(event.status || 'published');
  const sellable = availabilityKnown && truth.isSellable;
  const soldOut = status === 'sold_out' || truth?.isSoldOut === true;
  const prev = event.previous_start_at ? String(event.previous_start_at).slice(0, 10) : null;
  const statusNote: Record<string, { title: string; body: string }> = {
    sales_paused: { title: 'Sales Paused', body: 'Ticket sales are paused for this event. Check back soon.' },
    sold_out: { title: 'Sold Out', body: 'This event is sold out. Check back for future dates or related events.' },
    postponed: { title: 'Postponed', body: 'This event has been postponed. A new date will be announced — your tickets stay valid.' },
    rescheduled: { title: 'Rescheduled', body: prev && prev !== String(event.event_date).slice(0, 10) ? `This event was rescheduled (previously ${prev}). Your tickets stay valid for the new date.` : 'This event was rescheduled. Your tickets stay valid for the new date.' },
    cancelled: { title: 'Cancelled', body: 'This event has been cancelled. Ticket holders will be contacted about refunds.' },
    completed: { title: 'Event Ended', body: 'This event has already happened. Browse upcoming events for what\'s next.' },
  };
  const currentStatus = statusNote[status] || { title: 'Tickets Available', body: '' };
  const fromPrice = truth?.minPrice ?? (tiers.length ? Math.min(...tiers.map((t) => t.price)) : null);
  // Offers only where the public can actually buy (Google's requirement):
  // published lists InStock tiers, sold_out lists SoldOut, every other state
  // carries status markup with no offers at all.
  const eventJsonLd = startDate && event.venue ? {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    url: `${SITE.domain}${path}`,
    startDate,
    ...(status === 'rescheduled' && prev ? { previousStartDate: `${prev}T00:00:00+03:00` } : {}),
    eventStatus: eventSchemaStatus(status),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: event.venue, address: { '@type': 'PostalAddress', addressLocality: event.city || undefined, addressCountry: 'KE' } },
    image: event.image ? [`${SITE.domain}${event.image}`] : undefined,
    organizer: { '@id': `${SITE.domain}/#org` },
    offers: !availabilityKnown || (!sellable && !soldOut) ? undefined : truth.tiers
      .filter((tier) => soldOut || tier.sellable)
      .map((tier) => ({ '@type': 'Offer', name: tier.name, price: String(tier.price), priceCurrency: 'KES', availability: soldOut ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock', url: `${SITE.domain}${path}` })),
  } : null;
  const accent = /^#[0-9A-F]{6}$/i.test(event.accent) ? event.accent : '#E6218C';
  const eventDate = formatEventDate(event.event_date);
  const shareText = encodeURIComponent(`${event.name} — ${event.venue || ''} ${eventDate}`.trim());
  const shareUrl = encodeURIComponent(`${SITE.domain}${path}`);
  const calStart = startDate ? startDate.replace(/[-:]/g, '').replace('+03:00', '') : null;

  // Sticky mobile CTA — visible after scroll, hidden when not needed
  const stickyCta = sellable
    ? <a href="/events#ticket-booth" style={{ flex: 1, textAlign: 'center', background: '#111', color: '#FFD400', borderRadius: 10, padding: '13px 18px', fontFamily: 'var(--font-anton), Impact, sans-serif', fontSize: 17, textTransform: 'uppercase', textDecoration: 'none' }}>Get tickets</a>
    : <a href="/events" style={{ flex: 1, textAlign: 'center', background: '#eee7ea', color: '#111', borderRadius: 10, padding: '13px 18px', fontFamily: 'var(--font-anton), Impact, sans-serif', fontSize: 17, textTransform: 'uppercase', textDecoration: 'none' }}>{soldOut ? 'Sold out' : 'View events'}</a>;

  return <main style={{ minHeight: '100vh', color: '#111', background: '#fffafc', fontFamily: 'var(--font-space-grotesk), Arial, sans-serif' }}>
    {eventJsonLd ? <JsonLd data={eventJsonLd} /> : null}
    <EventsAnalytics eventSlug={event.slug} eventNames={[{ slug: event.slug, name: event.name }]} />
    <section style={{ position: 'relative', overflow: 'hidden', background: accent, borderBottom: '4px solid #111' }}>
      {event.image ? <img src={event.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.26 }} /> : null}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, rgba(17,17,17,.92), rgba(17,17,17,.52))' }} />
      <div style={{ position: 'relative', maxWidth: 1080, margin: '0 auto', padding: 'clamp(42px,9vw,96px) 20px', color: '#fff' }}>
        <p style={{ margin: '0 0 12px', fontWeight: 800, letterSpacing: '.11em', fontSize: 12, textTransform: 'uppercase', color: '#FFD400' }}>Urban Gang Tour presents</p>
        <h1 style={{ maxWidth: 780, margin: 0, fontFamily: 'var(--font-anton), Impact, sans-serif', fontSize: 'clamp(44px,8vw,96px)', lineHeight: .94, textTransform: 'uppercase' }}>{event.name}</h1>
        <p style={{ maxWidth: 660, fontSize: 'clamp(17px,2.5vw,22px)', fontWeight: 600, lineHeight: 1.45, margin: '24px 0 0' }}>{event.description || 'Details and ticket options are available below.'}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 24, fontSize: 15, fontWeight: 600 }}>
          <span style={{ background: 'rgba(255,255,255,.16)', borderRadius: 8, padding: '8px 14px' }}>{eventDate}</span>
          {event.event_time ? <span style={{ background: 'rgba(255,255,255,.16)', borderRadius: 8, padding: '8px 14px' }}>{event.event_time}</span> : null}
          <span style={{ background: 'rgba(255,255,255,.16)', borderRadius: 8, padding: '8px 14px' }}>{event.venue}{event.city ? `, ${event.city}` : ''}</span>
        </div>
      </div>
    </section>
    <section style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(30px,6vw,72px) 20px 100px' }}>
      {currentStatus.body ? <p role="status" style={{ margin: '0 0 22px', background: '#111', color: '#FFD400', fontWeight: 800, fontSize: 16, lineHeight: 1.5, padding: '14px 18px', borderRadius: 12 }}>{currentStatus.body}</p> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 28, alignItems: 'start' }}>
        <div>
          <p style={{ margin: 0, color: accent, fontWeight: 900, letterSpacing: '.1em', fontSize: 12, textTransform: 'uppercase' }}>Event details</p>
          <dl style={{ margin: '16px 0 0', borderTop: '2px solid #111' }}>
            {[['Date', eventDate], ['Time', event.event_time || 'To be confirmed'], ['Venue', event.venue || 'To be confirmed'], ['City', event.city || 'Kenya']].map(([label, value]) => <div key={label} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 14, padding: '15px 0', borderBottom: '1px solid #d8d0d5' }}><dt style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase' }}>{label}</dt><dd style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{value}</dd></div>)}
          </dl>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 22 }}>
            <a href={`https://wa.me/?text=${shareText}%20${shareUrl}`} target="_blank" rel="noopener" style={{ fontWeight: 800, fontSize: 14, color: '#111', border: '2px solid #111', borderRadius: 10, padding: '10px 16px', textDecoration: 'none' }}>Share on WhatsApp</a>
            <a href={`https://x.com/intent/tweet?text=${shareText}&url=${shareUrl}`} target="_blank" rel="noopener" style={{ fontWeight: 800, fontSize: 14, color: '#111', border: '2px solid #111', borderRadius: 10, padding: '10px 16px', textDecoration: 'none' }}>Share on X</a>
            {calStart ? <a href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${shareText}&dates=${calStart}/${calStart}&details=${shareUrl}`} target="_blank" rel="noopener" style={{ fontWeight: 800, fontSize: 14, color: '#111', border: '2px solid #111', borderRadius: 10, padding: '10px 16px', textDecoration: 'none' }}>Add to calendar</a> : null}
          </div>
        </div>
        <aside style={{ background: '#fff', border: '3px solid #111', borderRadius: 18, padding: 22, boxShadow: `8px 8px 0 ${accent}` }}>
          <p style={{ margin: 0, color: '#555', fontWeight: 800, fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase' }}>Ticket options</p>
          {tiers.length ? <div style={{ display: 'grid', gap: 10, margin: '15px 0 22px' }}>{tiers.map((tier) => <div key={tier.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '11px 0', borderBottom: '1px solid #e1dce0', fontWeight: 800 }}><span>{tier.name}</span><span>{money(tier.price)}</span></div>)}</div> : <p style={{ lineHeight: 1.5 }}>Ticket options will be confirmed on the ticket desk.</p>}
          {sellable
            ? <a href="/events#ticket-booth" style={{ display: 'block', textAlign: 'center', background: '#111', color: '#FFD400', borderRadius: 11, padding: '15px 18px', fontFamily: 'var(--font-anton), Impact, sans-serif', fontSize: 19, textTransform: 'uppercase', textDecoration: 'none' }}>Get tickets</a>
            : <p role="status" style={{ margin: 0, textAlign: 'center', background: '#eee7ea', borderRadius: 11, padding: '15px 18px', fontWeight: 800 }}>{soldOut ? 'Sold out' : 'Tickets not on sale'}</p>}
          <a href="/book" style={{ display: 'block', textAlign: 'center', marginTop: 12, color: '#111', fontWeight: 800 }}>Book Urban Gang Tour for your event</a>
        </aside>
      </div>
    </section>
    {/* Sticky mobile CTA */}
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: '#fff', borderTop: '2px solid #111', padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#555', minWidth: 60 }}>{fromPrice !== null ? `From ${money(fromPrice)}` : ''}</span>
      {stickyCta}
    </div>
  </main>;
}
