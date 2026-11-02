import {afterAll,beforeAll,expect,it} from 'vitest';
import {build} from 'esbuild';
import {chromium,type Browser} from 'playwright';
import {existsSync,mkdirSync,readFileSync} from 'node:fs';
import {VIEWPORT_BOOTSTRAP} from '@/lib/client/viewport-bootstrap';

const enabled=existsSync('/usr/bin/chromium');
const orderId='ORD-PAYMENT-CONFIDENCE-LOCAL-FIXTURE';
let browser:Browser,script:string,componentStyles:string;
const styles=['globals','design','modern','refinements','mobile-experience','reconstruction','android-mobile','concise-media','interaction-foundations','international','responsive-continuation','premium-implementation','navigation'].map(name=>readFileSync(`app/${name}.css`,'utf8')).join('\n');

beforeAll(async()=>{
 if(!enabled)return;
 const bundle=await build({
  stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
   import React from 'react';import {createRoot} from 'react-dom/client';
   import {LanguageProvider} from './ui/i18n/LanguageProvider';
   import PaymentStatus from './app/pay/success/PaymentStatus';
   import resultStyles from './app/pay/success/PaymentResult.module.css';
   createRoot(document.getElementById('app')).render(<LanguageProvider><div className={resultStyles.page}><PaymentStatus orderId="${orderId}"/></div></LanguageProvider>);
  `},bundle:true,write:false,outdir:'payment-result-fixture',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},
  plugins:[{name:'local-payment-route',setup(builder){
   builder.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}));
   builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const usePathname=()=>location.pathname;'}));
  }}],
 });
 script=bundle.outputFiles.find(file=>file.path.endsWith('.js'))!.text;
 componentStyles=bundle.outputFiles.find(file=>file.path.endsWith('.css'))?.text||'';
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
},30000);
afterAll(async()=>{await browser?.close()});

it.skipIf(!enabled).each([false,true])('keeps the payment result clear of the opaque header on desktop/coarse-tablet (%s)',async touchTablet=>{
 const {page,context}=await open('paid',undefined,false,false,false,touchTablet);
 try{
  await page.getByRole('heading',{name:'Payment confirmed',exact:true}).waitFor();if(!touchTablet)await page.setViewportSize({width:1440,height:900});
  const bounds=await page.locator('[data-payment-state]').evaluate(node=>({top:node.getBoundingClientRect().top,headerBottom:document.querySelector('.site-header')!.getBoundingClientRect().bottom}));
  expect(bounds.top).toBeGreaterThanOrEqual(bounds.headerBottom+12);
 }finally{await context.close()}
},15000);

it.skipIf(!enabled)('keeps the verified total and method inside the result panel despite shared definition-list styles',async()=>{
 const fixture=await open('paid'),{page}=fixture;
 try{
  await page.getByRole('heading',{name:'Payment confirmed',exact:true}).waitFor();
  fixture.setResponse({status:'paid',total:1250,method:'card'});
  const result=page.waitForResponse(response=>response.url().includes('/api/orders/status?'));
  await page.getByRole('button',{name:'Check payment again',exact:true}).click();await result;
  await page.getByText('Card',{exact:true}).waitFor();
  const clipped=await page.locator('[data-payment-state] dl').evaluate(node=>{
   const panel=node.closest('[data-payment-state]')!.getBoundingClientRect(),box=node.getBoundingClientRect();
   return [node,...Array.from(node.querySelectorAll('dt,dd'))].filter(child=>{
    const rect=child.getBoundingClientRect();return rect.left<panel.left||rect.right>panel.right+1||rect.right>box.right+1||child.scrollWidth>child.clientWidth+1;
   }).map(child=>child.textContent);
  });
  expect(clipped).toEqual([]);
 }finally{await fixture.context.close()}
},15000);

it.skipIf(!enabled)('keeps the verified order action usable in a wide-layout Android phone',async()=>{
 const fixture=await open('paid',{tickets:'not_required',email:'accepted'},false,false,true),{page}=fixture;
 try{
  await page.getByRole('heading',{name:'Payment confirmed',exact:true}).waitFor();
  await page.evaluate(script=>{const node=document.createElement('script');node.textContent=script;document.head.append(node)},VIEWPORT_BOOTSTRAP);
  const width=await page.getByRole('link',{name:'View order',exact:true}).evaluate(node=>node.getBoundingClientRect().width/Number(document.documentElement.style.zoom||1));
  expect(width).toBeGreaterThanOrEqual(240);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }finally{await fixture.context.close()}
},15000);

async function open(status:string,delivery?:{tickets:string;email:string},offline=false,copyDenied=false,wide=false,touchTablet=false){
 const context=await browser.newContext({viewport:{width:touchTablet?1024:wide?980:320,height:touchTablet?1366:wide?2122:700},...(wide?{screen:{width:393,height:851},hasTouch:true}:{}),...(touchTablet?{screen:{width:1024,height:1366},hasTouch:true,isMobile:true}:{}),deviceScaleFactor:2,serviceWorkers:'block',reducedMotion:'reduce'});
 if(wide)await context.addInitScript(()=>{Object.defineProperty(screen,'orientation',{value:{type:'portrait-primary'}})});
 const unexpected:string[]=[],mutations:string[]=[],errors:string[]=[];
 let response:Record<string,unknown>={status,delivery,remainingTicketsAvailable:false},reads=0;
 await context.addInitScript(({offline,copyDenied})=>{
  (window as unknown as {fixtureOnline:boolean}).fixtureOnline=!offline;
  Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>(window as unknown as {fixtureOnline:boolean}).fixtureOnline});
  sessionStorage.setItem('ugt-checkout-order',JSON.stringify({id:'ORD-NEWER-CHECKOUT',items:[]}));
  Object.defineProperty(navigator,'clipboard',{value:{writeText:async(value:string)=>{if(copyDenied)throw Error('fixture denied');(window as unknown as {copiedReference:string}).copiedReference=value;}}});
 },{offline,copyDenied});
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!=='http://127.0.0.1'){unexpected.push(url.href);return route.abort()}
  if(!['GET','HEAD'].includes(request.method())){mutations.push(url.pathname);return route.abort()}
  if(url.pathname==='/fixture.js')return route.fulfill({contentType:'application/javascript',body:script});
  if(url.pathname==='/api/orders/status'){reads++;expect(url.searchParams.get('id')).toBe(orderId);return route.fulfill({json:response})}
  if(url.pathname==='/fonts/inter.woff2')return route.fulfill({contentType:'font/woff2',body:readFileSync('public/fonts/inter.woff2')});
  if(request.isNavigationRequest())return route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${styles}\n${componentStyles}</style></head><body><header class="site-header" data-public-surface="navigation"><div class="header-content"></div></header><main id="main-content" class="application-content"><div id="app"></div></main><script src="/fixture.js"></script></body></html>`});
  unexpected.push(url.href);return route.abort();
 });
 const page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',error=>errors.push(error.message));
 await page.clock.install();await page.goto('http://127.0.0.1/pay/success?ref='+orderId);
 return {page,context,unexpected,mutations,errors,reads:()=>reads,setResponse:(body:Record<string,unknown>)=>{response=body}};
}

