import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

// Frozen-runtime browser checks. All APIs/providers are intercepted locally.
const base=process.env.BASE_URL||'http://127.0.0.1:4186';
const artifacts=process.env.ARTIFACT_DIR||'/workspace/artifacts/ugt-paystack-only-20261102/browser';
const scenario=process.argv[2];
const product={id:'checkout-fixture',name:'Checkout fixture shirt',price:1000,image:'/assets/ugt-logo.png',stock:5,variants:[]};
const items=[{id:product.id,qty:1}];
const options={pickup:{enabled:true,fee:0,location:'Fixture collection desk'},delivery:{enabled:true,fee:300},payments:{mpesa:false,card:true}};
const event={id:'fixture-event',name:'Fixture owned event',sellable:true,tiers:[{name:'Standard',price:900,sellable:true,remaining:4,per_order_min:2,per_order_max:4}]};
const results=[];
const scenarios={fulfillment,'cart-notification':cartNotification,recovery,'owned-tickets':ownedTickets};
assert.ok(!scenario||Object.hasOwn(scenarios,scenario),'Unknown scenario: '+scenario);
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
await mkdir(artifacts,{recursive:true});

async function fixture(width){
 const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
 await context.addInitScript(({items})=>{
  if(!sessionStorage.getItem('fixture-initialized')){
   localStorage.setItem('ugt-consent','no');localStorage.setItem('ugt-live-cart-v1',JSON.stringify(items));
   sessionStorage.setItem('fixture-initialized','yes');
  }
  window.checkoutCartChanges=0;
  window.addEventListener('ugt-cart-changed',()=>window.checkoutCartChanges++);
 },{items});
 const errors=[],unexpected=[],mutations=[];
 context.on('request',request=>{
  if(!['GET','HEAD'].includes(request.method()))mutations.push({path:new URL(request.url()).pathname,body:request.postData()?request.postDataJSON():null});
 });
 await context.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname;
  if(url.origin!==new URL(base).origin){unexpected.push({path:url.href,method:request.method()});return route.abort()}
  if(!['GET','HEAD'].includes(request.method())){unexpected.push({path,method:request.method()});return route.abort()}
  if(!path.startsWith('/api/'))return route.continue();
  if(path==='/api/site-data/products')return route.fulfill({json:{ok:true,products:[product]}});
  if(path==='/api/site-data/events')return route.fulfill({json:{ok:true,events:[event]}});
  if(path==='/api/checkout/fulfillment')return route.fulfill({json:options});
  if(path==='/api/auth')return route.fulfill({json:{ok:true,user:null}});
  return route.fulfill({json:{ok:true}});
 });
 const page=await context.newPage();page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(60000);
 page.on('pageerror',error=>errors.push(error.message));
 return {context,page,errors,unexpected,mutations};
}

async function assertPaystackOnly(page){
 const card=page.locator('input[name="paymentMethod"][value="card"]');
 await card.waitFor({state:'visible'});assert.equal(await card.isChecked(),true);
 assert.equal(await page.locator('input[name="paymentMethod"][value="mpesa"]').count(),0);
 assert.match(await page.locator('label').filter({has:card}).innerText(),/Paystack · Card/);
}

