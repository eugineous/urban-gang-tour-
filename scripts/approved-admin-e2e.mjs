import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.BASE||'http://127.0.0.1:4177';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
for(const width of [390,820,1440]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/api/admin/**',route=>{const url=new URL(route.request().url());if(url.pathname==='/api/admin/me')return route.fulfill({json:{ok:true,admin:true,scope:'super_admin',perms:[]}});return route.fulfill({json:{ok:true,rows:[],items:[],sources:[],period:'Today',generatedAt:new Date().toISOString()}})});
 const response=await page.goto(base+'/admin');assert.equal(response.status(),200);await page.locator('.cr-shell h1').waitFor();if(width<901)await page.getByRole('button',{name:'Modules',exact:true}).click();await page.getByPlaceholder('Bookings, payments, gallery…').fill('invoice');await page.locator('.cr-nav-button').filter({hasText:'Invoices'}).click();await page.locator('.cr-shell h1').filter({hasText:'Invoices'}).waitFor();console.log(`PASS ${width}: authenticated admin, module search and invoice navigation`);
 if(width<901)await page.getByRole('button',{name:'Modules',exact:true}).click();await page.getByPlaceholder('Bookings, payments, gallery…').fill('');const labels=await page.locator('.cr-nav-button').allTextContents();for(const label of labels){if(width<901&&await page.locator('#control-room-nav').isHidden())await page.getByRole('button',{name:'Modules',exact:true}).click();await page.locator('.cr-nav-button').filter({hasText:label.trim()}).first().click();await page.locator('.cr-shell h1').waitFor();}await page.screenshot({path:`/tmp/ugt-admin-${width}.png`,fullPage:false});console.log(`PASS ${width}: ${labels.length} permission-visible admin modules open`);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'Admin overflow');assert.deepEqual(errors,[]);await context.close();
}
await browser.close();