it.skipIf(!enabled)('shows paid preparation, then ready tickets and email acceptance with safe mobile actions',async()=>{
 const fixture=await open('paid',{tickets:'preparing',email:'queued'}),{page}=fixture;
 try{
  await page.getByText('Payment confirmed. We are preparing your tickets.',{exact:true}).waitFor();
  expect(await page.getByRole('link',{name:'View tickets',exact:true}).count()).toBe(0);
  expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('ugt-checkout-order')!).id)).toBe('ORD-NEWER-CHECKOUT');
  fixture.setResponse({status:'paid',total:1250,method:'card',delivery:{tickets:'ready',email:'accepted'}});
  await page.clock.runFor(3000);await page.getByText('Your tickets are ready.',{exact:true}).waitFor();
  expect(await page.getByText(/does not confirm inbox delivery/).count()).toBe(1);
  expect(await page.getByRole('link',{name:'View tickets',exact:true}).getAttribute('href')).toBe('/tickets/'+orderId);
  expect(await page.getByRole('link',{name:'Open receipt',exact:true}).getAttribute('href')).toBe('/receipt/'+orderId);
  const count=fixture.reads(),result=page.waitForResponse(response=>response.url().includes('/api/orders/status?'));
  await page.getByRole('button',{name:'Check payment again',exact:true}).click();await result;
  expect(fixture.reads()).toBe(count+1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const link of await page.getByRole('link').all())expect(await link.getAttribute('href')).toMatch(/^\/(?:receipt|tickets|orders\/track|account|contact-us|shop)/);
  expect(fixture.mutations).toEqual([]);expect(fixture.unexpected).toEqual([]);expect(fixture.errors).toEqual([]);
  mkdirSync('/workspace/artifacts/ugt-checkout-journey-20261102/screenshots',{recursive:true});
  await page.setViewportSize({width:360,height:640});
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  expect(await page.getByRole('link',{name:'View tickets',exact:true}).evaluate(node=>node.getBoundingClientRect().bottom)).toBeLessThanOrEqual(568);
  await page.screenshot({path:'/workspace/artifacts/ugt-checkout-journey-20261102/screenshots/result-paid-360.png'});
  await page.screenshot({path:'/workspace/artifacts/ugt-checkout-journey-20261102/screenshots/result-paid-full-360.png',fullPage:true});
 }finally{await fixture.context.close()}
},20000);

