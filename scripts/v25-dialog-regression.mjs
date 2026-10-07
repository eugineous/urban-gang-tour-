import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route('**/api/site-data/products', r => r.fulfill({ json: { products: [{ id: 'dialog-test', name: 'Dialog test', price: 100, image: '/assets/merch/magenta-tee.png', variants: [] }] } }));
  await page.goto((process.env.BASE || 'http://localhost:3100') + '/shop?item=dialog-test');
  await page.locator('#v25-host[data-ready="1"]').waitFor();
  const add = page.getByRole('button', { name: 'ADD TO BAG', exact: true });
  await add.waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await add.count(), 0, 'Escape closes product options');
  console.log('PASS keyboard dismissal on mobile V25 product options');
} finally { await browser.close(); }
