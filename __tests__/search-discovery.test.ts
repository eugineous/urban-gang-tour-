import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/db', () => ({ hasDb: () => true, q: vi.fn() }));
import { q } from '@/lib/server/db';
import { GET } from '@/app/image-sitemap.xml/route';
import robots from '@/app/robots';
import { pingIndexNow } from '@/lib/server/indexnow';

describe('public search discovery', () => {
  beforeEach(() => vi.clearAllMocks());

  it('advertises current gallery collections and valid absolute, escaped image URLs', async () => {
    vi.mocked(q)
      .mockResolvedValueOnce([{ url: '/media-library/custom.webp?crop=1&size=2', caption: 'School & campus' }])
      .mockResolvedValueOnce([{ id: 'tee', name: 'Black & magenta tee', image_url: '/media-library/tee.webp' }]);
    const response = await GET();
    const xml = await response.text();
    expect(response.headers.get('Content-Type')).toContain('application/xml');
    expect(xml).toContain('<loc>https://urbangangtour.co.ke/gallery/school-koinange</loc>');
    expect(xml).toContain('<loc>https://urbangangtour.co.ke/gallery/infinix-kicc</loc>');
    expect(xml).toContain('https://urbangangtour.co.ke/media-library/custom.webp?crop=1&amp;size=2');
    expect(xml).toContain('Black &amp; magenta tee');
    expect(xml).not.toContain('/assets/gal/maimahiu');
    expect(xml).not.toContain('<loc>https://urbangangtour.co.ke/gallery/institutional-advertising</loc>');
  });

  it('keeps search-engine and AI crawlers allowed to read public pages', () => {
    const rules = robots().rules;
    expect(Array.isArray(rules)).toBe(true);
    expect(rules).toContainEqual(expect.objectContaining({ userAgent: '*', allow: '/' }));
  });

  it('keeps a publishing background task alive until its crawl request completes', async () => {
    let complete: (response: Response) => void = () => {};
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { complete = resolve; })));
    let settled = false;
    const task = pingIndexNow(['/events']).then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
    complete(new Response(null, { status: 202 }));
    await task;
    expect(settled).toBe(true);
    vi.unstubAllGlobals();
  });
});
