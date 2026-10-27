import {MessageText} from '@/ui/i18n/MessageText';
import {commerceMessages} from '@/ui/i18n/catalogues/commerce';
import {EventDay} from '@/ui/components/PublicationDate';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SITE } from '@/lib/site';
import { getMarketplaceEventById } from '@/lib/server/marketplace';
import BuyBox from './BuyBox';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ eventId: string }> }): Promise<Metadata> {
  const { eventId } = await params;
  let ev;
  try { ev = await getMarketplaceEventById(eventId); } catch { ev = null; }
  if (!ev || ev.status !== 'published') return {};
  const url = `${SITE.domain}/marketplace/${ev.id}`;
  return {
    title: `${ev.name} — Tickets | Urban Gang Tour Marketplace`,
    description: (ev.description || `Buy tickets for ${ev.name}, hosted by ${ev.organizer_business_name}, ticketed through Urban Gang Tour.`).slice(0, 300),
    alternates: { canonical: url },
    openGraph: { title: ev.name, description: ev.description || '', url, images: [{ url: ev.image || SITE.defaultOg }] },
    robots: { index: true, follow: true },
  };
}

export default async function MarketplaceEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  let ev;
  try { ev = await getMarketplaceEventById(eventId); } catch { ev = null; }
  // Never show a non-published event publicly, even by direct URL — an
  // organizer previewing their own draft/pending event uses the organizer
  // dashboard, not this public page.
  if (!ev || ev.status !== 'published') notFound();

  return <section className="current-reading current-wide wrap"><a href="/marketplace"><MessageText catalogue={commerceMessages} message="marketplace.back"/></a><div className="current-marketplace-detail"><div>{ev.image&&<img className="marketplace-poster" src={ev.image} alt={ev.name}/>}<p className="eyebrow"><MessageText catalogue={commerceMessages} message="marketplace.hosted" values={{name:<span lang="en-KE">{ev.organizer_business_name}</span>}}/></p><h1 lang="en-KE">{ev.name}</h1><p><EventDay day={ev.event_date} long/> · <span lang="en-KE">{ev.venue}{ev.city?`, ${ev.city}`:''}</span></p>{ev.description&&<p lang="en-KE" style={{whiteSpace:'pre-wrap'}}>{ev.description}</p>}<div className="current-card"><h2><MessageText catalogue={commerceMessages} message="marketplace.organizer"/></h2><p><MessageText catalogue={commerceMessages} message="marketplace.organizerNote" values={{name:<span lang="en-KE">{ev.organizer_business_name}</span>}}/></p></div></div><BuyBox eventId={ev.id} tiers={ev.tiers}/></div></section>;
}
