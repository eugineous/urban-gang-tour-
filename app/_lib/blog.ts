import { ARTICLES } from './jsonld';
import { SITE } from '@/lib/site';

export type BlogPost = {
  slug: string;
  headline: string;
  datePublished: string;
  dateModified: string;
  section: string;
  image: string;
  description: string;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 70);
}

// Derive blog posts from v25's NewsArticle @graph. Prefer the existing #anchor
// in mainEntityOfPage as the slug so links stay stable.
export function getBlogPosts(): BlogPost[] {
  const graph: any[] = (ARTICLES as any)?.['@graph'] ?? [];
  return graph.map((a) => {
    const anchor = typeof a.mainEntityOfPage === 'string' && a.mainEntityOfPage.includes('#')
      ? a.mainEntityOfPage.split('#')[1]
      : null;
    const img = Array.isArray(a.image) ? a.image[0] : a.image;
    return {
      slug: anchor ? slugify(anchor) : slugify(a.headline),
      headline: a.headline,
      datePublished: a.datePublished,
      dateModified: a.dateModified || a.datePublished,
      section: a.articleSection || 'News',
      image: img || SITE.defaultOg,
      description: a.description || '',
    };
  });
}

export function getBlogPost(slug: string): BlogPost | undefined {
  return getBlogPosts().find((p) => p.slug === slug);
}

// NewsArticle JSON-LD for a single post, with a self canonical URL.
export function articleJsonLd(post: BlogPost) {
  const url = `${SITE.domain}/blog/${post.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.headline,
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    articleSection: post.section,
    image: [post.image],
    description: post.description,
    mainEntityOfPage: url,
    url,
    author: { '@id': `${SITE.domain}/news#pub` },
    publisher: { '@id': `${SITE.domain}/news#pub` },
  };
}
