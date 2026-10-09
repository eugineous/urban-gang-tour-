import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

async function request(path: string, networkFails = false) {
  const listeners: Record<string, Function> = {};
  const fetched: string[] = [];
  const cacheWrites: string[] = [];
  const cached = new Response('old runtime');
  vm.runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    URL, Response, Promise,
    self: { location: { origin: 'https://urbangangtour.co.ke' }, addEventListener: (name: string, handler: Function) => { listeners[name] = handler; } },
    caches: { match: async () => cached, open: async () => ({ put: async (req: any) => cacheWrites.push(req.url) }) },
    fetch: async (req: any) => { fetched.push(req.url); if (networkFails) throw new Error('offline'); return new Response('current runtime'); },
  });
  let response: Promise<Response> | undefined;
  listeners.fetch({ request: { url: 'https://urbangangtour.co.ke' + path, method: 'GET', mode: 'cors' }, respondWith: (result: Promise<Response>) => { response = result; }, waitUntil: () => {} });
  return { text: response ? await (await response).text() : '', fetched, cacheWrites };
}

describe('deployed runtime updates', () => {
  it('fetches the current unhashed runtime instead of keeping a previous deployment', async () => {
    const result = await request('/manifest.json');
    expect(result.text).toBe('current runtime');
    expect(result.fetched).toHaveLength(1);
  });
  it('revalidates mutable images and styles despite an old cache entry', async () => {
    for (const path of ['/assets/ugt-logo.png', '/design-assets/hero.jpg', '/fonts/v25-fonts.css', '/release-client.js']) {
      expect((await request(path)).text).toBe('current runtime');
    }
  });
  it('can fall back to a cached runtime while offline', async () => {
    expect((await request('/manifest.json', true)).text).toBe('old runtime');
  });
  it('retains cache-first behavior only for immutable compiled bundles', async () => {
    const result = await request('/_next/static/chunks/hashed.js');
    expect(result.text).toBe('old runtime');
    expect(result.fetched).toHaveLength(0);
  });
});
