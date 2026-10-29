// Local sample proof only: render drafts in memory; never issue documents or access a ledger.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const run=promisify(execFile);

const artifacts=process.env.ARTIFACT_DIR||'/workspace/artifacts/ugt-documents-20261028';
await mkdir(artifacts,{recursive:true});
// Existing db.ts has a Node require for ws. No configured DB is available to this proof.
globalThis.require=createRequire(import.meta.url);
process.env.DATABASE_URL='';
const vite=await createServer({configFile:false,resolve:{alias:{'@':process.cwd()}},server:{middlewareMode:true,hmr:{port:0}},logLevel:'error'});
let browser;
try {
 const docs=await vite.ssrLoadModule('/lib/server/docgen.ts');
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1000,height:1250}});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!=='http://draft.local'||!url.pathname.startsWith('/uploads/'))return route.abort();
  try {await route.fulfill({status:200,contentType:'image/png',body:await readFile(path.join(process.cwd(),'public',decodeURIComponent(url.pathname)))});} catch {await route.abort();}
 });
 const page=await context.newPage(),checks=[];
 for(const type of ['deliverynote','purchaseorder','creditnote','customerstatement']){
  const raw={date:'2026-10-28',party:'LOCAL QA EXAMPLE — NOT ISSUED',partyAddress:'Example address only',reference:'LOCAL-QA-NOT-ISSUED',purpose:'Layout sample only; no order, payment, delivery or adjustment occurred.',preparedBy:'Local QA example',notes:'LOCAL QA SAMPLE — NOT ISSUED. All entries are invented layout examples; this sample records no business activity.',requestedDate:'',openingBalance:1000,lines:Array.from({length:7},(_,i)=>({description:`Example item ${i+1} for draft layout review only`,qty:2,rate:700,date:'2026-10-20',reference:`EXAMPLE-${i+1}`,debit:1400,credit:0}))};
  const prepared=docs.preparePayload(type,raw);
  docs.validateFinalIssue(type,prepared,raw);
  const html=await docs.renderDoc(type,prepared.payload,'PREVIEW — LOCAL QA — NOT ISSUED');
  assert.equal(typeof html,'string');
  assert.ok(html.includes('STAFF-ENTERED DRAFT'));
  assert.ok(html.includes('Not a tax document'));
  assert.ok(!html.includes('/verify/'));
  await page.setContent(html.replace('<head>','<head><base href="http://draft.local/">'),{waitUntil:'networkidle'});
  await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  const layout=await page.locator('main').evaluate(main=>{
   const footer=main.querySelector('footer'),prepared=main.querySelector('[data-field="preparedBy"]').parentElement;
   return {background:getComputedStyle(main).backgroundColor,contentBottom:prepared.getBoundingClientRect().bottom,footerTop:footer.getBoundingClientRect().top,rootBottom:main.getBoundingClientRect().bottom};
  });
  assert.equal(layout.background,'rgb(255, 255, 255)');
  assert.ok(layout.contentBottom<layout.footerTop,`${type}: content must not overlap draft warning`);
  await page.screenshot({path:`${artifacts}/${type}.png`,fullPage:true});
  await page.pdf({path:`${artifacts}/${type}.pdf`,width:'794px',height:'1123px',printBackground:true});
  const {stdout:info}=await run('pdfinfo',[`${artifacts}/${type}.pdf`]);
  assert.match(info,/Pages:\s+1\b/,`${type}: one printable sample page`);
  const {stdout:printed}=await run('pdftotext',[`${artifacts}/${type}.pdf`,'-']);
  // Letter spacing in the heading may be represented as separate PDF text runs.
  assert.ok(printed.replace(/\s/g,'').includes('STAFF-ENTEREDDRAFT'));
  assert.match(printed,/Not\s+a\s+tax\s+document/);
  await writeFile(`${artifacts}/${type}.html`,html);
  checks.push({type,rows:7,pages:1,...layout});
 }
 await writeFile(`${artifacts}/documents-proof.json`,JSON.stringify({activeTypes:docs.ACTIVE_DOC_TYPES.length,checks,sampleOnly:true,noLedgerAccess:true},null,2)+'\n');
 console.log(JSON.stringify({passed:true,artifacts,checks}));
} finally {await browser?.close();await vite.close();}
