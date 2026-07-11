import { webkit, devices } from 'playwright';
const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
await page.goto('https://urbangangtour.co.ke/admin', { waitUntil: 'commit', timeout: 90000 });
await page.waitForTimeout(3000);
// try the access code login
const codeInput = page.locator('input[type="password"], input[placeholder*="code" i]').first();
if (await codeInput.count()) {
  await codeInput.fill('UGT-BAB6F0');
  const btn = page.locator('button:has-text("Enter"), button:has-text("Control Room"), button[type="submit"]').first();
  if (await btn.count()) await btn.click();
}
await page.waitForTimeout(4000);
await page.screenshot({ path: process.env.SHOT1 });
// try to find Events tab
const eventsTab = page.locator('text=Events').first();
if (await eventsTab.count()) {
  await eventsTab.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: process.env.SHOT2 });
}
await browser.close();