async function fulfillment(width){
 const {context,page,errors,unexpected,mutations}=await fixture(width);
 try{
  let requests=0,retryAllowed=false;
  await context.route('**/api/checkout/fulfillment',route=>{requests++;return route.fulfill(retryAllowed?{json:options}:{status:503,json:{error:'unavailable'}})});
  await page.goto(base+'/checkout',{waitUntil:'domcontentloaded'});
  await page.getByRole('alert').filter({hasText:'We could not load pickup and delivery options.'}).first().waitFor();
  assert.equal(await page.locator('form:has([data-checkout-step]) button[type="submit"]').isDisabled(),true);
  assert.equal(await page.locator('[data-checkout-next]:visible').isDisabled(),true);
  assert.deepEqual(mutations,[],'Unavailable configuration must not create a checkout session or payment');
  const failedRequests=requests;retryAllowed=true;
  await page.getByRole('button',{name:'Retry pickup and delivery options',exact:true}).click();
  await page.locator('[data-checkout-next]:visible').click();
  await page.getByLabel('Pickup or delivery').selectOption('delivery');
  await page.getByLabel('Delivery address',{exact:true}).fill('Fixture road 1');
  await page.getByLabel('Town or city',{exact:true}).fill('Nairobi');
  await page.locator('[data-checkout-next]:visible').click();
  await assertPaystackOnly(page);
  await page.locator('form input[type="checkbox"]').check();
  await page.getByRole('button',{name:'Continue to secure card payment',exact:true}).click();
  // Delivery revalidates the earlier contact panel before any provider work.
  const name=page.getByLabel('Your full name',{exact:true}),phone=page.getByLabel('Delivery contact number',{exact:true});
  await name.waitFor({state:'visible'});
  assert.equal(await name.evaluate(node=>node.required),true);assert.equal(await phone.evaluate(node=>node.required),true);
  await name.fill('Fixture Buyer');await page.locator('[data-checkout-next]:visible').click();
  await page.locator('input[name="phone"]:focus').waitFor({state:'visible'});
  assert.equal(await phone.evaluate(node=>document.activeElement===node),true,'Missing delivery phone must keep the contact panel open');
  await phone.fill('0712345678');await page.locator('[data-checkout-next]:visible').click();
  await assertPaystackOnly(page);
  assert.equal(await page.getByRole('button',{name:'Continue to secure card payment',exact:true}).isEnabled(),true);
  assert.equal(requests,failedRequests+1);assert.deepEqual(mutations,[],'Step changes and contact validation must not initiate payment');
  await page.screenshot({path:`${artifacts}/checkout-delivery-recovered-${width}.png`,fullPage:true});
  // Returning to pickup removes delivery-only requirements without losing the journey.
  await page.locator('[data-checkout-back]:visible').click();await page.getByLabel('Pickup or delivery').selectOption('pickup');
  await page.locator('[data-checkout-back]:visible').click();await name.waitFor({state:'visible'});
  assert.equal(await name.evaluate(node=>node.required),false);assert.equal(await phone.evaluate(node=>node.required),false);
  await name.fill('');await phone.fill('');
  await page.locator('[data-checkout-next]:visible').click();await page.locator('[data-checkout-next]:visible').click();
  await assertPaystackOnly(page);assert.deepEqual(mutations,[]);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
  results.push({scenario:'fulfillment',width,optionRequests:requests,payments:0});
 }finally{await context.close()}
}

async function cartNotification(width){
 const {context,page,errors,unexpected,mutations}=await fixture(width);
 try{
  await context.addInitScript(({items})=>sessionStorage.setItem('ugt-checkout-order',JSON.stringify({id:'ORD-CART-FIXTURE',items})),{items});
  await context.route('**/api/orders/status**',route=>route.fulfill({json:{status:'paid',method:'card',total:1000}}));
  await page.goto(base+'/pay/success?ref=ORD-CART-FIXTURE',{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'Payment confirmed',exact:true}).waitFor();
  await page.waitForFunction(()=>localStorage.getItem('ugt-live-cart-v1')==='[]');
  assert.equal(await page.evaluate(()=>localStorage.getItem('ugt-live-cart-v1')),'[]');
  assert.equal(await page.evaluate(()=>window.checkoutCartChanges),1,'Confirmed matching-cart cleanup must notify same-page cart consumers');
  assert.equal(await page.getByRole('link',{name:'Open receipt',exact:true}).getAttribute('href'),'/receipt/ORD-CART-FIXTURE');
  assert.deepEqual(mutations,[]);assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
  results.push({scenario:'cart-notification',width,cartNotifications:1,payments:0});
 }finally{await context.close()}
}

