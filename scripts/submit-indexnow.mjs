// Run after deployment: NODE_USE_ENV_PROXY=1 node scripts/submit-indexnow.mjs --submit
// The default is a read-only dry run. IndexNow requests a crawl; it does not
// guarantee indexing or a ranking, and Google is not an IndexNow participant.
import { readFile } from 'node:fs/promises';

const origin = 'https://urbangangtour.co.ke';
const key = (await readFile(new URL('../public/indexnow-key.txt', import.meta.url), 'utf8')).trim();
if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) throw new Error('Invalid IndexNow verification key');
const keyLocation = `${origin}/indexnow-key.txt`;
const fetchSafe = (url, options = {}) => fetch(url, { ...options, signal: AbortSignal.timeout(15_000) });
const sitemap = await fetchSafe(`${origin}/sitemap.xml`);
if (!sitemap.ok) throw new Error(`Sitemap returned HTTP ${sitemap.status}`);
const xml = await sitemap.text();
const decodeXml = value => value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const privatePath = /^\/(?:api|admin|organizer|account|cart|checkout|pay|receipt|tickets|t|verify|review|offline|signup)(?:\/|$)/;
const urls = [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => decodeXml(match[1])))].filter(raw => {
  try {
    const url = new URL(raw);
    return url.origin === origin && !url.username && !url.password && !url.search && !url.hash && !privatePath.test(url.pathname);
  } catch { return false; }
});
if (!urls.length || urls.length > 10_000) throw new Error('Sitemap has no public URLs or exceeds the IndexNow batch limit');
console.log(`Validated ${urls.length} canonical public sitemap URLs; excluded private operational routes.`);
if (!process.argv.includes('--submit')) {
  console.log('Dry run complete. Add --submit after the deployed key is live to request a crawl.');
  process.exit(0);
}
const verification = await fetchSafe(keyLocation, { cache: 'no-store' });
if (!verification.ok || (await verification.text()).trim() !== key) throw new Error('Deployed domain-verification file is missing or does not match. Nothing submitted.');
const response = await fetchSafe('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(origin).hostname, key, keyLocation, urlList: urls }),
});
if (response.status !== 200 && response.status !== 202) throw new Error(`IndexNow returned HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
console.log(`IndexNow accepted ${urls.length} URL crawl requests (HTTP ${response.status}). Search engines decide when and whether to index them.`);
