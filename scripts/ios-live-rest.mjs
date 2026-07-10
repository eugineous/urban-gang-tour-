import { webkit, devices } from 'playwright';
const browser = await webkit.launch();
const page = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
const rep = (s, ok, x = '') => console.log(`${ok ? 'PASS' : 'FAIL'} | ${s}${x ? ' | ' + x : ''}`);

await page.goto('https://urbangangtour.co.ke/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.__UGT_GO === 'function', null, { timeout: 40000 });
const a = page.locator('button:has-text("Accept")').first();
if (await a.count()) await a.tap();
await page.evaluate(() => { window.__M = 1; });
await page.locator('.ugt-tabbar a', { hasText: 'Shop' }).tap();
await page.waitForFunction(() => location.pathname === '/shop', null, { timeout: 8000 });
await page.goBack({ waitUntil: 'commit' });
await page.waitForTimeout(1200);
const back = await page.evaluate(() => ({ p: location.pathname, m: window.__M, home: /YOU ALREADY KNOW US/i.test(document.body.innerText) }));
rep('back button in-app to home', back.p === '/' && back.m === 1 && back.home, JSON.stringify(back));

const shell = await page.evaluate(async () => (await (await fetch('/the-gang')).text()).match(/<img[^>]+src="\/assets\//g)?.length || 0);
rep('SSR shell serves real image URLs', shell > 10, `${shell} imgs on /the-gang`);

const beacon = await page.evaluate(async () => (await fetch('/api/client-error', { method: 'POST', body: JSON.stringify({ msg: 'beacon-selftest', page: '/selftest' }) })).status);
rep('error beacon endpoint live', beacon === 204, `status ${beacon}`);
await page.screenshot({ path: process.env.SHOTDIR + '/ios-live-final.png' });
await browser.close();
