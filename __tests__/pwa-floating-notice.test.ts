import {afterAll, beforeAll, expect, it} from 'vitest';
import {build} from 'esbuild';
import {chromium, type Browser, type BrowserContext, type Page} from 'playwright';
import {existsSync} from 'node:fs';
import {VIEWPORT_BOOTSTRAP} from '@/lib/client/viewport-bootstrap';

const enabled = existsSync('/usr/bin/chromium');
let browser:Browser;
let script:string;
let css:string;

beforeAll(async () => {
  if (!enabled) return;
  const bundle = await build({
    stdin:{resolveDir:process.cwd(), loader:'tsx', contents:`
      import React from 'react';
      import {createRoot} from 'react-dom/client';
      import {LanguageProvider} from './ui/i18n/LanguageProvider';
      import * as pwa from './app/_components/InstallableApp';
      window.pwa = pwa;
      createRoot(document.getElementById('app')).render(<LanguageProvider><pwa.InstallableApp/></LanguageProvider>);
    `},
    bundle:true, write:false, outdir:'pwa-notice-fixture', jsx:'automatic',
    define:{'process.env.NODE_ENV':'"production"'},
    plugins:[{name:'local-notice-route', setup(builder) {
      builder.onResolve({filter:/^next\/navigation$/}, () => ({path:'navigation', namespace:'fixture'}));
      builder.onLoad({filter:/.*/, namespace:'fixture'}, () => ({contents:'export const usePathname=()=>location.pathname;'}));
    }}],
  });
  script = bundle.outputFiles.find(file => file.path.endsWith('.js'))!.text;
  css = bundle.outputFiles.find(file => file.path.endsWith('.css'))!.text;
  browser = await chromium.launch({executablePath:'/usr/bin/chromium', headless:true, args:['--no-sandbox', '--disable-dev-shm-usage']});
}, 30000);
afterAll(async () => {await browser?.close();});

async function open(options:{width?:number; height?:number; widePhone?:boolean; deniedStorage?:boolean; waitingWorker?:boolean; path?:string} = {}) {
  const context = await browser.newContext({
    viewport:{width:options.width || 393, height:options.height || 851},
    screen:options.widePhone ? {width:393, height:851} : undefined,
    hasTouch:true, serviceWorkers:'block',
  });
  const unexpected:string[] = [];
  await context.addInitScript(({deniedStorage, widePhone, waitingWorker}) => {
    Object.defineProperty(navigator, 'serviceWorker', {value:{controller:{}, getRegistration:async () => waitingWorker ? {waiting:{}} : undefined}});
    if (deniedStorage) Object.defineProperty(window, 'sessionStorage', {get() {throw new DOMException('Storage denied', 'SecurityError');}});
    if (widePhone) Object.defineProperty(screen, 'orientation', {value:{type:'portrait-primary'}});
  }, {deniedStorage:options.deniedStorage, widePhone:options.widePhone, waitingWorker:options.waitingWorker});
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://127.0.0.1') {unexpected.push(url.href); return route.abort();}
    if (url.pathname === '/fixture.js') return route.fulfill({contentType:'application/javascript', body:script});
    if (url.pathname === '/fixture.css') return route.fulfill({contentType:'text/css', body:css});
    if (route.request().isNavigationRequest()) return route.fulfill({contentType:'text/html; charset=utf-8', body:`
      <!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=${options.widePhone ? '980' : 'device-width'}, initial-scale=1">
      <style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}form{margin:12px}input{width:150px}</style>
      <link rel="stylesheet" href="/fixture.css"><script data-ugt-release></script><script>${VIEWPORT_BOOTSTRAP}</script>
      </head><body><a href="/about">Another page</a><form id="first" onsubmit="event.preventDefault()"><input aria-label="First draft"><button>Submit first</button></form>
      <form id="second" onsubmit="event.preventDefault()"><input aria-label="Second draft"></form><div id="app"></div><script src="/fixture.js"></script></body></html>
    `});
    unexpected.push(url.href); return route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  await page.goto('http://127.0.0.1' + (options.path || '/shop'), {waitUntil:'domcontentloaded'});
  await ready(page);
  await announce(page, 'release-a');
  await page.locator('aside[aria-label="App status"]').waitFor();
  return {context, page, unexpected};
}