async function recovery(width){
 const {context,page,errors,unexpected,mutations}=await fixture(width);
 try{
  let recoveries=0;const initiations=[];
  await context.route('**/api/checkout/session',route=>route.fulfill({json:{ok:true,created:false}}));
  await context.route('**/api/checkout/recovery',route=>{
   recoveries++;assert.deepEqual(route.request().postDataJSON(),{provider:'paystack',key:initiations[0].idempotencyKey});
   return route.fulfill({json:{ok:true,id:'ORD-UNKNOWN-FIXTURE',total:1000,attemptState:'unknown',paymentStatus:'unknown'}});
  });
  await context.route('**/api/paystack/checkout',route=>{initiations.push(route.request().postDataJSON());return route.abort()});
  await context.route('**/api/orders/status**',route=>route.fulfill({json:{status:'unknown',method:'card',total:1000}}));
  await page.goto(base+'/checkout',{waitUntil:'domcontentloaded'});
  await page.getByLabel('Email for your receipt',{exact:true}).waitFor({state:'visible'});
  await page.locator('[data-checkout-next]:visible').click();await page.locator('[data-checkout-next]:visible').click();
  await assertPaystackOnly(page);assert.deepEqual(mutations,[],'Step navigation must not allocate or initiate a payment');
  await page.locator('form input[type="checkbox"]').check();
  const submit=page.getByRole('button',{name:'Continue to secure card payment',exact:true});
  await submit.click();
  await page.getByRole('alert').filter({hasText:'Connection interrupted. Check for a payment confirmation before trying card checkout again.'}).waitFor();
  const key=await page.evaluate(()=>JSON.parse(localStorage.getItem('ugt-paystack-attempt-v1')).key);
  assert.equal(initiations.length,1);assert.equal(key,initiations[0].idempotencyKey);assert.match(key,/^[A-Za-z0-9_-]{32,128}$/);
  assert.deepEqual(initiations[0],{items,fulfillment:{method:'pickup'},idempotencyKey:key});
  await submit.click();await page.waitForURL('**/pay/success?ref=ORD-UNKNOWN-FIXTURE');
  await page.getByRole('heading',{name:'Payment outcome not yet confirmed',exact:true}).waitFor();
  assert.equal(initiations.length,1,'An uncertain attempt must recover without a second provider initiation');assert.equal(recoveries,1);
  assert.equal(await page.getByRole('link',{name:'Open receipt',exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>localStorage.getItem('ugt-live-cart-v1')),JSON.stringify(items));
  assert.equal(mutations.filter(request=>request.path==='/api/paystack/checkout').length,1);
  assert.equal(mutations.some(request=>request.path==='/api/orders'||request.path==='/api/stripe/checkout'),false);
  assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
  await page.screenshot({path:`${artifacts}/checkout-uncertain-payment-${width}.png`,fullPage:true});
  results.push({scenario:'recovery',width,initiations:1,recoveries});
 }finally{await context.close()}
}

async function ownedTickets(width){
 const {context,page,errors,unexpected,mutations}=await fixture(width);
 try{
  await page.goto(base+'/checkout?event='+event.id,{waitUntil:'domcontentloaded'});
  await page.getByRole('status').filter({hasText:'Ticket payments are currently unavailable.'}).waitFor();
  await page.locator('[data-checkout-next]:visible').click();
  const quantity=page.locator('[data-checkout-step="1"] input[type="number"]');
  assert.equal(await quantity.getAttribute('min'),'2');assert.equal(await quantity.getAttribute('max'),'4');
  await quantity.fill('3');await page.locator('[data-checkout-next]:visible').click();
  assert.equal(await page.locator('input[name="paymentMethod"]').count(),0);
  assert.equal(await page.getByRole('button',{name:'Payment unavailable',exact:true}).isDisabled(),true);
  assert.deepEqual(mutations,[]);assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
  await page.screenshot({path:`${artifacts}/checkout-owned-tickets-unavailable-${width}.png`,fullPage:true});
  results.push({scenario:'owned-tickets',width,payments:0});
 }finally{await context.close()}
}

try{
 for(const width of [390,820,1440])for(const [name,run] of Object.entries(scenarios))if(!scenario||scenario===name)await run(width);
 console.log(JSON.stringify({passed:true,checks:results.length,liveRequests:0,results}));
}finally{await writeFile(`${artifacts}/checkout-client-proof.json`,JSON.stringify({results},null,2));await browser.close()}
