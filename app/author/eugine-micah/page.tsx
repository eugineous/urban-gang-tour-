import type { Metadata } from 'next';
import { getBlogPosts } from '@/app/_lib/blog';
import { JsonLd } from '@/app/_components/JsonLd';
import { SITE } from '@/lib/site';

// Author page for E-E-A-T: gives every Urban News byline a real, crawlable
// Person behind it (Google's quality guidelines weigh author identity for
// news content). Facts here mirror /the-gang and the owner's real profile -
// nothing invented. A plain RSC page like /blog/[slug], so it defines its
// own metadata rather than joining the dc-runtime ROUTES registry; the URL
// is appended to the sitemap explicitly in app/sitemap.ts.

const PATH = '/author/eugine-micah';
const URL = SITE.domain + PATH;
const IMG = '/assets/crew/eugine-micah.png';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Eugine Micah — Co-Founder & Lead Host, Urban Gang Tour',
  description:
    'Eugine Micah is the co-founder, creative director and lead host of the Urban Gang Tour, and the host of Urban News on PPP TV (Channel 430). Read his stories from the tour.',
  alternates: { canonical: URL, types: { 'application/rss+xml': `${SITE.domain}/feed.xml` } },
  openGraph: {
    type: 'profile',
    title: 'Eugine Micah — Co-Founder & Lead Host, Urban Gang Tour',
    description: 'The face of the tour: co-founder, creative director and lead host of the Urban Gang Tour, and host of Urban News on PPP TV Channel 430.',
    url: URL,
    images: [{ url: SITE.domain + IMG }],
  },
};

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': `${URL}#person`,
  name: 'Eugine Micah',
  jobTitle: 'Co-Founder, Creative Director & Lead Host',
  worksFor: { '@type': 'Organization', name: 'Urban Gang Tour', url: SITE.domain },
  url: URL,
  image: SITE.domain + IMG,
  sameAs: ['https://euginemicah.tech'],
  description:
    'Co-founder, creative director and lead host of the Urban Gang Tour; host of Urban News on PPP TV (Channel 430); author of the memoir "Born Broke, Built Loud".',
};

export default async function AuthorEugineMicah() {
  const posts = (await getBlogPosts()).slice(0, 12);

  return (
    <>
      <JsonLd data={personJsonLd} />
      <main style={{ background: '#E6218C', minHeight: '60vh', padding: '48px 22px 90px' }}>
        <article style={{ maxWidth: 820, margin: '0 auto', background: '#fff', border: '3px solid #111', borderRadius: 18, boxShadow: '8px 8px 0 #111', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, padding: '30px 30px 8px', alignItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IMG} alt="Eugine Micah" style={{ width: 148, height: 148, objectFit: 'cover', border: '3px solid #111', borderRadius: 18, boxShadow: '5px 5px 0 #111' }} />
            <div style={{ flex: '1 1 320px' }}>
              <div style={{ display: 'inline-block', background: '#FFD400', border: '2px solid #111', borderRadius: 100, padding: '4px 13px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
                The Face of the Tour
              </div>
              <h1 style={{ fontFamily: "'Anton'", fontSize: 'clamp(32px,5vw,52px)', lineHeight: 1.05, margin: '12px 0 6px', color: '#111', textTransform: 'uppercase' }}>
                Eugine Micah
              </h1>
              <div style={{ color: '#555', fontWeight: 700, fontSize: 15 }}>
                Co-Founder, Creative Director &amp; Lead Host
              </div>
            </div>
          </div>
          <div style={{ padding: '18px 30px 40px' }}>
            <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.65, color: '#333', margin: '0 0 14px' }}>
              Eugine Micah co-founded the Urban Gang Tour and hosts every stop of it — the school
              talent tour travelling Nairobi, Kiambu, Machakos and Nakuru counties to put students
              on a real stage in their own school hall.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: '#222', margin: '0 0 14px' }}>
              Beyond the tour, he hosts Urban News on PPP TV (Channel 430), where standout school
              performances and student stories from the tour reach a national audience. He is also
              the author of the memoir &ldquo;Born Broke, Built Loud&rdquo; and writes most of the
              stories on this site&rsquo;s Urban News desk together with co-host Lucy Ogunde.
            </p>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', margin: '18px 0 6px' }}>
              <a href="/blog/eugine-feature" style={{ fontWeight: 700, color: '#E6218C', textDecoration: 'underline' }}>Read his story</a>
              <a href="/the-gang" style={{ fontWeight: 700, color: '#E6218C', textDecoration: 'underline' }}>Meet the whole Gang</a>
              <a href="https://euginemicah.tech" rel="me" style={{ fontWeight: 700, color: '#E6218C', textDecoration: 'underline' }}>euginemicah.tech</a>
            </div>
          </div>
        </article>
        <aside style={{ maxWidth: 820, margin: '34px auto 0' }}>
          <h2 style={{ fontFamily: "'Anton'", fontSize: 'clamp(20px,3.2vw,26px)', textTransform: 'uppercase', color: '#fff', margin: '0 0 14px' }}>
            Stories by Eugine
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
            {posts.map((p) => (
              <a key={p.slug} href={`/blog/${p.slug}`} style={{ display: 'block', background: '#fff', border: '3px solid #111', borderRadius: 14, boxShadow: '5px 5px 0 #111', overflow: 'hidden', textDecoration: 'none' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt="" style={{ width: '100%', height: 96, objectFit: 'cover', borderBottom: '3px solid #111' }} />
                <div style={{ padding: '10px 12px 14px' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: '#E6218C' }}>{p.section}</div>
                  <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.25, color: '#111', marginTop: 4 }}>{p.headline}</div>
                </div>
              </a>
            ))}
          </div>
        </aside>
      </main>
    </>
  );
}
