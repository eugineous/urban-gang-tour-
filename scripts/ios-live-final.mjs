import { webkit, devices } from 'playwright';
const browser = await webkit.launch();
const page = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));
const rep = (s, ok, x = '') => console.log(`${ok ? 'PASS' : 'FAIL'} | ${s}${x ? ' | ' + x : ''}`);

await page.goto('https://urbangangtour.co.ke/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.__UGT_GO === 'function', null, { timeout: 40000 }).catch(() => {});
rep('runtime boots on live', await page.evaluate(() => typeof window.__UGT_GO === 'function'));
const a = page.locator('button:has-text("Accept")').first();
if (await a.count()) await a.tap();
await page.evaluate(() => { window.__M = 1; });

// tab bar nav — instant, in-app
let t = Date.now();
await page.locator('.ugt-tabbar a', { hasText: 'Shop' }).tap();
await page.waitForFunction(() => location.pathname === '/shop', null, { timeout: 8000 }).catch(() => {});
const shop = await page.evaluate(() => ({ p: location.pathname, m: window.__M, c: /WEAR THE CULTURE/i.test(document.body.innerText) }));
rep('tap Shop -> instant in-app', shop.p === '/shop' && shop.m === 1 && shop.c, `${Date.now() - t}ms, no reload: ${shop.m === 1}`);

// menu sheet nav
await page.locator('.ugt-tabbar button').tap();
await page.waitForTimeout(300);
t = Date.now();
await page.locator('.ugt-sheet-links a', { hasText: 'Urban News' }).tap();
await page.waitForFunction(() => location.pathname === '/urban-news', null, { timeout: 8000 }).catch(() => {});
const news = await page.evaluate(() => ({ p: location.pathname, m: window.__M, sheet: !!document.querySelector('.ugt-sheet'), c: /PAPER OF RECORD/i.test(document.body.innerText) }));
rep('menu sheet -> Urban News in-app, sheet closes', news.p === '/urban-news' && news.m === 1 && !news.sheet && news.c, `${Date.now() - t}ms`);

// back button
await page.goBack();
await page.waitForTimeout(1000);
rep('back button in-app', await page.evaluate(() => location.pathname === '/shop' && window.__M === 1));

// shell fallback has real images now (crawler/no-JS view)
const shell = await page.evaluate(async () => (await (await fetch('/the-gang')).text()).match(/<img[^>]+src="\/assets\//g)?.length || 0);
rep('SSR shell serves real image URLs', shell > 10, `${shell} imgs on /the-gang`);

// error beacon endpoint alive
const beacon = await page.evaluate(async () => (await fetch('/api/client-error', { method: 'POST', body: JSON.stringify({ msg: 'beacon-selftest', page: '/test' }) })).status);
rep('error beacon endpoint live', beacon === 204, `status ${beacon}`);

await page.screenshot({ path: process.env.SHOTDIR + '/ios-live-final.png' });
console.log('PAGE ERRORS:', errors.length ? errors : 'none');
await browser.close();
