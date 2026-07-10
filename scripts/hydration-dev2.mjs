import { webkit, devices } from 'playwright';
const browser = await webkit.launch();
const page = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
const msgs = [];
page.on('console', (m) => msgs.push(m.text()));
page.on('pageerror', (e) => msgs.push('PAGEERROR: ' + String(e)));
await page.goto('http://localhost:3210/shop', { waitUntil: 'commit', timeout: 120000 });
await page.waitForTimeout(15000);
const hyd = msgs.filter((t) => /hydrat|match/i.test(t));
for (const h of hyd.slice(0, 2)) {
  // print the tail where React shows the mismatching element diff
  console.log('LEN', h.length, '>>>', h.slice(0, 200).replace(/\n/g, ' '), ' ......TAIL:', h.slice(-1200).replace(/\n/g, ' | '));
}
await browser.close();
