import data from './jsonld.data.json';
import { SITE, routeByPath } from '@/lib/site';
import { INDEXABLE_EVENT_STATUSES, eventSchemaStatus } from '@/lib/server/event-lifecycle';
import { resolveManyEventTruths } from '@/lib/server/event-truth';
import {partnerEventSchema} from '@/lib/partner-event-schema';
import {discoveryImageUrl, PRESENTER_DISCOVERY_IMAGES} from './seo';

// v25's structured data, split onto the pages it belongs to.
// Organization + WebSite are site-wide (rendered in the root layout);
// the rest are attached per-route below.
export const ORG = data.org;
export const WEBSITE = data.website;
export const EVENTS = data.events;      // @graph of Event / EducationEvent  -> /events
export const PEOPLE = {
  ...data.people,
  '@graph': data.people['@graph'].filter(person => ['Eugine Micah', 'Lucy Ogunde'].includes(person.name)),
};
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
    const { q, hasDb } = await import('@/lib/server/db');
    if (!hasDb()) return null;
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

/** Preserve a confirmed day when a start time is absent or malformed. */
export function eventDiscoveryDate(raw: unknown, time: unknown = ''): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const day = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return undefined;
  const date = new Date(day + 'T12:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) return undefined;
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(typeof time === 'string' ? time.trim() : '');
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12 || Number(m[2]) > 59) return day;
  const hour = Number(m[1]) % 12 + (/pm/i.test(m[3]) ? 12 : 0);
  return `${day}T${String(hour).padStart(2, '0')}:${m[2]}:00+03:00`;
}

type DiscoveryEventRow = Parameters<typeof partnerEventSchema>[0] & {kind: string};

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
    const { q, hasDb } = await import('@/lib/server/db');
    if (!hasDb()) return null;
    // event_date::text — plain 'YYYY-MM-DD' string, never a local-midnight
    // Date object (see lib/server/db.ts's note on pg's DATE parser).
    // Statuses come from the lifecycle (lib/server/event-lifecycle.ts). This
    // emits only indexable public discovery inventory, so the JSON-LD graph
    // never points crawlers to rows the detail route intentionally hides.
    // Draft, pending_review, cancelled, completed and archived rows are never
    // queried here.
    const rows = await q<DiscoveryEventRow>(
      `SELECT slug, kind, to_jsonb(tour_events)->'partner_details' AS partner_details, name, event_date::text AS event_date, previous_start_at::text AS previous_start_at,
              event_time, venue, city, image, description, tiers, status
       FROM tour_events
       WHERE kind IN ('ticketed','partner')
         AND status = ANY($1)
         AND slug != ''
         AND (event_date >= CURRENT_DATE OR status IN ('postponed','rescheduled'))
       ORDER BY priority DESC, event_date ASC`,
      [[...INDEXABLE_EVENT_STATUSES]],
    );
    if (!rows.length) return null;
    const truths = await resolveManyEventTruths(rows.filter(row=>row.kind!=='partner').map((row: { slug: string }) => row.slug));
    const truthBySlug = new Map(truths.map((truth) => [truth.slug, truth]));
    const graph = rows.flatMap<Record<string,unknown>>((r) => {
      if(r.kind==='partner'){
        const schema=partnerEventSchema(r);
        if(!schema)return [];
        return [Object.fromEntries(Object.entries(schema).filter(([key]) => key !== '@context'))];
      }
      const startDate = eventDiscoveryDate(r.event_date, r.event_time);
      if (!startDate || !String(r.venue || '').trim()) return [];
      const truth = truthBySlug.get(r.slug);
      // Availability controls Offer markup, not whether confirmed public event
      // information can be discovered. A failed inventory read must not invent
      // stock, but need not erase the event's name, artwork, date and venue.
      const dateStr = String(r.event_date).slice(0, 10);
      const desc = String(r.description || '').replace(/—/g, '-');
      const eventUrl = `${SITE.domain}/events/${encodeURIComponent(r.slug)}`;
      // No offers for an event that cannot be bought. Advertising InStock on a
      // cancelled or paused event is exactly the stale-truth failure this is
      // meant to prevent — the offer URL must land on a page where the public
      // can actually buy that event's tickets (Google's requirement), or it
      // must not be emitted.
      const status = String(r.status || 'published');
      const buyable = truth?.isSellable === true;
      const soldOut = truth?.isSoldOut === true;
      const prev = eventDiscoveryDate(r.previous_start_at);
      return [{
        '@type': 'Event',
        '@id': eventUrl + '#event',
        url: eventUrl,
        name: r.name,
        // Never invent a midnight start time when the operator has not
        // confirmed one. A date-only event is valid for an all-day/TBA-time
        // listing and remains truthful until the schedule is set.
        startDate,
        // Google: keep the original identifying information when an event is
        // rescheduled — previousStartDate carries the old date rather than the
        // record being deleted or silently overwritten.
        previousStartDate:
          status === 'rescheduled' && prev && prev !== dateStr ? prev : undefined,
        eventStatus: eventSchemaStatus(status),
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: { '@type': 'Place', name: r.venue || '', address: { '@type': 'PostalAddress', addressLocality: r.city || '', addressCountry: 'KE' } },
        image: discoveryImageUrl(r.image),
        organizer: { '@id': `${SITE.domain}/#org` },
        // Managed ticket inventory does not prove either presenter performs
        // at this particular event. Credits belong to its confirmed record.
        description: desc || r.name,
        offers: truth && (buyable || soldOut)
          ? truth.tiers.filter((tier) => soldOut || tier.sellable).map((tier) => ({
              '@type': 'Offer',
              name: tier.name,
              price: String(tier.price),
              priceCurrency: 'KES',
              availability: soldOut
                ? 'https://schema.org/SoldOut'
                : 'https://schema.org/InStock',
              url: eventUrl,
            })) : undefined,
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
    case '/author/eugine-micah':
    case '/author/lucy-ogunde': {
      const lucy = path.endsWith('lucy-ogunde');
      const url = SITE.domain + path;
      out.push({
        '@context': 'https://schema.org', '@type': 'ProfilePage', '@id': url + '#profile',
        url, name: lucy ? 'Lucy Ogunde' : 'Eugine Micah',
        description: routeByPath(path)?.description,
        isPartOf: { '@id': SITE.domain + '/#website' },
        mainEntity: {
          '@type': 'Person', '@id': SITE.domain + '/#member-' + (lucy ? 'lucy' : 'eugine'),
          name: lucy ? 'Lucy Ogunde' : 'Eugine Micah', url,
          image: discoveryImageUrl(PRESENTER_DISCOVERY_IMAGES[path]),
          jobTitle: lucy ? ['TV presenter', 'MC', 'Event host'] : ['TV presenter', 'Journalist', 'MC', 'Event host', 'Creative producer'],
          worksFor: { '@id': SITE.domain + '/#org' },
        },
      });
      break;
    }
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
