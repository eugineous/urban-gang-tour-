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

  return (
    <main style={{ background: '#0c0c0c', minHeight: '80vh', padding: '48px 18px 90px', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h1 style={{ fontFamily: 'Anton', color: '#fff', fontSize: 'clamp(32px,7vw,58px)', textTransform: 'uppercase', margin: '0 0 8px', WebkitTextStroke: '1px #E6218C' }}>Ticket Marketplace</h1>
          <p style={{ color: '#bbb', maxWidth: 620, margin: '0 auto', lineHeight: 1.6 }}>
            Independently organized events, ticketed securely through Urban Gang Tour. Each event below is run by its own
            organizer — UGT processes the payment and never claims to be the host.
          </p>
          <a href="/organizer/signup" style={{ display: 'inline-block', marginTop: 14, color: '#FFD400', fontSize: 12.5, fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(255,212,0,.5)', borderRadius: 999, padding: '7px 14px' }}>
            Have an event? Sell tickets through UGT →
          </a>
        </div>

        {!events.length ? (
          <div style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>No marketplace events are published right now — check back soon.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20 }}>
            {events.map((e) => {
              const minPrice = e.tiers.length ? Math.min(...e.tiers.map((t) => t.price)) : 0;
              return (
                <a key={e.id} href={`/marketplace/${encodeURIComponent(e.id)}`} style={{ textDecoration: 'none', color: '#fff' }}>
                  <div style={{ background: '#151515', border: '2px solid #2a2a2a', borderRadius: 16, overflow: 'hidden', height: '100%' }}>
                    <div style={{ height: 150, background: e.image ? `url(${e.image}) center/cover` : 'linear-gradient(135deg,#E6218C,#FFD400)' }} />
                    <div style={{ padding: 16 }}>
                      <div style={{ fontFamily: 'Anton', fontSize: 19, textTransform: 'uppercase', lineHeight: 1.1 }}>{e.name}</div>
                      <div style={{ fontSize: 12, color: '#9a9aa4', marginTop: 6 }}>{fmtDate(e.event_date)} · {e.venue}{e.city ? `, ${e.city}` : ''}</div>
                      <div style={{ fontSize: 11.5, color: '#21C7E6', marginTop: 8, fontWeight: 700 }}>Hosted by {e.organizer_business_name}</div>
                      <div style={{ marginTop: 10, fontFamily: 'Anton', color: '#FFD400', fontSize: 16 }}>From KES {minPrice.toLocaleString('en-KE')}</div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
