import data from './jsonld.data.json';
import { SITE, routeByPath } from '@/lib/site';

// v25's structured data, split onto the pages it belongs to.
// Organization + WebSite are site-wide (rendered in the root layout);
// the rest are attached per-route below.
export const ORG = data.org;
export const WEBSITE = data.website;
export const EVENTS = data.events;      // @graph of Event / EducationEvent  -> /events
export const PEOPLE = data.people;      // @graph of Person (crew)           -> /the-gang
export const PRODUCTS = data.products;  // ItemList of Product               -> /shop
export const NEWSORG = data.newsorg;    // NewsMediaOrganization             -> /urban-news
export const ARTICLES = data.articles;  // @graph of NewsArticle             -> /urban-news, /blog

// PRODUCTS enriched with real, moderated review data. Products with approved
// reviews get aggregateRating + up to 3 recent review objects; products with
// none get no rating fields at all (absent is fine for Google, fabricated is
// not). Any DB problem falls back to the plain static block.
export async function productsWithReviews(): Promise<unknown> {
  try {
    const { q, db } = await import('@/lib/server/db');
    const { PRICES } = await import('@/lib/server/catalog');
    if (!db()) return PRODUCTS;
    const rows = await q<{ product_id: string; author: string; rating: number; body: string; created_at: string }>(
      `SELECT product_id, author, rating, body, created_at FROM product_reviews
       WHERE approved ORDER BY created_at DESC`
    );
    if (!rows.length) return PRODUCTS;
    const byName = new Map<string, typeof rows>();
    for (const r of rows) {
      const name = PRICES[r.product_id]?.name;
      if (!name) continue;
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name)!.push(r);
    }
    const block = JSON.parse(JSON.stringify(PRODUCTS));
    for (const item of block.itemListElement || []) {
      const revs = byName.get(item.name);
      if (!revs?.length) continue;
      item.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: Math.round((revs.reduce((s, r) => s + r.rating, 0) / revs.length) * 10) / 10,
        reviewCount: revs.length,
        bestRating: 5,
        worstRating: 1,
      };
      item.review = revs.slice(0, 3).map((r) => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: r.author },
        reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
        reviewBody: r.body,
        datePublished: String(r.created_at).slice(0, 10),
      }));
    }
    return block;
  } catch {
    return PRODUCTS;
  }
}

// Which extra JSON-LD blocks each route carries (beyond the site-wide Org/WebSite).
export function structuredDataForPath(path: string): unknown[] {
  const out: unknown[] = [];
  switch (path) {
    case '/events':
      out.push(EVENTS); break;
    case '/shop':
      out.push(PRODUCTS); break;
    case '/the-gang':
      out.push(PEOPLE); break;
    case '/urban-news':
      out.push(NEWSORG, ARTICLES); break;
    case '/blog':
      out.push(ARTICLES); break;
  }
  out.push(breadcrumbFor(path));
  return out.filter(Boolean);
}

// BreadcrumbList for hierarchy — Home > This Page.
export function breadcrumbFor(path: string) {
  const r = routeByPath(path);
  const items: { '@type': 'ListItem'; position: number; name: string; item: string }[] = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.domain + '/' },
  ];
  if (r && r.path !== '/') {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: (r.nav || r.title.split('—')[0].split('|')[0].trim()),
      item: SITE.domain + r.path,
    });
  }
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}
