// Events page verification script — checks SSR rendering, layout, and SEO markup
// at mobile and desktop viewports using Playwright.
import { chromium } from 'playwright';

const BASE = 'http://localhost:3100';
const results = [];

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}

const browser = await chromium.launch();

// --- Mobile viewports ---
const mobileSizes = [
  { width: 360, height: 800, name: '360px (budget Android)' },
  { width: 375, height: 667, name: '375px (iPhone SE)' },
  { width: 390, height: 844, name: '390px (iPhone 14)' },
  { width: 412, height: 915, name: '412px (Android large)' },
];

for (const vp of mobileSizes) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  await page.goto(`${BASE}/events`, { waitUntil: 'networkidle' });

  // Check key content is present
  const hero = await page.locator('text=Urban Gang Live').count();
  check(`[${vp.name}] Hero renders`, hero > 0);

  const find = await page.locator('text=Find your next plot').count();
  check(`[${vp.name}] Discovery headline`, find > 0);

  const search = await page.locator('input[type="search"]').count();
  check(`[${vp.name}] Search input`, search > 0);

  const filters = await page.locator('button:has-text("Nairobi"), button:has-text("Campus")').count();
  check(`[${vp.name}] Filter chips`, filters > 0);

  // Check horizontal overflow
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  check(`[${vp.name}] No horizontal overflow`, !overflow);

  // Check JSON-LD
  const jsonld = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    return Array.from(scripts).map((s) => s.textContent).join('\n');
  });
  check(`[${vp.name}] JSON-LD present`, jsonld.includes('schema.org'));

  // Check canonical
  const canonical = await page.evaluate(() => document.querySelector('link[rel="canonical"]')?.href || '');
  check(`[${vp.name}] Canonical URL`, canonical.includes('/events'), canonical);

  await page.screenshot({ path: `C:/Users/eugin/AppData/Local/Temp/opencode/verify-events-${vp.width}.png`, fullPage: true });
  await page.close();
}

// --- Desktop viewport ---
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/events`, { waitUntil: 'networkidle' });
  check('[Desktop] Hero renders', (await page.locator('text=Urban Gang Live').count()) > 0);
  check('[Desktop] No horizontal overflow', await page.evaluate(() => !(document.documentElement.scrollWidth > document.documentElement.clientWidth)));
  await page.screenshot({ path: 'C:/Users/eugin/AppData/Local/Temp/opencode/verify-events-desktop.png', fullPage: true });
  await page.close();
}

// --- Event detail page (404 for non-existent) ---
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const resp = await page.goto(`${BASE}/events/non-existent-event`, { waitUntil: 'networkidle' });
  check('[Detail] 404 for non-existent slug', resp.status() === 404, `status=${resp.status()}`);
  await page.close();
}

// --- Summary ---
const failed = results.filter((r) => !r.ok);
console.log(`\n${'='.repeat(50)}`);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('\nFailed checks:');
  failed.forEach((f) => console.log(`  ✗ ${f.name}${f.detail ? ' — ' + f.detail : ''}`));
  process.exit(1);
} else {
  console.log('\nAll checks passed.');
}

await browser.close();
