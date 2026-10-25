import { SITE } from '@/lib/site';
import {publicImageUrl} from '@/lib/public-image-url';
import { cached } from '@/lib/server/microcache';
import { q, hasDb } from '@/lib/server/db';
import { NEWS_PUBLISHER_ID } from './jsonld';
import {PUBLIC_POST_SELECT} from '@/lib/server/editorial-publication';
import {URBAN_NEWS_AUTHOR, URBAN_NEWS_AUTHOR_URL, fallbackDeck} from '@/lib/blog-editorial-format';

export type BlogPost = {
  slug: string;
  headline: string;
  datePublished: string;
  dateModified: string;
  section: string;
  image: string;
  description: string;
  subtitle: string;
  body: string[];
  author?:string;
  schemaType?:'BlogPosting'|'NewsArticle';
  imageAlt?:string;
  imageCaption?:string;
  ogImage?:string;
  disclosure?:string;
};

// DB-backed posts, edited and published through the Control Room. A missing
// database or an empty newsroom is an honest empty feed, never a prewritten
// article presented as a current report.
export async function getBlogPosts(throwOnError=false): Promise<BlogPost[]> {
  try {
    if (hasDb()) {
      // Match the public feed and the editor's Nairobi publication day, not
      // the database session's timezone. Stable slug order for date ties.
      // Coalesce bursts for one second, never serve stale approved/retracted
      // snapshots during an outage. Public HTML/XML have no outer story cache.
      const rows = await cached('blog-published-posts', 1_000, () => q(PUBLIC_POST_SELECT), false);
      if (rows.length) {
        // pg returns DATE columns as JS Date objects — String(date).slice(0,10)
        // yields "Thu Jul 09" (not ISO), which breaks date maths downstream.
        const iso = (d: any) => (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10);
        return rows.map((r: any) => ({
          slug: r.slug,
          headline: r.headline,
          datePublished: r.publication_time ? new Date(r.publication_time).toISOString() : iso(r.date),
          dateModified: r.updated_at ? new Date(Math.max(new Date(r.updated_at).getTime(),r.publication_time?new Date(r.publication_time).getTime():0)).toISOString() : iso(r.date),
          section: r.section || 'News',
          image: r.image || '/assets/poster.png',
          description: fallbackDeck(r.dek, Array.isArray(r.body) ? r.body : []),
          subtitle: fallbackDeck(r.subtitle || r.dek, Array.isArray(r.body) ? r.body : []),
          body: Array.isArray(r.body) ? r.body : [],
          author:URBAN_NEWS_AUTHOR,schemaType:r.schema_type||'NewsArticle',imageAlt:r.public_asset?.alt,
          imageCaption:r.public_asset?.caption,ogImage:r.public_asset?.og,disclosure:r.disclosure||undefined,
        }));
      }
    }
  } catch(error) { if(throwOnError)throw error; /* no stale approvals on failure */ }
  return [];
}

export async function getBlogPost(slug: string): Promise<BlogPost | undefined> {
  return (await getBlogPosts()).find((p) => p.slug === slug);
}

export function articleJsonLd(post: BlogPost) {
  const url = `${SITE.domain}/blog/${post.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': post.schemaType||'NewsArticle',
    headline: post.headline,
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    articleSection: post.section,
    image: [publicImageUrl(post.image)],
    description: post.description,
    articleBody: post.body.join('\n\n'),
    mainEntityOfPage: url,
    url,
    author: { '@type': 'Person', name: URBAN_NEWS_AUTHOR, url: `${SITE.domain}${URBAN_NEWS_AUTHOR_URL}` },
    publisher: { '@id': NEWS_PUBLISHER_ID },
  };
}
