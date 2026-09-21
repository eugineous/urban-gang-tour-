import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/app/_components/JsonLd';
import { SITE } from '@/lib/site';
import { hasDb, q } from '@/lib/server/db';
import { formatEventDate } from '@/lib/server/catalog';
import { PUBLIC_EVENT_STATUSES, isEventSellable, eventSchemaStatus } from '@/lib/server/event-lifecycle';

export const revalidate = 300;

// Pre-generate published ticketed events for ISR. An unavailable database at
// build time yields no pre-generated pages (honest empty list); pages are then
// rendered on demand and cached for the revalidate window.
export async function generateStaticParams() {
  if (!hasDb()) return [];
  try {
    const rows = await q<{ id: string }>(
      `SELECT id FROM tour_events WHERE kind='ticketed' AND status='published'`,
    );
    return rows.map((r) => ({ id: r.id }));
  } catch {
    return [];
  }
}

type Tier = { name: string; price: number };
type TicketedEvent = {
  id: string;
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

const eventForPage = cache(async (id: string): Promise<TicketedEvent | null> => {
  if (!/^[a-z0-9-]{1,80}$/.test(id) || !hasDb()) return null;
  // Buyers holding tickets must still see what happened to their event, so
  // every PUBLIC lifecycle state renders here with truthful status UI —
  // only `published` is buyable (see isEventSellable). Drafts,
  // pending_review, archived and rejected rows stay invisible (404), per
  // Google's keep-the-event-and-flip-its-status rule.
  const rows = await q<TicketedEvent>(
    `SELECT id, name, event_date::text AS event_date, event_time, venue, city, accent, image, description, tiers,
            status, previous_start_at::text AS previous_start_at
     FROM tour_events WHERE id=$1 AND kind='ticketed' AND status = ANY($2) LIMIT 1`,
    [id, [...PUBLIC_EVENT_STATUSES]]
  );
  return rows[0] || null;
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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const event = await eventForPage(id);
  if (!event) return {};
  const path = `/events/${event.id}`;
  const description = event.description || `${event.name} at ${event.venue}${event.city ? `, ${event.city}` : ''}.`;
  return {
    title: `${event.name} | Urban Gang Tour`,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${event.name} | Urban Gang Tour`, description, url: path, images: event.image ? [{ url: event.image }] : undefined },
  };
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await eventForPage(id);
  if (!event) notFound();
  const tiers = safeTiers(event.tiers);
  const startDate = dateTime(event);
  const path = `/events/${event.id}`;
  const status = String(event.status || 'published');
  const sellable = isEventSellable({ status, kind: 'ticketed', tiers });
  const soldOut = status === 'sold_out';
  const prev = event.previous_start_at ? String(event.previous_start_at).slice(0, 10) : null;
  const statusNote: Record<string, string> = {
    sales_paused: 'Ticket sales are paused for this event. Check back soon.',
    sold_out: 'This event is sold out.',
    postponed: 'This event has been postponed. A new date will be announced — your tickets stay valid.',
    rescheduled: prev && prev !== String(event.event_date).slice(0, 10)
      ? `This event was rescheduled (previously ${prev}). Your tickets stay valid for the new date.`
      : 'This event was rescheduled. Your tickets stay valid for the new date.',
    cancelled: 'This event has been cancelled. Ticket holders will be contacted about refunds.',
    completed: 'This event has already happened.',
  };
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
    offers: (!sellable && !soldOut) ? undefined : tiers.map((tier) => ({ '@type': 'Offer', name: tier.name, price: String(tier.price), priceCurrency: 'KES', availability: soldOut ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock', url: `${SITE.domain}${path}` })),
  } : null;
  const accent = /^#[0-9A-F]{6}$/i.test(event.accent) ? event.accent : '#E6218C';
  const eventDate = formatEventDate(event.event_date);
  const shareText = encodeURIComponent(`${event.name} — ${event.venue || ''} ${eventDate}`.trim());
  const shareUrl = encodeURIComponent(`${SITE.domain}${path}`);
  const calStart = startDate ? startDate.replace(/[-:]/g, '').replace('+03:00', '') : null;

  return <main style={{ minHeight: '100vh', color: '#111', background: '#fffafc', fontFamily: 'var(--font-space-grotesk), Arial, sans-serif' }}>
    {eventJsonLd ? <JsonLd data={eventJsonLd} /> : null}
    <div style={{ borderBottom: '4px solid #111', background: '#111', padding: '14px 20px' }}>
      <a href="/" aria-label="Urban Gang Tour home" style={{ display: 'inline-flex', alignItems: 'center' }}>
        <img src="/uploads/URBAN%20GANG%20TOUR%20OFFICIAL%20LOGO.png" alt="Urban Gang Tour" style={{ display: 'block', height: 48, width: 'auto', maxWidth: 'min(280px, 76vw)', objectFit: 'contain' }} />
      </a>
    </div>
    <section style={{ position: 'relative', overflow: 'hidden', background: accent, borderBottom: '4px solid #111' }}>
      {event.image ? <img src={event.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.26 }} /> : null}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, rgba(17,17,17,.92), rgba(17,17,17,.52))' }} />
      <div style={{ position: 'relative', maxWidth: 1080, margin: '0 auto', padding: 'clamp(42px,9vw,96px) 20px', color: '#fff' }}>
        <p style={{ margin: '0 0 12px', fontWeight: 800, letterSpacing: '.11em', fontSize: 12, textTransform: 'uppercase', color: '#FFD400' }}>Urban Gang Tour presents</p>
        <h1 style={{ maxWidth: 780, margin: 0, fontFamily: 'var(--font-anton), Impact, sans-serif', fontSize: 'clamp(44px,8vw,96px)', lineHeight: .94, textTransform: 'uppercase' }}>{event.name}</h1>
        <p style={{ maxWidth: 660, fontSize: 'clamp(17px,2.5vw,22px)', fontWeight: 600, lineHeight: 1.45, margin: '24px 0 0' }}>{event.description || 'Details and ticket options are available below.'}</p>
      </div>
    </section>
    <section style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(30px,6vw,72px) 20px 86px' }}>
      {statusNote[status] ? <p role="status" style={{ margin: '0 0 22px', background: '#111', color: '#FFD400', fontWeight: 800, fontSize: 16, lineHeight: 1.5, padding: '14px 18px', borderRadius: 12 }}>{statusNote[status]}</p> : null}
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
            ? <a href="/events" style={{ display: 'block', textAlign: 'center', background: '#111', color: '#FFD400', borderRadius: 11, padding: '15px 18px', fontFamily: 'var(--font-anton), Impact, sans-serif', fontSize: 19, textTransform: 'uppercase', textDecoration: 'none' }}>Get tickets</a>
            : <p role="status" style={{ margin: 0, textAlign: 'center', background: '#eee7ea', borderRadius: 11, padding: '15px 18px', fontWeight: 800 }}>{soldOut ? 'Sold out' : 'Tickets not on sale'}</p>}
          <a href="/book" style={{ display: 'block', textAlign: 'center', marginTop: 12, color: '#111', fontWeight: 800 }}>Book Urban Gang Tour for your event</a>
        </aside>
      </div>
    </section>
  </main>;
}
