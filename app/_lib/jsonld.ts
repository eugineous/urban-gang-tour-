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
export const NEWSORG = data.newsorg;    // NewsMediaOrganization             -> /blog
export const ARTICLES = data.articles;  // @graph of NewsArticle             -> /blog

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

// Live rebuild of the /events JSON-LD @graph straight from the current,
// publicly ticketed tour_events rows. School events are intentionally left
// out: Google excludes spectator events primarily involving minors on school
// premises from its public Event experience. Each ticketed entry points to its
// crawlable event leaf URL, not to the generic schedule page.
//
// An unavailable database returns no Event markup rather than a stale static
// event list. Accuracy is more useful than a rich-result hint that could sell
// an expired, moved or unpublished show.
export async function eventsFromDb(): Promise<unknown | null> {
  try {
    const { q, db } = await import('@/lib/server/db');
    if (!db()) return null;
    // event_date::text — plain 'YYYY-MM-DD' string, never a local-midnight
    // Date object (see lib/server/db.ts's note on pg's DATE parser).
    const rows = await q<any>(
      `SELECT id, name, event_date::text AS event_date, event_time, venue, city, image, description, tiers
       FROM tour_events
       WHERE kind='ticketed' AND status='published' AND event_date >= CURRENT_DATE
       ORDER BY priority DESC, event_date ASC`
    );
    if (!rows.length) return null;
    const graph = rows.map((r: any) => {
      const dateStr = String(r.event_date).slice(0, 10);
      const desc = String(r.description || '').replace(/—/g, '-');
      const tiers: { name: string; price: number }[] = typeof r.tiers === 'string' ? JSON.parse(r.tiers) : r.tiers || [];
      const eventUrl = `${SITE.domain}/events/${encodeURIComponent(r.id)}`;
      return {
        '@type': 'Event',
        '@id': eventUrl,
        url: eventUrl,
        name: r.name,
        // Never invent a midnight start time when the operator has not
        // confirmed one. A date-only event is valid for an all-day/TBA-time
        // listing and remains truthful until the schedule is set.
        startDate: /^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(String(r.event_time || '').trim())
          ? `${dateStr}T${timeTo24h(r.event_time)}+03:00`
          : dateStr,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: { '@type': 'Place', name: r.venue || '', address: { '@type': 'PostalAddress', addressLocality: r.city || '', addressCountry: 'KE' } },
        image: r.image ? `${SITE.domain}${r.image}` : undefined,
        organizer: { '@id': `${SITE.domain}/#org` },
        performer: PERFORMER,
        description: desc || r.name,
        offers: tiers.map((t) => ({
          '@type': 'Offer', name: t.name, price: String(Math.round(Number(t.price) || 0)),
          priceCurrency: 'KES', availability: 'https://schema.org/InStock', url: eventUrl,
        })),
      };
    });
    return { '@context': 'https://schema.org', '@graph': graph };
  } catch {
    return null;
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
    case '/blog':
      out.push(NEWSORG, ARTICLES); break;
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
