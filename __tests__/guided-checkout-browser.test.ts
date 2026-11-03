import {afterAll,beforeAll,expect,it} from 'vitest';
import {build} from 'esbuild';
import {chromium,type Browser} from 'playwright';
import {existsSync,mkdirSync,readFileSync} from 'node:fs';
import {VIEWPORT_BOOTSTRAP} from '@/lib/client/viewport-bootstrap';

const enabled=existsSync('/usr/bin/chromium');
it.skipIf(!enabled)('keeps the payment radio compact and its label inside the payment tile',async()=>{
 const fixture=await open(false,390),{page}=fixture;
 try{
  // Production chunk ordering can place shared form rules after CSS modules.
  await page.addStyleTag({content:globalStyles});
  await page.locator('[data-checkout-next]:visible').click();
  await page.locator('[data-checkout-next]:visible').click();
  const bounds=await page.locator('input[type=radio]').evaluate(node=>{
   const radio=node.getBoundingClientRect(),tile=node.parentElement!.getBoundingClientRect(),label=node.nextElementSibling!.getBoundingClientRect();
   return {radio:radio.width,labelRight:label.right,tileRight:tile.right};
  });
  expect(bounds.radio).toBeLessThanOrEqual(24);
  expect(bounds.labelRight).toBeLessThanOrEqual(bounds.tileRight);
 }finally{await fixture.context.close()}
},20000);
let browser:Browser,script:string,componentStyles:string;
const globalStyles=['globals','design','modern','refinements','mobile-experience','reconstruction','android-mobile','concise-media','interaction-foundations','international','responsive-continuation','premium-implementation','navigation'].map(name=>readFileSync('app/'+name+'.css','utf8')).join('\n');
beforeAll(async()=>{
 if(!enabled)return;
 const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
  import React from 'react';import {createRoot} from 'react-dom/client';
  import {LanguageProvider} from './ui/i18n/LanguageProvider';
  import {LiveCommerce} from './app/_components/LiveCommerce';
  createRoot(document.getElementById('app')).render(<LanguageProvider><LiveCommerce view="checkout" eventId={new URLSearchParams(location.search).get('event')||undefined}/></LanguageProvider>);
 `},bundle:true,write:false,outfile:'/tmp/ugt-guided-checkout-fixture.js',external:['/assets/*','/fonts/*'],jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'fixture',setup(builder){
  builder.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}));
  builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const usePathname=()=>"/checkout";'}));
 }}]});
 script=bundle.outputFiles.find(file=>file.path.endsWith('.js'))!.text;
 componentStyles=bundle.outputFiles.find(file=>file.path.endsWith('.css'))!.text;
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
},30000);
afterAll(async()=>{await browser?.close()});

it.skipIf(!enabled).each([false,true])('keeps the checkout heading below the opaque header on desktop/coarse-tablet (%s)',async touchTablet=>{
 const {page,context}=await open(false,touchTablet?1024:1440,false,touchTablet);
 try{
  const bounds=await page.getByRole('heading',{name:'Checkout.',exact:true}).evaluate(node=>({top:node.getBoundingClientRect().top,headerBottom:document.querySelector('.site-header')!.getBoundingClientRect().bottom}));
  expect(bounds.top).toBeGreaterThanOrEqual(bounds.headerBottom+12);
 }finally{await context.close()}
},15000);

it.skipIf(!enabled)('keeps checkout fields readable in the Android wide-viewport fallback',async()=>{
 const fixture=await open(false,980,true),{page}=fixture;
 try{
  await page.evaluate(script=>{const node=document.createElement('script');node.textContent=script;document.head.append(node)},VIEWPORT_BOOTSTRAP);
  expect(await page.locator('html').getAttribute('data-phone-viewport')).toBe('wide');
  const width=await page.locator('input[name="email"]').evaluate(node=>node.getBoundingClientRect().width/Number(document.documentElement.style.zoom||1));
  expect(width).toBeGreaterThanOrEqual(240);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect(fixture.posts).toEqual([]);
 }finally{await fixture.context.close()}
},20000);

it.skipIf(!enabled)('keeps the first checkout action reachable in the initial phone viewport',async()=>{
 const fixture=await open(false,390),{page}=fixture;
 try{
  await page.getByRole('button',{name:/^Continue/}).waitFor();
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  const bounds=await page.getByRole('button',{name:/^Continue/}).evaluate(node=>({bottom:node.getBoundingClientRect().bottom,height:innerHeight}));
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.height-72);
  expect(fixture.posts).toEqual([]);
 }finally{await fixture.context.close()}
},20000);

async function open(event=false,width=390,wide=false,touchTablet=false){
 const context=await browser.newContext({viewport:{width,height:wide?2122:844},...(wide?{screen:{width:393,height:851},hasTouch:true}:{}),...(touchTablet?{screen:{width:1024,height:1366},hasTouch:true,isMobile:true}:{}),serviceWorkers:'block',reducedMotion:'reduce'});
 if(wide)await context.addInitScript(()=>{Object.defineProperty(screen,'orientation',{value:{type:'portrait-primary'}})});
 const posts:{path:string;body:unknown}[]=[],unexpected:string[]=[];
 await context.addInitScript(()=>localStorage.setItem('ugt-live-cart-v1',JSON.stringify([{id:'fixture',qty:1,variant:'Black / M'}])));
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!=='http://127.0.0.1'){unexpected.push(url.href);return route.abort()}
  if(request.method()==='POST')posts.push({path:url.pathname,body:request.postData()?request.postDataJSON():null});
  if(url.pathname==='/fixture.js')return route.fulfill({contentType:'text/javascript',body:script});
  if(url.pathname==='/fixture.css')return route.fulfill({contentType:'text/css',body:componentStyles});
  if(request.isNavigationRequest())return route.fulfill({contentType:'text/html; charset=utf-8',body:'<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+globalStyles+'</style><link rel="stylesheet" href="/fixture.css"><header class="site-header" data-public-surface="navigation"><div class="header-content"></div></header><main id="main-content" class="application-content"><div id="app"></div></main><script src="/fixture.js"></script>'});
  if(url.pathname==='/api/site-data/products')return route.fulfill({json:{ok:true,products:[{id:'fixture',name:'Fixture shirt',price:1000,variants:[{label:'Black / M',priceAdjustment:0}]}]}});
  if(url.pathname==='/api/site-data/events')return route.fulfill({json:{ok:true,events:[{id:'fixture-event',name:'Fixture event',sellable:true,tiers:[{name:'Standard',price:900,sellable:true,remaining:4,per_order_min:2,per_order_max:4}]}]}});
  if(url.pathname==='/api/checkout/fulfillment')return route.fulfill({json:{pickup:{enabled:true,fee:0,location:'Fixture desk'},delivery:{enabled:true,fee:300},payments:{mpesa:true,card:true}}});
  if(url.pathname==='/api/checkout/session')return route.fulfill({json:{ok:true,created:false}});
  if(url.pathname==='/api/orders')return route.abort();
  if(/^\/(?:payment-brands\/|fonts\/|assets\/)/.test(url.pathname)&&existsSync('public'+url.pathname))return route.fulfill({...(url.pathname.endsWith('.svg')?{contentType:'image/svg+xml'}:{}),body:readFileSync('public'+url.pathname)});
  unexpected.push(url.pathname);return route.abort();
 });
 const page=await context.newPage();page.setDefaultTimeout(5000);
 await page.goto('http://127.0.0.1/checkout'+(event?'?event=fixture-event':''));
 await page.getByLabel('Your full name',{exact:true}).waitFor();
 return {page,context,posts,unexpected};
}

it.skipIf(!enabled)('lets a card pickup buyer skip contact details before choosing card payment',async()=>{
 const {page,context,posts}=await open();
 try{
  await page.locator('[data-checkout-next]:visible').click();
  await page.getByLabel('Pickup or delivery').waitFor();
  await page.locator('[data-checkout-next]:visible').click();
  await page.locator('input[name="paymentMethod"][value="card"]').check();
  await page.locator('form input[type="checkbox"]').check();
  expect(await page.getByRole('button',{name:'Continue to secure card payment',exact:true}).isEnabled()).toBe(true);
  expect(await page.getByLabel('Your full name',{exact:true}).isVisible()).toBe(false);
  expect(posts).toEqual([]);
 }finally{await context.close()}
},20000);

it.skipIf(!enabled)('shows one checkout panel, validates details, and navigates without initiating a payment',async()=>{
 const {page,context,posts,unexpected}=await open();
 try{
  expect(await page.getByLabel('Pickup or delivery').isVisible()).toBe(false);
  expect(await page.getByRole('button',{name:/Pay KES/}).isVisible()).toBe(false);
  await page.locator('input[name="email"]').fill('invalid');
  await page.locator('[data-checkout-next]:visible').click();
  expect(await page.locator('input[name="email"]').evaluate(node=>node===document.activeElement)).toBe(true);
  await page.locator('input[name="email"]').fill('');
  await page.getByLabel('Your full name',{exact:true}).fill('Fixture Buyer');
  await page.getByLabel('Delivery contact number',{exact:true}).fill('0712345678');
  await page.getByLabel('Delivery contact number',{exact:true}).press('Enter');
  expect(await page.getByLabel('Pickup or delivery').isVisible()).toBe(true);
  expect(await page.getByLabel('Your full name',{exact:true}).isVisible()).toBe(false);
  await page.locator('[data-checkout-next]:visible').click();
  expect(await page.locator('input[name="paymentMethod"][value="card"]').isVisible()).toBe(true);
  expect(await page.locator('input[name="paymentMethod"][value="mpesa"]').count()).toBe(0);
  await page.locator('[data-checkout-back]:visible').click();
  await page.locator('[data-checkout-back]:visible').click();
  expect(await page.getByLabel('Your full name',{exact:true}).inputValue()).toBe('Fixture Buyer');
  expect(posts).toEqual([]);expect(unexpected).toEqual([]);
 }finally{await context.close()}
},20000);

it.skipIf(!enabled)('keeps the styled journey usable at phone, tablet, desktop and enlarged text sizes',async()=>{
 for(const width of [320,390,820,1440]){
  const {page,context,posts,unexpected}=await open(false,width);
  try{
   if(width===320)await page.addStyleTag({content:'html{font-size:125%}[data-checkout-journey] :is(p,label,small,button,input,select){font-size:20px!important}'});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const artifact=process.env.CHECKOUT_ARTIFACT_DIR;
   if(artifact){mkdirSync(artifact,{recursive:true});await page.screenshot({path:artifact+'/checkout-details-'+width+'.png',fullPage:true})}
   await page.getByLabel('Your full name',{exact:true}).fill('Fixture Buyer');await page.getByLabel('Delivery contact number',{exact:true}).fill('0712345678');
   await page.locator('[data-checkout-next]:visible').click();
   await page.getByLabel('Pickup or delivery').selectOption('delivery');
   await page.getByLabel('Delivery address',{exact:true}).fill('Fixture Road');await page.getByLabel('Town or city',{exact:true}).fill('Nairobi');
   await page.locator('[data-checkout-next]:visible').click();
   await page.locator('input[name="paymentMethod"][value="card"]').check();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   for(const tile of await page.locator('label:has(input[name="paymentMethod"])').all())expect((await tile.boundingBox())!.height).toBeGreaterThanOrEqual(44);
   for(const brand of ['visa.png','mastercard.svg'])expect(await page.locator('img[src="/payment-brands/'+brand+'"]').evaluate(node=>(node as HTMLImageElement).naturalWidth>0)).toBe(true);
   expect(await page.locator('img[src="/payment-brands/mpesa.png"]').count()).toBe(0);
   if(artifact)await page.screenshot({path:artifact+'/checkout-payment-'+width+'.png',fullPage:true});
   expect(posts).toEqual([]);expect(unexpected).toEqual([]);
  }finally{await context.close()}
 }
},30000);

it.skipIf(!enabled)('revalidates earlier contact fields after choosing delivery for Paystack payment',async()=>{
 const {page,context,posts}=await open();
 try{
  await page.locator('[data-checkout-next]:visible').click();
  await page.getByLabel('Pickup or delivery').selectOption('delivery');
  await page.getByLabel('Delivery address',{exact:true}).fill('Fixture Road');await page.getByLabel('Town or city',{exact:true}).fill('Nairobi');
  await page.locator('[data-checkout-next]:visible').click();
  await page.locator('form input[type="checkbox"]').check();
  await page.getByRole('button',{name:'Continue to secure card payment',exact:true}).click();
  await page.getByLabel('Your full name',{exact:true}).waitFor();
  expect(await page.getByLabel('Your full name',{exact:true}).evaluate(node=>node===document.activeElement)).toBe(true);
  await page.getByLabel('Your full name',{exact:true}).fill('Fixture Buyer');
  await page.getByLabel('Delivery contact number',{exact:true}).fill('0712345678');
  await page.locator('[data-checkout-next]:visible').click();
  expect(await page.locator('input[name="paymentMethod"][value="card"]').isVisible()).toBe(true);
  expect(posts).toEqual([]);
 }finally{await context.close()}
},20000);

it.skipIf(!enabled)('keeps ticket tier capacity bounds while unsupported Paystack ticket payment stays unavailable',async()=>{
 const {page,context,posts,unexpected}=await open(true);
 try{
  await page.getByRole('status').filter({hasText:'Ticket payments are currently unavailable'}).waitFor();
  await page.locator('[data-checkout-next]:visible').click();
  const quantity=page.locator('[data-checkout-step="1"] input[type="number"]');
  expect(await quantity.getAttribute('min')).toBe('2');expect(await quantity.getAttribute('max')).toBe('4');
  await quantity.fill('3');await page.locator('[data-checkout-next]:visible').click();
  expect(await page.locator('input[name="paymentMethod"][value="card"]').count()).toBe(0);
  expect(await page.locator('input[name="paymentMethod"][value="mpesa"]').count()).toBe(0);
  expect(await page.getByRole('button',{name:'Payment unavailable',exact:true}).isDisabled()).toBe(true);
  await page.locator('form').dispatchEvent('submit');
  expect(posts).toEqual([]);expect(unexpected).toEqual([]);
 }finally{await context.close()}
},20000);
