// Verify instant in-app navigation on WebKit iPhone emulation.
import { webkit, devices } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
let docLoads = 0;
page.on('framenavigated', (f) => { if (f === page.mainFrame()) docLoads++; });

const report = (step, ok, extra = '') => console.log(`${ok ? 'PASS' : 'FAIL'} | ${step}${extra ? ' | ' + extra : ''}`);

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
// wait for runtime boot
await page.waitForFunction(() => typeof window.__UGT_GO === 'function', null, { timeout: 30000 }).catch(() => {});
const booted = await page.evaluate(() => typeof window.__UGT_GO === 'function');
report('runtime booted, __UGT_GO exposed', booted);
const accept = page.locator('button:has-text("Accept")').first();
if (await accept.count()) { await accept.tap(); await page.waitForTimeout(400); }

// shell images restored (lazy) — count real-src imgs in the SSR shell markup we served
const shellImgs = await page.evaluate(async () => {
  const r = await fetch('/the-gang');
  const html = await r.text();
  return (html.match(/<img[^>]+src="\/assets\//g) || []).length;
});
report('SSR shell serves real image URLs again', shellImgs > 10, `imgs with /assets src on /the-gang: ${shellImgs}`);

const loadsBefore = docLoads;

// 1. tab bar -> Tickets: must be INSTANT (in-app), URL changes, no doc reload
const t0 = Date.now();
await page.locator('.ugt-tabbar a', { hasText: 'Tickets' }).tap();
await page.waitForFunction(() => location.pathname === '/events', null, { timeout: 5000 }).catch(() => {});
const dt1 = Date.now() - t0;
const onEvents = await page.evaluate(() => ({ path: location.pathname, text: document.body.innerText.slice(0, 300) }));
report('tab bar -> /events in-app', onEvents.path === '/events' && dt1 < 3000, `${dt1}ms, path=${onEvents.path}`);
report('no full page reload', docLoads === loadsBefore, `docLoads delta: ${docLoads - loadsBefore}`);
report('/events content rendered', /ticket|event|gituamba/i.test(onEvents.text), onEvents.text.replace(/\s+/g, ' ').slice(0, 80));

// 2. menu sheet -> The Gang, sheet must close
await page.locator('.ugt-tabbar button').tap();
await page.waitForTimeout(300);
const t1 = Date.now();
await page.locator('.ugt-sheet-links a', { hasText: 'The Gang' }).tap();
await page.waitForFunction(() => location.pathname === '/the-gang', null, { timeout: 5000 }).catch(() => {});
const dt2 = Date.now() - t1;
const sheetGone = await page.evaluate(() => !document.querySelector('.ugt-sheet'));
const gangPath = await page.evaluate(() => location.pathname);
report('sheet -> /the-gang in-app', gangPath === '/the-gang' && dt2 < 3000, `${dt2}ms`);
report('menu sheet closed after nav', sheetGone);
report('still no full reload', docLoads === loadsBefore, `delta: ${docLoads - loadsBefore}`);

// 3. back button -> in-app back to /events
await page.goBack();
await page.waitForTimeout(1200);
const backPath = await page.evaluate(() => location.pathname);
report('browser back in-app -> /events', backPath === '/events', `path=${backPath}, reloads delta: ${docLoads - loadsBefore}`);

// 4. blog link still does a real navigation (no runtime there)
await page.evaluate(() => { const a = document.createElement('a'); a.href = '/blog'; a.id = 'testblog'; a.textContent = 'b'; a.style.cssText = 'position:fixed;top:4px;left:4px;z-index:9999;font-size:30px'; document.body.appendChild(a); });
await page.locator('#testblog').tap();
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(1500);
report('blog link -> real navigation', page.url().includes('/blog') && docLoads > loadsBefore, page.url());

await page.screenshot({ path: (process.env.SHOTDIR || '.') + '/ios-inapp-final.png' });
console.log('\nPAGE ERRORS:', errors.length ? errors : 'none');
await browser.close();
