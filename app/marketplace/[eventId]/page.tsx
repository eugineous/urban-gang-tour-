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

function fmtDate(v: string | null): string {
  if (!v) return 'Date TBA';
  const d = new Date(v + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return 'Date TBA';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export default async function MarketplaceEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  let ev;
  try { ev = await getMarketplaceEventById(eventId); } catch { ev = null; }
  // Never show a non-published event publicly, even by direct URL — an
  // organizer previewing their own draft/pending event uses the organizer
  // dashboard, not this public page.
  if (!ev || ev.status !== 'published') notFound();

  return <section className="current-reading current-wide wrap"><a href="/marketplace">← All marketplace events</a><div className="current-marketplace-detail"><div>{ev.image&&<img className="marketplace-poster" src={ev.image} alt={ev.name}/>}<p className="eyebrow">Hosted by {ev.organizer_business_name}</p><h1>{ev.name}</h1><p>{fmtDate(ev.event_date)} · {ev.venue}{ev.city?`, ${ev.city}`:''}</p>{ev.description&&<p style={{whiteSpace:'pre-wrap'}}>{ev.description}</p>}<div className="current-card"><h2>Your event organizer</h2><p>{ev.organizer_business_name} runs this event. Urban Gang Tour processes ticket payments on their behalf. Review the ticket details and refund policy before paying.</p></div></div><BuyBox eventId={ev.id} tiers={ev.tiers}/></div></section>;
}
