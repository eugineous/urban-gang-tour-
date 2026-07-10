import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBlogPosts, getBlogPost, articleJsonLd } from '@/app/_lib/blog';
import { breadcrumbFor } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
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
    alternates: { canonical: url },
    openGraph: {
      type: 'article', title: post.headline, description: post.description, url,
      images: [{ url: img }], publishedTime: post.datePublished, modifiedTime: post.dateModified,
    },
    twitter: { card: 'summary_large_image', title: post.headline, description: post.description, images: [img] },
  };
}

export default async function BlogPost(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

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
              {new Date(post.datePublished).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · Urban News · by Eugine Micah &amp; Lucy Ogunde
            </div>
            <p style={{ fontSize: 17.5, fontWeight: 600, lineHeight: 1.6, color: '#333', margin: '14px 0 18px' }}>{post.description}</p>
            {post.body.map((para, i) => {
              // longform conventions: "## " → section heading, "> " → pull quote
              if (para.startsWith('## ')) {
                return (
                  <h2 key={i} style={{ fontFamily: "'Anton'", fontSize: 'clamp(21px,3.4vw,28px)', textTransform: 'uppercase', color: '#111', margin: '30px 0 12px', lineHeight: 1.15 }}>
                    {para.slice(3)}
                  </h2>
                );
              }
              if (para.startsWith('> ')) {
                return (
                  <blockquote key={i} style={{ margin: '22px 0', padding: '14px 18px', background: '#FFF7D6', borderLeft: '6px solid #FFD400', border: '2px solid #111', borderLeftWidth: 8, borderRadius: 12, fontSize: 18, fontWeight: 700, lineHeight: 1.5, color: '#111' }}>
                    {para.slice(2)}
                  </blockquote>
                );
              }
              return (
                <p key={i} style={{ fontSize: 16, lineHeight: 1.8, color: '#222', margin: '0 0 16px' }}>{para}</p>
              );
            })}
            <div style={{ marginTop: 26, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              <a href="/blog" style={{ fontWeight: 700, color: '#E6218C', textDecoration: 'underline' }}>← All stories</a>
              <a href="/urban-news" style={{ fontWeight: 700, color: '#E6218C', textDecoration: 'underline' }}>Urban News</a>
              <a href="/book" style={{ fontWeight: 700, color: '#E6218C', textDecoration: 'underline' }}>Book the Tour</a>
            </div>
          </div>
        </article>
      </main>
    </>
  );
}
