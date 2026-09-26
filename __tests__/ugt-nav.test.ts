import { describe, expect, it } from 'vitest';
import {
  PUBLIC_HEADER_NAV, PUBLIC_HEADER_CTA, BOTTOM_TABS, MENU_EXTRAS, FOOTER_LINKS, VOICE,
} from '@/app/_components/ugt/nav';
import { ROUTES } from '@/lib/site';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('public nav label map', () => {
  it('matches approved desktop header labels and yellow Book CTA', () => {
    expect(PUBLIC_HEADER_NAV.map((l) => l.label)).toEqual([
      'Events', 'The Tour', 'Urban News', 'Gallery', 'Shop',
    ]);
    expect(PUBLIC_HEADER_CTA).toEqual({ href: '/book', label: 'Book the tour' });
  });

  it('matches BottomTabBar labels with raised Book CTA', () => {
    expect(BOTTOM_TABS.map((t) => t.label)).toEqual(['Home', 'Tickets', 'Book', 'Shop', 'Gallery']);
    expect(BOTTOM_TABS.find((t) => t.label === 'Book')?.cta).toBe(true);
    expect(BOTTOM_TABS.find((t) => t.label === 'Tickets')?.href).toBe('/events');
  });

  it('has one Work With Us label and a working privacy door', () => {
    const work = MENU_EXTRAS.filter((l) => /work with/i.test(l.label));
    expect(work).toHaveLength(1);
    expect(work[0].href).toBe('/work-with-us');
    expect(FOOTER_LINKS.some((l) => l.href === '/privacy-policy' && l.label === 'Privacy')).toBe(true);
    expect(FOOTER_LINKS.some((l) => l.href === '/privacy')).toBe(false);
  });

  it('keeps separated intent doors and voice ladder', () => {
    const hrefs = MENU_EXTRAS.map((l) => l.href);
    expect(hrefs).toContain('/book');
    expect(hrefs).toContain('/work-with-us');
    expect(hrefs).toContain('/contact-us');
    expect(hrefs).toContain('/press');
    expect(VOICE.emotional).toBe('Where the culture gets made.');
    expect(VOICE.institutional).toBe('From Potential to Purpose');
  });

  it('includes Press in ROUTES without stealing Partners URL', () => {
    const press = ROUTES.find((r) => r.path === '/press');
    const partners = ROUTES.find((r) => r.path === '/partners');
    expect(press).toBeTruthy();
    expect(partners?.path).toBe('/partners');
    expect(press?.path).not.toBe('/partners');
  });
it('PublicShell sources header/footer from ugt/nav', () => {
    const src = readFileSync(resolve(__dirname, '../app/_components/PublicShell.tsx'), 'utf8');
    expect(src).toMatch(/from '\.\/ugt\/nav'|from '@\/app\/_components\/ugt\/nav'/);
    expect(src).toContain('PUBLIC_HEADER_NAV');
    expect(src).toContain('FOOTER_LINKS');
    expect(src).toContain('VOICE');
    expect(src).not.toContain('href="/privacy"');
  });
});