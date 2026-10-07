import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.BASE || 'http://localhost:3100';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const ready = page => page.locator('#v25-host[data-ready="1"]').waitFor();
try {
  for (const width of [320, 390, 414]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
    await context.route('**/api/site-data/events', route => route.fulfill({ json: { events: [] } }));
    await context.route('**/api/site-data/products', route => route.fulfill({ json: { products: [{ id: 'journey-shirt', name: 'Journey Shirt', price: 900, image: '/assets/gal/g-street.jpg', variants: [] }] } }));
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base); await ready(page);
    const primary = page.locator('#dc-root [data-hero]').getByRole('button', { name: /^book the tour$/i });
    const primaryRect = await primary.boundingBox();
    const tabs = page.getByRole('navigation', { name: 'Primary', exact: true });
    assert.ok(primaryRect.y + primaryRect.height < (await tabs.boundingBox()).y, 'Main action above mobile navigation');
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
    const scroll = await page.evaluate(() => window.scrollY);
    await page.getByRole('button', { name: 'Open site menu', exact: true }).click();
    const menu = page.getByRole('dialog', { name: 'Site menu', exact: true });
    assert.equal(await menu.isVisible(), true);
    assert.equal(await page.getByRole('button', { name: 'Close menu', exact: true }).evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await menu.evaluate(el => el.contains(document.activeElement)), true);
    await page.keyboard.press('Escape');
    assert.equal(await menu.count(), 0);
    assert.ok(Math.abs((await page.evaluate(() => window.scrollY)) - scroll) < 2, 'Closing menu preserves reading position');
    await tabs.getByRole('link', { name: 'Shop', exact: true }).click(); await ready(page);
    assert.equal(await tabs.getByRole('link', { name: 'Shop', exact: true }).getAttribute('aria-current'), 'page');
    assert.equal(await page.locator('#dc-root [data-screen-label="Shop"]').evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.getByRole('button', { name: /^add to bag$/i }).first().scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await tabs.getByRole('link', { name: 'Events', exact: true }).click(); await ready(page);
    const empty = page.locator('#dc-root [data-events-empty]');
    assert.equal(await empty.isVisible(), true);
    await empty.getByRole('link', { name: /Explore the school tour/ }).click();
    await page.waitForURL('**/tour-stops');
    await page.goBack(); await ready(page);
    assert.equal(await empty.isVisible(), true);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS mobile ${width}: action visibility, scroll/menu focus, navigation, shop and honest empty-events recovery`);
  }
} finally { await browser.close(); }
