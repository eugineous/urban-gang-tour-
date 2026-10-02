import type { Metadata } from 'next';
import Link from 'next/link';
import { hasDb, q } from '@/lib/server/db';
import { formatEventDate } from '@/lib/server/catalog';
import { metadataForPathDynamic } from '@/app/_lib/seo';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> { return metadataForPathDynamic('/tour-stops'); }

export default async function TourStops() {
  let stops: { id: string; name: string; venue: string; event_date: string; description: string; status: string }[] = [];
  if (hasDb()) {
    try {
      stops = await q(`SELECT id, name, venue, event_date::text, description, status FROM tour_events WHERE kind='school' AND status IN ('published','completed','rescheduled','postponed') ORDER BY event_date DESC NULLS LAST`);
    } catch { /* Keep the booking route available when the calendar cannot load. */ }
  }
  const today = new Date().toISOString().slice(0, 10);
  const past = stops.filter(stop => stop.status === 'completed' || (stop.event_date && stop.event_date < today));
  const upcoming = stops.filter(stop => !past.includes(stop)).sort((a, b) => (a.event_date || '9999').localeCompare(b.event_date || '9999'));
  return <main className="ugt-stops-page"><header><p>URBAN GANG TOUR</p><h1>Tour Stops</h1><p>Upcoming school visits and the places we have taken the tour.</p><Link href="/book">Bring the tour to your institution</Link></header>
    {[{ title: 'Upcoming stops', items: upcoming }, { title: 'From the road', items: past }].map(group => <section key={group.title}><h2>{group.title}</h2>{group.items.length ? <div className="ugt-stops-list">{group.items.map(stop => <article key={stop.id}><p>{stop.event_date ? formatEventDate(stop.event_date) : 'Date to be confirmed'}{stop.status === 'postponed' ? ' · Postponed' : ''}</p><h3>{stop.name}</h3><p>{stop.venue}</p>{stop.description && <p>{stop.description}</p>}<Link href={group.title === 'From the road' ? '/gallery' : '/book'}>{group.title === 'From the road' ? 'View tour photos' : 'Enquire about this stop'}</Link></article>)}</div> : <p>{group.title === 'Upcoming stops' ? 'New dates appear here when the team publishes them. You can request a school or campus stop through the booking desk.' : 'Published tour history will appear here. Explore the gallery for highlights.'}</p>}</section>)}
  </main>;
}
