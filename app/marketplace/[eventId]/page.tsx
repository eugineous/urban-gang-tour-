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

  return (
    <main style={{ background: '#0c0c0c', minHeight: '80vh', padding: '40px 18px 90px', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <a href="/marketplace" style={{ color: '#9a9aa4', fontSize: 12, textDecoration: 'none' }}>&larr; All marketplace events</a>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(280px,1fr)', gap: 26, marginTop: 14, alignItems: 'start' }}>
          <div>
            <div style={{ height: 240, borderRadius: 16, overflow: 'hidden', background: ev.image ? `url(${ev.image}) center/cover` : 'linear-gradient(135deg,#E6218C,#FFD400)', border: '2px solid #2a2a2a' }} />
            <h1 style={{ fontFamily: 'Anton', color: '#fff', fontSize: 'clamp(28px,5vw,42px)', textTransform: 'uppercase', margin: '18px 0 6px' }}>{ev.name}</h1>
            <div style={{ color: '#21C7E6', fontWeight: 700, fontSize: 13 }}>Hosted by {ev.organizer_business_name}</div>
            <div style={{ color: '#bbb', fontSize: 14, marginTop: 8 }}>{fmtDate(ev.event_date)} &middot; {ev.venue}{ev.city ? `, ${ev.city}` : ''}</div>
            {ev.description ? <p style={{ color: '#ddd', lineHeight: 1.7, marginTop: 16, whiteSpace: 'pre-wrap' }}>{ev.description}</p> : null}
            <div style={{ marginTop: 20, padding: 14, border: '1px solid #2a2a2a', borderRadius: 12, background: '#151515', fontSize: 12, color: '#9a9aa4', lineHeight: 1.6 }}>
              This event is independently organized by <b style={{ color: '#fff' }}>{ev.organizer_business_name}</b> and ticketed
              through the Urban Gang Tour Marketplace. Urban Gang Tour processes your payment securely and passes the organizer
              their share automatically — UGT is not the host of this event.
            </div>
          </div>
          <div style={{ position: 'sticky', top: 20 }}>
            <BuyBox eventId={ev.id} tiers={ev.tiers} />
          </div>
        </div>
      </div>
    </main>
  );
}
