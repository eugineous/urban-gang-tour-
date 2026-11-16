import {afterAll,beforeAll,expect,it} from 'vitest';
import {build} from 'esbuild';
import {chromium,type Browser} from 'playwright';
import {existsSync,readFileSync} from 'node:fs';

const enabled=existsSync('/usr/bin/chromium');let browser:Browser,script:string;
beforeAll(async()=>{
 if(!enabled)return;
 const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`import React from 'react';import {createRoot} from 'react-dom/client';import BuyBox from './app/marketplace/[eventId]/BuyBox';createRoot(document.getElementById('app')).render(<BuyBox eventId="mkt-fixture" tiers={[{name:'General',price:500,capacity:window.fixtureCapacity}]}/>);`},bundle:true,write:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'navigation-fixture',setup(builder){
  builder.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}));
  builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const useRouter=()=>({push:path=>history.pushState({},"",path)});export const usePathname=()=>location.pathname;'}));
 }}]});script=bundle.outputFiles[0].text;browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
},30000);
afterAll(async()=>{await browser?.close()});
async function open(options:{loseFirst?:boolean;saved?:boolean;capacity?:number|null}={}){
 const context=await browser.newContext({viewport:{width:320,height:760},serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage(),purchases:Record<string,unknown>[]=[],errors:string[]=[];
 await context.addInitScript(({saved,capacity})=>{(window as unknown as {fixtureCapacity:number|null}).fixtureCapacity=capacity;if(saved)localStorage.setItem('ugt-paystack-attempt-v1',JSON.stringify({key:'a'.repeat(64),orderId:'ORD-SHOP123',state:'unknown'}))},{saved:!!options.saved,capacity:options.capacity===undefined?3:options.capacity});
 page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());if(url.origin!=='http://127.0.0.1')return route.abort();
  if(url.pathname==='/fixture.js')return route.fulfill({contentType:'text/javascript',body:script});
  if(url.pathname==='/marketplace/mkt-fixture')return route.fulfill({contentType:'text/html',body:`<meta name="viewport" content="width=device-width,initial-scale=1"><style>${readFileSync('app/design.css','utf8')}</style><main id="app" style="max-width:480px;padding:12px"></main><script src="/fixture.js"></script>`});
  if(url.pathname==='/api/checkout/session')return route.fulfill({json:{ok:true,created:false}});
  if(url.pathname==='/api/checkout/recovery')return options.saved?route.fulfill({json:{ok:true,id:'ORD-SHOP123',total:1000,attemptState:'unknown',paymentStatus:'unknown'}}):route.fulfill({status:404,json:{error:'attempt_not_found'}});
  if(url.pathname==='/api/marketplace/checkout'){purchases.push(request.postDataJSON());return options.loseFirst&&purchases.length===1?route.abort():route.fulfill({status:202,json:{ok:true,id:'ORD-MARKET123',total:500,attemptState:'unknown'}})}
  return route.abort();
 });
 await page.goto('http://127.0.0.1/marketplace/mkt-fixture');await page.locator('input[autocomplete="name"]').waitFor();
 return{context,page,purchases,errors,fill:async()=>{await page.locator('input[autocomplete="name"]').fill('Fixture adult');await page.getByRole('checkbox').check()}};
}
it.skipIf(!enabled)('requires active terms acceptance and makes one durable request despite repeated mobile submit',async()=>{
 const{context,page,purchases,errors,fill}=await open();try{
  expect(await page.getByRole('checkbox').isChecked()).toBe(false);await fill();
  await page.locator('form').evaluate(form=>{(form as HTMLFormElement).requestSubmit();(form as HTMLFormElement).requestSubmit()});await page.waitForURL('**/pay/success?ref=ORD-MARKET123');
  expect(purchases).toHaveLength(1);expect(purchases[0].idempotencyKey).toMatch(/^[a-f0-9]{64}$/);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('ugt-paystack-attempt-v1')!))).toMatchObject({orderId:'ORD-MARKET123',state:'unknown'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect(errors).toEqual([]);
 }finally{await context.close()}
},15000);
it.skipIf(!enabled)('recovers after response loss with the same payment key',async()=>{
 const{context,page,purchases,fill}=await open({loseFirst:true});try{await fill();await page.locator('button[type="submit"]').click();await page.getByRole('alert').waitFor();await page.locator('button[type="submit"]').click();await page.waitForURL('**/pay/success?ref=ORD-MARKET123');expect(purchases).toHaveLength(2);expect(purchases[0].idempotencyKey).toBe(purchases[1].idempotencyKey)}finally{await context.close()}
},15000);
it.skipIf(!enabled)('opens an unresolved shop payment without initiating a second purchase',async()=>{
 const{context,page,purchases,fill}=await open({saved:true});try{await fill();await page.locator('button[type="submit"]').click();await page.waitForURL('**/pay/success?ref=ORD-SHOP123');expect(purchases).toHaveLength(0)}finally{await context.close()}
},15000);
it.skipIf(!enabled)('keeps unknown legacy capacity unavailable for new payment',async()=>{
 const{context,page,purchases}=await open({capacity:null});try{expect(await page.locator('button[type="submit"]').isDisabled()).toBe(true);expect(purchases).toHaveLength(0)}finally{await context.close()}
},15000);
