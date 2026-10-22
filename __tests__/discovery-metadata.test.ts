import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';

const state = vi.hoisted(() => ({
  q: vi.fn(), rows: [] as Record<string, unknown>[], truths: vi.fn(), truth: vi.fn(), configured: true,
}));
vi.mock('@/lib/server/db', () => ({hasDb: () => state.configured, q: state.q}));
vi.mock('@/lib/server/event-truth', () => ({resolveManyEventTruths: state.truths, resolveEventTruth: state.truth}));
vi.mock('@/app/_lib/blog', () => ({getBlogPosts: async () => []}));
vi.mock('next/navigation', () => ({usePathname: () => '/events/public-fixture', notFound: () => {throw Error('not_found');}, permanentRedirect: (url: string) => {throw Error('redirect:' + url);}}));

import {discoveryImageUrl, metadataForPath} from '@/app/_lib/seo';
import {eventDiscoveryDate, eventsFromDb, structuredDataForPath} from '@/app/_lib/jsonld';
import {GET as imageSitemap} from '@/app/image-sitemap.xml/route';
import EventPage, {generateMetadata} from '@/app/events/[slug]/page';
import {JsonLd} from '@/app/_components/JsonLd';

const origin = 'https://urbangangtour.co.ke';
const row = () => ({
  id: 'fixture', slug: 'public-fixture', kind: 'ticketed', name: 'An actual public event', status: 'published',
  event_date: '2099-11-06', event_time: '4:00 PM', venue: 'Real venue', city: 'Nairobi',
  image: 'https://images.example.test/original.jpg', description: 'Confirmed event details.', tiers: [],
  partner_details: null, previous_start_at: null, accent: '#E6218C',
});

beforeEach(() => {
  state.configured = true;
  state.rows = [row()];
  state.q.mockReset().mockImplementation(async (sql: string) => sql.includes('FROM tour_events') ? state.rows : []);
  state.truths.mockReset().mockResolvedValue([]);
  state.truth.mockReset().mockResolvedValue(null);
});

