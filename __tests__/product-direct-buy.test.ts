import {afterAll,beforeAll,expect,it} from 'vitest';
import {build} from 'esbuild';
import {chromium,type Browser} from 'playwright';
import {existsSync,readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import {commerceMessages} from '@/ui/i18n/catalogues/commerce';
import {formatMessage} from '@/lib/i18n/messages';
import {INTERFACE_LOCALES,type InterfaceLocale} from '@/lib/i18n/locale';

const enabled=existsSync('/usr/bin/chromium');
const labels={en:'Buy now',sw:'Nunua sasa',fr:'Acheter maintenant','zh-Hans':'立即购买',ru:'Купить сейчас',es:'Comprar ahora'};
const product={id:'direct-buy-fixture',price:3500,stock:10,nameOnBackEnabled:true,variants:[{label:'Black / M',priceAdjustment:0,stock:5},{label:'Blue / L',priceAdjustment:250,stock:5}]};
declare global{
 interface Window{purchaseProps?:typeof product;originalPurchaseNodes?:Element[];restoreCartStorage?:()=>void;fixturePageRestored?:boolean}
}
const saved=[{id:'existing-other',qty:1,variant:'Original'},{id:'direct-buy-fixture',qty:1,variant:'Black / M',printableName:'Other'},{id:'direct-buy-fixture',qty:1,variant:'Blue / L',printableName:'Amina Rose'}];
let browser:Browser,script:string,css:string;
beforeAll(async()=>{
 if(!enabled)return;
 const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
  import React from 'react';import {createRoot} from 'react-dom/client';
  import {LanguageProvider} from './ui/i18n/LanguageProvider';
  import LanguageChooser from './app/_components/LanguageChooser';
  import {ProductPurchase} from './app/_components/ProductPurchase';
  createRoot(document.getElementById('app')).render(<LanguageProvider><LanguageChooser path="/shop/fixture"/><ProductPurchase {...window.purchaseProps}/></LanguageProvider>);
 `},bundle:true,write:false,outfile:'/tmp/product-direct-buy-fixture.js',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'local-product-navigation',setup(builder){
  builder.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}));
  builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const usePathname=()=>location.pathname;'}));
 }}]});
 script=bundle.outputFiles.find(file=>file.path.endsWith('.js'))!.text;
 css=readFileSync('app/design.css','utf8')+'\n'+bundle.outputFiles.find(file=>file.path.endsWith('.css'))!.text;
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,ignoreDefaultArgs:['--disable-back-forward-cache'],args:['--no-sandbox','--disable-dev-shm-usage']});
},30000);
afterAll(async()=>{await browser?.close()});

async function open(locale:InterfaceLocale='en',items:unknown[]=[],props:Partial<typeof product>&{madeToOrder?:boolean}={}){
 const context=await browser.newContext({viewport:{width:320,height:700},serviceWorkers:'block',reducedMotion:'reduce'});
 const unexpected:string[]=[],errors:string[]=[];
 await context.addInitScript(({locale,items,props})=>{
  if(location.pathname!=='/shop/fixture')return;
  localStorage.setItem('ugt-interface-language-v1',locale);localStorage.setItem('ugt-live-cart-v1',JSON.stringify(items));
  window.purchaseProps=props;
  window.addEventListener('ugt-cart-changed',()=>sessionStorage.setItem('fixture-cart-events',String(Number(sessionStorage.getItem('fixture-cart-events')||0)+1)));
 },{locale,items,props:{...product,...props}});
 await context.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!=='http://127.0.0.1'||request.method()!=='GET'){unexpected.push(request.method()+' '+url.href);return route.abort()}
  if(url.pathname==='/fixture.js')return route.fulfill({contentType:'application/javascript',body:script});
  if(url.pathname==='/fonts/inter.woff2')return route.fulfill({contentType:'font/woff2',body:readFileSync('public/fonts/inter.woff2')});
  if(url.pathname==='/shop/fixture')return route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><main id="app" style="max-width:480px;padding:12px"></main><script src="/fixture.js"></script>`});
  if(url.pathname==='/checkout')return route.fulfill({contentType:'text/html',body:'<main>Native checkout fixture</main>'});
  unexpected.push(request.method()+' '+url.href);return route.abort();
 });
 const page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto('http://127.0.0.1/shop/fixture');await page.locator('.product-purchase').waitFor();
  await page.waitForFunction(locale=>document.documentElement.lang===(locale==='en'?'en-KE':locale),locale);
 }catch(error){await context.close();throw error}
 return {context,page,unexpected,errors,cart:()=>page.evaluate(()=>JSON.parse(localStorage.getItem('ugt-live-cart-v1')!))};
}

