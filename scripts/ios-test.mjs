// Reproduce iOS Safari behavior with Playwright WebKit + iPhone emulation
import { webkit, devices } from 'playwright';

const BASE = process.env.BASE || 'https://urbangangtour.co.ke';
const pages = (process.env.PAGES || '/,/shop,/urban-news,/admin').split(',');

const browser = await webkit.launch();
const iphone = devices['iPhone 13'];
const ctx = await browser.newContext({ ...iphone });

for (const path of pages) {
  const page = await ctx.newPage();
  const errors = [];
  const failedReqs = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + String(e).slice(0, 300)));
  page.on('requestfailed', r => failedReqs.push(r.url().slice(0, 120) + ' :: ' + (r.failure()?.errorText || '')));
  try {
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(12000); // give the runtime time to boot
    const state = await page.evaluate(() => ({
      dcRoot: !!document.querySelector('#dc-root'),
      dcChildren: document.querySelector('#dc-root')?.children.length || 0,
      shellVisible: (() => { const s = document.querySelector('#v25-host'); return s ? getComputedStyle(s).display : 'none-found'; })(),
      ssrShell: (() => { const s = document.querySelector('[data-ssr-shell]'); return s ? getComputedStyle(s).display : 'no-shell-el'; })(),
      tabbar: !!document.querySelector('.ugt-tabbar'),
      bodyText: document.body.innerText.replace(/\s+/g, ' ').slice(0, 200),
      hasReact: typeof window.React !== 'undefined',
      swControlled: !!navigator.serviceWorker?.controller,
    }));
    console.log(`\n=== ${path} ===`);
    console.log('STATE:', JSON.stringify(state, null, 1));
    console.log('ERRORS:', errors.length ? errors.slice(0, 10) : 'none');
    console.log('FAILED REQS:', failedReqs.length ? failedReqs.slice(0, 10) : 'none');
    await page.screenshot({ path: process.env.SHOTDIR ? `${process.env.SHOTDIR}/ios${path.replace(/\//g, '_') || '_home'}.png` : `ios${path.replace(/\//g, '_') || '_home'}.png` });
  } catch (e) {
    console.log(`\n=== ${path} === NAVIGATION FAILED:`, String(e).slice(0, 300));
    console.log('ERRORS:', errors.slice(0, 10));
  }
  await page.close();
}
await browser.close();
