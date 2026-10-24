import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

// Every API call is intercepted. These fixtures never reach a payment provider.
const base=process.env.BASE_URL||'http://127.0.0.1:3010';
const artifacts=process.env.ARTIFACT_DIR||'/workspace/artifacts/ugt-home-energy-20261024';
const scenario=process.argv[2];
const product={id:'checkout-fixture',name:'Checkout fixture shirt',price:1000,image:'/assets/ugt-logo.png',stock:5,variants:[]};
const items=[{id:product.id,qty:1}];
const options={pickup:{enabled:true,fee:0,location:'Fixture collection desk'},delivery:{enabled:true,fee:300}};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
await mkdir(artifacts,{recursive:true});

async function fixture(width){
 const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
 await context.addInitScript(({items})=>{
  localStorage.setItem('ugt-consent','no');
  localStorage.setItem('ugt-live-cart-v1',JSON.stringify(items));
  window.checkoutCartChanges=0;
  window.addEventListener('ugt-cart-changed',()=>window.checkoutCartChanges++);
 },{items});
 await context.route('**/api/**',route=>route.fulfill({json:{ok:true}}));
 await context.route('**/api/site-data/products',route=>route.fulfill({json:{ok:true,products:[product]}}));
 await context.route('**/api/checkout/fulfillment',route=>route.fulfill({json:options}));
 const page=await context.newPage();page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(60000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 return {context,page,errors};
}

async function fulfillment(width){
 const {context,page,errors}=await fixture(width);
 let requests=0,purchases=0,retryAllowed=false;
 await context.route('**/api/checkout/fulfillment',route=>{requests++;return route.fulfill(retryAllowed?{json:options}:{status:503,json:{error:'unavailable'}})});
 await context.route('**/api/orders',route=>{purchases++;return route.abort()});
 await page.goto(base+'/checkout',{waitUntil:'domcontentloaded'});
 try{await page.getByRole('alert').filter({hasText:'We could not load pickup and delivery options.'}).waitFor()}
 catch(error){console.error({requests,errors,body:(await page.locator('body').innerText({timeout:1000}).catch(()=>'' )).slice(0,1600)});throw error}
 assert.equal(await page.getByRole('button',{name:/Pay .* with M-Pesa/}).isDisabled(),true,'Unknown fulfillment configuration must not silently submit pickup');
 const failedRequests=requests;retryAllowed=true;
 await page.getByRole('button',{name:'Retry pickup and delivery options'}).click();
 await page.getByLabel('Pickup or delivery').selectOption('delivery');
 await page.getByLabel('Delivery address',{exact:true}).fill('Fixture road 1');
 await page.getByLabel('Town or city',{exact:true}).fill('Nairobi');
 assert.equal(await page.getByRole('button',{name:'Pay KES 1,300 with M-Pesa'}).isDisabled(),false);
 assert.equal(purchases,0);assert.equal(requests,failedRequests+1);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:`${artifacts}/checkout-delivery-recovered-${width}.png`,fullPage:true});
 assert.deepEqual(errors,[]);await context.close();
 console.log(`PASS fulfillment ${width}: failure disclosed, payment held, configuration retry restores delivery`);
}

async function cartNotification(width){
 const {context,page,errors}=await fixture(width);
 await context.addInitScript(({items})=>sessionStorage.setItem('ugt-checkout-order',JSON.stringify({id:'ORD-CART-FIXTURE',items})),{items});
 await context.route('**/api/orders/status**',route=>route.fulfill({json:{status:'paid',total:1000}}));
 await page.goto(base+'/pay/success?ref=ORD-CART-FIXTURE',{waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:'Payment confirmed',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>localStorage.getItem('ugt-live-cart-v1')),'[]');
 assert.equal(await page.evaluate(()=>window.checkoutCartChanges),1,'Confirmed matching-cart cleanup must notify same-page cart consumers');
 assert.equal(await page.getByRole('link',{name:'Open receipt and downloads'}).getAttribute('href'),'/receipt/ORD-CART-FIXTURE');
 assert.deepEqual(errors,[]);await context.close();
 console.log(`PASS cart-notification ${width}: confirmed matching cart clears and notifies; receipt link available`);
}

async function recovery(width){
 const {context,page,errors}=await fixture(width);
 let recoveries=0;const orders=[];
 await context.route('**/api/checkout/session',route=>route.fulfill({json:{ok:true,created:false}}));
 await context.route('**/api/checkout/recovery',route=>{
  recoveries++;return route.fulfill({json:{ok:true,id:'ORD-UNKNOWN-FIXTURE',total:1000,attemptState:'unknown',paymentStatus:'pending'}});
 });
 await context.route('**/api/orders',route=>{orders.push(route.request().postDataJSON());return route.abort()});
 await context.route('**/api/orders/status**',route=>route.fulfill({json:{status:'pending',attemptState:'unknown',total:1000}}));
 await page.goto(base+'/checkout',{waitUntil:'domcontentloaded'});
 await page.getByLabel('Your full name').fill('Fixture Buyer');
 await page.getByLabel('M-Pesa phone number').fill('0712345678');
 await page.locator('form input[type=checkbox]').check();
 await page.getByRole('button',{name:'Pay KES 1,000 with M-Pesa'}).click();
 await page.getByRole('alert').filter({hasText:'Check the saved payment before paying again.'}).waitFor();
 const key=await page.evaluate(()=>JSON.parse(localStorage.getItem('ugt-mpesa-attempt-v1')).key);
 assert.equal(key,orders[0].idempotencyKey);assert.equal('total' in orders[0],false);
 await page.getByRole('button',{name:'Pay KES 1,000 with M-Pesa'}).click();
 await page.waitForURL('**/pay/success?ref=ORD-UNKNOWN-FIXTURE');
 await page.getByRole('heading',{name:'Payment outcome not yet confirmed'}).waitFor();
 assert.equal(orders.length,1,'An uncertain attempt must recover without another order/payment request');
 assert.equal(recoveries,1);
 assert.equal(await page.getByRole('link',{name:'Open receipt and downloads'}).count(),0);
 assert.equal(await page.evaluate(()=>localStorage.getItem('ugt-live-cart-v1')),JSON.stringify(items));
 await page.screenshot({path:`${artifacts}/checkout-uncertain-payment-${width}.png`,fullPage:true});
 assert.deepEqual(errors,[]);await context.close();
 console.log(`PASS recovery ${width}: lost response retains key; retry recovers without new payment; no premature receipt`);
}

try{
 for(const width of [390,820,1440])for(const [name,run] of Object.entries({fulfillment,'cart-notification':cartNotification,recovery}))if(!scenario||scenario===name)await run(width);
}finally{await browser.close()}
