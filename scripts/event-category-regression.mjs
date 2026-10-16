// Local production-bundle UI verification with explicit fictional API replies.
// This does not sign into production or establish provider/database delivery.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4204';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Local fixtures only');
const out='/workspace/artifacts/event-categories-20261016';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
try{for(const [name,profile]of [['galaxy-s24',devices['Galaxy S24']],['narrow-android',{...devices['Galaxy S24'],viewport:{width:320,height:800}}],['desktop',{viewport:{width:1440,height:1000}}]]){
 const context=await browser.newContext({...profile,serviceWorkers:'block'});
 await context.addInitScript(()=>localStorage.setItem('ugt-consent','no'));
 let categories=[],categoryAck=false,eventAck=false,eventWrites=0;
 let row={id:'fixture-school',slug:'fixture-school',kind:'school',name:'Fictional school fixture',status:'announced',event_date:null,venue:'',priority:0,image:'',tiers:[],updated_at:'2026-10-16 00:00:00.123456+00',category_id:null};
 await context.route('**/api/admin/**',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.pathname==='/api/admin/me')return route.fulfill({json:{ok:true,scope:'super_admin',perms:[]}});
  if(url.pathname==='/api/admin/event-categories'){
   if(req.method()==='GET')return route.fulfill({json:{ok:true,rows:categories}});
   const input=req.postDataJSON();await new Promise(resolve=>setTimeout(resolve,180));
   if(!categoryAck){categoryAck=true;return route.fulfill({json:{}})}
   const saved=input.action==='create'?{id:'category-fixture',name:input.name,active:true,version:1}:{id:input.id,name:input.name,active:input.active,version:input.version+1};
   categories=[saved];return route.fulfill({json:{ok:true,row:saved}});
  }
  if(url.pathname==='/api/admin/ops'&&req.method()==='POST'){
   const input=req.postDataJSON();assert.equal(input.kind,'tourEvent.save');eventWrites++;
   if(!eventAck){eventAck=true;return route.fulfill({json:{ok:true,row}})} // Correct record, wrong category: not confirmation.
   row={...row,name:input.data.name,description:input.data.description,status:input.data.status,category_id:input.data.categoryId,updated_at:'2026-10-16 01:00:00.654321+00'};
   return route.fulfill({json:{ok:true,row}});
  }
  return route.fulfill({json:{ok:true,rows:url.searchParams.get('view')==='tourEvents'?[row]:[]}});
 });
 await context.route('**/api/site-data/events',route=>route.fulfill({json:{ok:true,events:[{...row,eventDate:null,category:categories[0]&&{id:categories[0].id,name:categories[0].name},sellable:false},{id:'fixture-other',slug:'fixture-other',name:'Other fixture event',kind:'school',status:'announced',eventDate:null,sellable:false,category:{id:'category-other',name:'Other category'}}]}}));
 await context.route('**/api/event-interest',route=>route.fulfill({json:{signals:[]}}));
 await context.route('https://urban-gang-tour-events.euginemicah.workers.dev/events',route=>route.fulfill({json:{generatedAt:new Date().toISOString(),events:[],sources:[],refreshSeconds:180}}));
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/admin?tab=Events');await page.getByRole('button',{name:'Edit event',exact:true}).click();
 await page.getByLabel('Category (optional)',{exact:true}).waitFor();
 await page.getByRole('button',{name:'New category',exact:true}).click();await page.getByLabel('New category name',{exact:true}).fill('Campus culture');
 await page.getByRole('button',{name:'Save event',exact:true}).click();await page.getByRole('alert').filter({hasText:'Save or cancel your category edit first'}).waitFor();assert.equal(eventWrites,0);checks++;
 await page.getByRole('button',{name:'Save category',exact:true}).click();await page.getByRole('alert').filter({hasText:'server did not confirm this category change'}).waitFor();assert.equal(await page.getByLabel('New category name',{exact:true}).inputValue(),'Campus culture');checks++;
 await page.getByRole('button',{name:'Save category',exact:true}).click();await page.getByRole('status').filter({hasText:'Category created and selected'}).waitFor();assert.equal(await page.locator('#event-category').inputValue(),'category-fixture');assert.equal(await page.getByLabel('Name *',{exact:true}).inputValue(),row.name);checks++;
 await page.getByRole('button',{name:'Save event',exact:true}).click();await page.getByRole('alert').filter({hasText:'server did not confirm the category selection'}).waitFor();assert.equal(await page.locator('#event-category').inputValue(),'category-fixture');checks++;
 await page.getByRole('button',{name:'Save event',exact:true}).click();await page.getByText('Event saved and published.',{exact:true}).waitFor();assert.equal(row.category_id,'category-fixture');checks++;
 await page.getByRole('button',{name:'Edit event',exact:true}).click();await page.waitForFunction(()=>document.getElementById('event-category')?.value==='category-fixture'&&!document.getElementById('event-category').disabled);checks++;
 await page.getByText('Manage categories',{exact:true}).click();await page.getByRole('button',{name:'Rename Campus culture',exact:true}).click();
 // An unbroken long name must wrap on small Android widths.
 const longName='Campus'+('c'.repeat(68));await page.getByLabel('Rename category',{exact:true}).fill(longName);await page.getByRole('button',{name:'Save category',exact:true}).click();await page.getByRole('button',{name:'Pause '+longName,exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);checks++;
 await page.getByRole('button',{name:'Pause '+longName,exact:true}).click();await page.getByRole('button',{name:'Restore '+longName,exact:true}).waitFor();assert.equal(await page.locator('#event-category').inputValue(),'category-fixture');assert.match(await page.locator('#event-category option:checked').textContent(),/paused/);checks++;
 await page.getByRole('button',{name:'Restore '+longName,exact:true}).click();await page.getByRole('button',{name:'Pause '+longName,exact:true}).waitFor();checks++;
 await page.screenshot({path:out+'/'+name+'-category-editor.png',fullPage:true});
 await page.goto(base+'/events?period=all&eventCategory=category-fixture');await page.getByRole('heading',{name:row.name,exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'Other fixture event',exact:true}).count(),0);assert.equal(await page.getByLabel('Event category',{exact:true}).inputValue(),'category-fixture');checks++;
 await page.getByLabel('Event category',{exact:true}).selectOption('all');await page.getByRole('heading',{name:'Other fixture event',exact:true}).waitFor();checks++;
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);checks++;
 await page.screenshot({path:out+'/'+name+'-public-categories.png',fullPage:true});await context.close();console.log('PASS',name,'category creation, preserved input, save acknowledgement, rename/pause/restore and public deep-link filters');
}console.log(JSON.stringify({checks,out,localFixtures:true}));}finally{await browser.close()}
