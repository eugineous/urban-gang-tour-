import type { Metadata } from 'next';
import { metadataForPathDynamic } from '@/app/_lib/seo';
import { breadcrumbFor } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import { SITE } from '@/lib/site';

const PATH = '/press';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPathDynamic(PATH);
}

const facts = [
  ['Founded', '2019'],
  ['Founders', 'Eugine Micah and Lucy Ogunde'],
  ['Schools visited', '50+'],
  ['Students reached', '100,000+'],
  ['Broadcast', 'Urban News on PPP TV Kenya'],
  ['Base', 'Kilimani, Nairobi'],
];

const contacts = [
  ['Bookings and institutions', 'admin@urbangangtour.co.ke'],
  ['Media and interviews', 'admin@urbangangtour.co.ke'],
  ['Instagram', '@urban_newsgang'],
];

const founderBios = [
  {
    name: 'Eugine Micah',
    role: 'Co-founder, creative director and lead host',
    copy:
      'Eugine Micah is the face of the Urban Gang Tour and a host of Urban News. He leads the show energy, student-facing moments and the creative direction that turns each stop into broadcast-ready youth culture.',
  },
  {
    name: 'Lucy Ogunde',
    role: 'Co-founder, co-host and trusted youth voice',
    copy:
      'Lucy Ogunde is the co-founder and co-host of the Urban Gang Tour and Urban News. She helps carry the mentorship, media and confidence-building side of the platform, especially for young women performers.',
  },
];

const PRESS_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${SITE.domain}/press`,
  url: `${SITE.domain}/press`,
  name: 'Press & Media Kit - Urban Gang Tour',
  isPartOf: { '@id': `${SITE.domain}/#website` },
  about: { '@id': `${SITE.domain}/#org` },
};

const card: React.CSSProperties = {
  background: '#fff',
  border: '3px solid #111',
  borderRadius: 8,
  boxShadow: '6px 6px 0 #111',
};

export default function PressPage() {
  return (
    <>
      <JsonLd data={[PRESS_JSONLD, breadcrumbFor(PATH)]} />
      <main style={{ minHeight: '100vh', background: '#fffafc', color: '#111', fontFamily: 'var(--font-space-grotesk), Arial, sans-serif' }}>
        <header style={{ background: '#111', color: '#fff', borderBottom: '4px solid #111', padding: '14px 20px' }}>
          <a href="/" aria-label="Urban Gang Tour home" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <img src="/uploads/URBAN%20GANG%20TOUR%20OFFICIAL%20LOGO.png" alt="Urban Gang Tour" style={{ height: 50, width: 'auto', maxWidth: 'min(280px, 78vw)', objectFit: 'contain' }} />
          </a>
        </header>

        <section style={{ background: '#E6218C', borderBottom: '4px solid #111', padding: 'clamp(42px,7vw,84px) 20px' }}>
          <div style={{ maxWidth: 1080, margin: '0 auto' }}>
            <p style={{ margin: '0 0 10px', display: 'inline-block', background: '#111', color: '#FFD400', border: '2px solid #111', borderRadius: 999, padding: '7px 13px', fontSize: 12, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase' }}>Press Room</p>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-anton), Impact, sans-serif', fontSize: 'clamp(42px,8vw,86px)', lineHeight: .92, textTransform: 'uppercase', color: '#fff', WebkitTextStroke: '2px #111', textShadow: '4px 4px 0 #111' }}>
              The official UGT media kit.
            </h1>
            <p style={{ maxWidth: 690, fontSize: 'clamp(16px,2vw,19px)', fontWeight: 750, lineHeight: 1.55, margin: '18px 0 0' }}>
              Approved facts, founder bios, media contacts and story angles for coverage of Kenya's youth entertainment and campus tour.
            </p>
          </div>
        </section>

        <section style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(30px,5vw,58px) 20px', display: 'grid', gap: 22 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14 }}>
            {facts.map(([label, value]) => (
              <div key={label} style={{ ...card, padding: 16, background: label === 'Broadcast' ? '#FFD400' : '#fff' }}>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: '#666' }}>{label}</div>
                <div style={{ marginTop: 6, fontFamily: 'var(--font-anton), Impact, sans-serif', fontSize: 25, lineHeight: 1, textTransform: 'uppercase' }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 18, alignItems: 'start' }}>
            <section style={{ ...card, padding: 'clamp(20px,3vw,28px)' }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-anton), Impact, sans-serif', fontSize: 34, textTransform: 'uppercase' }}>Boilerplate</h2>
              <p style={{ fontSize: 16, lineHeight: 1.65, fontWeight: 650 }}>
                Urban Gang Tour is a Kenyan youth entertainment and media platform founded in 2019 by Eugine Micah and Lucy Ogunde. The tour brings a full broadcast-ready production to schools and campuses, combining talent showcases, runway moments, awards, mentorship pods and Urban News coverage through PPP TV Kenya.
              </p>
              <p style={{ fontSize: 16, lineHeight: 1.65, fontWeight: 650 }}>
                Its mission is From Potential to Purpose: giving young performers a real stage, useful mentorship and a media record their school community can rally behind.
              </p>
            </section>

            <aside style={{ ...card, padding: 20, background: '#21C7E6' }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-anton), Impact, sans-serif', fontSize: 28, textTransform: 'uppercase' }}>Media Contact</h2>
              <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                {contacts.map(([label, value]) => (
                  <div key={label} style={{ background: '#fff', border: '2px solid #111', borderRadius: 8, padding: 11 }}>
                    <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#666' }}>{label}</div>
                    <div style={{ marginTop: 3, fontWeight: 900 }}>{value}</div>
                  </div>
                ))}
              </div>
              <a href="/book" style={{ display: 'inline-block', marginTop: 16, background: '#111', color: '#FFD400', border: '3px solid #111', borderRadius: 8, padding: '12px 16px', fontWeight: 900, textTransform: 'uppercase', boxShadow: '4px 4px 0 #fff' }}>Request media access</a>
            </aside>
          </div>

          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 290px), 1fr))', gap: 16 }}>
            {founderBios.map((founder) => (
              <article key={founder.name} style={{ ...card, padding: 20 }}>
                <div style={{ color: '#E6218C', fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase' }}>{founder.role}</div>
                <h2 style={{ margin: '6px 0 10px', fontFamily: 'var(--font-anton), Impact, sans-serif', fontSize: 32, textTransform: 'uppercase' }}>{founder.name}</h2>
                <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, fontWeight: 650 }}>{founder.copy}</p>
              </article>
            ))}
          </section>

          <section style={{ ...card, padding: 20, background: '#111', color: '#fff' }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-anton), Impact, sans-serif', fontSize: 32, textTransform: 'uppercase', color: '#FFD400' }}>Good story angles</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 12, marginTop: 14 }}>
              {['Youth talent moving from school halls to national TV', 'Founder-led Kenyan entertainment built around mentorship', 'How schools host a broadcast-ready culture day', 'Brand activations that participate in youth culture'].map((angle) => (
                <div key={angle} style={{ border: '2px solid #FFD400', borderRadius: 8, padding: 12, fontWeight: 800, lineHeight: 1.4 }}>{angle}</div>
              ))}
            </div>
          </section>
        </section>
      </main>
    </>
  );
}
