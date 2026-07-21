import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBlogPosts, getBlogPost, articleJsonLd, type BlogPost as BlogPostData } from '@/app/_lib/blog';
import { breadcrumbFor } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import { ShareBar } from '@/app/_components/ShareBar';
import { ArticleAd } from '@/app/_components/Ads';
import { SITE } from '@/lib/site';

export const revalidate = 300; // admin edits go live within 5 minutes

export async function generateStaticParams() {
  return (await getBlogPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return {};
  const url = `${SITE.domain}/blog/${post.slug}`;
  const img = SITE.domain + post.image;
  return {
    title: `${post.headline} — Urban News`,
    description: post.description,
    alternates: { canonical: url, types: { 'application/rss+xml': `${SITE.domain}/feed.xml` } },
    openGraph: {
      type: 'article', title: post.headline, description: post.description, url,
      images: [{ url: img }], publishedTime: post.datePublished, modifiedTime: post.dateModified,
    },
    twitter: { card: 'summary_large_image', title: post.headline, description: post.description, images: [img] },
  };
}

// Up to 4 other stories, same section first then most recent. Real <a href>
// links so every article is reachable from every other one - crawlers were
// finding these pages orphaned ("Discovered - currently not indexed" in
// Search Console: known URL, never followed a link to it, never crawled).
function relatedPosts(all: BlogPostData[], current: BlogPostData): BlogPostData[] {
  const others = all.filter((p) => p.slug !== current.slug);
  const sameSection = others.filter((p) => p.section === current.section);
  const rest = others.filter((p) => p.section !== current.section);
  return [...sameSection, ...rest].slice(0, 4);
}

export default async function BlogPost(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const posts = await getBlogPosts();
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();
  const related = relatedPosts(posts, post);

  return (
    <>
      <JsonLd data={[articleJsonLd(post), breadcrumbFor('/blog')]} />
      <main style={{ background: '#E6218C', minHeight: '60vh', padding: '48px 22px 90px' }}>
        <article style={{ maxWidth: 820, margin: '0 auto', background: '#fff', border: '3px solid #111', borderRadius: 18, boxShadow: '8px 8px 0 #111', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.image} alt={post.headline} style={{ width: '100%', height: 340, objectFit: 'cover', borderBottom: '3px solid #111' }} />
          <div style={{ padding: '26px 30px 40px' }}>
            <div style={{ display: 'inline-block', background: '#FFD400', border: '2px solid #111', borderRadius: 100, padding: '4px 13px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
              {post.section}
            </div>
            <h1 style={{ fontFamily: "'Anton'", fontSize: 'clamp(30px,5vw,50px)', lineHeight: 1.05, margin: '14px 0 8px', color: '#111', textTransform: 'uppercase' }}>
              {post.headline}
            </h1>
            <div style={{ color: '#888', fontSize: 13, marginBottom: 6 }}>
              {new Date(post.datePublished).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · Urban News · by{' '}
              <a href="/author/eugine-micah" style={{ color: '#E6218C', fontWeight: 700, textDecoration: 'underline' }}>Eugine Micah</a> &amp; Lucy Ogunde
            </div>
            <ShareBar url={`${SITE.domain}/blog/${post.slug}`} title={post.headline} />
            <p style={{ fontSize: 17.5, fontWeight: 600, lineHeight: 1.6, color: '#333', margin: '14px 0 18px' }}>{post.description}</p>
            {post.body.map((para, i) => {
              // one in-content ad slot partway down long stories (dormant
              // until AdSense is live) - shown just before roughly the fourth
              // block, only on stories long enough for it not to intrude.
              const adHere = i === Math.min(3, post.body.length - 1) && post.body.length > 4;
              // longform conventions: "## " → section heading, "> " → pull quote
              let el: React.ReactNode;
              if (para.startsWith('## ')) {
                el = (
                  <h2 style={{ fontFamily: "'Anton'", fontSize: 'clamp(21px,3.4vw,28px)', textTransform: 'uppercase', color: '#111', margin: '30px 0 12px', lineHeight: 1.15 }}>
                    {para.slice(3)}
                  </h2>
                );
              } else if (para.startsWith('> ')) {
                el = (
                  <blockquote style={{ margin: '22px 0', padding: '14px 18px', background: '#FFF7D6', borderLeft: '6px solid #FFD400', border: '2px solid #111', borderLeftWidth: 8, borderRadius: 12, fontSize: 18, fontWeight: 700, lineHeight: 1.5, color: '#111' }}>
                    {para.slice(2)}
                  </blockquote>
                );
              } else {
                el = <p style={{ fontSize: 16, lineHeight: 1.8, color: '#222', margin: '0 0 16px' }}>{para}</p>;
              }
              return (
                <div key={i}>
                  {adHere && <ArticleAd />}
                  {el}
                </div>
              );
            })}
            <div style={{ marginTop: 26, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              <a href="/blog" style={{ fontWeight: 700, color: '#E6218C', textDecoration: 'underline' }}>← All stories</a>
              <a href="/book" style={{ fontWeight: 700, color: '#E6218C', textDecoration: 'underline' }}>Book the Tour</a>
            </div>
          </div>
        </article>
        {related.length > 0 && (
          <aside style={{ maxWidth: 820, margin: '34px auto 0' }}>
            <h2 style={{ fontFamily: "'Anton'", fontSize: 'clamp(20px,3.2vw,26px)', textTransform: 'uppercase', color: '#fff', margin: '0 0 14px' }}>
              More from Urban News
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
              {related.map((r) => (
                <a key={r.slug} href={`/blog/${r.slug}`} style={{ display: 'block', background: '#fff', border: '3px solid #111', borderRadius: 14, boxShadow: '5px 5px 0 #111', overflow: 'hidden', textDecoration: 'none' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.image} alt="" style={{ width: '100%', height: 96, objectFit: 'cover', borderBottom: '3px solid #111' }} />
                  <div style={{ padding: '10px 12px 14px' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: '#E6218C' }}>{r.section}</div>
                    <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.25, color: '#111', marginTop: 4 }}>{r.headline}</div>
                  </div>
                </a>
              ))}
            </div>
          </aside>
        )}
      </main>
    </>
  );
}
