// Local-only browser proof: no live writes, accounts, payment or notification requests.
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import {chromium} from 'playwright';

const upstream = new URL(process.env.QA_ORIGIN || 'http://127.0.0.1:4186');
assert.ok(upstream.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(upstream.hostname) && upstream.pathname === '/' && !upstream.username && !upstream.password && !upstream.search && !upstream.hash, 'Loopback preview only');
const artifacts = process.env.ARTIFACT_DIR || '/workspace/artifacts/ugt-pwa-20261028';
await mkdir(artifacts, {recursive:true});
const source = await readFile('public/sw.js', 'utf8');
const offlineSource = await readFile('public/offline.html', 'utf8');
let upgraded = 0;
const server = http.createServer(async (request, response) => {
  if (request.url === '/sw.js') {
    response.writeHead(200, {'Content-Type':'application/javascript', 'Cache-Control':'no-store'});
    return response.end(upgraded ? source + (upgraded > 1 ? '\n// QA next release' : '') : source.replace(/ugt-([^']+)'/, "ugt-qa-previous'"));
  }
  if (!['GET', 'HEAD'].includes(request.method)) {
    // Existing auth's read-only identity lookup is a POST. No request leaves this proxy.
    if (request.url === '/api/auth') {response.writeHead(200, {'Content-Type':'application/json'}); return response.end('{"ok":true,"user":null}');}
    response.writeHead(405); return response.end('Writes blocked in local QA');
  }
  try {
    const result = await fetch(new URL(request.url, upstream), {headers:{accept:request.headers.accept || '*/*'}, signal:AbortSignal.timeout(90000)});
    response.statusCode = result.status;
    for (const [key, value] of result.headers) if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(key)) response.setHeader(key, value);
    response.end(Buffer.from(await result.arrayBuffer()));
  } catch {response.writeHead(502); response.end('Local preview unavailable');}
});
// Next dev waits for its same-origin HMR handshake before hydration.
// Forward that local-only socket when this proof runs against a dev preview.
const sockets = new Set();
server.on('upgrade', (request, socket, head) => {
  const remote = net.connect(Number(upstream.port || 80), upstream.hostname);
  sockets.add(socket); sockets.add(remote);
  remote.on('connect', () => {
    const headers = {...request.headers, host:upstream.host, origin:upstream.origin};
    remote.write(`GET ${request.url} HTTP/1.1\r\n${Object.entries(headers).map(([key, value]) => `${key}: ${value}`).join('\r\n')}\r\n\r\n`);
    if (head.length) remote.write(head);
    socket.pipe(remote).pipe(socket);
  });
  remote.on('error', () => socket.destroy()); socket.on('error', () => remote.destroy());
  remote.on('close', () => {sockets.delete(remote); socket.destroy();});
  socket.on('close', () => {sockets.delete(socket); remote.destroy();});
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({executablePath:'/usr/bin/chromium', headless:true, args:['--no-sandbox', '--disable-dev-shm-usage']});
const checks = [], errors = [];
async function context(options = {}) {
  const result = await browser.newContext({locale:'fr-FR', ...options});
  await result.addInitScript(() => {try {localStorage.setItem('ugt-consent', 'no');} catch {}});
  await result.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  return result;
}
async function open(ctx) {
  const page = await ctx.newPage();
  page.setDefaultTimeout(25000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {if (message.type() === 'error') console.error(message.text().slice(0, 350));});
  const response = await page.goto(origin + '/app', {waitUntil:'domcontentloaded', timeout:90000});
  assert.equal(response.status(), 200, '/app is a working route');
  await page.locator('[data-app-ready="true"]').waitFor().catch(async error => {
    console.error(JSON.stringify({errors, url:page.url(), body:(await page.locator('body').innerText()).slice(0, 1200), scripts:await page.locator('script[src]').evaluateAll(nodes => nodes.map(node => node.src))}));
    throw error;
  });
  return page;
}
try {
  const ctx = await context({serviceWorkers:'block'}), page = await open(ctx);
  assert.equal(await page.locator('html').getAttribute('lang'), 'en-KE', 'English first even with a French browser');
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({width, height:900});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `reflow ${width}`);
    assert.ok(await page.locator('[data-app-content] a, [data-app-content] button, [data-app-content] summary').evaluateAll(nodes => nodes.every(node => node.getBoundingClientRect().height >= 44)), `44px targets ${width}`);
    await page.screenshot({path:`${artifacts}/app-${width}.png`, fullPage:true});
  }
  assert.deepEqual(await page.locator('[data-app-links] a').evaluateAll(links => links.map(link => link.getAttribute('href'))), ['/shop', '/orders/track', '/account']);
  await page.evaluate(() => {
    window.__installPrompts = 0;
    const event = new Event('beforeinstallprompt', {cancelable:true});
    Object.assign(event, {prompt:async () => {window.__installPrompts++;}, userChoice:Promise.resolve({outcome:'dismissed'})});
    dispatchEvent(event);
  });
  assert.equal(await page.evaluate(() => window.__installPrompts), 0, 'Installation is never prompted automatically');
  await page.getByRole('button', {name:'Install app', exact:true}).click();
  await page.getByText('Installation cancelled. You can try again from your browser menu.').waitFor();
  assert.equal(await page.evaluate(() => window.__installPrompts), 1);
  await page.evaluate(() => dispatchEvent(new Event('appinstalled')));
  await page.getByText('The app is installed on this device.').waitFor();
  await ctx.setOffline(true);
  await page.getByText('You’re offline', {exact:true}).waitFor();
  await ctx.setOffline(false);
  await page.getByText('Online', {exact:true}).waitFor();
  checks.push('Responsive phone/tablet/desktop, deliberate install/dismissal/installed, connectivity, customer links, English-first');
  await ctx.close();

  const ios = await context({serviceWorkers:'block', userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
  const iphone = await open(ios);
  await iphone.getByText('In Safari, open Share, then Add to Home Screen. Open the new Urban Gang Tour icon.').waitFor();
  await ios.close();
  const denied = await context({serviceWorkers:'block'});
  await denied.addInitScript(() => {Object.defineProperty(window, 'localStorage', {get() {throw new DOMException('Denied', 'SecurityError');}});});
  const privatePage = await open(denied);
  assert.equal(await privatePage.locator('[data-app-links] a').count(), 3);
  await denied.close();
  checks.push('iOS instructions and storage-denied navigation');

  const installed = await context(), app = await open(installed);
  await app.evaluate(async () => {await navigator.serviceWorker.ready;});
  await app.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await app.evaluate(() => {
    localStorage.setItem('ugt-live-cart-v1', '[{"id":"kept-product","qty":1}]');
    const form = document.createElement('form');
    form.innerHTML = '<label>QA draft<input name="draft"></label>';
    form.dataset.pwaQa = 'true'; document.querySelector('[data-app-content]').append(form);
  });
  await app.locator('input[name="draft"]').fill('Keep this work');
  upgraded = 1;
  await app.evaluate(async () => {await (await navigator.serviceWorker.getRegistration()).update();});
  await app.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting));
  await app.getByText('An update is ready', {exact:true}).waitFor();
  assert.equal(await app.getByRole('button', {name:'Update app', exact:true}).isDisabled(), true, 'Update cannot discard a dirty form');
  assert.equal(await app.locator('input[name="draft"]').inputValue(), 'Keep this work');
  // Simulate another open tab accepting the waiting worker: this tab keeps its form.
  await app.evaluate(async () => {(await navigator.serviceWorker.getRegistration()).waiting.postMessage({type:'SKIP_WAITING'});});
  await app.getByText('The update is installed', {exact:true}).waitFor();
  assert.equal(await app.locator('input[name="draft"]').inputValue(), 'Keep this work');
  assert.match(await app.evaluate(() => localStorage.getItem('ugt-live-cart-v1')), /kept-product/);
  await app.reload({waitUntil:'domcontentloaded'});
  await app.locator('[data-app-ready="true"]').waitFor();
  assert.match(await app.evaluate(() => localStorage.getItem('ugt-live-cart-v1')), /kept-product/);
  upgraded = 2;
  await app.evaluate(async () => {await (await navigator.serviceWorker.getRegistration()).update();});
  await app.getByText('An update is ready', {exact:true}).waitFor();
  await Promise.all([app.waitForEvent('domcontentloaded'), app.getByRole('button', {name:'Update app', exact:true}).click()]);
  await app.locator('[data-app-ready="true"]').waitFor();
  assert.match(await app.evaluate(() => localStorage.getItem('ugt-live-cart-v1')), /kept-product/);
  const offlineAssets = [], priorDocumentRequests = [], priorDocumentUrl = app.url();
  const trackOfflineAssets = request => {
    if (request.resourceType() === 'document') return;
    // DOMContentLoaded precedes the previous React page's release-client effect.
    // Attribute requests to their document rather than that overlapping interval.
    let frameUrl;try {frameUrl = request.frame().url();} catch {}
    if (frameUrl === priorDocumentUrl) {priorDocumentRequests.push(request.url());return;}
    // Chromium may finish its previous tab-icon request after the navigation.
    // This browser-UI request is not an offline-document dependency; an actual
    // image element would have resourceType=image and is still rejected below.
    if (request.resourceType() === 'other' && new URL(request.url()).pathname === '/icon-48.png') {priorDocumentRequests.push(request.url());return;}
    offlineAssets.push({url:request.url(),type:request.resourceType(),frameUrl});
  };
  app.on('request', trackOfflineAssets);
  await installed.setOffline(true);
  const offline = await app.goto(origin + '/about', {waitUntil:'domcontentloaded'});
  assert.equal(offline.status(), 200);
  assert.equal(await offline.text(), offlineSource, 'The worker serves the exact self-contained fallback');
  await app.getByRole('heading', {name:/offline/i}).waitFor();
  assert.equal(await app.locator('html').getAttribute('lang'), 'en-KE', 'Offline remains English first with a French browser');
  assert.equal(await app.locator('script[src], link[rel="stylesheet"], img, video, audio, iframe').count(), 0, 'Offline has no external UI assets or React chunks');
  assert.equal(await app.getByRole('link', {name:'Get the app', exact:true}).getAttribute('href'), '/app');
  assert.deepEqual(errors, [], 'Offline fallback has no uncaught page errors with JavaScript enabled');
  assert.deepEqual(offlineAssets, [], 'Offline rendering requests no external UI assets');
  await Promise.all([app.waitForURL(origin + '/'), app.getByRole('link', {name:'Try again', exact:true}).click()]);
  await app.getByRole('heading', {name:/offline/i}).waitFor();
  app.off('request', trackOfflineAssets);
  for (const path of ['/api/orders', '/orders/track?ref=private', '/account']) {
    const result = await app.evaluate(async path => {try {await fetch(path); return 'unexpected response';} catch {return 'network unavailable';}}, path);
    assert.equal(result, 'network unavailable', `No offline substitution for ${path}`);
  }
  assert.equal(await app.evaluate(async () => {const keys = await caches.keys(); return keys.some(key => key === 'ugt-qa-previous');}), false);
  assert.equal(await app.getByRole('link', {name:'Try again', exact:true}).getAttribute('href'), '/');
  const cdp = await installed.newCDPSession(app);
  await cdp.send('Emulation.setScriptExecutionDisabled', {value:true});
  await Promise.all([app.waitForURL(origin + '/'), app.getByRole('link', {name:'Try again', exact:true}).click()]);
  await app.getByRole('heading', {name:/offline/i}).waitFor();
  await installed.close();
  checks.push('Real controlling worker upgrade waits; dirty form and cart survive other-tab activation; exact self-contained public offline fallback without external assets or page errors; private/API bypass; old cache cleanup; native offline retry with and without JavaScript');
  assert.deepEqual(errors, []);
  await writeFile(`${artifacts}/pwa-proof.json`, JSON.stringify({checks, errors, priorDocumentRequests, browser:'Local Chromium; normal TLS; no live writes'}, null, 2) + '\n');
  console.log(JSON.stringify({passed:true, checks, artifacts}));
} finally {
  await browser.close();
  for (const socket of sockets) socket.destroy();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
