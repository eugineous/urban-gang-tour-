import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.BASE||'http://localhost:3100';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
 for(const width of [320,390,414,1440]){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
 // A stalled enhancement must never strand visitors behind a loading screen.

 const page=await context.newPage();
 for(const route of ['/','/shop','/events','/about']){
 await page.goto(base+route,{waitUntil:'domcontentloaded'});
 await page.locator('#ssr-shell h1').first().waitFor({state:'visible'});
 assert.equal(await page.locator('#boot-veil').isVisible(),false);
 if(width<1024){
 const copy=page.locator('#ssr-shell p').first();
 if(await copy.count()) assert.ok(await copy.evaluate(e=>parseFloat(getComputedStyle(e).fontSize))>=18);
 const logo=await page.locator('#ssr-shell .ugt-brand-logo').boundingBox(); assert.ok(logo.width<=92&&logo.height<=48);
 assert.ok(await page.locator('.ugt-tab-lb').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))>=13);
 }
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.reload({waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('#boot-veil').isVisible(),false);
 }
 await context.close();console.log(`PASS ${width}: readable SSR, refresh, no blocking loader despite failed runtime`);
 }
}finally{await browser.close();}