async function ready(page:Page) {
  // The parent language effect runs after InstallableApp attaches its listeners.
  await page.waitForFunction(() => Boolean((window as unknown as {pwa?:unknown}).pwa) && document.documentElement.lang === 'en-KE');
}

async function announce(page:Page, release:string|null, activated = false) {
  await page.evaluate(({release, activated}) => dispatchEvent(new CustomEvent(activated ? 'ugt-release-activated' : 'ugt-release-ready', {detail:{release}})), {release, activated});
}

async function close(fixture:{context:BrowserContext; unexpected:string[]}) {
  expect(fixture.unexpected).toEqual([]);
  await fixture.context.close();
}

it.skipIf(!enabled)('keeps the floating update and its close control within ordinary, wide-layout Android, and short phone viewports', async () => {
  for (const options of [{width:360}, {width:393}, {width:980, height:2122, widePhone:true}, {width:360, height:280}]) {
    const fixture = await open(options), {page} = fixture;
    try {
      const bounds = await page.locator('aside[aria-label="App status"]').evaluate(node => {
        const box = node.getBoundingClientRect();
        return {left:box.left, right:box.right, bottom:box.bottom, viewportWidth:innerWidth, viewportHeight:innerHeight, zoom:document.documentElement.style.zoom};
      });
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth);
      expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewportHeight);
      if (options.widePhone) expect(Number(bounds.zoom)).toBeCloseTo(2.4936386768);
      const closeControl = page.getByRole('button', {name:'Dismiss app status'});
      const target = await closeControl.boundingBox();
      expect(target?.height).toBeGreaterThanOrEqual(44);
      expect(target?.width).toBeGreaterThanOrEqual(44);
      await closeControl.click();
      await expect.poll(() => page.locator('aside[aria-label="App status"]').count()).toBe(0);
    } finally {await close(fixture);}
  }
}, 30000);

it.skipIf(!enabled)('remembers the dismissed release across native page navigation and reload while showing a genuinely new release', async () => {
  const fixture = await open(), {page} = fixture;
  try {
    await page.getByRole('button', {name:'Dismiss app status'}).click();
    await page.reload();
    await ready(page);
    await announce(page, 'release-a');
    expect(await page.locator('aside[aria-label="App status"]').count()).toBe(0);
    await Promise.all([page.waitForURL('http://127.0.0.1/about'), page.getByRole('link', {name:'Another page'}).click()]);
    await ready(page);
    await announce(page, 'release-a', true);
    expect(await page.locator('aside[aria-label="App status"]').count()).toBe(0);
    await announce(page, 'release-b');
    await page.getByText('An update is ready', {exact:true}).waitFor();
    expect(await page.getByRole('button', {name:'Update app', exact:true}).isEnabled()).toBe(true);
  } finally {await close(fixture);}
}, 30000);

it.skipIf(!enabled)('keeps dismissal usable when session storage is denied and does not hide the next release', async () => {
  const fixture = await open({deniedStorage:true}), {page} = fixture;
  try {
    await page.getByRole('button', {name:'Dismiss app status'}).click();
    expect(await page.locator('aside[aria-label="App status"]').count()).toBe(0);
    await announce(page, 'release-b');
    await page.getByText('An update is ready', {exact:true}).waitFor();
  } finally {await close(fixture);}
}, 30000);

it.skipIf(!enabled)('does not flash an unidentified waiting update before its dismissed release is identified after reload', async () => {
  const fixture = await open({waitingWorker:true}), {page} = fixture;
  try {
    await page.getByRole('button', {name:'Dismiss app status'}).click();
    await page.reload();
    await ready(page);
    expect(await page.locator('aside[aria-label="App status"]').count()).toBe(0);
    await announce(page, 'release-a');
    expect(await page.locator('aside[aria-label="App status"]').count()).toBe(0);
    await announce(page, 'release-b');
    await page.getByText('An update is ready', {exact:true}).waitFor();
  } finally {await close(fixture);}
}, 30000);

