// Actual frozen-Worker smoke. All fixtures are loopback-only; no live writes.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const origin=process.env.QA_ORIGIN||'http://127.0.0.1:4184';
const target=new URL(origin);
assert.ok(target.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(target.hostname)&&!target.username&&!target.password&&target.pathname==='/'&&!target.search&&!target.hash,'Fixture mode requires a loopback HTTP origin');
const artifacts=process.env.ARTIFACT_DIR||'/workspace/artifacts/ugt-english-first-20261027';
await mkdir(artifacts,{recursive:true});
const locales=['en','sw','fr','zh-Hans','ru','es'];
const requests=[],errors=[],checks=[];
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const makeContext=async options=>{
 const context=await browser.newContext({locale:'fr-FR',viewport:{width:390,height:900},serviceWorkers:'block',...options});
 context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url()),method=request.method();
  if(url.origin!==target.origin){requests.push({method,path:url.hostname+url.pathname,kind:'external-blocked'});return route.abort();}
  if(!['GET','HEAD'].includes(method)){
   let body;try{body=request.postDataJSON()}catch{}
   if(method==='POST'&&url.pathname==='/api/auth'&&body?.action==='me'){
    requests.push({method,path:url.pathname,kind:'fictional-session-probe'});
    return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"user":null}'});
   }
   requests.push({method,path:url.pathname,kind:'rejected-write'});return route.abort();
  }
  return route.continue();
 });
 return context;
};
const language=async(page,locale)=>{
 const picker=page.locator('[data-language-control] select').first();
 // Server HTML is useful English before hydration; interact only after React
 // has attached this control's actual change handler, not merely painted it.
 await page.waitForFunction(()=>{const select=document.querySelector('[data-language-control] select');return select&&Object.getOwnPropertyNames(select).some(key=>key.startsWith('__reactProps$')&&typeof select[key]?.onChange==='function')});
 await picker.selectOption(locale);
 await page.waitForFunction(expected=>document.documentElement.lang===expected,locale==='en'?'en-KE':locale);
 assert.equal(await picker.inputValue(),locale);
};
const navigate=async(page,path)=>{
 const response=await page.goto(origin+path,{waitUntil:'domcontentloaded'});
 assert.equal(response.status(),200,path+' must load');
 await page.waitForFunction(()=>document.querySelector('[data-language-control] select')?.value==='en').catch(error=>{throw new Error('English language control did not become ready on '+path,{cause:error})});
 assert.equal(await page.locator('html').getAttribute('lang'),'en-KE');
};
try{
 const context=await makeContext();const page=await context.newPage();page.setDefaultTimeout(20000);
 for(const path of ['/','/about','/clients','/events','/tour-stops','/blog','/gallery','/shop','/cart','/checkout','/book','/account','/organizer/login','/international','/accessibility']){
  await navigate(page,path);
  assert.equal(await page.locator('[data-language-control] select').first().locator('option').count(),6);
  assert.equal(await page.locator('a[href*="translate.google"]').count(),0);
  checks.push({route:path,status:200,language:'en-KE'});
 }
 await navigate(page,'/');
 const englishLabel=await page.locator('[data-language-control] .language-label').first().innerText();
 for(const locale of locales){
  await language(page,locale);
  const visibleLabel=await page.locator('[data-language-control] .language-label').first().innerText();
  assert.ok(visibleLabel.trim());if(locale==='en')assert.equal(visibleLabel,englishLabel);else assert.notEqual(visibleLabel,englishLabel);
 }
 await language(page,'fr');await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.lang==='fr');
 const tab=await context.newPage();await tab.goto(origin+'/about',{waitUntil:'domcontentloaded'});
 await tab.waitForFunction(()=>document.documentElement.lang==='fr');
 await language(page,'en');await tab.waitForFunction(()=>document.documentElement.lang==='en-KE');
 await tab.close();checks.push({check:'six choices, reload persistence and cross-tab English reset'});

 await navigate(page,'/account');
 const email=page.locator('input[type="email"]').first(),password=page.locator('input[type="password"]').first();
 await email.fill('local-fixture@example.invalid');await password.fill('fictional password');await email.focus();
 const posts=requests.filter(value=>value.method==='POST').length;
 await page.evaluate(()=>{
  window.__languageForm={email:document.querySelector('input[type="email"]'),password:document.querySelector('input[type="password"]'),form:document.querySelector('input[type="email"]').closest('form')};
  const picker=document.querySelector('[data-language-control] select');picker.value='fr';picker.dispatchEvent(new Event('change',{bubbles:true}));
 });
 await page.waitForFunction(()=>document.documentElement.lang==='fr');
 assert.equal(await email.inputValue(),'local-fixture@example.invalid');assert.equal(await password.inputValue(),'fictional password');
 assert.equal(await page.evaluate(()=>{const before=window.__languageForm;return before.email===document.querySelector('input[type="email"]')&&before.password===document.querySelector('input[type="password"]')&&before.form===before.email.closest('form')&&document.activeElement===before.email}),true);
 assert.equal(requests.filter(value=>value.method==='POST').length,posts);
 checks.push({check:'filled account nodes, values, focus and request count preserved'});
 await language(page,'en');
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:900});await page.goto(origin+'/',{waitUntil:'domcontentloaded'});await language(page,'fr');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'French home reflow at '+width);
  await page.screenshot({path:`${artifacts}/native-home-fr-${width}.png`});
  await page.locator('[data-language-control]').first().scrollIntoViewIfNeeded();
  await page.screenshot({path:`${artifacts}/native-footer-fr-${width}.png`});
 }
 await context.close();

 const migration=await makeContext({storageState:{cookies:[],origins:[{origin:target.origin,localStorage:[{name:'ugt-language-choice',value:'fr'}]}]}});
 const migrated=await migration.newPage();await migrated.goto(origin+'/',{waitUntil:'domcontentloaded'});await migrated.waitForFunction(()=>document.documentElement.lang==='fr');
 await migrated.evaluate(()=>localStorage.removeItem('ugt-interface-language-v1'));await migrated.reload({waitUntil:'domcontentloaded'});
 await migrated.waitForFunction(()=>document.documentElement.lang==='en-KE');await migration.close();checks.push({check:'legacy choice migrates once; removing new choice and reloading stays English'});

 const blocked=await makeContext();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Fixture blocked','SecurityError')}}));
 const blockedPage=await blocked.newPage();await navigate(blockedPage,'/');await language(blockedPage,'fr');
 await blockedPage.locator('.language-storage').first().waitFor({state:'visible'});await blocked.close();checks.push({check:'blocked storage still permits immediate in-memory choice with warning'});

 const noScript=await makeContext({javaScriptEnabled:false,storageState:{cookies:[],origins:[{origin:target.origin,localStorage:[{name:'ugt-interface-language-v1',value:'fr'},{name:'ugt-interface-language-migrated-v1',value:'1'}]}]}});
 const plain=await noScript.newPage();const response=await plain.goto(origin+'/',{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
 assert.equal(await plain.locator('html').getAttribute('lang'),'en-KE');assert.equal(await plain.locator('[data-language-control] select').first().inputValue(),'en');
 await noScript.close();checks.push({check:'JavaScript-disabled HTML stays usable English'});
 assert.deepEqual(requests.filter(value=>value.kind==='rejected-write'),[]);
 assert.deepEqual(requests.filter(value=>/translate\.google|translate\.goog/.test(value.path)),[]);
 assert.deepEqual(errors,[]);
 await writeFile(artifacts+'/native-worker-smoke.json',JSON.stringify({origin,checks,requests,errors},null,2));
 console.log(JSON.stringify({checks:checks.length,errors,unexpectedWrites:0,translationRequests:0,artifacts}));
}finally{await browser.close()}
