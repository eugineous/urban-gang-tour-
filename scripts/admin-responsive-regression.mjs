// Local UI fixtures only. No real login, records, document generation or writes.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const base = process.env.BASE_URL || 'http://127.0.0.1:3010';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Local fixtures only');
const out = process.env.UGT_ADMIN_EVIDENCE_DIR || '/workspace/artifacts/ugt-home-energy-20261024/admin-after';
await mkdir(out, {recursive: true});
const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
const results = [], failures = [];
let checks = 0;
const check = (condition, message) => {checks++; if (!condition) failures.push(message);};
const rect = async (locator) => locator.evaluate(element => {
  const {width, height, top, left} = element.getBoundingClientRect();
  return {width, height, top, left};
});
try {
  for (const [name, width, height] of [['narrow',320,800], ['phone',390,844], ['tablet',820,900], ['desktop',1440,1000], ['short',915,412]]) {
    const context = await browser.newContext({viewport: {width, height}, serviceWorkers: 'block'});
    await context.addInitScript(() => localStorage.setItem('ugt-consent', 'no'));
    const writes = [], errors = [];
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== new URL(base).origin) return route.abort();
      if (url.pathname.startsWith('/api/')) return route.fulfill({status: 503, json: {error: 'outside_local_fixture'}});
      return route.continue();
    });
    await context.route('**/api/admin/**', route => {
      const request = route.request(), url = new URL(request.url()), view = url.searchParams.get('view');
      if (!['GET','HEAD'].includes(request.method()) && url.pathname !== '/api/admin/docs/preview') writes.push(url.pathname);
      if (url.pathname === '/api/admin/me') return route.fulfill({json: {ok: true, scope: 'super_admin', perms: []}});
      if (view === 'stats') return route.fulfill({json: {ok: true, rows: [{new_bookings: 3, orders: 5, revenue: 12000, posts: 4, hits_7d: 102}]}});
      if (view === 'worklist') return route.fulfill({json: {ok: true, period: 'Today', generatedAt: new Date().toISOString(), items: [], sources: []}});
      if (view === 'orders') return route.fulfill({json: {ok: true, rows: [{id: 'fixture-order', total: 2500, status: 'paid', name: 'Fictional Buyer', phone: '', mpesa_receipt: 'FIXTURE', items: []}]}});
      if (view === 'documents') return route.fulfill({json: {ok: true, rows: [{id: 1, doc_number: 'INV-FIXTURE', doc_type: 'invoice', created_at: '2026-10-24', status: 'sent', lines: [{label: 'Fixture service', qty: 1, amount: 2500}], paid: 0, bill_to: {name: 'Fictional Recipient'}}]}});
      if (url.pathname === '/api/admin/docs/list') return route.fulfill({json: {ok: true, rows: [{id: 'fixture-doc', serial: 'UGT-FIXTURE', type: 'invoice', issued_to: 'Fictional Recipient', created_at: '2026-10-24', status: 'final', pdf_url: '/api/admin/docs/file/fixture'}]}});
      return route.fulfill({json: {ok: true, rows: [], items: [], sources: []}});
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(120000);
    page.on('pageerror', error => errors.push(error.message));
    const noOverflow = async label => {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      check(overflow <= 1, `${name}: ${label} page overflows by ${overflow}px`);
      return overflow;
    };

    await page.goto(base + '/admin');
    await page.locator('.cr-quick-action').first().waitFor();
    const quickActions = await page.locator('.cr-quick-actions').evaluate(element => ({
      height: element.getBoundingClientRect().height,
      buttons: [...element.children].map(button => ({width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height})),
    }));
    check(quickActions.buttons.every(button => button.width >= 120 && button.height >= 44 && button.height <= 128), `${name}: shortcut targets are squeezed or unnecessarily tall`);
    if (width === 390) check(quickActions.height < 400, `${name}: shortcuts need ${quickActions.height}px before the work list`);
    await noOverflow('Today');
    await page.screenshot({path: `${out}/${name}-today.png`, fullPage: true});
    await page.getByRole('button', {name: '5 orders and payments', exact: true}).click();
    await page.getByRole('heading', {name: 'Orders & payments', exact: true}).waitFor();
    check(new URL(page.url()).searchParams.get('tab') === 'Orders', `${name}: shortcut retains a navigable Orders URL`);
    const search = page.getByPlaceholder('Search…', {exact: true});
    const exportLink = page.getByRole('link', {name: '⬇ Export CSV', exact: true});
    await exportLink.waitFor();
    const orders = {search: await rect(search), export: await rect(exportLink), overflow: await noOverflow('Orders')};
    check(orders.search.height >= 44 && orders.search.height <= 52, `${name}: search stretches to ${orders.search.height}px tall`);
    check(orders.export.height >= 44 && orders.export.height <= 52, `${name}: CSV action stretches to ${orders.export.height}px tall`);
    check(orders.search.width >= Math.min(200, width - 100), `${name}: search is squeezed to ${orders.search.width}px`);
    check(await exportLink.getAttribute('href') === '/api/admin/export?kind=orders', `${name}: export keeps its gated endpoint`);
    await search.fill('missing fixture');
    await page.getByText('Nothing here yet.', {exact: true}).waitFor();
    await search.fill('');
    await page.getByRole('cell', {name: 'Fictional Buyer', exact: true}).waitFor();
    await page.screenshot({path: `${out}/${name}-orders.png`, fullPage: true});

    await page.goto(base + '/admin?tab=Invoices');
    const invoicePDF = page.getByRole('link', {name: 'PDF', exact: true});
    await invoicePDF.waitFor();
    const invoices = {pdf: await rect(invoicePDF), overflow: await noOverflow('Invoices')};
    check(invoices.pdf.height >= 44 && invoices.pdf.width >= 44, `${name}: invoice PDF touch target is too small`);
    check(await invoicePDF.getAttribute('href') === '/api/admin/ops/pdf?type=doc&id=1', `${name}: invoice PDF keeps its gated endpoint`);
    await page.screenshot({path: `${out}/${name}-invoices.png`, fullPage: true});

    await page.goto(base + '/admin?tab=Documents');
    const recentPDF = page.getByRole('link', {name: 'PDF', exact: true});
    await recentPDF.waitFor();
    const documents = {pdf: await rect(recentPDF), overflow: await noOverflow('Documents')};
    check(documents.pdf.height >= 44 && documents.pdf.width >= 44, `${name}: recent PDF target is ${documents.pdf.width}×${documents.pdf.height}px`);
    await page.screenshot({path: `${out}/${name}-documents.png`, fullPage: true});
    check(errors.length === 0, `${name}: browser errors: ${errors.join('; ')}`);
    check(writes.length === 0, `${name}: UI navigation attempted a mutation: ${writes.join(', ')}`);
    results.push({name, width, height, quickActions, orders, invoices, documents, errors, writes});
    await writeFile(`${out}/metrics.json`, JSON.stringify({localOnly: true, checks, failures, results}, null, 2));
    await context.close();
  }
  await writeFile(`${out}/metrics.json`, JSON.stringify({localOnly: true, checks, failures, results}, null, 2));
  console.log(JSON.stringify({localOnly: true, checks, failures, out}));
  assert.deepEqual(failures, [], 'Responsive admin checks');
} finally {
  await browser.close();
}
