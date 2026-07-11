import { webkit, devices } from 'playwright';
const browser = await webkit.launch();
const page = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));

const SHOT = process.env.SHOTDIR;
for (const p of ['/shop', '/events', '/experience']) {
  await page.goto('https://urbangangtour.co.ke' + p, { waitUntil: 'commit', timeout: 90000 });
  await page.waitForTimeout(10000);
  await page.screenshot({ path: `${SHOT}/mig${p.replace(/\//g, '_')}.png` });
  console.log(p, 'shot saved');
}
console.log('page errors:', errors.length ? errors : 'NONE');
await browser.close();
