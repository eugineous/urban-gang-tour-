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

  return <main className="news-article-page wrap">
    <JsonLd data={articleJsonLd(post)}/><JsonLd data={breadcrumbFor(`/blog/${post.slug}`)}/>
    <div className="detail-breadcrumbs"><a href="/blog">Urban News</a><span>/</span><span>{post.section}</span></div>
    <article className="news-article"><p className="eyebrow">{post.section}</p><h1>{post.headline}</h1><div className="article-byline"><time dateTime={post.datePublished}>{new Intl.DateTimeFormat('en-KE',{day:'numeric',month:'long',year:'numeric',timeZone:'Africa/Nairobi'}).format(new Date(post.datePublished))}</time><span>By <a href="/author/eugine-micah">Eugine Micah</a> &amp; <a href="/author/lucy-ogunde">Lucy Ogunde</a></span></div><p className="article-summary">{post.description}</p><img className="article-cover" src={post.image} alt={post.headline}/><ShareBar url={`${SITE.domain}/blog/${post.slug}`} title={post.headline}/><div className="article-body">{post.body.map((para,i)=><div key={i}>{i===3&&post.body.length>4&&<ArticleAd/>}{para.startsWith('## ')?<h2>{para.slice(3)}</h2>:para.startsWith('> ')?<blockquote>{para.slice(2)}</blockquote>:<p>{para}</p>}</div>)}</div><div className="modern-actions"><a href="/blog">All stories</a><a href="/book">Plan an event with us</a></div></article>
    {related.length>0&&<section className="related-stories"><h2>More from Urban News.</h2><div className="modern-grid">{related.map(r=><a className="news-card" key={r.slug} href={'/blog/'+r.slug}><img src={r.image} alt="" loading="lazy"/><p className="eyebrow">{r.section}</p><h3>{r.headline}</h3></a>)}</div></section>}
  </main>;
}
