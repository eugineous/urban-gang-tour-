import type { Metadata } from 'next';
import { SITE } from '@/lib/site';
import { getPublishedMarketplaceEvents } from '@/lib/server/marketplace';

// Third-party ticketing marketplace — any outside event organizer, approved
// by UGT admin, sells tickets here. DISTINCT from /events (UGT's own tour
// dates, tour_events table). Every card is explicitly labelled "Hosted by
// <organizer>" so a buyer is never confused about who is actually running
// the show — UGT only processes the payment and takes a commission.

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const url = `${SITE.domain}/marketplace`;
  return {
    title: 'Ticket Marketplace — Urban Gang Tour',
    description: 'Buy tickets for independently organized events sold through the Urban Gang Tour Marketplace. UGT processes payment securely; each event is run by its own organizer.',
    alternates: { canonical: url },
    openGraph: { title: 'Ticket Marketplace — Urban Gang Tour', description: 'Independently organized events, ticketed through UGT.', url, images: [{ url: SITE.defaultOg }] },
  };
}

function fmtDate(v: string | null): string {
  if (!v) return 'Date TBA';
  const d = new Date(v + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return 'Date TBA';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export default async function MarketplacePage() {
  let events: Awaited<ReturnType<typeof getPublishedMarketplaceEvents>> = [];
  try { events = await getPublishedMarketplaceEvents(); } catch { events = []; }

  return <section className="current-reading current-wide wrap"><p className="eyebrow">Ticket marketplace</p><h1>Find your next event.</h1><p>Events from independent organizers. Check the date, venue and ticket options before booking.</p><a className="button" href="/organizer/signup">Sell tickets for your event</a>{!events.length?<div className="current-card"><h2>No events on sale yet.</h2><p>Browse our event recommendations while organizers prepare their next release.</p><a href="/events">Explore events</a></div>:<div className="current-grid">{events.map(e=><a className="current-card marketplace-card" href={`/marketplace/${encodeURIComponent(e.id)}`} key={e.id}>{e.image?<img src={e.image} alt={e.name} loading="lazy"/>:<div className="event-image-empty">Ticket marketplace</div>}<h2>{e.name}</h2><p>{fmtDate(e.event_date)} · {e.venue}{e.city?`, ${e.city}`:''}</p><p>Hosted by {e.organizer_business_name}</p><strong>From KES {(e.tiers.length?Math.min(...e.tiers.map(t=>t.price)):0).toLocaleString('en-KE')}</strong></a>)}</div>}</section>;
}
