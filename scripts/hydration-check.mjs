import { webkit, devices } from 'playwright';
const browser = await webkit.launch();
const page = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
for (const p of ['/', '/shop']) {
  await page.goto('https://urbangangtour.co.ke' + p, { waitUntil: 'commit', timeout: 90000 });
  await page.waitForTimeout(12000);
}
const react418 = errors.filter((e) => e.includes('418') || e.includes('Hydration'));
console.log('React hydration errors across / and /shop:', react418.length ? react418 : 'NONE');
console.log('other page errors:', errors.filter((e) => !e.includes('418')).map((e) => e.slice(0, 80)) .join(' | ') || 'none');
await browser.close();