describe('public discovery metadata', () => {
  it.each([
    ['/media/admin-events/original.jpg', origin + '/media/admin-events/original.jpg'],
    ['https://images.example.test/original.jpg', 'https://images.example.test/original.jpg'],
    ['javascript:alert(1)', undefined], ['data:image/png;base64,AA==', undefined],
    ['https://private:secret@example.test/image.jpg', undefined], ['', undefined], [null, undefined],
  ])('resolves public artwork without double-prefixing or unsafe protocols: %s', (input, expected) => {
    expect(discoveryImageUrl(input)).toBe(expected);
  });

  it.each([
    ['2099-11-06', '4:00 PM', '2099-11-06T16:00:00+03:00'],
    ['2099-11-06', '12:00 AM', '2099-11-06T00:00:00+03:00'],
    ['2099-11-06', '12:00 PM', '2099-11-06T12:00:00+03:00'],
    ['2099-11-06', '', '2099-11-06'],
    ['2099-11-06', '00:00 PM', '2099-11-06'],
    ['2099-11-06', '13:78 PM', '2099-11-06'],
    ['2026-02-30', '4:00 PM', undefined],
    ['', '', undefined],
  ])('never invents an unknown or invalid event start: %s %s', (day, time, expected) => {
    expect(eventDiscoveryDate(day, time)).toBe(expected);
  });

  it('keeps public event information when availability is unknown, but emits no offer or unverified performers', async () => {
    const data = await eventsFromDb() as {'@graph': Record<string, unknown>[]};
    expect(data['@graph']).toHaveLength(1);
    expect(data['@graph'][0]).toMatchObject({
      name: 'An actual public event', startDate: '2099-11-06T16:00:00+03:00', image: 'https://images.example.test/original.jpg',
    });
    expect(data['@graph'][0].offers).toBeUndefined();
    expect(data['@graph'][0].performer).toBeUndefined();
  });

  it('advertises only commercially resolved sellable tiers, and keeps paused inventory out of offers', async () => {
    state.truths.mockResolvedValue([{slug: 'public-fixture', isSellable: true, isSoldOut: false, tiers: [
      {name: 'Available', price: 500, sellable: true}, {name: 'Not available', price: 1000, sellable: false},
    ]}]);
    let data = await eventsFromDb() as {'@graph': Record<string, unknown>[]};
    expect(data['@graph'][0].offers).toEqual([{ '@type': 'Offer', name: 'Available', price: '500', priceCurrency: 'KES', availability: 'https://schema.org/InStock', url: origin + '/events/public-fixture' }]);
    state.rows[0].status = 'sales_paused';
    state.truths.mockResolvedValue([{slug: 'public-fixture', isSellable: false, isSoldOut: false, tiers: []}]);
    data = await eventsFromDb() as {'@graph': Record<string, unknown>[]};
    expect(data['@graph'][0].offers).toBeUndefined();
  });

  it('gives an event its own canonical, original image and matching Twitter card', async () => {
    const metadata = await generateMetadata({params: Promise.resolve({slug: 'public-fixture'})});
    expect(metadata.alternates?.canonical).toBe(origin + '/events/public-fixture');
    expect(metadata.openGraph).toMatchObject({url: origin + '/events/public-fixture', images: [{url: 'https://images.example.test/original.jpg', alt: 'An actual public event'}]});
    expect(metadata.twitter).toMatchObject({card: 'summary_large_image', title: 'An actual public event | Urban Gang Tour', images: ['https://images.example.test/original.jpg']});
  });

  it('renders date-only event schema and truthful previous dates without an invented midnight', async () => {
    state.rows[0] = {...row(), status: 'rescheduled', event_time: '', previous_start_at: '2099-10-20'};
    const html = renderToStaticMarkup(await EventPage({params: Promise.resolve({slug: 'public-fixture'})}));
    expect(html).toContain('"startDate":"2099-11-06"');
    expect(html).toContain('"previousStartDate":"2099-10-20"');
    expect(html).not.toContain('T00:00:00');
    expect(html).not.toContain(origin + 'https://');
    expect(html).not.toContain('schema.org/InStock');
  });

  it('adds factual ProfilePage/Person markup and distinct owned portrait cards without Wikipedia affiliation', () => {
    for (const slug of ['eugine-micah', 'lucy-ogunde']) {
      const path = '/author/' + slug;
      const schema = structuredDataForPath(path).find(value => (value as Record<string, unknown>)['@type'] === 'ProfilePage') as {url: string; mainEntity: Record<string, unknown>};
      expect(schema.url).toBe(origin + path);
      expect(schema.mainEntity).toMatchObject({'@type': 'Person', url: origin + path});
      expect(schema.mainEntity).not.toHaveProperty('birthDate');
      expect(schema.mainEntity).not.toHaveProperty('sameAs');
      expect(schema.mainEntity.image).toMatch(/^https:\/\/urbangangtour.co.ke\/media-library\//);
      expect(metadataForPath(path).openGraph?.images).toEqual([{url: schema.mainEntity.image, alt: metadataForPath(path).title}]);
    }
  });

  it('keeps record text inside escaped JSON-LD rather than allowing script breakouts', () => {
    const html = renderToStaticMarkup(createElement(JsonLd, {data: {'@type': 'Event', name: '</script><img src=x onerror=alert(1)>&'}}));
    expect(html).toContain('\\u003c/script\\u003e');
    expect(html).not.toContain('<img');
    expect(html.match(/<script /g)).toHaveLength(1);
  });
});

describe('public image discovery', () => {
  it('links original event/poster variants, current product images and profile portraits to their canonical pages', async () => {
    state.q.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM products')) return [{id: 'tee', name: 'Original tee', image_url: '/media/tee.jpg', photos: ['/media/tee-back.jpg', '/media/tee.jpg', 'javascript:alert(1)']}];
      if (sql.includes('FROM tour_events')) return [
        {...row(), kind: 'partner', name: 'School & campus', image: '/media/event.jpg', partner_details: {
          organizer: 'Real organiser', client: 'Real client', role: 'Hosting', admission: 'free', ticketUrl: '', institutions: [], newsSlug: '',
          posters: [{url: '/media/event-variant.jpg', caption: 'Original & alternate poster'}],
        }},
        {...row(), slug: 'private-draft', status: 'draft', image: '/media/private-draft.jpg'},
        {...row(), slug: 'broken-partner', kind: 'partner', partner_details: {bad: true}, image: '/media/private-malformed.jpg'},
      ];
      return [];
    });
    const xml = await (await imageSitemap()).text();
    expect(xml).toContain('<loc>' + origin + '/events/public-fixture</loc>');
    expect(xml).toContain(origin + '/media/event.jpg');
    expect(xml).toContain(origin + '/media/event-variant.jpg');
    expect(xml).toContain('Original &amp; alternate poster');
    expect(xml).toContain('<loc>' + origin + '/shop/tee</loc>');
    expect(xml).toContain(origin + '/media/tee-back.jpg');
    expect(xml.split(origin + '/media/tee.jpg')).toHaveLength(2);
    expect(xml).toContain('<loc>' + origin + '/author/eugine-micah</loc>');
    expect(xml).toContain('<loc>' + origin + '/author/lucy-ogunde</loc>');
    expect(xml).not.toContain('private-draft');
    expect(xml).not.toContain('private-malformed');
    expect(xml).not.toContain('javascript:');
    expect(state.q.mock.calls.find(([sql]) => sql.includes('FROM products'))?.[0]).toContain("to_jsonb(products)->>'image'");
    expect(state.q.mock.calls.find(([sql]) => sql.includes('FROM gallery_photos'))?.[0]).toContain('published=true');
    expect(state.q.mock.calls.find(([sql]) => sql.includes('FROM tour_events'))?.[1]?.[0]).not.toContain('draft');
  });

  it('retains the approved archive and profiles when the database is unavailable', async () => {
    state.configured = false;
    const xml = await (await imageSitemap()).text();
    expect(xml).toContain('/gallery/school-koinange');
    expect(xml).toContain('/author/lucy-ogunde');
    expect(state.q).not.toHaveBeenCalled();
  });
});
