import data from './jsonld.data.json';
import { SITE, routeByPath } from '@/lib/site';
import { INDEXABLE_EVENT_STATUSES, eventSchemaStatus } from '@/lib/server/event-lifecycle';
import { resolveManyEventTruths } from '@/lib/server/event-truth';

// v25's structured data, split onto the pages it belongs to.
// Organization + WebSite are site-wide (rendered in the root layout);
// the rest are attached per-route below.
export const ORG = data.org;
export const WEBSITE = data.website;
export const EVENTS = data.events;      // @graph of Event / EducationEvent  -> /events
export const PEOPLE = data.people;      // @graph of Person (crew)           -> /the-gang
// Keep both the publisher identifier and URL on the live /blog route. Article
// pages import this identifier too, so all newsroom markup resolves to one
// canonical publisher instead of the retired /news URL.
export const NEWS_PUBLISHER_ID = `${SITE.domain}/blog#publisher`;
export const NEWSORG = { ...data.newsorg, '@id': NEWS_PUBLISHER_ID, url: `${SITE.domain}/blog` };

type NewsIndexItem = {
  slug: string;
  headline: string;
  datePublished: string;
};

// An index page is a collection, not one article. Listing only the live
// Control Room-published stories avoids presenting a historical static
// snapshot as current reporting, while still giving crawlers clear links to
// the stories the page actually contains.
export function newsIndexJsonLd(posts: NewsIndexItem[]): Record<string, unknown> {
  const articles = posts.slice(0, 50);
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE.domain}/blog#collection`,
    name: 'Urban News',
    url: `${SITE.domain}/blog`,
    isPartOf: { '@id': `${SITE.domain}/#website` },
    publisher: { '@id': NEWS_PUBLISHER_ID },
    mainEntity: {
      '@type': 'ItemList',
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      numberOfItems: posts.length,
      itemListElement: articles.map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE.domain}/blog/${encodeURIComponent(post.slug)}`,
        name: post.headline,
        datePublished: post.datePublished,
      })),
    },
  };
}

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
    // Statuses come from the lifecycle (lib/server/event-lifecycle.ts). This
    // emits only indexable public discovery inventory, so the JSON-LD graph
    // never points crawlers to rows the detail route intentionally hides.
    // Draft, pending_review, cancelled, completed and archived rows are never
    // queried here.
    const rows = await q<any>(
      `SELECT slug, name, event_date::text AS event_date, previous_start_at::text AS previous_start_at,
              event_time, venue, city, image, description, tiers, status
       FROM tour_events
       WHERE kind='ticketed'
         AND status = ANY($1)
         AND slug != ''
         AND (event_date >= CURRENT_DATE OR status IN ('postponed','rescheduled'))
       ORDER BY priority DESC, event_date ASC`,
      [[...INDEXABLE_EVENT_STATUSES]],
    );
    if (!rows.length) return null;
    const truths = await resolveManyEventTruths(rows.map((row: { slug: string }) => row.slug));
    const truthBySlug = new Map(truths.map((truth) => [truth.slug, truth]));
    const graph = rows.flatMap((r: any) => {
      const truth = truthBySlug.get(r.slug);
      // A rich-result offer must be backed by current commercial truth. If
      // availability cannot be resolved, omit this event rather than assert
      // that a ticket is InStock from its lifecycle label alone.
      if (!truth) return [];
      const dateStr = String(r.event_date).slice(0, 10);
      const desc = String(r.description || '').replace(/—/g, '-');
      const eventUrl = `${SITE.domain}/events/${encodeURIComponent(r.slug)}`;
      // No offers for an event that cannot be bought. Advertising InStock on a
      // cancelled or paused event is exactly the stale-truth failure this is
      // meant to prevent — the offer URL must land on a page where the public
      // can actually buy that event's tickets (Google's requirement), or it
      // must not be emitted.
      const status = String(r.status || 'published');
      const buyable = truth.isSellable;
      const soldOut = truth.isSoldOut;
      const prev = r.previous_start_at ? String(r.previous_start_at).slice(0, 10) : null;
      const startOf = (d: string) =>
        /^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(String(r.event_time || '').trim())
          ? `${d}T${timeTo24h(r.event_time)}+03:00`
          : d;
      return [{
        '@type': 'Event',
        '@id': eventUrl,
        url: eventUrl,
        name: r.name,
        // Never invent a midnight start time when the operator has not
        // confirmed one. A date-only event is valid for an all-day/TBA-time
        // listing and remains truthful until the schedule is set.
        startDate: startOf(dateStr),
        // Google: keep the original identifying information when an event is
        // rescheduled — previousStartDate carries the old date rather than the
        // record being deleted or silently overwritten.
        previousStartDate:
          status === 'rescheduled' && prev && prev !== dateStr ? startOf(prev) : undefined,
        eventStatus: eventSchemaStatus(status),
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: { '@type': 'Place', name: r.venue || '', address: { '@type': 'PostalAddress', addressLocality: r.city || '', addressCountry: 'KE' } },
        image: r.image ? `${SITE.domain}${r.image}` : undefined,
        organizer: { '@id': `${SITE.domain}/#org` },
        performer: PERFORMER,
        description: desc || r.name,
        offers: !buyable && !soldOut
          ? undefined
          : truth.tiers.filter((tier) => soldOut || tier.sellable).map((tier) => ({
              '@type': 'Offer',
              name: tier.name,
              price: String(tier.price),
              priceCurrency: 'KES',
              availability: soldOut
                ? 'https://schema.org/SoldOut'
                : 'https://schema.org/InStock',
              url: eventUrl,
            })),
      }];
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
      out.push(NEWSORG); break;
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
