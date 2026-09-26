import { describe, expect, it } from 'vitest';
import { isSafeEventPathSegment, matchEventRoute } from '@/lib/server/event-route';

const canonical = { id: 'show-2026', slug: 'urban-gang-live' };

describe('event canonical route contract', () => {
  it('keeps a canonical slug canonical even if an old id has the same shape', () => {
    expect(matchEventRoute('urban-gang-live', canonical, { id: 'urban-gang-live', slug: 'old-show' }))
      .toEqual({ kind: 'canonical', event: canonical });
  });

  it('marks a public legacy id for a canonical redirect', () => {
    expect(matchEventRoute('show-2026', null, canonical))
      .toEqual({ kind: 'redirect', event: canonical });
  });

  it('does not create a redirect for an unknown id or a blank legacy slug', () => {
    expect(matchEventRoute('missing-event', null, null)).toEqual({ kind: 'not_found' });
    expect(matchEventRoute('legacy-row', null, { id: 'legacy-row', slug: '' })).toEqual({ kind: 'not_found' });
  });

  it('rejects malformed path parameters before a database lookup can be used', () => {
    for (const value of ['', '../admin', 'has space', 'UPPERCASE', 'x'.repeat(81)]) {
      expect(isSafeEventPathSegment(value)).toBe(false);
      expect(matchEventRoute(value, canonical, canonical)).toEqual({ kind: 'not_found' });
    }
  });
});
