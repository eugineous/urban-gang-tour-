// Regenerate the public SSR fragments from the same working runtime visitors
// use. Public catalogue reads are optional; no credentials or writes occur.
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';
const base = process.env.BASE || 'http://localhost:3100';
const source = process.env.PUBLIC_SOURCE;
const feeds = new Map();
if (source) {
  for (const path of ['/api/site-data/events', '/api/site-data/products', '/api/site-data/gallery', '/api/site-data/posts', '/api/promos']) {
    const { stdout } = await promisify(execFile)('curl', ['-fsS', '--max-time', '30', new URL(path, source).href], { maxBuffer: 8 * 1024 * 1024 });
    feeds.set(path, JSON.parse(stdout));
  }
}
const routes = { home: '/', about: '/about', gang: '/the-gang', exp: '/experience', events: '/events', shop: '/shop', gallery: '/gallery', partners: '/partners', contact: '/book', work: '/work-with-us' };
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  await context.route('**/api/**', route => {
    const request = route.request();
    if (request.method() !== 'GET') return route.abort();
    const feed = feeds.get(new URL(request.url()).pathname);
    return feed ? route.fulfill({ json: feed }) : route.continue();
  });
  const page = await context.newPage();
  for (const [key, path] of Object.entries(routes)) {
    await page.goto(base + path, { waitUntil: 'domcontentloaded' });
    await page.locator('#v25-host[data-ready="1"]').waitFor({ timeout: 20000 });
    await page.waitForTimeout(900);
    const html = await page.locator('#dc-root main').evaluate(main => {
      const copy = main.cloneNode(true);
      copy.removeAttribute('id');
      copy.removeAttribute('tabindex');
      copy.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('seen'));
      return copy.outerHTML;
    });
    if (!html.includes('<h1') || html.includes('{{')) throw new Error(`Invalid capture: ${key}`);
    await writeFile(`app/_rendered/${key}.html`, html + '\n');
    console.log(`Captured original V25 ${key}`);
  }
} finally { await browser.close(); }
