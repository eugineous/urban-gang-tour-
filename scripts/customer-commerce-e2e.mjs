import {chromium} from 'playwright';
import assert from 'node:assert/strict';

// Isolated browser fixtures: no processor, email or production writes.
const base=process.env.BASE_URL||'http://127.0.0.1:4190';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const product={id:'fixture-shirt',name:'Fixture shirt',price:1000,image:'/assets/ugt-logo.png',stock:3,variants:[{label:'Medium',priceAdjustment:0,stock:0},{label:'Large',priceAdjustment:0,stock:3}]};
try{
 for(const width of [390,820,1440]){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.addInitScript(()=>{localStorage.setItem('ugt-consent','no');localStorage.setItem('ugt-booking-invitation-seen-v1','1')});
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/site-data/products',route=>route.fulfill({json:{ok:true,products:[product]}}));
  await page.route('**/api/checkout/fulfillment',route=>route.fulfill({json:{pickup:{enabled:true,fee:0,location:'Fixture collection desk'},delivery:{enabled:true,fee:300}}}));
  await page.goto(base+'/shop');
  await page.getByLabel('Variation for Fixture shirt').waitFor();
  assert.equal(await page.getByLabel('Variation for Fixture shirt').inputValue(),'Large');
  assert.equal(await page.getByLabel('Variation for Fixture shirt').locator('option').first().evaluate(option=>option.disabled),true);
  await page.getByRole('button',{name:'Add to cart',exact:true}).click();
  await page.goto(base+'/cart');
  await page.getByLabel('Quantity for Fixture shirt').fill('4');
  await page.getByRole('alert').filter({hasText:'Reduce quantities'}).waitFor();
  assert.equal(await page.getByRole('link',{name:'Continue to secure checkout'}).count(),0);
  await page.getByLabel('Quantity for Fixture shirt').fill('1');
  await page.getByRole('link',{name:'Continue to secure checkout'}).click();
  await page.getByLabel('Fulfillment').selectOption('delivery');
  await page.getByLabel('Delivery address',{exact:true}).fill('Fixture road 1');
  await page.getByLabel('Town or city',{exact:true}).fill('Nairobi');
  await page.getByLabel('Payment method').selectOption('card');
  assert.equal(await page.getByLabel('Email for your receipt').evaluate(input=>input.required),false);
  await page.getByLabel('Your full name').fill('Fixture Buyer');
  await page.getByLabel('Delivery contact number').fill('+254712345678');
  await page.getByLabel('Email for your receipt').fill('fixture@example.invalid');
  let firstQuote;let firstRequested;
  const requested=new Promise(resolve=>{firstRequested=resolve});
  let quotes=0;
  await page.route('**/api/checkout/quote',route=>{quotes++;if(quotes===1){firstQuote=route;firstRequested();return}return route.fulfill({json:{total:950,promoApplied:true,savings:350,deliveryFee:300}})});
  await page.getByLabel('Promo code (optional)').fill('OLD');
  await page.getByRole('button',{name:'Check total and promo'}).click();await requested;
  await page.getByLabel('Promo code (optional)').fill('NEW');
  await page.getByRole('button',{name:'Check total and promo'}).waitFor();
  await firstQuote.fulfill({json:{total:1,promoApplied:true,savings:999,deliveryFee:300}}).catch(()=>{});
  assert.equal(await page.getByText('Confirmed total: KES 1',{exact:true}).count(),0);
  await page.getByRole('button',{name:'Check total and promo'}).click();
  await page.getByText('Confirmed total: KES 950',{exact:true}).waitFor();
  await page.getByText('You save KES 350 on merchandise.',{exact:true}).waitFor();
  let paymentBody;
  await page.route('**/api/paystack/checkout',route=>{paymentBody=route.request().postDataJSON();return route.fulfill({json:{authorizationUrl:'https://checkout.paystack.com/ugt-fictional',orderId:'ORD-FIXTURE'}})});
  await page.route('https://checkout.paystack.com/ugt-fictional',route=>route.fulfill({contentType:'text/html',body:'<h1>Isolated checkout fixture</h1>'}));
  await page.locator('form input[type=checkbox]').check();
  await page.getByRole('button',{name:'Continue to secure card payment'}).click();
  await page.waitForURL('https://checkout.paystack.com/ugt-fictional');
  assert.equal(paymentBody.name,'Fixture Buyer');assert.equal(paymentBody.phone,'+254712345678');
  assert.equal(paymentBody.promoCode,'NEW');assert.equal(paymentBody.fulfillment.method,'delivery');
  assert.equal(paymentBody.fulfillment.address.line1,'Fixture road 1');
  assert.equal('total' in paymentBody,false);assert.equal('fee' in paymentBody.fulfillment,false);
  await page.unroute('**/api/site-data/products');
  await page.route('**/api/site-data/products',route=>route.fulfill({status:503,json:{error:'catalog_unavailable'}}));
  await page.goto(base+'/shop');
  await page.getByRole('alert').filter({hasText:'We could not load the live catalogue'}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'The next drop is being prepared.'}).count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Shop must fit viewport');
  assert.deepEqual(errors,[]);
  console.log('PASS',width,'available variants, stock-bound cart, optional guest email, stale quote cancellation, verified savings, private delivery contact, server-priced card redirect, honest catalogue outage');
  await context.close();
 }
}finally{await browser.close()}
