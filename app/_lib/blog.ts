import seed from './articles.seed.json';
import { SITE } from '@/lib/site';

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

function fromSeed(): BlogPost[] {
  return (seed as any[]).map((a) => ({
    slug: a.id,
    headline: a.headline,
    datePublished: String(a.date),
    dateModified: String(a.date),
    section: a.section || 'News',
    image: a.img?.startsWith('/') ? a.img : '/' + (a.img || 'assets/poster.png'),
    description: a.dek || '',
    body: a.body || [],
  }));
}

// DB-backed posts (admin-editable), seed fallback so the site never breaks.
export async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const { q, db } = await import('@/lib/server/db');
    if (db()) {
      // AND date <= CURRENT_DATE: a future-dated post is "scheduled", not yet
      // live. Without this, setting published=true made a post public the
      // instant it was saved regardless of its date field.
      const rows = await q(`SELECT slug, headline, section, image, dek, body, date FROM posts WHERE published AND date <= CURRENT_DATE ORDER BY date DESC`);
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
  } catch { /* fall back to seed */ }
  return fromSeed();
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
    publisher: { '@id': `${SITE.domain}/news#pub` },
  };
}
