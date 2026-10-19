import { SITE } from '@/lib/site';
import {publicImageUrl} from '@/lib/public-image-url';
import { cached } from '@/lib/server/microcache';
import { q, hasDb } from '@/lib/server/db';
import { NEWS_PUBLISHER_ID } from './jsonld';

export type BlogPost = {
  slug: string;
  headline: string;
  datePublished: string;
  dateModified: string;
  section: string;
  image: string;
  description: string;
  body: string[];
};

// DB-backed posts, edited and published through the Control Room. A missing
// database or an empty newsroom is an honest empty feed, never a prewritten
// article presented as a current report.
export async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    if (hasDb()) {
      // Match the public feed and the editor's Nairobi publication day, not
      // the database session's timezone. Stable slug order for date ties.
      const rows = await cached('blog-published-posts', 60_000, () => q(`SELECT slug, headline, section, image, dek, body, date FROM posts WHERE published AND date <= (now() AT TIME ZONE 'Africa/Nairobi')::date ORDER BY date DESC, slug ASC`));
      if (rows.length) {
        // pg returns DATE columns as JS Date objects — String(date).slice(0,10)
        // yields "Thu Jul 09" (not ISO), which breaks date maths downstream.
        const iso = (d: any) => (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10);
        return rows.map((r: any) => ({
          slug: r.slug,
          headline: r.headline,
          datePublished: iso(r.date),
          dateModified: iso(r.date),
          section: r.section || 'News',
          image: r.image || '/assets/poster.png',
          description: r.dek || '',
          body: Array.isArray(r.body) ? r.body : [],
        }));
      }
    }
  } catch { /* an unavailable newsroom has no public posts */ }
  return [];
}

export async function getBlogPost(slug: string): Promise<BlogPost | undefined> {
  return (await getBlogPosts()).find((p) => p.slug === slug);
}

export function articleJsonLd(post: BlogPost) {
  const url = `${SITE.domain}/blog/${post.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.headline,
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    articleSection: post.section,
    image: [publicImageUrl(post.image)],
    description: post.description,
    articleBody: post.body.join('\n\n'),
    mainEntityOfPage: url,
    url,
    // The current Content desk has no verified per-article author field.
    // Do not turn the founders or an article's subject into its author.
    author: { '@type': 'Organization', name: 'Urban Gang Tour Newsroom', url: `${SITE.domain}/blog` },
    publisher: { '@id': NEWS_PUBLISHER_ID },
  };
}
