import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';

// Read-only browser proof against an already running local development server.
const base = process.env.VENDOR_CHECK_BASE || 'http://127.0.0.1:4186';
assert.match(new URL(base).hostname, /^(127\.0\.0\.1|localhost)$/);
const out = resolve(process.env.VENDOR_CHECK_OUT || '/workspace/artifacts/ugt-vendor-documents-20261029');
await mkdir(out, {recursive:true});
const browser = await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try {
  for (const [width,height,locale] of [[360,800,'en'],[820,1100,'en'],[1440,1000,'en'],[360,800,'sw'],[360,800,'fr'],[360,800,'zh-Hans'],[360,800,'ru'],[360,800,'es']]) {
    const context = await browser.newContext({viewport:{width,height},acceptDownloads:true});
    await context.addInitScript(locale => {
      localStorage.setItem('ugt-interface-language-v1',locale);
      localStorage.setItem('ugt-interface-language-migrated-v1','1');
    },locale);
    const errors = [], page = await context.newPage();
    page.on('pageerror',error => errors.push(error.message));
    const response = await page.goto(`${base}/vendors`,{waitUntil:'domcontentloaded'});
    assert.equal(response.status(),200);
    await page.waitForFunction(locale => document.documentElement.lang.startsWith(locale),locale);
    await page.locator('h1').waitFor({state:'visible'});
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('h1').count(),1);
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://urbangangtour.co.ke/vendors');
    // An omitted robots directive is indexable; an explicit noindex would be a bug.
    const robots = await page.locator('meta[name=robots]').count() ? await page.locator('meta[name=robots]').getAttribute('content') : '';
    assert.doesNotMatch(robots || '',/noindex/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),false,`${width}/${locale}: overflow`);
    assert.equal(await page.getByText('Package 1 — Main Vendor',{exact:true}).count(),1);
    assert.equal(await page.getByText('Package 2 — Minor Vendor',{exact:true}).count(),1);
    assert.equal(await page.locator('dl dd').evaluateAll(amounts => amounts.every(el => {
      const range = document.createRange();
      range.selectNode(el.lastChild);
      return range.getClientRects().length === 1;
    })),true,`${width}/${locale}: fee range must fit on one line`);
    const download = page.locator('a[download][href="/downloads/vendor-application.pdf"]').first();
    assert.equal(await download.isVisible(),true);
    const box = await download.boundingBox(); assert.ok(box.height >= 44);
    await download.focus();
    assert.equal(await download.evaluate(el => el === document.activeElement),true);
    assert.notEqual(await download.evaluate(el => getComputedStyle(el).outlineStyle),'none');
    const consent = page.locator('[data-privacy-preferences]');
    if (await consent.isVisible()) await consent.locator('div').first().locator('button').click();
    await page.screenshot({path:resolve(out,`vendors-${width}-${locale}.png`),fullPage:true});
    if (locale === 'en') {
      assert.equal(await page.locator('a[href="/book?type=sponsorship"]').count(),1);
      assert.equal(await page.locator('a[href="/book?type=partnership"]').count(),1);
      for (const name of ['vendor-application.pdf','sponsorship-partnership-pack.pdf']) {
        const link = page.locator(`a[download][href="/downloads/${name}"]`).first();
        const [file] = await Promise.all([page.waitForEvent('download'),link.click()]);
        assert.equal(file.suggestedFilename(),name);
        assert.equal(await file.failure(),null);
        const expected = await readFile(resolve('public/downloads',name));
        assert.equal((await readFile(await file.path())).equals(expected),true,`${width}: native download bytes`);
        const pdf = await context.request.get(`${base}/downloads/${name}`);
        assert.equal(pdf.status(),200); assert.match(pdf.headers()['content-type'],/application\/pdf/);
        assert.equal((await pdf.body()).subarray(0,5).toString(),'%PDF-');
        assert.equal((await pdf.body()).equals(expected),true,`${width}: served PDF bytes`);
      }
    }
    assert.deepEqual(errors,[],`${width}/${locale}: runtime errors`);
    console.log(`PASS ${width}x${height}/${locale}: route, canonical, reflow, keyboard focus, touch target and downloads`);
    await context.close();
  }
  const context = await browser.newContext({viewport:{width:390,height:844}}), page = await context.newPage();
  await page.goto(`${base}/partners`,{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('section a.button[href="/vendors"]').count(),1);
  assert.equal(await page.locator('a[download][href="/downloads/sponsorship-partnership-pack.pdf"]').count(),1);
  for (const [intent,type] of [['sponsorship','Sponsorship'],['partnership','Partnership']]) {
    await page.goto(`${base}/book?type=${intent}`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(type => document.querySelector('form select')?.value === type,type);
    assert.equal(await page.locator('form select').inputValue(),type);
  }
  await context.close();
  console.log('PASS partners: vendor route, direct partnership-pack download and both booking aliases');
} finally { await browser.close(); }
