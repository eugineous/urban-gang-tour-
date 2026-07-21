import type { Metadata } from 'next';
import { getBlogPosts } from '@/app/_lib/blog';
import { JsonLd } from '@/app/_components/JsonLd';
import { SITE } from '@/lib/site';

// Author page for Lucy Ogunde - same E-E-A-T pattern as /author/eugine-micah.
// Every fact here comes from /the-gang's real copy and her published feature
// story (/blog/lucy-feature) - nothing invented. Plain RSC page outside the
// dc-runtime ROUTES registry; URL appended to the sitemap in app/sitemap.ts.

const PATH = '/author/lucy-ogunde';
const URL = SITE.domain + PATH;
const IMG = '/assets/crew/lucy-ogunde.jpg';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Lucy Ogunde — Co-Founder & Co-Host, Urban Gang Tour',
  description:
    'Lucy Ogunde is the co-founder and co-host of the Urban Gang Tour and co-host of Urban News - the voice every school trusts. Read her stories from the tour.',
  alternates: { canonical: URL, types: { 'application/rss+xml': `${SITE.domain}/feed.xml` } },
  openGraph: {
    type: 'profile',
    title: 'Lucy Ogunde — Co-Founder & Co-Host, Urban Gang Tour',
    description: 'The voice they trust: co-founder and co-host of the Urban Gang Tour, and co-host of Urban News on PPP TV Kenya.',
    url: URL,
    images: [{ url: SITE.domain + IMG }],
  },
};

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': `${URL}#person`,
  name: 'Lucy Ogunde',
  jobTitle: 'Co-Founder & Co-Host',
  worksFor: { '@type': 'Organization', name: 'Urban Gang Tour', url: SITE.domain },
  url: URL,
  image: SITE.domain + IMG,
  description:
    'Co-founder and co-host of the Urban Gang Tour and co-host of Urban News on PPP TV Kenya - the anchor of the tour’s interviews, crownings and broadcast moments.',
};

export default async function AuthorLucyOgunde() {
  const posts = (await getBlogPosts()).slice(0, 12);

  return (
    <>
      <JsonLd data={personJsonLd} />
      <main style={{ background: '#E6218C', minHeight: '60vh', padding: '48px 22px 90px' }}>
        <article style={{ maxWidth: 820, margin: '0 auto', background: '#fff', border: '3px solid #111', borderRadius: 18, boxShadow: '8px 8px 0 #111', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, padding: '30px 30px 8px', alignItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IMG} alt="Lucy Ogunde" style={{ width: 148, height: 148, objectFit: 'cover', border: '3px solid #111', borderRadius: 18, boxShadow: '5px 5px 0 #111' }} />
            <div style={{ flex: '1 1 320px' }}>
              <div style={{ display: 'inline-block', background: '#FFD400', border: '2px solid #111', borderRadius: 100, padding: '4px 13px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
                The Voice They Trust
              </div>
              <h1 style={{ fontFamily: "'Anton'", fontSize: 'clamp(32px,5vw,52px)', lineHeight: 1.05, margin: '12px 0 6px', color: '#111', textTransform: 'uppercase' }}>
                Lucy Ogunde
              </h1>
              <div style={{ color: '#555', fontWeight: 700, fontSize: 15 }}>
                Co-Founder &amp; Co-Host
              </div>
            </div>
          </div>
          <div style={{ padding: '18px 30px 40px' }}>
            <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.65, color: '#333', margin: '0 0 14px' }}>
              Lucy Ogunde co-founded the Urban Gang Tour and co-hosts every stop of it — and she
              anchors the moments that stay with people longest: the interviews where a student
              says her own name to a national camera for the first time, the pep talks behind the
              curtain, and the crownings where a school&rsquo;s whole year of pride lands on one head.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: '#222', margin: '0 0 14px' }}>
              As co-host of Urban News on PPP TV Kenya, she leads with warmth and lands with
              authority — which is why principals, parents and first-time performers all trust the
              tour with their biggest day. She writes the stories on this site&rsquo;s Urban News desk
              together with co-founder Eugine Micah.
            </p>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', margin: '18px 0 6px' }}>
              <a href="/blog/lucy-feature" style={{ fontWeight: 700, color: '#E6218C', textDecoration: 'underline' }}>Read her story</a>
              <a href="/the-gang" style={{ fontWeight: 700, color: '#E6218C', textDecoration: 'underline' }}>Meet the whole Gang</a>
              <a href="/author/eugine-micah" style={{ fontWeight: 700, color: '#E6218C', textDecoration: 'underline' }}>Eugine Micah</a>
            </div>
          </div>
        </article>
        <aside style={{ maxWidth: 820, margin: '34px auto 0' }}>
          <h2 style={{ fontFamily: "'Anton'", fontSize: 'clamp(20px,3.2vw,26px)', textTransform: 'uppercase', color: '#fff', margin: '0 0 14px' }}>
            Stories by Lucy
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
