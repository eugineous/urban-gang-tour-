import { SITE } from '@/lib/site';
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
      // AND date <= CURRENT_DATE: a future-dated post is "scheduled", not yet
      // live. Without this, setting published=true made a post public the
      // instant it was saved regardless of its date field.
      const rows = await cached('blog-published-posts', 60_000, () => q(`SELECT slug, headline, section, image, dek, body, date FROM posts WHERE published AND date <= CURRENT_DATE ORDER BY date DESC`));
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
    image: [SITE.domain + post.image],
    description: post.description,
    articleBody: post.body.join('\n\n'),
    mainEntityOfPage: url,
    url,
    author: [
      { '@type': 'Person', name: 'Eugine Micah', url: `${SITE.domain}/author/eugine-micah` },
      { '@type': 'Person', name: 'Lucy Ogunde', url: `${SITE.domain}/author/lucy-ogunde` },
    ],
    publisher: { '@id': NEWS_PUBLISHER_ID },
  };
}
