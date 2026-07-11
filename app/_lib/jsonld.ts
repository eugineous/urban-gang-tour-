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
    const { getProducts } = await import('@/lib/server/catalog');
    if (!db()) return PRODUCTS;
    const [rows, catalogPrices] = await Promise.all([
      q<{ product_id: string; author: string; rating: number; body: string; created_at: string }>(
        `SELECT product_id, author, rating, body, created_at FROM product_reviews
         WHERE approved ORDER BY created_at DESC`
      ),
      getProducts(),
    ]);
    if (!rows.length) return PRODUCTS;
    const byName = new Map<string, typeof rows>();
    for (const r of rows) {
      const name = catalogPrices[r.product_id]?.name;
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

const PERFORMER = [
  { '@type': 'PerformingGroup', name: 'Urban Gang Tour' },
  { '@type': 'Person', name: 'Eugine Micah' },
  { '@type': 'Person', name: 'Lucy Ogunde' },
];

function timeTo24h(t: string): string {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(t || '').trim());
  if (!m) return '00:00:00';
  let h = Number(m[1]) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return `${String(h).padStart(2, '0')}:${m[2]}:00`;
}

// Live rebuild of the /events JSON-LD @graph straight from tour_events
// (kind='ticketed' | 'school', status='published') — the same admin-edited
// rows the public site and checkout read, so Google always sees the current
// name/date/venue/price, never a frozen copy. Rows with no confirmed
// event_date (TBA school stops) are omitted rather than emitting an invalid
// startDate. Any DB problem (including DATABASE_URL not configured) falls
// back to the static app/_lib/jsonld.data.json snapshot — SEO must never
// break because of a transient DB issue.
export async function eventsFromDb(): Promise<unknown> {
  try {
    const { q, db } = await import('@/lib/server/db');
    if (!db()) return EVENTS;
    // event_date::text — plain 'YYYY-MM-DD' string, never a local-midnight
    // Date object (see lib/server/db.ts's note on pg's DATE parser).
    const rows = await q<any>(
      `SELECT id, kind, name, event_date::text AS event_date, event_time, venue, city, accent, image, description, tiers
       FROM tour_events WHERE kind IN ('ticketed','school') AND status='published' AND event_date IS NOT NULL
       ORDER BY priority DESC, event_date ASC`
    );
    if (!rows.length) return EVENTS;
    const graph = rows.map((r: any) => {
      const dateStr = String(r.event_date).slice(0, 10);
      const desc = String(r.description || '').replace(/—/g, '-');
      if (r.kind === 'ticketed') {
        const tiers: { name: string; price: number }[] = typeof r.tiers === 'string' ? JSON.parse(r.tiers) : r.tiers || [];
        return {
          '@type': 'Event',
          name: r.name,
          startDate: `${dateStr}T${timeTo24h(r.event_time)}+03:00`,
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          location: { '@type': 'Place', name: r.venue || '', address: { '@type': 'PostalAddress', addressLocality: r.city || '', addressCountry: 'KE' } },
          image: r.image ? `${SITE.domain}${r.image}` : undefined,
          organizer: { '@id': `${SITE.domain}/#org` },
          performer: PERFORMER,
          description: desc || `${r.name} at ${r.venue}, ${r.city}.`,
          offers: tiers.map((t) => ({
            '@type': 'Offer', name: t.name, price: String(Math.round(Number(t.price) || 0)),
            priceCurrency: 'KES', availability: 'https://schema.org/InStock', url: `${SITE.domain}/events`,
          })),
        };
      }
      return {
        '@type': ['Event', 'EducationEvent'],
        name: `Urban Gang Tour — ${r.name}`,
        startDate: dateStr,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: { '@type': 'Place', name: r.name, address: { '@type': 'PostalAddress', addressLocality: r.venue || '', addressCountry: 'KE' } },
        image: r.image ? `${SITE.domain}${r.image}` : undefined,
        organizer: { '@id': `${SITE.domain}/#org` },
        performer: PERFORMER,
        description: desc || 'A full day of talent showcases, mentorship pods, a modelling runway, and a national Urban News broadcast.',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'KES', availability: 'https://schema.org/InStock', url: `${SITE.domain}/events` },
      };
    });
    return { '@context': 'https://schema.org', '@graph': graph };
  } catch {
    return EVENTS;
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
