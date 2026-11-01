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
const legacyTee = {id: 'p1', name: 'Magenta Oversized Tee', price: 900, image: '/assets/merch/magenta-tee.png', category: 'Apparel', stock: null, variants: []};

function render(overrides: Partial<Props> = {}) {
  return renderToStaticMarkup(createElement(Site, {
    path: '/', query: {}, screens: [], events: [partners[1], owned, partners[0]], products: [tee, cap],
    posts: [], initialNow: now, pageContent: WEBSITE_DEFAULTS['/'], ...overrides,
  }));
}
function eventSection(html: string) {
  return html.slice(html.indexOf('id="home-events"'), html.indexOf('aria-label="Booking questions"'));
}
function merchSection(html: string) {
  return html.slice(html.indexOf('id="collection-title"'), html.indexOf('id="home-events"'));
}

describe('homepage front-door integration', () => {
  it('does not automatically promote legacy p1 from the live catalogue', () => {
    const merch = merchSection(render({products: [legacyTee]}));
    expect(merch).not.toContain('data-shop-product="p1"');
    expect(merch).not.toContain('/assets/merch/magenta-tee.png');
    expect(merch).not.toContain('Magenta Oversized Tee');
    expect(merch).toContain('data-shop-design="cb-oversized-tee"');
  });

  it('server-renders events and booking routes and an in-page shop link in the hero', () => {
    const html = render();
    const hero = html.slice(0, html.indexOf('id="home-events"'));
    expect(hero).toContain('aria-label="Start exploring"');
    expect(hero).toMatch(/href="\/events"[^>]*>Events/s);
    expect(hero).toMatch(/href="#merchandise-catalogue"[^>]*>Shop/s);
    expect(hero).toMatch(/href="\/book"[^>]*>Book/s);
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
    expect(events).toContain('from KES 1,200</p>');
    expect(events).toContain('Free admission');
    expect(events).toContain('Tickets via organiser');
    expect(events.indexOf('data-home-event="fixture-ticketed"')).toBeLessThan(events.indexOf('data-home-event="uni-fest-2026"'));
    expect(events.indexOf('data-home-event="uni-fest-2026"')).toBeLessThan(events.indexOf('data-home-event="satuk-award-gala-2026"'));
    expect(events).not.toContain('href="/checkout');
    expect(events).not.toContain('Buy tickets');
  });

  it('puts module discovery and the embedded collection before upcoming events', () => {
    const html = render();
    const events = html.indexOf('id="home-events"');
    const merch = html.indexOf('id="merchandise-catalogue"');
    const explore = html.indexOf('id="explore"');
    expect(explore).toBeGreaterThan(0);
    expect(explore).toBeLessThan(merch);
    expect(merch).toBeLessThan(events);
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

  it('renders actual live products and distinguishes proposed designs in the embedded catalogue', () => {
    const merch = merchSection(render());
    for (const product of [tee, cap]) {
      expect(merch).toContain(`data-shop-product="${product.id}"`);
      expect(merch).toContain(`href="/shop/${product.id}"`);
      expect(merch).toContain(product.name);
      expect(merch).toContain(`src="${product.image}"`);
    }
    expect(merch).toContain('data-shop-design="cb-oversized-tee"');
    expect(merch).toContain('Design · not on sale');
    expect(merch).toContain('Proposed KES');
    expect(merch).toContain('KES');
    expect(merch).toContain('Out of stock');
  });

  it('keeps live catalogue records separate from the curated design previews', () => {
    const excluded = [
      {...tee, id: 'exclude-preview', name: 'Excluded proposed design', preview: true},
      {...tee, id: 'exclude-retired', name: 'Excluded retired item', active: false},
      {...tee, id: 'exclude-invalid-price', name: 'Excluded invalid price', price: NaN},
      {...tee, id: 'exclude-unsafe-image', name: 'Excluded unsafe image', image: 'javascript:alert(1)'},
      {...tee, id: 'exclude-no-image', name: 'Excluded no photograph', image: ''},
    ];
    const products = [...excluded, tee];
    const before = JSON.stringify(products);
    const html = render({products});
    expect(merchSection(html)).toContain('data-shop-product="original-tee"');
    expect(merchSection(html)).toContain(tee.image);
    for (const product of excluded) expect(html).not.toContain(product.name);
    expect(JSON.stringify(products)).toBe(before);
  });

  it('renders every supplied live catalogue item rather than truncating the collection', () => {
    const products = Array.from({length: 24}, (_, index) => ({...tee, id: `fixture-item-${index + 1}`, name: `Fixture item ${index + 1}`}));
    const merch = merchSection(render({products}));
    for (const product of products) expect(merch).toContain(`data-shop-product="${product.id}"`);
    expect(merch.match(/data-shop-product=/g)).toHaveLength(24);
  });

  it('withdraws stale event and product sales claims', () => {
    const html = render({homeCurrent: {events: false, products: false}});
    const events = eventSection(html);
    const merch = merchSection(html);
    expect(events).toContain('Check latest availability');
    expect(events).toContain('Showing the last loaded events. Open an event for the latest details.');
    expect(events).not.toContain('Tickets on sale');
    expect(events).not.toContain('from KES 1,200.00');
    expect(merch).toContain('We could not load the live catalogue. Try again.');
    expect(merch).toContain('href="/shop"');
    expect(merch).not.toContain('data-shop-design=');
    expect(merch).not.toContain('data-shop-product="original-tee"');
    expect(merch).not.toContain('data-shop-product="original-cap"');
  });

  it('keeps useful events, shop and booking links when both catalogues are empty or unavailable', () => {
    const html = render({events: [], products: [], homeCurrent: {events: false, products: false}});
    const events = eventSection(html);
    const merch = merchSection(html);
    expect(events).toContain('Event updates are temporarily unavailable.');
    expect(events).toMatch(/href="\/events"[^>]*>Explore events/s);
    expect(events).toMatch(/href="\/book"[^>]*>Book the team/s);
    expect(merch).toContain('href="/shop"');
    expect(merch).toContain('We could not load the live catalogue. Try again.');
    expect(html).not.toContain('data-home-event=');
    expect(html).not.toContain('data-shop-product=');
    expect(html).not.toContain('Sold out');
    expect(html).not.toContain('Free tickets');
  });

  it('preserves owner-edited hero copy, image and native FAQs without adding another H1', () => {
    const content = {...WEBSITE_DEFAULTS['/'], title: 'Our live world <together>', summary: 'An owner-written introduction.\nSchool stages & culture.', image: '/uploads/fixture-home-hero.jpg', faqs: [{question: 'Owner question <one>?', answer: 'Owner answer & details.'}]};
    const html = render({pageContent: content});
    expect(html).toContain('<h1><span lang="en-KE">Our live world &lt;together&gt;</span></h1>');
    expect(html).toContain('An owner-written introduction.\nSchool stages &amp; culture.');
    expect(html).toContain('src="/uploads/fixture-home-hero.jpg"');
    expect(html).toContain('<summary><h3><span lang="en-KE">Owner question &lt;one&gt;?</span></h3>');
    expect(html).toContain('Owner answer &amp; details.');
    expect(html).toContain('href="/faq"');
    expect((html.match(/<h1(?:\s|>)/g) || [])).toHaveLength(1);
    const faq = html.slice(html.indexOf('aria-label="Booking questions"'));
    expect((faq.match(/<details(?:\s|>)/g) || [])).toHaveLength(1);
  });
});
