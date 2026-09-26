import type { Metadata } from 'next';
import Link from 'next/link';
import { metadataForPathDynamic } from '@/app/_lib/seo';
import { eventsFromDb, breadcrumbFor } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import EventsAnalytics from '@/app/_components/EventsAnalytics';
import { SITE } from '@/lib/site';
import { hasDb, q } from '@/lib/server/db';
import { formatEventDate } from '@/lib/server/catalog';
import { INDEXABLE_EVENT_STATUSES, isEventSellable } from '@/lib/server/event-lifecycle';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPathDynamic('/events');
}

type Tier = { name: string; price: number };
type EventCard = {
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
};

function safeTiers(value: Tier[] | string): Tier[] {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed)
      ? parsed.filter((t) => typeof t?.name === 'string' && Number.isFinite(Number(t?.price)))
        .map((t) => ({ name: t.name, price: Math.max(0, Math.round(Number(t.price))) }))
      : [];
  } catch {
    return [];
  }
}

function money(value: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    published: 'On sale',
    sales_paused: 'Paused',
    sold_out: 'Sold out',
    postponed: 'Postponed',
    rescheduled: 'Rescheduled',
    completed: 'Ended',
  };
  return labels[status] || status;
}

function ctaFor(status: string, slug: string, tiers: Tier[]): { label: string; href: string; disabled: boolean } {
  const sellable = isEventSellable({ status, kind: 'ticketed', tiers });
  if (sellable) return { label: 'Get tickets', href: `/events/${slug}`, disabled: false };
  if (status === 'sold_out') return { label: 'Sold out', href: `/events/${slug}`, disabled: true };
  if (status === 'completed') return { label: 'View recap', href: `/events/${slug}`, disabled: false };
  if (status === 'postponed' || status === 'rescheduled') return { label: 'Event update', href: `/events/${slug}`, disabled: false };
  return { label: 'View event', href: `/events/${slug}`, disabled: false };
}

async function getEvents(): Promise<EventCard[]> {
  if (!hasDb()) return [];
  try {
    const rows = await q<EventCard>(
      `SELECT slug, name, event_date::text AS event_date, event_time, venue, city, accent, image, description, tiers, status
       FROM tour_events
       WHERE kind='ticketed'
         AND status = ANY($1)
         AND slug != ''
         AND (event_date >= CURRENT_DATE OR status IN ('postponed','rescheduled'))
       ORDER BY priority DESC, event_date ASC`,
      [[...INDEXABLE_EVENT_STATUSES]]
    );
    return rows;
  } catch {
    return [];
  }
}

