import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBlogPosts, getBlogPost, articleJsonLd, type BlogPost as BlogPostData } from '@/app/_lib/blog';
import { JsonLd } from '@/app/_components/JsonLd';
import { ShareBar } from '@/app/_components/ShareBar';
import { ArticleAd } from '@/app/_components/Ads';
import { SITE } from '@/lib/site';
import {publicImageUrl} from '@/lib/public-image-url';
import PartnerEventPortfolio from '@/app/_components/PartnerEventPortfolio';
import ArticleText from '@/app/_components/ArticleText';
import {URBAN_NEWS_AUTHOR, URBAN_NEWS_AUTHOR_URL, articleSections, readingMinutes} from '@/lib/blog-editorial-format';
import styles from './editorial.module.css';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  return (await getBlogPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  // Metadata also fails closed. The outer Worker enforces the real HTTP 404
  // before Next's root loading boundary can begin a response stream.
  if (!post) notFound();
  const url = `${SITE.domain}/blog/${post.slug}`;
  const img = publicImageUrl(post.ogImage||post.image);
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
  const sections = articleSections(post.body);
  const anchorByIndex = new Map(sections.map(section => [section.index, section.id]));
  const publishedDate = new Intl.DateTimeFormat('en-KE', {day:'numeric', month:'long', year:'numeric', timeZone:'Africa/Nairobi'}).format(new Date(post.datePublished));
  const updated = Date.parse(post.dateModified) - Date.parse(post.datePublished) > 24 * 60 * 60 * 1000;
  const modifiedDate = updated ? new Intl.DateTimeFormat('en-KE', {day:'numeric', month:'short', year:'numeric', timeZone:'Africa/Nairobi'}).format(new Date(post.dateModified)) : null;

  return <main className="news-article-page wrap">
    <JsonLd data={articleJsonLd(post)}/><JsonLd data={{'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:SITE.domain+'/'},{'@type':'ListItem',position:2,name:'Urban News',item:SITE.domain+'/blog'},{'@type':'ListItem',position:3,name:post.headline,item:SITE.domain+'/blog/'+post.slug}]}}/>
    <nav className="detail-breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/blog">Urban News</a><span aria-hidden="true">/</span><span aria-current="page">{post.headline}</span></nav>
    <article className="news-article">
      <p className="eyebrow">{post.section}</p><h1>{post.headline}</h1>
      {post.subtitle&&<p className={styles.deck}>{post.subtitle}</p>}
      <div className={styles.meta}>
        <span>By <a href={URBAN_NEWS_AUTHOR_URL}><strong>{URBAN_NEWS_AUTHOR}</strong></a></span>
        <span aria-hidden="true">·</span>
        <time dateTime={post.datePublished}>{publishedDate}</time>
        <span aria-hidden="true">·</span>
        <span>{readingMinutes(post.body)} min read</span>
        {modifiedDate&&<><span aria-hidden="true">·</span><span>Updated <time dateTime={post.dateModified}>{modifiedDate}</time></span></>}
      </div>
      <img className="article-cover" src={post.image} alt={post.imageAlt||post.headline}/>
      {post.imageCaption&&<p className="article-caption">{post.imageCaption}</p>}<ShareBar url={`${SITE.domain}/blog/${post.slug}`} title={post.headline}/>
      {sections.length>=3&&<nav className={styles.contents} aria-label="In this article">
        <h2>In this article</h2>
        <ol>{sections.map(section=><li key={section.id}><a href={'#'+section.id}>{section.label}</a></li>)}</ol>
      </nav>}
      <div className="article-body">{post.body.map((para,i)=><div key={i}>{i===3&&post.body.length>4&&<ArticleAd/>}<ArticleText paragraph={para} headingId={anchorByIndex.get(i)}/></div>)}</div>
      {post.disclosure&&<p className="article-disclosure">{post.disclosure}</p>}<div className="modern-actions"><a href="/blog">All stories</a><a href="/book">Plan an event with us</a></div>
    </article>
    <PartnerEventPortfolio newsSlug={post.slug}/>
    {related.length>0&&<section className="related-stories"><h2>More from Urban News.</h2><div className="modern-grid">{related.map(r=><a className="news-card" key={r.slug} href={'/blog/'+r.slug}><img src={r.image} alt="" loading="lazy"/><p className="eyebrow">{r.section}</p><h3>{r.headline}</h3></a>)}</div></section>}
  </main>;
}
