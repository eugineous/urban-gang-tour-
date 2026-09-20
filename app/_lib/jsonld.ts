import data from './jsonld.data.json';
import { SITE, routeByPath } from '@/lib/site';

// v25's structured data, split onto the pages it belongs to.
// Organization + WebSite are site-wide (rendered in the root layout);
// the rest are attached per-route below.
export const ORG = data.org;
export const WEBSITE = data.website;
export const EVENTS = data.events;      // @graph of Event / EducationEvent  -> /events
export const PEOPLE = data.people;      // @graph of Person (crew)           -> /the-gang
export const NEWSORG = data.newsorg;    // NewsMediaOrganization             -> /blog
export const ARTICLES = data.articles;  // @graph of NewsArticle             -> /blog

// The shop index is a catalogue, not a product-detail page. Google recommends
// Product markup on a URL focused on one product, so this only exposes live
// product leaf URLs. Each /shop/[id] page supplies the purchase markup.
// An unavailable database produces no catalogue markup rather than stale
// prices or retired products.
export async function shopCatalogList(): Promise<unknown | null> {
  try {
    const { q, db } = await import('@/lib/server/db');
    if (!db()) return null;
    const rows = await q<{ id: string; name: string }>(
      `SELECT id, name FROM products WHERE active ORDER BY id`
    );
    if (!rows.length) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Urban Gang Merch',
      itemListElement: rows.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: product.name,
        url: `${SITE.domain}/shop/${encodeURIComponent(product.id)}`,
      })),
    };
  } catch {
    return null;
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
