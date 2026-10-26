import {MessageText} from '@/ui/i18n/MessageText';
import {commerceMessages} from '@/ui/i18n/catalogues/commerce';
import {EventAmount,EventDay} from '@/ui/components/PublicationDate';
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

export default async function MarketplacePage() {
  let events: Awaited<ReturnType<typeof getPublishedMarketplaceEvents>> = [];
  try { events = await getPublishedMarketplaceEvents(); } catch { events = []; }

  return <section className="current-reading current-wide wrap"><p className="eyebrow"><MessageText catalogue={commerceMessages} message="marketplace.label"/></p><h1><MessageText catalogue={commerceMessages} message="marketplace.heading"/></h1><p><MessageText catalogue={commerceMessages} message="marketplace.intro"/></p><a className="button" href="/organizer/signup"><MessageText catalogue={commerceMessages} message="marketplace.sell"/></a>{!events.length?<div className="current-card"><h2><MessageText catalogue={commerceMessages} message="marketplace.empty"/></h2><p><MessageText catalogue={commerceMessages} message="marketplace.browse"/></p><a href="/events"><MessageText catalogue={commerceMessages} message="marketplace.explore"/></a></div>:<div className="current-grid">{events.map(e=><a className="current-card marketplace-card" href={`/marketplace/${encodeURIComponent(e.id)}`} key={e.id}>{e.image?<img src={e.image} alt={e.name} loading="lazy"/>:<div className="event-image-empty"><MessageText catalogue={commerceMessages} message="marketplace.label"/></div>}<h2 lang="en-KE">{e.name}</h2><p><EventDay day={e.event_date}/> · <span lang="en-KE">{e.venue}{e.city?`, ${e.city}`:''}</span></p><p><MessageText catalogue={commerceMessages} message="marketplace.hosted" values={{name:<span lang="en-KE">{e.organizer_business_name}</span>}}/></p><strong><EventAmount value={e.tiers.length?Math.min(...e.tiers.map(t=>t.price)):0} from/></strong></a>)}</div>}</section>;
}
