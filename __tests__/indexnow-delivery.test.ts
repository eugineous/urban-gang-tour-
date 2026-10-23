import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pingIndexNow } from '@/lib/server/indexnow';

const origin = 'https://urbangangtour.co.ke';
const fetchMock = vi.fn<typeof fetch>();
const warning = vi.fn();
beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 202 }));
  vi.stubGlobal('fetch', fetchMock);
  warning.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(warning);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const payload = () => JSON.parse(String(fetchMock.mock.calls[0][1]?.body));

describe('bounded canonical IndexNow delivery', () => {
  it('skips empty and non-public URL batches', async () => {
    await pingIndexNow([]);
    await pingIndexNow(['/admin', '/account', '/checkout', '/cart', '/tickets/private', '/api/site-info', '/the-gang']);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warning).not.toHaveBeenCalled();
  });
  it('deduplicates owned public URLs and preserves the existing ownership proof', async () => {
    await pingIndexNow(['/', '/events', 'events', origin + '/events/', '/blog/current-story', '/feed.xml', '/news-sitemap.xml']);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.indexnow.org/indexnow');
    expect(payload()).toEqual({ host: 'urbangangtour.co.ke', key: 'db2a35cb019b2d7ae6e257a25e899f96', keyLocation: origin + '/db2a35cb019b2d7ae6e257a25e899f96.txt', urlList: [origin + '/', origin + '/events', origin + '/blog/current-story', origin + '/feed.xml', origin + '/news-sitemap.xml'] });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', redirect: 'error' });
    expect(warning).not.toHaveBeenCalled();
  });
  it('does not submit external origins, ambiguous paths, query tokens or fragments', async () => {
    await pingIndexNow(['https://evil.example/events', 'http://urbangangtour.co.ke/events', '//evil.example/events', 'https://user:password@urbangangtour.co.ke/events', '/events?token=private', '/events#private', '/blog/%73tory', '/events\\private', '/gallery/../events', '/events\n', 'javascript:alert(1)', '/unknown-route']);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warning).not.toHaveBeenCalled();
  });
  it.each([400, 403, 429, 500])('reports HTTP%d rejection safely without failing publication', async status => {
    fetchMock.mockResolvedValue(new Response('private provider diagnostics', { status }));
    await expect(pingIndexNow(['/blog/current-story'])).resolves.toBeUndefined();
    expect(warning).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledWith('[indexnow] delivery rejected (non-fatal)', { status });
    expect(JSON.stringify(warning.mock.calls)).not.toContain('private provider diagnostics');
    expect(JSON.stringify(warning.mock.calls)).not.toContain('current-story');
  });
  it('does not expose transport exception contents', async () => {
    fetchMock.mockRejectedValue(Error('credential-or-private-URL-must-not-be-logged'));
    await expect(pingIndexNow(['/events'])).resolves.toBeUndefined();
    expect(warning).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledWith('[indexnow] delivery failed (non-fatal)', { code: 'transport_error' });
    expect(JSON.stringify(warning.mock.calls)).not.toContain('credential');
  });
  it('bounds a slow provider call to the existing four-second deadline', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(Error('aborted')), { once: true });
    }));
    const task = pingIndexNow(['/events']);
    await vi.advanceTimersByTimeAsync(4001);
    await expect(task).resolves.toBeUndefined();
    expect(warning).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledWith('[indexnow] delivery failed (non-fatal)', { code: 'timeout' });
    expect(vi.getTimerCount()).toBe(0);
  });
  it('keeps accepted public detail batches within the provider limit', async () => {
    await pingIndexNow(Array.from({ length: 10_003 }, (_, i) => '/blog/story-' + i));
    expect(payload().urlList).toHaveLength(10_000);
    expect(warning).not.toHaveBeenCalled();
  });
});
