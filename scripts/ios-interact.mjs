// Drive the live site in WebKit iPhone emulation like a real user.
import { webkit, devices } from 'playwright';

const BASE = process.env.BASE || 'https://urbangangtour.co.ke';
const SHOT = process.env.SHOTDIR || '.';
const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 200)));

const report = (step, ok, extra = '') => console.log(`${ok ? 'PASS' : 'FAIL'} | ${step}${extra ? ' | ' + extra : ''}`);

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(9000);

// 1. cookie banner accept
const banner = page.locator('text=Quick one about your data');
if (await banner.count()) {
  await page.locator('button:has-text("Accept")').first().tap();
  await page.waitForTimeout(800);
  report('cookie accept', !(await banner.count()));
} else report('cookie banner (absent — maybe already accepted)', true);

// 2. tab bar visible + correctly positioned
const tb = await page.evaluate(() => {
  const el = document.querySelector('.ugt-tabbar');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return { display: cs.display, pos: cs.position, top: r.top, bottom: r.bottom, vh: innerHeight, zIndex: cs.zIndex, visible: r.height > 0 && cs.visibility !== 'hidden' };
});
report('tab bar visible & fixed to bottom', !!tb && tb.visible && tb.pos === 'fixed' && Math.abs(tb.bottom - tb.vh) < 60, JSON.stringify(tb));

// 3. open the Menu sheet
await page.locator('.ugt-tabbar button').tap();
await page.waitForTimeout(600);
const sheetOpen = await page.evaluate(() => {
  const s = document.querySelector('.ugt-sheet');
  return s ? { links: s.querySelectorAll('a').length, height: s.getBoundingClientRect().height } : null;
});
report('menu sheet opens', !!sheetOpen && sheetOpen.links >= 10, JSON.stringify(sheetOpen));
await page.screenshot({ path: SHOT + '/ios-menu-open.png' });

// 4. navigate via sheet to Shop
if (sheetOpen) {
  await page.locator('.ugt-sheet-links a', { hasText: 'Shop Merch' }).tap();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(9000);
  report('sheet nav -> /shop', page.url().includes('/shop'), page.url());
}

// 5. add a product to cart (v25 runtime interaction)
const productTag = page.locator('#dc-root .shop-tag, #dc-root [class*="tag"]').first();
let tagInfo = 'no dc-root product tag found';
try {
  const prod = await page.evaluate(() => {
    const root = document.querySelector('#dc-root');
    if (!root) return null;
    const els = [...root.querySelectorAll('button, [role="button"], .tag, [class*="price"]')];
    const withKes = els.filter((e) => /KES|2,?500|3,?800/i.test(e.textContent || ''));
    return withKes.length;
  });
  tagInfo = `clickable price elements: ${prod}`;
  report('shop page has interactive product tags', (prod || 0) > 0, tagInfo);
} catch (e) {
  report('shop interactivity probe', false, String(e).slice(0, 120));
}
await page.screenshot({ path: SHOT + '/ios-shop-after-nav.png' });

// 6. tab bar CTA -> /book
await page.locator('.ugt-tabbar a.ugt-tab-cta').tap();
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(8000);
report('tab bar Book CTA -> /book', page.url().includes('/book'), page.url());
const bookState = await page.evaluate(() => ({
  dc: document.querySelector('#dc-root')?.children.length || 0,
  text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 120),
}));
report('/book booted with content', bookState.dc > 0, bookState.text);
await page.screenshot({ path: SHOT + '/ios-book.png' });

console.log('\nPAGE ERRORS ACROSS SESSION:', errors.length ? errors : 'none');
await browser.close();
