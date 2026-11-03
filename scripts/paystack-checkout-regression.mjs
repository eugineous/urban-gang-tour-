// Frozen-runtime UI checks. Every API/provider request is intercepted locally.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,devices} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4186';
const out=process.env.ARTIFACT_DIR||'/workspace/artifacts/ugt-paystack-only-20261102/browser';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const product={id:'fixture-shirt',name:'Fixture shirt',price:1000,image:'/assets/ugt-logo.png',stock:5,variants:[]};
const cart=[{id:product.id,qty:1}],key='k'.repeat(64),id='ORD-PAYSTACK-FIXTURE';
const results=[],errors=[],unhandled=[];
try{
 for(const width of [390,820,1440])for(const scenario of ['lost-response','ready','paid-prepared']){
  const context=await browser.newContext({...(width===390?devices['Pixel 7']:{}),viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.addInitScript(({cart,key,id,scenario})=>{
   if(!sessionStorage.getItem('fixture-initialized')){
    localStorage.setItem('ugt-consent','no');localStorage.setItem('ugt-live-cart-v1',JSON.stringify(cart));
    if(scenario!=='lost-response')localStorage.setItem('ugt-paystack-attempt-v1',JSON.stringify({key,orderId:id,state:'unknown'}));
    sessionStorage.setItem('fixture-initialized','yes');
   }
  },{cart,key,id,scenario});
  let attempts=0,recoveries=0,sessions=0,postedKey;
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url()),path=url.pathname;
   const json=(body,status=200)=>route.fulfill({status,json:body});
   if(url.origin!==new URL(base).origin){
    if(request.method()==='GET'&&request.url()==='https://checkout.paystack.com/fixture')return route.fulfill({contentType:'text/html',body:'<h1>Simulated secure checkout</h1>'});
    if(!['GET','HEAD'].includes(request.method()))unhandled.push({scenario,width,path:url.href,method:request.method()});
    return route.abort();
   }
   if(!path.startsWith('/api/')){
    if(['GET','HEAD'].includes(request.method()))return route.continue();
    unhandled.push({scenario,width,path,method:request.method()});return route.abort();
   }
   if(path==='/api/site-data/products')return json({ok:true,products:[product]});
   if(path==='/api/checkout/fulfillment')return json({pickup:{enabled:true,fee:0,location:'Fixture desk'},delivery:{enabled:false,fee:null},payments:{mpesa:false,card:true}});
   if(path==='/api/checkout/session'){sessions++;return json({ok:true,created:false})}
   if(path==='/api/checkout/recovery'){
    recoveries++;assert.deepEqual(request.postDataJSON(),{provider:'paystack',key:scenario==='lost-response'?postedKey:key});
    return json({ok:true,id,total:1000,attemptState:scenario==='ready'?'ready':scenario==='paid-prepared'?'prepared':'unknown',paymentStatus:scenario==='paid-prepared'?'paid':'pending',...(scenario==='ready'?{authorizationUrl:'https://checkout.paystack.com/fixture'}:{})});
   }
   if(path==='/api/paystack/checkout'){
    attempts++;const body=request.postDataJSON();postedKey=body.idempotencyKey;
    assert.match(postedKey,/^[A-Za-z0-9_-]{32,128}$/);assert.equal(body.total,undefined);assert.equal(body.ticket,undefined);
    assert.deepEqual(body.items,cart);return route.abort();
   }
   if(path==='/api/orders/status')return json({status:scenario==='paid-prepared'?'paid':'unknown',method:'card',total:1000});
   if(path==='/api/auth')return json({ok:true,user:null});
   if(!['GET','HEAD'].includes(request.method())){unhandled.push({scenario,width,path,method:request.method()});return route.abort()}
   return json({ok:true});
  });
  const page=await context.newPage();page.on('pageerror',error=>errors.push({scenario,width,error:error.message}));
  await page.goto(base+'/checkout',{waitUntil:'domcontentloaded'});
  await page.locator('input[name="email"]').waitFor({state:'visible'});
  assert.equal(await page.locator('input[name="name"]').evaluate(node=>node.required),false);
  assert.equal(await page.locator('input[name="phone"]').evaluate(node=>node.required),false);
  await page.locator('input[name="email"]').fill('buyer@example.invalid');
  await page.locator('[data-checkout-next]:visible').click();
  await page.locator('[data-checkout-next]:visible').click();
  await page.locator('input[type="radio"][name="paymentMethod"][value="card"]').check();
  assert.equal(await page.locator('input[name="paymentMethod"][value="mpesa"]').count(),0);
  assert.match(await page.locator('label').filter({has:page.locator('input[name="paymentMethod"][value="card"]')}).innerText(),/Paystack · Card/);
  assert.equal(attempts,0,'Moving through checkout must not initialize a payment');
  assert.equal(recoveries,0,'Moving through checkout must not recover or allocate an attempt');
  assert.equal(sessions,0,'Moving through checkout must not allocate a checkout session');
  await page.locator('form input[type=checkbox]').check();
  const submit=page.getByRole('button',{name:'Continue to secure card payment'});
  await submit.click();
  if(scenario==='lost-response'){
   await page.getByRole('alert').filter({hasText:/saved payment|card checkout|payment may|could not|check/i}).first().waitFor();
   assert.equal(attempts,1);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ugt-paystack-attempt-v1')).key),postedKey);
   await submit.click();
  }
  if(scenario==='ready'){
   await page.waitForURL('https://checkout.paystack.com/fixture');
   await page.getByRole('heading',{name:'Simulated secure checkout'}).waitFor();assert.equal(attempts,0);
  }else{
   await page.waitForURL('**/pay/success?ref='+id);
   await page.getByRole('heading',{name:scenario==='paid-prepared'?'Payment confirmed':'Payment outcome not yet confirmed',exact:true}).waitFor();
   assert.equal(attempts,scenario==='lost-response'?1:0);
   if(scenario==='lost-response')assert.equal(await page.getByRole('link',{name:'Open receipt',exact:true}).count(),0);
  }
  if(scenario!=='ready')await page.screenshot({path:`${out}/${scenario}-${width}.png`,fullPage:true});
  assert.equal(recoveries,1);assert.equal(sessions,scenario==='lost-response'?2:1);
  results.push({scenario,width,attempts,recoveries,sessions});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(unhandled,[]);
 console.log(JSON.stringify({passed:true,checks:results.length,errors:0,liveRequests:0}));
}finally{await writeFile(`${out}/proof.json`,JSON.stringify({results,errors,unhandled},null,2));await browser.close()}