it.skipIf(!enabled).each(INTERFACE_LOCALES)('saves the exact configured cart once and opens checkout in %s',async locale=>{
 const fixture=await open(locale,saved),{page}=fixture;
 try{
  await page.locator('.product-purchase select').selectOption('Blue / L');
  await page.locator('.product-purchase input[type="number"]').fill('2');
  await page.locator('input[maxlength="24"]').fill('  Amina   Rose  ');
  const buy=page.getByRole('button',{name:labels[locale],exact:true});
  await buy.waitFor();
  expect(await buy.evaluate(button=>({height:button.getBoundingClientRect().height,color:getComputedStyle(button).backgroundColor}))).toEqual({height:44,color:'rgb(173, 18, 100)'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await buy.evaluate(button=>{(button as HTMLButtonElement).click();(button as HTMLButtonElement).click();(button.closest('form') as HTMLFormElement).requestSubmit()});
  await page.waitForURL('http://127.0.0.1/checkout');
  expect(await fixture.cart()).toEqual([{id:'existing-other',qty:1,variant:'Original'},{id:'direct-buy-fixture',qty:1,variant:'Black / M',printableName:'Other'},{id:'direct-buy-fixture',qty:3,variant:'Blue / L',printableName:'Amina Rose'}]);
  expect(await page.evaluate(()=>sessionStorage.getItem('fixture-cart-events'))).toBe('1');
  expect(fixture.unexpected).toEqual([]);expect(fixture.errors).toEqual([]);
 }finally{await fixture.context.close()}
},10000);

it.skipIf(!enabled)('keeps invalid personalization inline through six languages without remounting fields, then allows add to cart',async()=>{
 const fixture=await open(),{page}=fixture;
 try{
  await page.locator('.product-purchase select').selectOption('Blue / L');
  await page.locator('.product-purchase input[type="number"]').fill('2');
  await page.locator('input[maxlength="24"]').fill('Amina!');
  await page.getByRole('button',{name:labels.en,exact:true}).click();
  await page.getByRole('alert').waitFor();
  await page.evaluate(()=>{const nodes=[...document.querySelectorAll('.product-purchase,.product-purchase input,.product-purchase select')];window.originalPurchaseNodes=nodes;(document.querySelector('input[maxlength="24"]') as HTMLInputElement).focus()});
  for(const locale of INTERFACE_LOCALES){
   await page.locator('[data-language-control] select').evaluate((field,locale)=>{(field as HTMLSelectElement).value=locale;field.dispatchEvent(new Event('change',{bubbles:true}))},locale);
   await page.getByRole('button',{name:labels[locale],exact:true}).waitFor();
   expect(await page.getByRole('alert').textContent()).toBe(formatMessage(commerceMessages,locale,'personalization.invalid').text);
   expect(await page.evaluate(()=>{const fields=[...document.querySelectorAll('.product-purchase,.product-purchase input,.product-purchase select')];return fields.every((node,index)=>node===window.originalPurchaseNodes?.[index])&&document.activeElement===document.querySelector('input[maxlength="24"]')})).toBe(true);
   expect(await page.locator('.product-purchase select').inputValue()).toBe('Blue / L');
   expect(await page.locator('.product-purchase input[type="number"]').inputValue()).toBe('2');
   expect(await page.locator('input[maxlength="24"]').inputValue()).toBe('Amina!');
   expect(await fixture.cart()).toEqual([]);expect(page.url()).toBe('http://127.0.0.1/shop/fixture');
  }
  await page.locator('input[maxlength="24"]').fill('Amina');
  await page.locator('.product-purchase button[type="submit"]').click();
  expect(await fixture.cart()).toEqual([{id:'direct-buy-fixture',qty:2,variant:'Blue / L',printableName:'Amina'}]);
  expect(await page.locator('.product-purchase a[href="/cart"]').count()).toBe(1);expect(page.url()).toBe('http://127.0.0.1/shop/fixture');
  expect(fixture.unexpected).toEqual([]);expect(fixture.errors).toEqual([]);
 }finally{await fixture.context.close()}
},15000);

it.skipIf(!enabled)('counts existing variant quantities across printed names before allowing direct buy',async()=>{
 const items=[{id:'direct-buy-fixture',qty:4,variant:'Blue / L',printableName:'Other'}];
 const fixture=await open('en',items),{page}=fixture;
 try{
  await page.locator('.product-purchase select').selectOption('Blue / L');await page.locator('.product-purchase input[type="number"]').fill('2');
  await page.getByRole('button',{name:labels.en,exact:true}).click();
  expect(await page.getByRole('alert').textContent()).toBe(formatMessage(commerceMessages,'en','cart.exceedsStock').text);
  expect(await fixture.cart()).toEqual(items);expect(page.url()).toBe('http://127.0.0.1/shop/fixture');
  expect(fixture.unexpected).toEqual([]);expect(fixture.errors).toEqual([]);
 }finally{await fixture.context.close()}
});

it.skipIf(!enabled)('disables both purchase actions for unavailable stock even after a forced submit',async()=>{
 const fixture=await open('en',[],{stock:0}),{page}=fixture;
 try{
  expect(await page.locator('.product-purchase button').count()).toBe(2);
  for(const button of await page.locator('.product-purchase button').all())expect(await button.isDisabled()).toBe(true);
  await page.locator('.product-purchase').dispatchEvent('submit');
  expect(await fixture.cart()).toEqual([]);expect(page.url()).toBe('http://127.0.0.1/shop/fixture');
  expect(fixture.unexpected).toEqual([]);expect(fixture.errors).toEqual([]);
 }finally{await fixture.context.close()}
});

it.skipIf(!enabled)('applies native quantity validity before direct buy can save a fractional item',async()=>{
 const fixture=await open(),{page}=fixture;
 try{
  await page.locator('.product-purchase input[type="number"]').fill('1.5');
  await page.getByRole('button',{name:labels.en,exact:true}).click();
  expect(page.url()).toBe('http://127.0.0.1/shop/fixture');expect(await fixture.cart()).toEqual([]);
  expect(await page.locator('.product-purchase input[type="number"]').evaluate(field=>(field as HTMLInputElement).validity.stepMismatch)).toBe(true);
  await page.locator('.product-purchase input[type="number"]').fill('2');
  await page.getByRole('button',{name:labels.en,exact:true}).click();await page.waitForURL('http://127.0.0.1/checkout');
  expect(await fixture.cart()).toEqual([{id:'direct-buy-fixture',qty:2,variant:'Black / M'}]);
  expect(fixture.unexpected).toEqual([]);expect(fixture.errors).toEqual([]);
 }finally{await fixture.context.close()}
});

it.skipIf(!enabled)('keeps a failed cart write inline and permits a valid retry once storage recovers',async()=>{
 const fixture=await open(),{page}=fixture;
 try{
  await page.evaluate(()=>{
   const write=Storage.prototype.setItem;window.restoreCartStorage=()=>{Storage.prototype.setItem=write};
   Storage.prototype.setItem=function(key,value){if(key==='ugt-live-cart-v1')throw new Error('Fixture storage full');write.call(this,key,value)};
  });
  await page.getByRole('button',{name:labels.en,exact:true}).click();
  expect(await page.getByRole('alert').textContent()).toBe(formatMessage(commerceMessages,'en','cart.storageUnavailable').text);
  expect(await fixture.cart()).toEqual([]);expect(page.url()).toBe('http://127.0.0.1/shop/fixture');
  await page.evaluate(()=>window.restoreCartStorage!());
  await page.getByRole('button',{name:labels.en,exact:true}).click();await page.waitForURL('http://127.0.0.1/checkout');
  expect(await fixture.cart()).toEqual([{id:'direct-buy-fixture',qty:1,variant:'Black / M'}]);
  expect(await page.evaluate(()=>sessionStorage.getItem('fixture-cart-events'))).toBe('1');
  expect(fixture.unexpected).toEqual([]);expect(fixture.errors).toEqual([]);
 }finally{await fixture.context.close()}
});

it.skipIf(!enabled)('preserves made-to-order availability for direct buy without inventing opening stock',async()=>{
 const fixture=await open('en',[],{stock:0,madeToOrder:true,variants:[{label:'Black / M',priceAdjustment:0,stock:0}]}),{page}=fixture;
 try{
  await page.getByRole('button',{name:labels.en,exact:true}).click();await page.waitForURL('http://127.0.0.1/checkout');
  expect(await fixture.cart()).toEqual([{id:'direct-buy-fixture',qty:1,variant:'Black / M'}]);
  expect(fixture.unexpected).toEqual([]);expect(fixture.errors).toEqual([]);
 }finally{await fixture.context.close()}
});

it.skipIf(!enabled)('restores usable purchase controls after browser Back without replaying the saved cart',async()=>{
 const unexpected:string[]=[];
 // Routing interception disables browser caching. A local HTTP fixture and
 // Chromium's real back-forward cache exercise the persisted page lifecycle.
 const server=createServer((request,response)=>{
  response.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; font-src 'self'");
  if(request.url==='/fixture.js'){response.setHeader('Content-Type','application/javascript');return response.end('window.purchaseProps='+JSON.stringify(product)+';'+script)}
  if(request.url==='/fonts/inter.woff2'){response.setHeader('Content-Type','font/woff2');return response.end(readFileSync('public/fonts/inter.woff2'))}
  response.setHeader('Content-Type','text/html; charset=utf-8');
  if(request.url==='/checkout')return response.end('<main>Native checkout fixture</main>');
  if(request.url==='/shop/fixture')return response.end(`<meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><main id="app"></main><script src="/fixture.js"></script>`);
  unexpected.push(request.method+' '+request.url);response.statusCode=404;response.end();
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+(server.address() as AddressInfo).port;
 const context=await browser.newContext({serviceWorkers:'block'});
 try{
  await context.addInitScript(()=>{
   window.addEventListener('pageshow',event=>{window.fixturePageRestored=event.persisted});
   window.addEventListener('ugt-cart-changed',()=>sessionStorage.setItem('fixture-cart-events',String(Number(sessionStorage.getItem('fixture-cart-events')||0)+1)));
  });
  const page=await context.newPage();page.setDefaultTimeout(5000);
  await page.goto(origin+'/shop/fixture');
  await page.getByRole('button',{name:labels.en,exact:true}).click();await page.waitForURL(origin+'/checkout');
  await page.goBack({waitUntil:'commit'});await page.waitForFunction(()=>window.fixturePageRestored===true);
  await page.waitForFunction(()=>document.querySelector('.product-purchase')?.getAttribute('aria-busy')==='false');
  expect(await page.getByRole('button',{name:labels.en,exact:true}).isEnabled()).toBe(true);
  expect(await page.locator('.product-purchase button[type="submit"]').isEnabled()).toBe(true);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('ugt-live-cart-v1')!))).toEqual([{id:'direct-buy-fixture',qty:1,variant:'Black / M'}]);
  expect(await page.evaluate(()=>sessionStorage.getItem('fixture-cart-events'))).toBe('1');
  await page.locator('.product-purchase button[type="submit"]').click();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('ugt-live-cart-v1')!))).toEqual([{id:'direct-buy-fixture',qty:2,variant:'Black / M'}]);
  expect(unexpected).toEqual([]);
 }finally{await context.close();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()))}
},15000);
