import {MessageText} from '@/ui/i18n/MessageText';
import {discoveryMessages} from '@/ui/i18n/catalogues/discovery';
import {OriginalContent} from '@/ui/i18n/OriginalContent';
import {EventDay,EventAmount} from '@/ui/components/PublicationDate';
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
import PartnerEventDetails from '@/app/_components/PartnerEventDetails';
import {publicPartnerDetails} from '@/lib/partner-events';
import {InformationalEventDetails} from '@/app/_components/InformationalEventDetails';
import {EventArtwork} from '@/app/_components/EventArtwork';
import {discoveryImageUrl} from '@/app/_lib/seo';
import {eventDiscoveryDate} from '@/app/_lib/jsonld';

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
  kind: string;
  partner_details: unknown;
  id: string;
  slug: string;
  name: string;
  event_date: string|null;
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
    `SELECT id, slug, kind, to_jsonb(tour_events)->'partner_details' AS partner_details, name, event_date::text AS event_date, event_time, venue, city, accent, image, description, tiers,
            status, previous_start_at::text AS previous_start_at
     FROM tour_events WHERE slug=$1 AND kind IN ('ticketed','partner','school','past') AND status = ANY($2) LIMIT 1`,
    [slug, [...PUBLIC_EVENT_STATUSES]]
  );
  const direct = rows[0];
  if (direct) return direct.kind==='partner'&&!publicPartnerDetails(direct.partner_details)?null:{ event: direct, canonical: true };

  // Legacy ids are resolved only after canonical slug lookup fails. A blank
  // legacy slug intentionally remains a 404; inventing a redirect would hide
  // an operator migration problem and could expose a non-public record.
  const legacyRows = await q<TicketedEvent>(
    `SELECT id, slug, kind, to_jsonb(tour_events)->'partner_details' AS partner_details, name, event_date::text AS event_date, event_time, venue, city, accent, image, description, tiers,
            status, previous_start_at::text AS previous_start_at
     FROM tour_events WHERE id=$1 AND slug != '' AND kind IN ('ticketed','partner','school','past') AND status = ANY($2) LIMIT 1`,
    [slug, [...PUBLIC_EVENT_STATUSES]],
  );
  const match = matchEventRoute(slug, null, legacyRows[0]);
  return match.kind === 'redirect' ? { event: match.event, canonical: false } : null;
});

