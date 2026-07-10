import { webkit, devices } from 'playwright';
const browser = await webkit.launch();
const page = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
const t0 = Date.now();
await page.goto('https://urbangangtour.co.ke/', { waitUntil: 'domcontentloaded' });
// poll: first moment ANY video is actually progressing (currentTime > 0)
const playingAt = await page.waitForFunction(() => {
  const vs = [...document.querySelectorAll('video')];
  return vs.some((v) => v.currentTime > 0.05 && !v.paused) ? Date.now() : false;
}, null, { timeout: 30000, polling: 200 }).then(() => Date.now() - t0).catch(() => -1);
const state = await page.evaluate(() => [...document.querySelectorAll('video')].map((v) => ({
  src: (v.currentSrc || v.src || '').split('/').pop(), t: +v.currentTime.toFixed(2), paused: v.paused, ready: v.readyState,
})));
console.log('video playing after (ms since nav):', playingAt);
console.log('videos:', JSON.stringify(state));
await browser.close();
