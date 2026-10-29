import {existsSync, readFileSync} from 'node:fs';
import vm from 'node:vm';
import {chromium} from 'playwright';
import {describe, expect, it} from 'vitest';
import {catalogueProblems, formatMessage} from '@/lib/i18n/messages';
import {appMessages} from '@/ui/i18n/catalogues/app';
import {shellMessages, navigationMessageKey} from '@/ui/i18n/catalogues/shell';

function worker({cacheDenied = false, offline = false, response = new Response('public asset')} = {}) {
  const listeners:Record<string, (event:unknown) => void> = {};
  const entries = new Map<string, Response>();
  const pending:Promise<unknown>[] = [];
  let activated = 0;
  const cache = {
    addAll:async (paths:string[]) => { for (const path of paths) entries.set(path, new Response(path === '/offline.html' ? readFileSync('public/offline.html', 'utf8') : 'offline')); },
    put:async (request:string|{url:string}, value:Response) => { entries.set(typeof request === 'string' ? request : request.url, value); },
    keys:async () => [...entries.keys()].map(url => ({url})),
    delete:async (request:string|{url:string}) => entries.delete(typeof request === 'string' ? request : request.url),
  };
  vm.runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    URL, Response, Promise,
    self:{location:{origin:'https://urbangangtour.co.ke'}, skipWaiting:async () => { activated++; }, clients:{claim:async () => {}}, addEventListener:(name:string, listener:(event:unknown) => void) => {listeners[name] = listener;}},
    caches:{open:async () => {if (cacheDenied) throw new Error('storage denied'); return cache;}, match:async (path:string) => entries.get(path)?.clone(), keys:async () => [], delete:async () => true},
    fetch:async () => {if (offline) throw new Error('network unavailable'); return response.clone();},
  });
  const waitUntil = (promise:Promise<unknown>) => {pending.push(promise);};
  async function settle() { while (pending.length) await Promise.all(pending.splice(0)); }
  return {
    entries,
    activated:() => activated,
    async install() {listeners.install({waitUntil}); await settle();},
    async message(data:unknown) {listeners.message?.({data, waitUntil}); await settle();},
    async request(path:string, options:{authorization?:string; rsc?:boolean; mode?:string} = {}) {
      let result:Promise<Response>|undefined;
      const headers = new Headers(options.authorization ? {Authorization:options.authorization} : options.rsc ? {RSC:'1'} : {});
      listeners.fetch({request:{url:'https://urbangangtour.co.ke'+path, method:'GET', mode:options.mode || 'cors', headers}, waitUntil, respondWith:(value:Promise<Response>) => {result = value;}});
      const received = result ? await result : undefined;
      await settle();
      return received;
    },
  };
}

describe('PWA privacy and deliberate updates', () => {
  it('provides native app guidance and a translated footer entry in all supported languages', () => {
    expect(catalogueProblems(appMessages)).toEqual([]);
    for (const locale of ['en', 'sw', 'fr', 'zh-Hans', 'ru', 'es'] as const) {
      expect(formatMessage(appMessages, locale, 'install.ios').fallback).toBe(false);
      expect(navigationMessageKey('/app')).toBe('nav.app');
      expect(formatMessage(shellMessages, locale, navigationMessageKey('/app')!).fallback).toBe(false);
    }
  });
  it('leaves an installed update waiting until the visitor explicitly applies it', async () => {
    const app = worker();
    await app.install();
    expect(app.activated()).toBe(0);
    await app.message({type:'UNKNOWN'});
    expect(app.activated()).toBe(0);
    await app.message({type:'SKIP_WAITING'});
    expect(app.activated()).toBe(1);
  });

  it('continues installing when offline storage is denied', async () => {
    await expect(worker({cacheDenied:true}).install()).resolves.toBeUndefined();
  });

  it('serves self-contained offline HTML only for public document navigations', async () => {
    const app = worker({offline:true});
    await app.install();
    const fallback = await app.request('/about', {mode:'navigate'});
    expect(await fallback?.text()).toContain('<html lang="en-KE">');
    expect(app.entries.has('/offline.html')).toBe(true);
    expect(await app.request('/about')).toBeUndefined();
    for (const path of ['/api/orders', '/orders/track?ref=private', '/account', '/admin', '/checkout', '/pay/secret', '/tickets/private', '/receipt/private']) {
      expect(await app.request(path, {mode:'navigate'}), path).toBeUndefined();
    }
    expect(await app.request('/about', {mode:'navigate', authorization:'Bearer private'})).toBeUndefined();
    expect(await app.request('/about?_rsc=123', {mode:'navigate', rsc:true})).toBeUndefined();
  });

  it('does not intercept private destinations, API roots, authenticated assets or RSC requests', async () => {
    const app = worker();
    for (const path of ['/api', '/api/orders', '/orders/track?ref=private', '/pay/secret', '/cart', '/checkout', '/account', '/admin', '/organizer', '/tickets/private', '/receipt/private', '/t/private', '/verify/private']) {
      expect(await app.request(path), path).toBeUndefined();
    }
    expect(await app.request('/assets/logo.png', {authorization:'Bearer private'})).toBeUndefined();
    expect(await app.request('/about?_rsc=123', {rsc:true})).toBeUndefined();
    expect(app.entries.size).toBe(0);
  });

  it('does not retain private, no-store or cookie-varying asset responses', async () => {
    for (const headers of [{'Cache-Control':'private'}, {'Cache-Control':'no-store'}, {Vary:'Cookie'}, {Vary:'Authorization'}]) {
      const app = worker({response:new Response('private contents', {headers})});
      expect(await (await app.request('/assets/private.png'))?.text()).toBe('private contents');
      expect(app.entries.size).toBe(0);
    }
  });

  it('only stores public assets and keeps its runtime cache bounded', async () => {
    const app = worker();
    await app.request('/unknown-export.json');
    expect(app.entries.size).toBe(0);
    for (let i = 0; i < 85; i++) await app.request(`/assets/photo-${i}.png`);
    expect(app.entries.size).toBeLessThanOrEqual(80);
    expect(app.entries.has('https://urbangangtour.co.ke/assets/photo-84.png')).toBe(true);
  });

  it('returns a fetched asset even when cache storage is denied', async () => {
    const app = worker({cacheDenied:true});
    expect(await (await app.request('/assets/logo.png'))?.text()).toBe('public asset');
  });

  it('offers shortcuts to existing customer routes', () => {
    const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf8'));
    expect(manifest.shortcuts?.map((item:{url:string}) => item.url)).toEqual(['/shop', '/orders/track', '/account']);
  });
});

