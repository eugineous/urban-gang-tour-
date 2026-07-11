import { webkit, devices } from 'playwright';
const browser = await webkit.launch();
const page = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
await page.goto('https://urbangangtour.co.ke/t/TKT-KCYGM4QYHP-5DVU', { waitUntil: 'commit', timeout: 90000 });
await page.waitForTimeout(9000);
await page.screenshot({ path: process.env.SHOT, fullPage: false });
console.log('shot saved');
await browser.close();
