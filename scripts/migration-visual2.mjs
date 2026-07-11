import { webkit, devices } from 'playwright';
const browser = await webkit.launch();
const page = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
const SHOT = process.env.SHOTDIR;

for (const p of ['/shop', '/events', '/experience']) {
  await page.goto('https://urbangangtour.co.ke' + p, { waitUntil: 'commit', timeout: 90000 });
  await page.waitForTimeout(8000);
  const accept = page.locator('button:has-text("Accept")').first();
  if (await accept.count()) { await accept.tap(); await page.waitForTimeout(500); }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOT}/mig2${p.replace(/\//g, '_')}.png`, fullPage: false });
  console.log(p, 'shot saved (cookie dismissed)');
}
await browser.close();
