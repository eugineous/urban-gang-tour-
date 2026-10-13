import {chromium,devices} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.BASE||'http://127.0.0.1:4190';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const product={id:'hydration-fixture',name:'Hydration test shirt',price:800,stock:10,variants:[],image:'/assets/ugt-logo.png',category:'Apparel'};
const errors=[];
try{for(const profile of [devices['Galaxy S24'],{viewport:{width:1920,height:900}}]){
 const context=await browser.newContext({...profile,serviceWorkers:'block'});
 await context.addInitScript(()=>{try{localStorage.setItem('ugt-consent','no');localStorage.setItem('ugt-booking-invitation-seen-v1','tested');localStorage.setItem('ugt-live-cart-v1',JSON.stringify([{id:'hydration-fixture',qty:1}]))}catch{}});
 await context.route('**/api/site-data/products',r=>r.fulfill({json:{ok:true,products:[product]}}));
 await context.route('**/api/checkout/fulfillment',r=>r.fulfill({json:{pickup:{location:'Fixture pickup'},delivery:{enabled:false,fee:null}}}));
 const page=await context.newPage();page.on('pageerror',e=>errors.push({url:page.url(),message:e.message}));
 for(let cycle=0;cycle<10;cycle++)for(const path of ['/shop/available','/cart','/checkout']){
  await page.goto(base+path,{waitUntil:'domcontentloaded'});
  await page.getByText('Hydration test shirt',{exact:true}).first().waitFor();
  assert.equal(await page.locator('h1').count(),1);
 }
 await context.close();console.log('PASS 30 immediate-catalogue/saved-cart reloads at '+profile.viewport.width+'px');
}assert.deepEqual(errors,[]);}finally{await browser.close()}
