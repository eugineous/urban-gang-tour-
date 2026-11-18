import { SITE } from '@/lib/site';
import {publicImageUrl} from '@/lib/public-image-url';
import { cached } from '@/lib/server/microcache';
import { q, hasDb } from '@/lib/server/db';
import { NEWS_PUBLISHER_ID } from './jsonld';
import {getPublicPostSelect,getPublicPostSummarySelect} from '@/lib/server/editorial-publication';
import {urbanNewsEnabled} from '@/lib/server/urban-news-mode';
import type {PublicNewsSource,NewsVerification} from '@/lib/shared/urban-news';

export type BlogPost = {
  slug: string;
  headline: string;
  datePublished: string;
  dateModified: string;
  section: string;
  image: string;
  description: string;
  body: string[];
  author?:string;
  schemaType?:'BlogPosting'|'NewsArticle';
  imageAlt?:string;
  imageCaption?:string;
  imageIllustration?:boolean;
  ogImage?:string;
  disclosure?:string;
  newsSources?:PublicNewsSource[];
  newsVerification?:NewsVerification;
  newsCorrection?:string;
  newsRevision?:number;
  newsCountry?:string;
};

export type BlogPostSummary = Pick<BlogPost,'slug'|'headline'|'datePublished'|'section'|'image'|'description'|'imageAlt'|'newsCountry'|'newsVerification'>;
type BlogPostSummaryRow = {
  slug:string;headline:string;date:string|Date;publication_time?:string|null;
  section?:string|null;image?:string|null;dek?:string|null;public_asset?:{alt?:string}|null;
  public_country?:string|null;public_verification?:NewsVerification|null;
};

// PostgreSQL DATE values may arrive as Dates; preserve the existing ISO day.
const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10);
function postSummary(r: BlogPostSummaryRow): BlogPostSummary {
  return {
    slug:r.slug,headline:r.headline,
    datePublished:r.publication_time ? new Date(r.publication_time).toISOString() : iso(r.date),
    section:r.section || 'News',image:r.image || '/assets/poster.png',description:r.dek || '',
    imageAlt:r.public_asset?.alt,
    ...(r.public_country?{newsCountry:r.public_country}:{}),...(r.public_verification?{newsVerification:r.public_verification}:{}),
  };
}

/** Public card fields only; eligibility, freshness and failure policy match full reads. */
export async function getBlogPostSummaries(throwOnError=false): Promise<BlogPostSummary[]> {
  try {
    if (hasDb()) {
      const key='blog-published-post-summaries'+(urbanNewsEnabled()?':urban-news':'');
      const sql=getPublicPostSummarySelect();
      const rows = await cached(key, 1_000, () => q<BlogPostSummaryRow>(sql), false);
      return rows.map(postSummary);
    }
  } catch(error) { if(throwOnError)throw error; }
  return [];
}

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
      const key='blog-published-posts'+(urbanNewsEnabled()?':urban-news':'');
      const sql=getPublicPostSelect();
      const rows = await cached(key, 1_000, () => q(sql), false);
      if (rows.length) {
        return rows.map((r: any) => ({
          ...postSummary(r),
          dateModified: r.modification_time||r.updated_at ? new Date(Math.max(new Date(r.modification_time||r.updated_at).getTime(),r.publication_time?new Date(r.publication_time).getTime():0)).toISOString() : iso(r.date),
          body: Array.isArray(r.body) ? r.body : [],
          author:r.author||undefined,schemaType:r.schema_type||'NewsArticle',
          imageCaption:r.public_asset?.caption,imageIllustration:r.public_asset?.illustration===true,ogImage:r.public_asset?.og,disclosure:r.disclosure||undefined,
          ...(r.public_revision?{newsSources:Array.isArray(r.public_sources)?r.public_sources:[],newsVerification:r.public_verification,newsCorrection:r.public_correction||undefined,newsRevision:Number(r.public_revision)}:{}),
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
    ...(post.newsRevision&&post.image==='/assets/pwa-512.png'?{}:{image:[publicImageUrl(post.image)]}),
    description: post.description,
    articleBody: post.body.join('\n\n'),
    mainEntityOfPage: url,
    url,
    // The current Content desk has no verified per-article author field.
    // Do not turn the founders or an article's subject into its author.
    author: { '@type': 'Organization', name: post.author||'Urban Gang Tour Newsroom', url: `${SITE.domain}/blog` },
    publisher: { '@id': NEWS_PUBLISHER_ID },
    ...(post.newsSources?.length?{citation:post.newsSources.map(source=>({'@type':'CreativeWork',url:source.url,name:source.title,publisher:{'@type':'Organization',name:source.publisher},...(source.publishedAt?{datePublished:source.publishedAt}:{})}))}:{}),
  };
}
