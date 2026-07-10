import type { Metadata } from 'next';
import { metadataForPath } from '@/app/_lib/seo';
import { structuredDataForPath } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import { getBlogPosts } from '@/app/_lib/blog';

const PATH = '/blog';
export const metadata: Metadata = metadataForPath(PATH);

export const revalidate = 300;

export default async function BlogIndex() {
  const posts = await getBlogPosts();
  return (
    <>
      <JsonLd data={structuredDataForPath(PATH)} />
      <main style={{ background: '#E6218C', minHeight: '60vh', padding: '56px 22px 90px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ fontFamily: "'Permanent Marker'", color: '#111', fontSize: 20, transform: 'rotate(-2deg)' }}>
            Urban News
          </div>
          <h1 style={{ fontFamily: "'Anton'", color: '#fff', fontSize: 'clamp(40px,7vw,84px)', margin: '4px 0 26px', textTransform: 'uppercase', WebkitTextStroke: '2px #111' }}>
            The Blog
          </h1>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 22 }}>
            {posts.map((p) => (
              <a
                key={p.slug}
                href={`/blog/${p.slug}`}
                style={{ background: '#fff', border: '3px solid #111', borderRadius: 16, boxShadow: '6px 6px 0 #111', overflow: 'hidden', display: 'block', color: '#111' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt={p.headline} style={{ width: '100%', height: 190, objectFit: 'cover', borderBottom: '3px solid #111' }} />
                <div style={{ padding: '16px 18px 20px' }}>
                  <div style={{ display: 'inline-block', background: '#FFD400', border: '2px solid #111', borderRadius: 100, padding: '3px 11px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                    {p.section}
                  </div>
                  <h2 style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 19, lineHeight: 1.2, margin: '12px 0 8px' }}>{p.headline}</h2>
                  <p style={{ fontSize: 13.5, color: '#333', lineHeight: 1.5, margin: 0 }}>{p.description}</p>
                  <div style={{ marginTop: 12, color: '#888', fontSize: 12 }}>{p.datePublished}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
