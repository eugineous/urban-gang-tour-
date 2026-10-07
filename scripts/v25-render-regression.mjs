import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.BASE || 'http://localhost:3100';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const path of ['/about', '/the-gang', '/events', '/gallery', '/shop', '/', '/experience', '/partners', '/book']) {
      await page.goto(base + path, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelector('#dc-root main') && getComputedStyle(document.querySelector('#ssr-shell')).display === 'none', { timeout: 15000 });
      assert.equal(await page.locator('#boot-veil').isVisible(), false, path + ': loading veil must finish');
      assert.equal(await page.locator('.ugt-mobile-app').count(), 0, path + ': one V25 renderer');
      assert.equal(await page.locator('#dc-root h1:visible').count(), 1, path + ': one visible main heading');
      assert.equal((await page.locator('body').innerText()).includes('{{'), false, path + ': no unresolved bindings');
      assert.equal(await page.locator('#dc-root .sc-logic-error').count(), 0, path + ': no runtime fallback error');
      assert.ok(await page.locator('link[rel="canonical"]').getAttribute('href'), path + ': canonical is present');
      if (width === 390) assert.equal(await page.getByRole('button', { name: 'Open site menu' }).isVisible(), true);
      if (['/', '/about', '/shop'].includes(path)) await page.screenshot({ path: `/workspace/v25-after-${path === '/' ? 'home' : path.slice(1)}-${width}.png`, fullPage: false });
    }
    await page.goto(base + '/about');
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#ssr-shell')).display === 'none');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#ssr-shell')).display === 'none');
    assert.deepEqual(errors, [], 'No browser errors on public navigation or reload');
    await context.close();
    console.log(`PASS V25 routes and refresh at ${width}px`);
  }
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(base + '/about');
  assert.equal(await page.locator('#ssr-shell h1:visible').count(), 1, 'Server-rendered fallback remains visible without JavaScript');
  assert.equal(await page.locator('#boot-veil').isVisible(), false);
  await context.close();
  console.log('PASS accessible no-JavaScript page fallback');
} finally { await browser.close(); }
