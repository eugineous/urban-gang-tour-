import {describe, expect, it} from 'vitest';
import {EVENT_STATUSES, PUBLIC_EVENT_STATUSES} from '@/lib/server/event-lifecycle';
import {ownedEventPresentation, ownedEventSignature, publicOwnedEvents} from '@/ui/lib/owned-event-presentation';

const now = Date.parse('2026-10-11T12:00:00+03:00');
const event = {id:'test-event', kind:'ticketed', name:'Test event', slug:'test-event', status:'published', eventDate:'2026-10-12', sellable:true};

describe('owned event presentation respects public and commercial truth', () => {
  it('keeps every public lifecycle state discoverable and hides private states', () => {
    const rows = EVENT_STATUSES.map(status => ({...event, id:status, status}));
    expect(publicOwnedEvents(rows, now).map(row => row.status).sort()).toEqual([...PUBLIC_EVENT_STATUSES].sort());
    for (const row of rows) {
      const view = ownedEventPresentation(row, now);
      expect(view.sellable).toBe(row.status === 'published');
      if (row.status !== 'published') expect(view.action).not.toBe('View tickets');
    }
  });
  it('does not infer ticket availability from published status or tiers', () => {
    for (const sellable of [undefined, false, 'true']) {
      const view = ownedEventPresentation({...event, sellable, tiers:[{name:'Entry', price:500}]}, now);
      expect(view.sellable).toBe(false);
      expect(view.label).toBe('Details published');
      expect(view.action).toBe('View event details');
    }
  });
  it('routes school stops to the tour rather than a ticket detail or checkout', () => {
    const view = ownedEventPresentation({...event, kind:'school'}, now);
    expect(view.sellable).toBe(false);
    expect(view.href).toBe('/tour-stops');
    expect(view.action).toBe('View the school tour');
  });
  it('keeps postponed records visible after the previous date without advertising that date', () => {
    const view = ownedEventPresentation({...event, status:'postponed', eventDate:'2026-10-01'}, now);
    expect(view.past).toBe(false);
    expect(view.dateLabel).toBe('New date to be confirmed');
    expect(view.dateTime).toBeUndefined();
    expect(view.sellable).toBe(false);
  });
  it('keeps completed records and stale published dates out of upcoming ticket actions', () => {
    for (const row of [{...event, status:'completed'}, {...event, eventDate:'2026-10-10'}]) {
      const view = ownedEventPresentation(row, now);
      expect(view.past).toBe(true);
      expect(view.sellable).toBe(false);
      expect(view.href).toBe('/events/test-event');
    }
  });
  it('handles missing or malformed dates and unsafe detail slugs without inventing them', () => {
    const view = ownedEventPresentation({...event, eventDate:'2026-02-30', slug:'../admin'}, now);
    expect(view.dateLabel).toBe('Date to be confirmed');
    expect(view.dateTime).toBeUndefined();
    expect(view.href).toBe('/contact-us');
    expect(view.action).toBe('Ask about this event');
  });
  it('detects status and availability updates even when the event id is unchanged', () => {
    expect(ownedEventSignature([event])).not.toBe(ownedEventSignature([{...event, status:'sold_out'}]));
    expect(ownedEventSignature([event])).not.toBe(ownedEventSignature([{...event, sellable:false}]));
    expect(ownedEventSignature([event])).not.toBe(ownedEventSignature([]));
    expect(ownedEventSignature([event, {...event, id:'second'}])).toBe(ownedEventSignature([{...event, id:'second'}, event]));
  });
});
