import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4204';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Local fictional fixtures only');
const out='/workspace/artifacts/event-publication-feedback-20261016';await mkdir(out,{recursive:true});
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jOAAAAABJRU5ErkJggg==','base64');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
const fixture=()=>({id:'satuk-fixture',slug:'satuk-fixture',kind:'partner',name:'SATUK Award Gala 2026 | Technical University of Kenya',status:'pending_review',event_date:'2026-11-08',event_time:'4:00 PM',venue:'Main Campus',city:'Nairobi',image:'',priority:1,tiers:[],updated_at:'2026-10-16 00:00:00.123456+00',partner_details:{organizer:'Fixture organiser',client:'Sherehe Vibes Africa',role:'Hosting and interviews',admission:'free',ticketUrl:'',institutions:[],posters:[],newsSlug:'',posterCaption:''}});
try{for(const [name,profile]of [['galaxy-s24',devices['Galaxy S24']],['desktop',{viewport:{width:1440,height:1000}}]]){
 const context=await browser.newContext({...profile,serviceWorkers:'block'});let rows=[fixture()],emptyAcknowledgement=true,conflict=false,statusWrites=0;const saved=[];
 await context.route('**/api/admin/**',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.pathname==='/api/admin/me')return route.fulfill({json:{ok:true,scope:'super_admin',perms:[]}});
  if(url.pathname==='/api/admin/media/upload'){await new Promise(resolve=>setTimeout(resolve,400));return route.fulfill({json:{url:'/media/admin-events/fixture/cover.png'}})}
  if(url.pathname==='/api/admin/ops'&&req.method()==='POST'){
   const body=req.postDataJSON();if(body.kind==='tourEvent.status'){statusWrites++;rows=[{...rows[0],status:body.data.status}];return route.fulfill({json:{ok:true,row:rows[0]}})}
   if(body.kind==='tourEvent.save'){
    saved.push(body.data);await new Promise(resolve=>setTimeout(resolve,650));
    if(emptyAcknowledgement){emptyAcknowledgement=false;return route.fulfill({json:{}})}
    if(conflict)return route.fulfill({status:409,json:{error:'event_conflict'}});
    rows=[{...rows[0],name:body.data.name,status:body.data.status,image:body.data.image,venue:body.data.venue,event_date:body.data.eventDate,partner_details:body.data.partnerDetails,updated_at:'2026-10-16 01:00:00.654321+00'}];return route.fulfill({json:{ok:true,row:rows[0]}});
   }
  }
  return route.fulfill({json:{ok:true,rows:url.searchParams.get('view')==='tourEvents'?rows:[]}});
 });
 await context.route('**/media/admin-events/**',route=>route.fulfill({contentType:'image/png',body:png}));
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
 await page.goto(base+'/admin?tab=Events');await page.getByLabel('Status for '+rows[0].name).selectOption('published');
 const confirmation=page.getByRole('region',{name:'Confirm event status'});await confirmation.getByText('Upload or select the main event artwork.',{exact:true}).waitFor();assert.equal(await confirmation.locator('li').count(),1);assert.match(await confirmation.innerText(),/Saved status: Pending review/);checks++;
 await confirmation.getByRole('button',{name:'Confirm status',exact:true}).click();assert.equal(statusWrites,0);await page.waitForTimeout(3300);assert.equal(await page.getByRole('alert').filter({hasText:'The saved record still needs these items'}).count(),1);checks++;
 await confirmation.getByRole('button',{name:'Edit missing details',exact:true}).click();assert.equal(await page.getByLabel('Status',{exact:true}).inputValue(),'published');assert.equal(await page.getByLabel('Contracting company',{exact:true}).inputValue(),'Sherehe Vibes Africa');checks++;
 const checklist=page.getByRole('region',{name:'Publishing checklist'});for(const label of ['Organiser','Contracting company','Our role','Venue','Event date'])await checklist.getByText('✓ '+label+': Added',{exact:true}).waitFor();assert.equal(await checklist.getByRole('button',{name:'Main event artwork: Needed',exact:true}).count(),1);checks++;
 await page.screenshot({path:out+'/'+name+'-exact-missing-artwork.png',fullPage:true});
 await page.getByLabel('Event artwork',{exact:true}).setInputFiles({name:'cover.png',mimeType:'image/png',buffer:png});await page.getByLabel('Location line',{exact:true}).fill('Main Campus Hall');await page.getByRole('img',{name:'Event artwork preview',exact:true}).waitFor();assert.equal(await page.getByLabel('Location line',{exact:true}).inputValue(),'Main Campus Hall');await checklist.getByText('✓ Main event artwork: Added',{exact:true}).waitFor();checks++;
 await page.getByRole('button',{name:'Save event',exact:true}).click();await page.waitForFunction(()=>document.getElementById('partner-role')?.matches(':disabled'));checks++;
 await page.getByRole('alert').filter({hasText:'server did not confirm this save'}).waitFor();assert.equal(await page.getByLabel('Contracting company',{exact:true}).inputValue(),'Sherehe Vibes Africa');assert.equal(rows[0].status,'pending_review');checks++;
 await page.getByRole('button',{name:'Save event',exact:true}).click();await page.getByText('Event saved and published.',{exact:true}).waitFor();assert.equal(rows[0].status,'published');assert.equal(saved.at(-1).updatedAt,'2026-10-16 00:00:00.123456+00');checks++;
 rows=[fixture()];await page.reload();await page.getByRole('button',{name:'Edit event',exact:true}).click();await page.getByLabel('Status',{exact:true}).selectOption('published');await page.getByRole('button',{name:'Save private draft',exact:true}).click();await page.getByText('Draft saved. It is not public.',{exact:true}).waitFor();assert.equal(rows[0].status,'draft');assert.equal(rows[0].partner_details.client,'Sherehe Vibes Africa');checks++;
 await page.getByRole('button',{name:'Edit event',exact:true}).click();await page.getByLabel('Our role & credited team',{exact:true}).fill('New role entered by editor');conflict=true;await page.getByRole('button',{name:'Save event',exact:true}).click();await page.getByRole('alert').filter({hasText:'newer saved version'}).waitFor();assert.equal(await page.getByLabel('Our role & credited team',{exact:true}).inputValue(),'New role entered by editor');checks++;
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);checks++;assert.deepEqual(errors,[]);await page.screenshot({path:out+'/'+name+'-preserved-conflict.png',fullPage:true});await context.close();console.log('PASS',name,'exact blockers, entered-value acknowledgement, upload edits, failed acknowledgement, publication and private draft');
}console.log(JSON.stringify({checks,localFixtures:true,out}));}finally{await browser.close()}