it.skipIf(!enabled)('never persists dismissal for an unknown release or suppresses a later identified update', async () => {
  const fixture = await open(), {page} = fixture;
  try {
    await announce(page, null);
    await page.getByRole('button', {name:'Dismiss app status'}).click();
    await page.reload();
    await ready(page);
    await announce(page, null);
    await page.getByText('An update is ready', {exact:true}).waitFor();
    await page.getByRole('button', {name:'Dismiss app status'}).click();
    await announce(page, 'release-b');
    await page.getByText('An update is ready', {exact:true}).waitFor();
  } finally {await close(fixture);}
}, 30000);

it.skipIf(!enabled)('retains dirty drafts after submission and clears only reset forms while preserving another dirty form', async () => {
  const fixture = await open(), {page} = fixture;
  try {
    await page.getByRole('textbox', {name:'First draft'}).fill('Keep first');
    await page.getByRole('button', {name:'Submit first', exact:true}).click();
    expect(await page.getByRole('button', {name:'Update app', exact:true}).isDisabled()).toBe(true);
    await page.getByRole('textbox', {name:'Second draft'}).fill('Keep second');
    await page.evaluate(() => (document.getElementById('first') as HTMLFormElement).reset());
    expect(await page.getByRole('button', {name:'Update app', exact:true}).isDisabled()).toBe(true);
    expect(await page.getByRole('textbox', {name:'Second draft'}).inputValue()).toBe('Keep second');
    await page.evaluate(() => (document.getElementById('second') as HTMLFormElement).reset());
    await expect.poll(() => page.getByRole('button', {name:'Update app', exact:true}).isEnabled()).toBe(true);
  } finally {await close(fixture);}
}, 30000);

it.skipIf(!enabled)('does not clear a cancelled native reset and clears an explicitly acknowledged saved form only', async () => {
  const fixture = await open(), {page} = fixture;
  try {
    await page.getByRole('textbox', {name:'First draft'}).fill('Keep first');
    await page.evaluate(() => {
      const form = document.getElementById('first') as HTMLFormElement;
      form.addEventListener('reset', event => event.preventDefault(), {once:true});
      form.reset();
    });
    expect(await page.getByRole('textbox', {name:'First draft'}).inputValue()).toBe('Keep first');
    expect(await page.getByRole('button', {name:'Update app', exact:true}).isDisabled()).toBe(true);
    await page.getByRole('textbox', {name:'Second draft'}).fill('Keep second');
    const acknowledge = async (id:string) => page.evaluate(id => {
      const pwa = (window as unknown as {pwa:{acknowledgeSavedForm?:(form:HTMLFormElement) => void}}).pwa;
      pwa.acknowledgeSavedForm?.(document.getElementById(id) as HTMLFormElement);
    }, id);
    await acknowledge('first');
    expect(await page.getByRole('button', {name:'Update app', exact:true}).isDisabled()).toBe(true);
    await acknowledge('second');
    await expect.poll(() => page.getByRole('button', {name:'Update app', exact:true}).isEnabled()).toBe(true);
  } finally {await close(fixture);}
}, 30000);

it.skipIf(!enabled)('keeps protected routes and offline pages blocked and preserves entered work after another tab activates', async () => {
  for (const path of ['/checkout', '/pay/return', '/admin']) {
    const fixture = await open({path}), {page} = fixture;
    try {expect(await page.getByRole('button', {name:'Update app', exact:true}).isDisabled()).toBe(true);}
    finally {await close(fixture);}
  }
  const fixture = await open(), {page} = fixture;
  try {
    await page.getByRole('textbox', {name:'First draft'}).fill('Keep my work');
    await announce(page, 'release-a', true);
    await page.getByText('The update is installed', {exact:true}).waitFor();
    expect(await page.getByRole('textbox', {name:'First draft'}).inputValue()).toBe('Keep my work');
    expect(await page.getByRole('button', {name:'Refresh app', exact:true}).isDisabled()).toBe(true);
    await page.evaluate(() => {Object.defineProperty(navigator, 'onLine', {configurable:true, value:false}); dispatchEvent(new Event('offline'));});
    await page.getByText('You’re offline', {exact:true}).waitFor();
    expect(await page.getByRole('button', {name:'Refresh app', exact:true}).count()).toBe(0);
  } finally {await close(fixture);}
}, 30000);