it.skipIf(!enabled)('retains the order offline, resumes on reconnect, and bounds automatic status reads',async()=>{
 const fixture=await open('paid',{tickets:'preparing',email:'processing'},true),{page}=fixture;
 try{
  await page.getByText(/You are offline/).waitFor();expect(fixture.reads()).toBe(0);
  await page.evaluate(()=>{(window as unknown as {fixtureOnline:boolean}).fixtureOnline=true;dispatchEvent(new Event('online'))});
  await page.getByRole('heading',{name:'Payment confirmed',exact:true}).waitFor();
  // Await each response before advancing again: network I/O is not virtual time.
  for(let remaining=11;remaining>0;remaining--){
   const result=page.waitForResponse(response=>response.url().includes('/api/orders/status?'));
   await page.clock.runFor(12000);await result;
   await page.getByRole('button',{name:'Check payment again',exact:true}).waitFor();
  }
  await page.getByText(/Automatic checks are paused/).waitFor();
  const count=fixture.reads();expect(count).toBeGreaterThan(1);expect(count).toBeLessThanOrEqual(12);
  await page.clock.runFor(240000);expect(fixture.reads()).toBe(count);
  expect(await page.getByText(orderId,{exact:false}).count()).toBe(1);
  expect(fixture.mutations).toEqual([]);expect(fixture.unexpected).toEqual([]);expect(fixture.errors).toEqual([]);
 }finally{await fixture.context.close()}
},20000);

it.skipIf(!enabled).each([{status:'declined',heading:'Payment declined'},{status:'refunded',heading:'Full return recorded'}])('keeps $status truthful and check-again read-only',async({status,heading})=>{
 const fixture=await open(status),{page}=fixture;
 try{
  await page.getByRole('heading',{name:heading,exact:true}).waitFor();
  expect(await page.getByRole('link',{name:'Open receipt',exact:true}).count()).toBe(0);
  const count=fixture.reads();const result=page.waitForResponse(response=>response.url().includes('/api/orders/status?'));
  await page.getByRole('button',{name:'Check payment again',exact:true}).click();await result;
  expect(fixture.reads()).toBe(count+1);expect(fixture.mutations).toEqual([]);expect(fixture.unexpected).toEqual([]);expect(fixture.errors).toEqual([]);
  mkdirSync('/workspace/artifacts/ugt-checkout-journey-20261102/screenshots',{recursive:true});
  await page.screenshot({path:'/workspace/artifacts/ugt-checkout-journey-20261102/screenshots/result-'+status+'-320.png',fullPage:true});
 }finally{await fixture.context.close()}
},15000);

it.skipIf(!enabled).each([false,true])('keeps pending requests unconfirmed while copying the reference (denied=%s)',async denied=>{
 const fixture=await open('pending',undefined,false,denied),{page}=fixture;
 try{
  await page.getByRole('heading',{name:'Payment confirmation pending',exact:true}).waitFor();
  await page.getByRole('button',{name:'Copy order reference',exact:true}).click();
  await page.getByText(denied?'Select the reference to copy it.':'Reference copied',{exact:true}).waitFor();
  expect(await page.locator('[data-payment-state="success"]').count()).toBe(0);
  expect(await page.getByRole('link',{name:'Open receipt',exact:true}).count()).toBe(0);
  expect(fixture.mutations).toEqual([]);expect(fixture.errors).toEqual([]);
  if(!denied)expect(await page.evaluate(()=>(window as unknown as {copiedReference:string}).copiedReference)).toBe(orderId);
  mkdirSync('/workspace/artifacts/ugt-checkout-journey-20261102/screenshots',{recursive:true});
  await page.screenshot({path:'/workspace/artifacts/ugt-checkout-journey-20261102/screenshots/result-pending-320.png',fullPage:true});
 }finally{await fixture.context.close()}
},15000);
