import {beforeAll,afterAll,it,expect} from 'vitest';
import {build} from 'esbuild';
import {chromium,type Browser} from 'playwright';
import {existsSync} from 'node:fs';
let browser:Browser,js:string,css:string;
const enabled=existsSync('/usr/bin/chromium');
beforeAll(async()=>{if(!enabled)return;const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./ui/i18n/LanguageProvider';import{InstallableApp}from'./app/_components/InstallableApp';createRoot(document.getElementById('app')).render(<LanguageProvider><InstallableApp/></LanguageProvider>);`},bundle:true,write:false,outdir:'fixture',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'navigation',setup(b){b.onResolve({filter:/^next\/navigation$/},()=>({path:'nav',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const usePathname=()=>location.pathname'}));}}]});js=bundle.outputFiles.find(f=>f.path.endsWith('.js'))!.text;css=bundle.outputFiles.find(f=>f.path.endsWith('.css'))!.text;browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});},30000);
afterAll(async()=>{await browser?.close()});
async function open(path='/'){
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await context.addInitScript(()=>{Object.defineProperty(navigator,'serviceWorker',{value:{getRegistration:async()=>undefined}})});
 await context.route('**/*',r=>r.fulfill(r.request().url().endsWith('/fixture.js')?{contentType:'text/javascript',body:js}:{contentType:'text/html',body:'<style>'+css+'</style><form><input aria-label="Draft"></form><div id="app"></div><script src="/fixture.js"></script>'}));
 const page=await context.newPage();await page.goto('http://127.0.0.1'+path);await page.waitForFunction(()=>document.documentElement.lang==='en-KE');return{page,context};
}
it.skipIf(!enabled)('does not cover public pages or checkout with an online update card',async()=>{
 for(const path of ['/','/shop','/cart','/checkout']){const{page,context}=await open(path);try{await page.evaluate(()=>dispatchEvent(new CustomEvent('ugt-release-ready',{detail:{release:'ugt-fixture-v2'}})));expect(await page.locator('[data-app-update],aside[aria-label="App status"]').count()).toBe(0);}finally{await context.close()}}
},20000);
it.skipIf(!enabled)('automatically refreshes an activated release while preserving the saved basket',async()=>{
 const{page,context}=await open();try{
  await page.evaluate(()=>{localStorage.setItem('ugt-live-cart-v1',JSON.stringify([{id:'shirt',qty:2}]));dispatchEvent(new CustomEvent('ugt-release-activated',{detail:{release:'ugt-fixture-v2'}}))});
  await page.waitForEvent('framenavigated',{predicate:f=>f===page.mainFrame(),timeout:10000});
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('ugt-live-cart-v1')!))).toEqual([{id:'shirt',qty:2}]);
  expect(await page.evaluate(()=>sessionStorage.getItem('ugt-auto-update-applied'))).toBe('ugt-fixture-v2');
 }finally{await context.close()}
},20000);
it.skipIf(!enabled)('defers updates during checkout and while a form has unsaved input',async()=>{
 for(const path of ['/checkout','/book']){const{page,context}=await open(path);try{
  await page.getByLabel('Draft').fill('Keep this');let navigations=0;page.on('framenavigated',()=>navigations++);
  await page.evaluate(()=>dispatchEvent(new CustomEvent('ugt-release-activated',{detail:{release:'ugt-fixture-v2'}})));
  await page.waitForTimeout(3500);expect(navigations).toBe(0);expect(await page.getByLabel('Draft').inputValue()).toBe('Keep this');
 }finally{await context.close()}}
},20000);
it.skipIf(!enabled)('keeps the offline notice dismissible on mobile',async()=>{
 const{page,context}=await open();try{
  await page.evaluate(()=>{Object.defineProperty(navigator,'onLine',{value:false,configurable:true});dispatchEvent(new Event('offline'))});
  const notice=page.locator('aside[aria-label="App status"]');await notice.waitFor();
  const box=await notice.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(390);
  await page.getByRole('button',{name:'Dismiss app status'}).click();expect(await notice.count()).toBe(0);
 }finally{await context.close()}
},10000);
