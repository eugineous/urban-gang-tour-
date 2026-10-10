import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { JsonLd } from '@/app/_components/JsonLd';
import EventsAnalytics from '@/app/_components/EventsAnalytics';
import { SITE } from '@/lib/site';
import {EventCalendar} from '@/app/_components/EventCalendar';
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
  if (Number(m[1]) < 1 || Number(m[1]) > 12 || Number(m[2]) > 59) return null;
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
  const ticketHref = `/events?event=${encodeURIComponent(event.id)}`;

  return <main className="event-detail-page wrap">
    {eventJsonLd&&<JsonLd data={eventJsonLd}/>}
    <EventsAnalytics eventSlug={event.slug} eventNames={[{slug:event.slug,name:event.name}]}/>
    <div className="detail-breadcrumbs"><a href="/events">All events</a><span>/</span><span>{event.name}</span></div>
    <section className="event-detail-hero"><div><p className="eyebrow">Urban Gang Tour presents</p><h1>{event.name}</h1><p>{event.description||'Event details and ticket options are below.'}</p><p>{eventDate} · {event.venue}</p></div>{event.image&&<img src={event.image} alt={event.name+' event poster'}/>}</section>
    {currentStatus.body&&<p className="modern-alert" role="status">{currentStatus.body}</p>}
    <section className="event-detail-grid"><div><h2>Plan your visit.</h2><dl>{[['Date',eventDate],['Time',event.event_time||'To be confirmed'],['Venue',event.venue||'To be confirmed'],['City',event.city||'Kenya']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="modern-actions"><a href={`https://wa.me/?text=${shareText}%20${shareUrl}`} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a><a href={`https://x.com/intent/tweet?text=${shareText}&url=${shareUrl}`} target="_blank" rel="noopener noreferrer">Share on X</a>{/^\d{4}-\d{2}-\d{2}$/.test(String(event.event_date).slice(0,10))&&<EventCalendar name={event.name} date={String(event.event_date).slice(0,10)} start={startDate} venue={event.venue||''} url={`${SITE.domain}${path}`}/>}</div></div>
    <aside className="modern-card"><h2>Ticket options.</h2>{tiers.length?<dl>{tiers.map(tier=><div key={tier.name}><dt>{tier.name}</dt><dd>{money(tier.price)}</dd></div>)}</dl>:<p>Ticket options have not been published yet.</p>}{sellable?<a className="button" href={ticketHref}>Get tickets</a>:<p role="status">{soldOut?'Sold out':'Tickets not on sale'}</p>}<p className="form-note">Ticket availability is checked again at checkout.</p><a href="/book">Plan your own event with us</a></aside></section>
    {sellable&&<div className="event-ticket-dock"><span>{fromPrice!==null?'From '+money(fromPrice):''}</span><a className="button" href={ticketHref}>Get tickets</a></div>}
  </main>;
}
