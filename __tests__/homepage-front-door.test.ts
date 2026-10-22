import {createElement, type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';
import Site from '@/ui/components/Site';
import {WEBSITE_DEFAULTS} from '@/lib/website-content';
import {EMPTY_PARTNER} from '@/lib/partner-events';

const now = Date.parse('2026-10-22T12:00:00+03:00');
type Props = ComponentProps<typeof Site>;
const owned = {
  id: 'fixture-ticketed', slug: 'fixture-ticketed', kind: 'ticketed', name: 'Ticketed fixture event',
  status: 'published', eventDate: '2026-10-30', eventTime: '6:00 PM', venue: 'Fixture venue', city: 'Nairobi',
  image: '/uploads/fixture-ticketed.jpg', sellable: true, tiers: [{id: 'standard', price: 1200, sellable: true}],
};
const partners = [{
  id: 'uni-fest', slug: 'uni-fest-2026', kind: 'partner', name: 'UNI FEST 2026', status: 'published',
  eventDate: '2026-11-06', venue: 'University of Nairobi Graduation Square', city: 'Nairobi',
  image: '/uploads/fixture-uni-fest.jpg', sellable: false,
  partnerDetails: {...EMPTY_PARTNER, organizer: 'University of Nairobi', client: 'Sherehe Vibes Africa', role: 'Event support', admission: 'free'},
}, {
  id: 'satuk-gala', slug: 'satuk-award-gala-2026', kind: 'partner', name: 'SATUK Award Gala 2026', status: 'published',
  eventDate: '2026-11-08', venue: 'Technical University of Kenya', city: 'Nairobi',
  image: '/uploads/fixture-satuk-gala.jpg', sellable: false,
  partnerDetails: {...EMPTY_PARTNER, organizer: 'SATUK', client: 'Sherehe Vibes Africa', role: 'Live hosting', admission: 'external', ticketUrl: 'https://tickets.example.com/satuk-gala'},
}];
const tee = {
  id: 'original-tee', name: 'Original Tour Tee', price: 1000, image: '/uploads/fixture-original-tee.webp',
  category: 'T-shirts', stock: null, variants: [{label: 'M', priceAdjustment: 200}, {label: 'L', priceAdjustment: 400}],
};
const cap = {id: 'original-cap', name: 'Original Tour Cap', price: 600, image: '/uploads/fixture-cap.webp', category: 'Headwear', stock: 0, variants: []};

function render(overrides: Partial<Props> = {}) {
  return renderToStaticMarkup(createElement(Site, {
    path: '/', query: {}, screens: [], events: [partners[1], owned, partners[0]], products: [tee, cap],
    posts: [], initialNow: now, pageContent: WEBSITE_DEFAULTS['/'], ...overrides,
  }));
}
function eventSection(html: string) {
  return html.slice(html.indexOf('id="home-events"'), html.indexOf('id="home-shop"'));
}
function merchSection(html: string) {
  return html.slice(html.indexOf('id="home-shop"'), html.indexOf('id="experiences"'));
}

describe('homepage front-door integration', () => {
  it('server-renders events, merchandise and booking as direct native hero routes', () => {
    const html = render();
    const hero = html.slice(0, html.indexOf('id="home-events"'));
    expect(hero).toContain('aria-label="Start exploring"');
    expect(hero).toMatch(/href="\/events"[^>]*>.*?Find an event/s);
    expect(hero).toMatch(/href="\/shop"[^>]*>Shop merchandise/s);
    expect(hero).toMatch(/href="\/book"[^>]*>Book the team/s);
    expect((html.match(/<h1(?:\s|>)/g) || [])).toHaveLength(1);
  });

  it('shows canonical real event posters with truthful dates, admission and authoritative ticket prices', () => {
    const events = eventSection(render());
    for (const event of [owned, ...partners]) {
      expect(events).toContain(`data-home-event="${event.slug}"`);
      expect(events).toContain(`href="/events/${event.slug}"`);
      expect(events).toContain(`src="${event.image}"`);
      expect(events).toContain(`alt="Event image: ${event.name}"`);
      expect(events).toContain(`dateTime="${event.eventDate}"`);
      expect(events).toContain(event.venue);
    }
    expect(events).toContain('from KES 1,200.00');
    expect(events).toContain('Free admission');
    expect(events).toContain('Tickets via organiser');
    expect(events.indexOf('data-home-event="fixture-ticketed"')).toBeLessThan(events.indexOf('data-home-event="uni-fest-2026"'));
    expect(events.indexOf('data-home-event="uni-fest-2026"')).toBeLessThan(events.indexOf('data-home-event="satuk-award-gala-2026"'));
    expect(events).not.toContain('href="/checkout');
    expect(events).not.toContain('Buy tickets');
  });

  it('puts current event discovery and merchandise before service descriptions and archive work', () => {
    const html = render();
    const events = html.indexOf('id="home-events"');
    const merch = html.indexOf('id="home-shop"');
    const experiences = html.indexOf('id="experiences"');
    const portfolio = html.indexOf('Featured work.');
    expect(events).toBeGreaterThan(0);
    expect(events).toBeLessThan(merch);
    expect(merch).toBeLessThan(experiences);
    expect(experiences).toBeLessThan(portfolio);
  });

  it('does not leak private, archived, completed, past, postponed or malformed records into upcoming promotions', () => {
    const excluded = [
      ...['draft', 'pending_review', 'archived', 'completed', 'cancelled', 'postponed'].map(status => ({...owned, id: 'exclude-' + status, slug: 'exclude-' + status, name: 'Excluded ' + status, status})),
      {...owned, id: 'exclude-past-date', slug: 'exclude-past-date', name: 'Excluded past date', eventDate: '2026-10-21'},
      {...owned, id: 'exclude-past-kind', slug: 'exclude-past-kind', name: 'Excluded history kind', kind: 'past'},
      {...owned, id: 'exclude-undated', slug: 'exclude-undated', name: 'Excluded undated record', eventDate: null},
      {...owned, id: 'exclude-invalid-date', slug: 'exclude-invalid-date', name: 'Excluded invalid date', eventDate: '2026-02-30'},
      {...partners[0], id: 'exclude-invalid-partner', slug: 'exclude-invalid-partner', name: 'Excluded invalid partner', partnerDetails: {admission: 'free'}},
    ];
    const html = render({events: [...excluded, owned]});
    expect(eventSection(html)).toContain('data-home-event="fixture-ticketed"');
    for (const event of excluded) expect(html).not.toContain(event.name);
  });

  it('shows live product photographs and canonical details with actual option-floor prices, not purchase promises', () => {
    const merch = merchSection(render());
    for (const product of [tee, cap]) {
      expect(merch).toContain(`data-home-product="${product.id}"`);
      expect(merch).toContain(`href="/shop/${product.id}"`);
      expect(merch).toContain(`src="${product.image}"`);
      expect(merch).toContain(`alt="${product.name}"`);
    }
    expect(merch).toContain('From KES 1,200');
    expect(merch).toContain('KES 600');
    expect(merch).toContain('Out of stock');
    expect(merch).not.toContain('Add to cart');
    expect(merch).not.toContain('Buy now');
    expect(merch).not.toContain(' available');
  });

  it('never substitutes proposed designs, retired stock or unsafe catalogue records for real merchandise', () => {
    const excluded = [
      {...tee, id: 'exclude-preview', name: 'Excluded proposed design', preview: true},
      {...tee, id: 'exclude-retired', name: 'Excluded retired item', active: false},
      {...tee, id: 'exclude-invalid-price', name: 'Excluded invalid price', price: NaN},
      {...tee, id: 'exclude-unsafe-image', name: 'Excluded unsafe image', image: 'javascript:alert(1)'},
      {...tee, id: 'exclude-no-image', name: 'Excluded no photograph', image: ''},
    ];
    const html = render({products: [...excluded, tee]});
    expect(merchSection(html)).toContain('data-home-product="original-tee"');
    for (const product of excluded) expect(html).not.toContain(product.name);
    expect(html).not.toContain('data-home-product="exclude-');
  });

  it('withdraws price and ticket-sales claims when the last loaded catalogues are stale', () => {
    const html = render({homeCurrent: {events: false, products: false}});
    const events = eventSection(html);
    const merch = merchSection(html);
    expect(events).toContain('Check latest availability');
    expect(events).toContain('Showing the last loaded events. Open an event for the latest details.');
    expect(events).not.toContain('Tickets on sale');
    expect(events).not.toContain('from KES 1,200.00');
    expect(merch).toContain('View latest price');
    expect(merch).toContain('Open a product to check its latest price and options.');
    expect(merch).not.toContain('From KES 1,200');
    expect(merch).not.toContain('KES 600');
  });

  it('keeps useful events, shop and booking links when both catalogues are empty or unavailable', () => {
    const html = render({events: [], products: [], homeCurrent: {events: false, products: false}});
    const events = eventSection(html);
    const merch = merchSection(html);
    expect(events).toContain('Event updates are temporarily unavailable.');
    expect(events).toMatch(/href="\/events"[^>]*>Explore events/s);
    expect(events).toMatch(/href="\/book"[^>]*>Book the team/s);
    expect(merch).toMatch(/href="\/shop"[^>]*>Explore the shop/s);
    expect(html).not.toContain('data-home-event=');
    expect(html).not.toContain('data-home-product=');
    expect(html).not.toContain('Sold out');
    expect(html).not.toContain('Free tickets');
  });

  it('preserves owner-edited hero copy, image and native FAQs without adding another H1', () => {
    const content = {...WEBSITE_DEFAULTS['/'], title: 'Our live world <together>', summary: 'An owner-written introduction.\nSchool stages & culture.', image: '/uploads/fixture-home-hero.jpg', faqs: [{question: 'Owner question <one>?', answer: 'Owner answer & details.'}]};
    const html = render({pageContent: content});
    expect(html).toContain('<h1>Our live world &lt;together&gt;</h1>');
    expect(html).toContain('An owner-written introduction.\nSchool stages &amp; culture.');
    expect(html).toContain('src="/uploads/fixture-home-hero.jpg"');
    expect(html).toContain('<summary><h3>Owner question &lt;one&gt;?</h3>');
    expect(html).toContain('Owner answer &amp; details.');
    expect(html).toContain('href="/faq"');
    expect((html.match(/<h1(?:\s|>)/g) || [])).toHaveLength(1);
    expect((html.match(/<details(?:\s|>)/g) || [])).toHaveLength(1);
  });
});
