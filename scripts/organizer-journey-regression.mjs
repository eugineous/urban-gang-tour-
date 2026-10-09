import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.BASE||'http://127.0.0.1:4184';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
for(const width of[390,820,1440]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/api/**',r=>r.fulfill({json:{ok:true,rows:[],events:[],products:[],user:null,organizer:{id:'fixture-org',businessName:'Review Organizer'}}}));
 await context.route('**/api/organizer/banks',r=>r.fulfill({json:{banks:[{name:'Fixture bank',code:'FIXTURE',currency:'KES'}]}}));
 let fails=true;
 await context.route('**/api/organizer/signup',r=>fails?r.abort():r.fulfill({json:{ok:true}}));
 await page.goto(base+'/organizer/signup');
 for(const [id,value] of[['org-business-name','Review Organizer'],['org-contact-name','Amani Example'],['org-email','review@example.invalid'],['org-phone','0712345678'],['org-password','fictional-review-password'],['org-account','00000000']])await page.locator('#'+id).fill(value);
 await page.locator('#org-bank').selectOption('FIXTURE');
 await page.getByRole('button',{name:'Apply to sell tickets'}).click();await page.getByText('Confirm adult authority and accept the terms before applying.').waitFor();
 for(const el of await page.locator('input[type=checkbox]').all())await el.check();
 await page.getByRole('button',{name:'Apply to sell tickets'}).click();await page.getByText(/Failed: Connection failed/).waitFor();assert.equal(await page.locator('#org-email').inputValue(),'review@example.invalid');
 fails=false;await page.getByRole('button',{name:'Apply to sell tickets'}).click();await page.getByRole('heading',{name:'Application received'}).waitFor();
 fails=true;await context.route('**/api/organizer/forgot',r=>fails?r.abort():r.fulfill({json:{ok:true}}));await page.goto(base+'/organizer/forgot');await page.getByLabel('Account email').fill('review@example.invalid');await page.getByRole('button',{name:'Send reset link'}).click();await page.getByText(/Request failed: Connection failed/).waitFor();assert.equal(await page.getByLabel('Account email').inputValue(),'review@example.invalid');fails=false;await page.getByRole('button',{name:'Send reset link'}).click();await page.getByText(/If that address belongs/).waitFor();
 fails=true;await context.route('**/api/organizer/events',r=>r.request().method()==='POST'?(fails?r.abort():r.fulfill({json:{ok:true}})):r.fulfill({json:{ok:true,rows:[]}}));
 await page.goto(base+'/organizer/events/new');await page.getByRole('heading',{name:'Submit a new event'}).waitFor();await page.getByLabel('Event name').fill('Review Concert');await page.getByLabel('Date',{exact:true}).fill('2026-11-12');await page.getByLabel('City',{exact:true}).fill('Nairobi');await page.getByLabel('Venue',{exact:true}).fill('Fictional venue');await page.getByLabel('Description',{exact:true}).fill('Fictional concert for testing only.');await page.getByLabel('Tier 1 price in KES').fill('1500');await page.getByRole('button',{name:'Submit for review'}).click();await page.getByText(/Failed: Connection failed/).waitFor();assert.equal(await page.getByLabel('Event name').inputValue(),'Review Concert');fails=false;await page.getByRole('button',{name:'Submit for review'}).click();await page.waitForURL('**/organizer/dashboard');
 const row={id:'fixture-event',name:'Review Concert',status:'published',event_date:'2026-11-12',venue:'Fictional venue',city:'Nairobi',description:'Fictional concert.',image:'',tiers:[{name:'Regular',price:1500}]};
 await context.route('**/api/organizer/events/fixture-event',r=>{if(r.request().method()==='GET')return r.fulfill({json:{row,ticketsSold:5}});const body=r.request().postDataJSON();assert.deepEqual(Object.keys(body).sort(),['description','image','name']);return r.fulfill({json:{ok:true}})});
 await page.goto(base+'/organizer/events/fixture-event/edit');await page.getByRole('heading',{name:'Edit event'}).waitFor();assert.equal(await page.getByLabel('Date',{exact:true}).isDisabled(),true);assert.equal(await page.getByLabel('Tier 1 price in KES').isDisabled(),true);await page.getByLabel('Description',{exact:true}).fill('Updated public description.');await page.getByRole('button',{name:'Save changes'}).click();await page.waitForURL('**/organizer/dashboard');
 assert.deepEqual(errors,[]);console.log(`PASS ${width}: organizer consent, signup retry, password recovery, event submission retry and sold-tier protection`);await context.close();
}
await browser.close();
