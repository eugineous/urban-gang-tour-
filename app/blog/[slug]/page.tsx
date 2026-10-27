import {MessageText} from '@/ui/i18n/MessageText';
import {discoveryMessages} from '@/ui/i18n/catalogues/discovery';
import {OriginalContent} from '@/ui/i18n/OriginalContent';
import {PublicationDate,DiscoveryRegion} from '@/ui/components/PublicationDate';
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

  return <section className="news-article-page wrap">
    <JsonLd data={articleJsonLd(post)}/><JsonLd data={{'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:SITE.domain+'/'},{'@type':'ListItem',position:2,name:'Urban News',item:SITE.domain+'/blog'},{'@type':'ListItem',position:3,name:post.headline,item:SITE.domain+'/blog/'+post.slug}]}}/>
    <DiscoveryRegion as="nav" className="detail-breadcrumbs" message="breadcrumb"><a href="/"><MessageText catalogue={discoveryMessages} message="home"/></a><span aria-hidden="true">/</span><a href="/blog"><MessageText catalogue={discoveryMessages} message="news.title"/></a><span aria-hidden="true">/</span><span aria-current="page" lang="en-KE">{post.headline}</span></DiscoveryRegion>
    <article className="news-article">
      <OriginalContent disclose><p className="eyebrow">{post.section}</p><h1>{post.headline}</h1></OriginalContent>
      <div className="article-byline"><PublicationDate value={post.datePublished} long/><span><MessageText catalogue={discoveryMessages} message="by"/> <a href="/blog" lang="en-KE">{post.author||'Urban Gang Tour Newsroom'}</a></span></div>
      <p className="article-summary" lang="en-KE">{post.description}</p><img lang="en-KE" className="article-cover" src={post.image} alt={post.imageAlt||post.headline} data-editorial-illustration={post.imageIllustration||undefined}/>
      {post.imageCaption&&<p className="article-caption" lang="en-KE">{post.imageCaption}</p>}<ShareBar url={`${SITE.domain}/blog/${post.slug}`} title={post.headline}/>
      <div className="article-body">{post.body.map((para,i)=><div key={i}>{i===3&&post.body.length>4&&<ArticleAd/>}<ArticleText paragraph={para}/></div>)}</div>
      {post.disclosure&&<p className="article-disclosure" lang="en-KE">{post.disclosure}</p>}<div className="modern-actions"><a href="/blog"><MessageText catalogue={discoveryMessages} message="news.all"/></a><a href="/book"><MessageText catalogue={discoveryMessages} message="planEvent"/></a></div>
    </article>
    <PartnerEventPortfolio newsSlug={post.slug}/>
    {related.length>0&&<section className="related-stories"><h2><MessageText catalogue={discoveryMessages} message="news.moreUrban"/></h2><div className="modern-grid">{related.map(r=><a className="news-card" key={r.slug} href={'/blog/'+r.slug}><img src={r.image} alt="" loading="lazy"/><p className="eyebrow" lang="en-KE">{r.section}</p><h3 lang="en-KE">{r.headline}</h3></a>)}</div></section>}
  </section>;
}
