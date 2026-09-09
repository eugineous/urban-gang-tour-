import assert from 'node:assert/strict';
import { chromium, webkit, devices } from 'playwright';

const base = process.env.BASE || 'http://localhost:3100';
for (const [engine, device] of [[chromium, devices['Pixel 7']], [webkit, devices['iPhone 13']], [chromium, { viewport: { width: 1440, height: 900 } }]]) {
  const browser = await engine.launch({ headless: true });
  const context = await browser.newContext(device);
  const errors = [];
  await context.addInitScript(() => {
    localStorage.setItem('ugt_cart', JSON.stringify([{ id: 'removed-product', qty: 2 }]));
  });
  // Delay the gallery response until after boot to exercise the real data race.
  await context.route('**/api/site-data/gallery', async route => {
    await new Promise(resolve => setTimeout(resolve, 3500));
    await route.fulfill({ json: { photos: [{ id: 991, url: '/assets/gal/g-runway.jpg', category: 'Published Test Album' }] } });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#dc-root')?.children.length > 0);
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#ssr-shell')).display === 'none');
  assert.equal(await page.locator('#boot-veil').isVisible(), false);
  await page.evaluate(() => window.__UGT_GO('gallery'));
  await page.getByRole('heading', { name: 'Published Test Album', exact: true }).waitFor();
  assert.ok(await page.locator('#dc-root main img').count() > 0);
  for (let i = 0; i < 8; i++) {
    await page.evaluate(i => window.scrollTo(0, i % 2 ? 0 : document.body.scrollHeight), i);
    await page.waitForTimeout(100);
  }
  await page.evaluate(() => window.__UGT_GO('events'));
  await page.locator('#dc-root').getByRole('button', { name: /get tickets|buy tickets/i }).first().click();
  const phone = page.locator('#dc-root input[placeholder="M-Pesa number"]');
  await phone.fill('0712345678');
  await page.waitForTimeout(4500);
  assert.equal(await phone.inputValue(), '0712345678');
  assert.ok(await page.locator('#dc-root button[type="submit"]').count());
  await page.screenshot({ path: `mobile-check-${engine.name()}-${device.viewport.width}.png` });
  assert.deepEqual(errors, [], 'No runtime errors during stale-cart recovery, navigation, scrolling or typing');
  console.log(`PASS ${engine.name()} ${device.viewport.width}: stale cart, delayed gallery, scroll, ticket form`);
  await browser.close();
}
