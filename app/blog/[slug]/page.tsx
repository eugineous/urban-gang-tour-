import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBlogPosts, getBlogPost, articleJsonLd } from '@/app/_lib/blog';
import { breadcrumbFor } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import { SITE } from '@/lib/site';

export function generateStaticParams() {
  return getBlogPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  const url = `${SITE.domain}/blog/${post.slug}`;
  return {
    title: `${post.headline} — Urban News`,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: post.headline,
      description: post.description,
      url,
      images: [{ url: post.image }],
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified,
    },
    twitter: { card: 'summary_large_image', title: post.headline, description: post.description, images: [post.image] },
  };
}

export default async function BlogPost(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  return (
    <>
      <JsonLd data={[articleJsonLd(post), breadcrumbFor('/blog')]} />
      <main style={{ background: '#E6218C', minHeight: '60vh', padding: '48px 22px 90px' }}>
        <article style={{ maxWidth: 820, margin: '0 auto', background: '#fff', border: '3px solid #111', borderRadius: 18, boxShadow: '8px 8px 0 #111', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.image} alt={post.headline} style={{ width: '100%', height: 320, objectFit: 'cover', borderBottom: '3px solid #111' }} />
          <div style={{ padding: '26px 30px 40px' }}>
            <div style={{ display: 'inline-block', background: '#FFD400', border: '2px solid #111', borderRadius: 100, padding: '4px 13px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
              {post.section}
            </div>
            <h1 style={{ fontFamily: "'Anton'", fontSize: 'clamp(30px,5vw,52px)', lineHeight: 1.03, margin: '14px 0 10px', color: '#111', textTransform: 'uppercase' }}>
              {post.headline}
            </h1>
            <div style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>{post.datePublished}</div>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: '#222', margin: 0 }}>{post.description}</p>
            <div style={{ marginTop: 28 }}>
              <a href="/urban-news" style={{ fontWeight: 700, color: '#E6218C', textDecoration: 'underline' }}>← More on Urban News</a>
            </div>
          </div>
        </article>
      </main>
    </>
  );
}
