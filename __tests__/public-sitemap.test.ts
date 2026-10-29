import {expect, it, vi} from 'vitest';

vi.mock('@/lib/server/db', () => ({hasDb: () => false, q: vi.fn()}));
vi.mock('@/app/_lib/blog', () => ({getBlogPosts: async () => []}));

import sitemap from '@/app/sitemap';

it('advertises the public install guide once without exposing account or order journeys', async () => {
  const pages = await sitemap();
  expect(pages.filter(page => page.url === 'https://urbangangtour.co.ke/app')).toHaveLength(1);
  expect(pages.some(page => /\/(?:admin|api|account|checkout|pay|receipt|tickets|track)(?:[/?]|$)/.test(page.url))).toBe(false);
});
