// Disambiguate: is sheet-link tap navigation broken, or just slow?
import { webkit, devices } from 'playwright';

const BASE = 'https://urbangangtour.co.ke';
const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);
const accept = page.locator('button:has-text("Accept")').first();
if (await accept.count()) { await accept.tap(); await page.waitForTimeout(500); }

// open sheet, tap Shop Merch, time the navigation precisely
await page.locator('.ugt-tabbar button').tap();
await page.waitForTimeout(400);
const t0 = Date.now();
await page.locator('.ugt-sheet-links a', { hasText: 'Shop Merch' }).tap();
try {
  await page.waitForURL('**/shop', { timeout: 30000, waitUntil: 'commit' });
  console.log(`NAV OK in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${page.url()}`);
} catch {
  console.log(`NAV NEVER HAPPENED after 30s. URL: ${page.url()}`);
  const sheet = await page.evaluate(() => {
    const s = document.querySelector('.ugt-sheet');
    const a = [...(s?.querySelectorAll('a') || [])].find((x) => x.textContent.includes('Shop'));
    if (!a) return 'no link';
    const r = a.getBoundingClientRect();
    const topEl = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, href: a.href, covering: topEl ? topEl.tagName + '.' + topEl.className.slice(0, 60) : 'none' };
  });
  console.log('link state:', JSON.stringify(sheet));
}

// also time a plain tab-bar navigation for comparison
const t1 = Date.now();
await page.locator('.ugt-tabbar a', { hasText: 'Tickets' }).tap({ timeout: 10000 }).catch((e) => console.log('tickets tap failed:', String(e).slice(0, 150)));
try {
  await page.waitForURL('**/events', { timeout: 30000, waitUntil: 'commit' });
  console.log(`TABBAR NAV OK in ${((Date.now() - t1) / 1000).toFixed(1)}s -> ${page.url()}`);
} catch {
  console.log(`TABBAR NAV FAILED. URL: ${page.url()}`);
}
await browser.close();
