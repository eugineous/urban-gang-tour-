import { describe, expect, it } from 'vitest';
import { FOUNDERS, MOBILE_NAV, resolvePublicPage } from '@/app/_components/public-site-content';

describe('public site content', () => {
  it('keeps the public people story founder-only', () => {
    expect(FOUNDERS.map((founder) => founder.name)).toEqual(['Eugine Micah', 'Lucy Ogunde']);
  });

  it('keeps the phone navigation focused on five real destinations', () => {
    expect(MOBILE_NAV).toHaveLength(5);
    expect(MOBILE_NAV.map((item) => item.href)).toEqual(['/', '/events', '/gallery', '/shop', '/book']);
  });

  it('falls back to a real public page for an unknown captured route', () => {
    expect(resolvePublicPage('/not-a-real-page').title).toBe('Urban Gang Tour');
  });
});