describe('standalone offline document', () => {
  function html() {
    expect(existsSync('public/offline.html'), 'The fallback must exist independently of Next route chunks').toBe(true);
    return readFileSync('public/offline.html', 'utf8');
  }

  it.skipIf(!existsSync('/usr/bin/chromium'))('keeps English native links usable with JavaScript enabled or disabled and every external asset unavailable', async () => {
    const source = html();
    const browser = await chromium.launch({executablePath:'/usr/bin/chromium', headless:true, args:['--no-sandbox', '--disable-dev-shm-usage']});
    try {
      for (const javaScriptEnabled of [true, false]) {
        const context = await browser.newContext({javaScriptEnabled, locale:'fr-FR'});
        const errors:string[] = [], assets:string[] = [];
        await context.route('**/*', route => {
          if (route.request().resourceType() === 'document') return route.fulfill({contentType:'text/html', body:source});
          assets.push(route.request().url());
          return route.abort();
        });
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('https://offline.test/about', {waitUntil:'load'});
        expect(await page.locator('html').getAttribute('lang')).toBe('en-KE');
        expect(await page.getByRole('heading', {name:'You’re offline.', exact:true}).count()).toBe(1);
        expect(await page.getByRole('link', {name:'Get the app', exact:true}).getAttribute('href')).toBe('/app');
        for (const width of [360, 768]) {
          await page.setViewportSize({width, height:800});
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          expect(await page.locator('a').evaluateAll(nodes => nodes.every(node => node.getBoundingClientRect().height >= 44))).toBe(true);
        }
        const retry = page.getByRole('link', {name:'Try again', exact:true});
        expect(await retry.getAttribute('href')).toBe('/');
        await Promise.all([page.waitForURL('https://offline.test/'), retry.click()]);
        expect(await page.getByRole('heading', {name:'You’re offline.', exact:true}).count()).toBe(1);
        expect(await page.locator('script[src], link[rel="stylesheet"], img, video, audio, iframe').count()).toBe(0);
        expect(errors).toEqual([]);
        expect(assets).toEqual([]);
        await context.close();
      }
    } finally {await browser.close();}
  }, 20000);

  it.skipIf(!existsSync('/usr/bin/chromium'))('uses only an explicit supported saved language and survives denied preference storage', async () => {
    const source = html();
    const browser = await chromium.launch({executablePath:'/usr/bin/chromium', headless:true, args:['--no-sandbox', '--disable-dev-shm-usage']});
    try {
      for (const [saved, lang, retry] of [
        ['en', 'en-KE', 'Try again'], ['sw', 'sw', 'Jaribu tena'], ['fr', 'fr', 'Réessayer'],
        ['zh-Hans', 'zh-Hans', '重试'], ['ru', 'ru', 'Повторить'], ['es', 'es', 'Reintentar'],
        ['fr-FR', 'en-KE', 'Try again'], ['__proto__', 'en-KE', 'Try again'], ['denied', 'en-KE', 'Try again'],
      ]) {
        const context = await browser.newContext({locale:'es-ES'});
        await context.route('**/*', route => route.fulfill({contentType:'text/html', body:source}));
        await context.addInitScript(value => {
          if (value === 'denied') Object.defineProperty(window, 'localStorage', {get() {throw new DOMException('Denied', 'SecurityError');}});
          else localStorage.setItem('ugt-interface-language-v1', value);
        }, saved);
        const page = await context.newPage();
        const errors:string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('https://offline.test/about', {waitUntil:'load'});
        expect(await page.locator('html').getAttribute('lang'), saved).toBe(lang);
        expect(await page.getByRole('link', {name:retry, exact:true}).getAttribute('href')).toBe('/');
        expect(errors).toEqual([]);
        await context.close();
      }
    } finally {await browser.close();}
  }, 20000);
});