export default async function EventsPage() {
  const events = await getEvents();
  const jsonLd = await eventsFromDb();

  const featured = events[0] || null;
  const upcoming = events.slice(1);
  const cities = [...new Set(events.map((e) => e.city).filter(Boolean))].sort();

  return (
    <>
      {jsonLd ? <JsonLd data={[jsonLd, breadcrumbFor('/events')].filter(Boolean)} /> : null}
      <EventsAnalytics eventNames={events.map((e) => ({ slug: e.slug, name: e.name }))} />
      <main style={{ minHeight: '100vh', color: '#111', background: '#fffafc', fontFamily: 'var(--font-space-grotesk), Arial, sans-serif' }}>
        {/* Header */}
        <div style={{ borderBottom: '4px solid #111', background: '#111', padding: '14px 20px' }}>
          <a href="/" aria-label="Urban Gang Tour home" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <img src="/uploads/URBAN%20GANG%20TOUR%20OFFICIAL%20LOGO.png" alt="Urban Gang Tour" style={{ display: 'block', height: 48, width: 'auto', maxWidth: 'min(280px, 76vw)', objectFit: 'contain' }} />
          </a>
        </div>

        {/* Hero */}
        <section style={{ background: '#111', color: '#fff', padding: 'clamp(36px,7vw,72px) 20px', borderBottom: '4px solid #111' }}>
          <div style={{ maxWidth: 1080, margin: '0 auto' }}>
            <p style={{ margin: '0 0 8px', fontWeight: 800, letterSpacing: '.12em', fontSize: 12, textTransform: 'uppercase', color: '#FFD400' }}>Urban Gang Live</p>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-anton), Impact, sans-serif', fontSize: 'clamp(36px,7vw,72px)', lineHeight: .95, textTransform: 'uppercase' }}>Find your next plot.</h1>
            <p style={{ maxWidth: 560, fontSize: 'clamp(15px,2vw,18px)', fontWeight: 500, lineHeight: 1.5, margin: '16px 0 0', color: '#ccc' }}>
              Concerts, festivals, campus raves and cultural experiences across Kenya.
            </p>
            {/* Search */}
            <div style={{ marginTop: 24, maxWidth: 480 }}>
              <input
                type="search"
                placeholder="Search events, places, campuses…"
                aria-label="Search events"
                style={{ width: '100%', padding: '13px 16px', borderRadius: 10, border: '2px solid #333', background: '#1a1a1a', color: '#fff', fontSize: 15, fontFamily: 'inherit', outline: 'none' }}
              />
            </div>
            {/* Filter chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              {['This Weekend', 'Nairobi', 'Campus', 'Festivals', 'Free', 'Under KSh 1K'].map((chip) => (
                <button key={chip} type="button" style={{ padding: '8px 14px', borderRadius: 20, border: '1.5px solid #444', background: 'transparent', color: '#ccc', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Featured event */}
        {featured ? (
          <section style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(28px,5vw,56px) 20px 0' }}>
            <p style={{ margin: '0 0 14px', fontWeight: 900, letterSpacing: '.1em', fontSize: 12, textTransform: 'uppercase', color: '#E6218C' }}>Featured</p>
            <Link href={`/events/${featured.slug}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, border: '3px solid #111', background: featured.accent || '#E6218C', minHeight: 220 }}>
                {featured.image ? <img src={featured.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} /> : null}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, rgba(17,17,17,.9), rgba(17,17,17,.4))' }} />
                <div style={{ position: 'relative', padding: 'clamp(24px,4vw,44px)', color: '#fff' }}>
                  <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', color: '#FFD400' }}>{featured.name}</p>
                  <p style={{ margin: 0, fontSize: 'clamp(15px,2vw,18px)', fontWeight: 600 }}>
                    {formatEventDate(featured.event_date)} {featured.event_time ? `· ${featured.event_time}` : ''}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 500 }}>{featured.venue}{featured.city ? `, ${featured.city}` : ''}</p>
                  {safeTiers(featured.tiers).length > 0 ? (
                    <p style={{ margin: '12px 0 0', fontSize: 14, fontWeight: 700 }}>
                      From {money(Math.min(...safeTiers(featured.tiers).map((t) => t.price)))}
                    </p>
                  ) : null}
                  <span style={{ display: 'inline-block', marginTop: 16, background: '#111', color: '#FFD400', borderRadius: 10, padding: '11px 20px', fontFamily: 'var(--font-anton), Impact, sans-serif', fontSize: 16, textTransform: 'uppercase' }}>
                    View event
                  </span>
                </div>
              </div>
            </Link>
          </section>
        ) : null}

        {/* Upcoming events */}
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(28px,5vw,56px) 20px 100px' }}>
          <p style={{ margin: '0 0 18px', fontWeight: 900, letterSpacing: '.1em', fontSize: 12, textTransform: 'uppercase', color: '#E6218C' }}>
            {upcoming.length ? 'Happening soon' : 'No upcoming events'}
          </p>
          {upcoming.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 20 }}>
              {upcoming.map((event) => {
                const tiers = safeTiers(event.tiers);
                const cta = ctaFor(event.status, event.slug, tiers);
                return (
                  <Link key={event.slug} href={`/events/${event.slug}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ background: '#fff', border: '2.5px solid #111', borderRadius: 16, overflow: 'hidden', height: '100%', boxShadow: `5px 5px 0 ${event.accent || '#E6218C'}` }}>
                      <div style={{ position: 'relative', height: 140, background: event.accent || '#E6218C' }}>
                        {event.image ? <img src={event.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} /> : null}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(17,17,17,.5))' }} />
                        <span style={{ position: 'absolute', top: 10, left: 10, background: '#111', color: '#FFD400', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                          {statusLabel(event.status)}
                        </span>
                      </div>
                      <div style={{ padding: '16px 18px 18px' }}>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 16, lineHeight: 1.3 }}>{event.name}</p>
                        <p style={{ margin: '6px 0 0', fontSize: 13.5, fontWeight: 600, color: '#555' }}>
                          {formatEventDate(event.event_date)} {event.event_time ? `· ${event.event_time}` : ''}
                        </p>
                        <p style={{ margin: '3px 0 0', fontSize: 13.5, fontWeight: 600, color: '#555' }}>
                          {event.venue}{event.city ? `, ${event.city}` : ''}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                          {tiers.length > 0 ? (
                            <span style={{ fontSize: 14, fontWeight: 800 }}>From {money(Math.min(...tiers.map((t) => t.price)))}</span>
                          ) : <span />}
                          <span style={{ fontSize: 13, fontWeight: 800, color: cta.disabled ? '#999' : '#E6218C', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                            {cta.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p style={{ color: '#777', fontSize: 15, lineHeight: 1.6 }}>
              There are no upcoming events right now. Check back soon or follow us on socials for announcements.
            </p>
          )}
        </section>
      </main>
    </>
  );
}