function dateTime(event: TicketedEvent): string | null {
  return eventDiscoveryDate(event.event_date, event.event_time) || null;
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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await eventForPage(slug);
  if (!resolved) return {};
  const event = resolved.event;
  const path = `/events/${event.slug}`;
  const description = event.description || `${event.name}${event.venue?' at '+event.venue:''}${event.city ? `, ${event.city}` : ''}. Event details from Urban Gang Tour.`;
  const indexable = isEventIndexable(event.status) || event.status==='completed';
  const title = `${event.name} | Urban Gang Tour`;
  const image = discoveryImageUrl(event.image) || SITE.defaultOg;
  return {
    title,
    description,
    alternates: { canonical: `${SITE.domain}${path}` },
    robots: indexable ? undefined : { index: false, follow: true },
    openGraph: { type: 'website', siteName: SITE.name, locale: 'en_KE', title, description, url: `${SITE.domain}${path}`, images: [{ url: image, alt: event.name }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await eventForPage(slug);
  if (!resolved) notFound();
  if (!resolved.canonical) permanentRedirect(`/events/${resolved.event.slug}`);
  const event = resolved.event;
  if(event.kind==='partner')return <PartnerEventDetails event={event}/>;
  if(event.kind==='school'||event.kind==='past')return <InformationalEventDetails event={event}/>;
  const truth = await resolveEventTruth(event.slug);
  // A page may render public event information when availability lookup is
  // unavailable, but it must never claim tickets can be bought in that case.
  const availabilityKnown = truth !== null;
  const tiers = safeTiers(event.tiers);
  const startDate = dateTime(event);
  const path = `/events/${event.slug}`;
  const status = String(event.status || 'published');
  const sellable = availabilityKnown && truth.isSellable;
  const soldOut = status === 'sold_out' || (status!=='announced'&&truth?.isSoldOut === true);
  const prev = eventDiscoveryDate(event.previous_start_at);
  const statusMessages={announced:'event.announced',ongoing:'event.ongoing',sales_paused:'event.sales_paused',sold_out:'event.sold_out',postponed:'event.postponed',rescheduled:prev&&prev!==String(event.event_date).slice(0,10)?'event.rescheduledPrevious':'event.rescheduled',cancelled:'event.cancelled',completed:'event.completed'} as const;
  const currentStatus=statusMessages[status as keyof typeof statusMessages];
  const fromPrice = truth?.minPrice ?? (tiers.length ? Math.min(...tiers.map((t) => t.price)) : null);
  // Offers only where the public can actually buy (Google's requirement):
  // published lists InStock tiers, sold_out lists SoldOut, every other state
  // carries status markup with no offers at all.
  const eventJsonLd = startDate && event.venue ? {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `${SITE.domain}${path}#event`,
    name: event.name,
    description: event.description || undefined,
    url: `${SITE.domain}${path}`,
    startDate,
    ...(status === 'rescheduled' && prev && prev !== String(event.event_date).slice(0, 10) ? { previousStartDate: prev } : {}),
    eventStatus: eventSchemaStatus(status),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: event.venue, address: { '@type': 'PostalAddress', addressLocality: event.city || undefined, addressCountry: 'KE' } },
    image: discoveryImageUrl(event.image) ? [discoveryImageUrl(event.image)] : undefined,
    organizer: { '@id': `${SITE.domain}/#org` },
    offers: !availabilityKnown || (!sellable && !soldOut) ? undefined : truth.tiers
      .filter((tier) => soldOut || tier.sellable)
      .map((tier) => ({ '@type': 'Offer', name: tier.name, price: String(tier.price), priceCurrency: 'KES', availability: soldOut ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock', url: `${SITE.domain}${path}` })),
  } : null;
  const eventDate = event.event_date?formatEventDate(event.event_date):'Date to be confirmed';
  const shareText = encodeURIComponent(`${event.name} — ${event.venue || ''} ${eventDate}`.trim());
  const shareUrl = encodeURIComponent(`${SITE.domain}${path}`);
  const ticketHref = `/events?event=${encodeURIComponent(event.id)}`;

  return <section className="event-detail-page wrap">
    {eventJsonLd&&<JsonLd data={eventJsonLd}/>}
    <EventsAnalytics eventSlug={event.slug} eventNames={[{slug:event.slug,name:event.name}]}/>
    <div className="detail-breadcrumbs"><a href="/events"><MessageText catalogue={discoveryMessages} message="events.all"/></a><span>/</span><span lang="en-KE">{event.name}</span></div>
    <section className="event-detail-hero"><div><p className="eyebrow"><MessageText catalogue={discoveryMessages} message="event.presents"/></p><h1 lang="en-KE">{event.name}</h1><p>{event.description?<OriginalContent inline disclose>{event.description}</OriginalContent>:<MessageText catalogue={discoveryMessages} message="event.moreDetails"/>}</p><p><EventDay day={String(event.event_date||'').slice(0,10)} long/> · {event.venue?<span lang="en-KE">{event.venue}</span>:<MessageText catalogue={discoveryMessages} message="card.venue"/>}</p></div><EventArtwork name={event.name} image={event.image}/></section>
    {currentStatus&&<p className="modern-alert" role="status"><MessageText catalogue={discoveryMessages} message={currentStatus} values={{previous:<span lang="en-KE">{prev}</span>}}/></p>}
    <section className="event-detail-grid"><div><h2><MessageText catalogue={discoveryMessages} message="event.planVisit"/></h2><dl><div><dt><MessageText catalogue={discoveryMessages} message="details.date"/></dt><dd><EventDay day={String(event.event_date||'').slice(0,10)} long/></dd></div>{([['details.time',event.event_time],['details.venue',event.venue],['details.city',event.city||'Kenya']] as const).map(([label,value])=><div key={label}><dt><MessageText catalogue={discoveryMessages} message={label}/></dt><dd>{value?<span lang="en-KE">{value}</span>:<MessageText catalogue={discoveryMessages} message="details.confirm"/>}</dd></div>)}</dl><div className="modern-actions"><a href={`https://wa.me/?text=${shareText}%20${shareUrl}`} target="_blank" rel="noopener noreferrer"><MessageText catalogue={discoveryMessages} message="event.whatsapp"/></a><a href={`https://x.com/intent/tweet?text=${shareText}&url=${shareUrl}`} target="_blank" rel="noopener noreferrer"><MessageText catalogue={discoveryMessages} message="event.x"/></a>{/^\d{4}-\d{2}-\d{2}$/.test(String(event.event_date).slice(0,10))&&<EventCalendar name={event.name} date={String(event.event_date).slice(0,10)} start={startDate} venue={event.venue||''} url={`${SITE.domain}${path}`}/>}</div></div>
    <aside className="modern-card"><h2><MessageText catalogue={discoveryMessages} message="event.options"/></h2>{tiers.length?<dl>{tiers.map(tier=><div key={tier.name}><dt lang="en-KE">{tier.name}</dt><dd><EventAmount value={tier.price}/></dd></div>)}</dl>:<p><MessageText catalogue={discoveryMessages} message="event.noOptions"/></p>}{sellable?<a className="button" href={ticketHref}><MessageText catalogue={discoveryMessages} message="event.getTickets"/></a>:<p role="status"><MessageText catalogue={discoveryMessages} message={soldOut?'status.sold_out':'event.notOnSale'}/></p>}<p className="form-note"><MessageText catalogue={discoveryMessages} message="event.checkoutCheck"/></p><a href="/book"><MessageText catalogue={discoveryMessages} message="event.planOwn"/></a></aside></section>
    {sellable&&<div className="event-ticket-dock"><span>{fromPrice!==null&&<EventAmount value={fromPrice} from/>}</span><a className="button" href={ticketHref}><MessageText catalogue={discoveryMessages} message="event.getTickets"/></a></div>}
  </section>;
}
