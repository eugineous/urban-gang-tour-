import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
import {mkdir} from 'node:fs/promises';
const base=process.env.BASE_URL||'http://127.0.0.1:4204';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Fixture suite is local only.');
const out='/workspace/artifacts/admin-events-20261015/after';await mkdir(out,{recursive:true});
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jOAAAAABJRU5ErkJggg==','base64');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
try{for(const [name,profile] of [['galaxy-s24',devices['Galaxy S24']],['galaxy-a55',devices['Galaxy A55']],['landscape',{viewport:{width:915,height:412}}],['desktop',{viewport:{width:1440,height:1000}}]]){
 const context=await browser.newContext({...profile,serviceWorkers:'block'});await context.addInitScript(()=>localStorage.setItem('ugt-consent','no'));
 const errors=[];let conflict=false,failUpload=false,uploads=[],saved=[],changes=[];
 let rows=[{id:'fixture-event',slug:'fixture-event',kind:'ticketed',name:'Fixture festival',event_date:'2026-12-20',event_time:'14:00',venue:'Nairobi studio',city:'Nairobi',status:'published',priority:0,image:'',description:'Fixture event for interface inspection.',tiers:[{name:'General',price:500,capacity:200}],updated_at:'2026-10-15 00:00:00.123456+00'}];
 let galleryUploads=0,gallerySaves=0;
 await context.route('**/api/admin/**',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.pathname==='/api/admin/me')return route.fulfill({json:{ok:true,scope:'super_admin',perms:[]}});
  if(url.pathname==='/api/admin/gallery/upload'){galleryUploads++;return route.fulfill({json:{url:'/media/gallery/fixture/test.png'}})}
  if(url.pathname==='/api/admin/gallery'){if(request.method()==='POST')gallerySaves++;return route.fulfill({json:{ok:true,rows:[],capabilities:{publish:true}}})}
  if(url.pathname==='/api/admin/media/upload'){uploads.push(url.searchParams.get('purpose'));await new Promise(resolve=>setTimeout(resolve,350));return route.fulfill(failUpload?{status:503,json:{error:'upload_unavailable'}}:{json:{url:'/media/admin-'+url.searchParams.get('purpose')+'/fixture/test.png'}})}
  if(url.pathname==='/api/admin/ops'&&request.method()==='POST'){
   const body=request.postDataJSON();
   if(body.kind==='tourEvent.status'){changes.push(body.data);if(conflict)return route.fulfill({status:409,json:{error:'event_conflict'}});rows=[{...rows[0],status:body.data.status}];}
   else if(body.kind==='tourEvent.save')saved.push(body.data);
   return route.fulfill({json:{ok:true,row:rows[0]}});
  }
  return route.fulfill({json:{ok:true,rows:url.searchParams.get('view')==='tourEvents'?rows:[],campaigns:[]}});
 });
 await context.route('**/media/admin-**',route=>route.fulfill({contentType:'image/png',body:png}));
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 const response=await page.goto(base+'/admin?tab=Events');assert.match(response.headers()['content-security-policy'],/img-src [^;]*blob:/);checks++;await page.getByRole('button',{name:'Edit event',exact:true}).waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');checks++;
 const select=page.getByLabel('Status for Fixture festival');await select.selectOption('ongoing');assert.equal(changes.length,0,'requires confirmation');checks++;
 await page.getByRole('button',{name:'Confirm status',exact:true}).click();await page.getByRole('region',{name:'Confirm event status'}).waitFor({state:'hidden'});assert.equal(changes[0].status,'ongoing');assert.equal(changes[0].updatedAt,'2026-10-15 00:00:00.123456+00');checks++;
 await select.selectOption('completed');await page.getByRole('button',{name:'Keep current'}).click();assert.equal(changes.length,1);checks++;
 conflict=true;await select.selectOption('completed');await page.getByRole('button',{name:'Confirm status',exact:true}).click();await page.getByText('This event changed. Reload and review before trying again.',{exact:true}).waitFor();assert.equal(rows[0].status,'ongoing');checks++;conflict=false;
 await page.getByRole('button',{name:'Keep current'}).click();await page.waitForTimeout(5000);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:out+'/'+name+'-events.png',fullPage:true});await page.getByRole('article').filter({has:page.getByRole('heading',{name:'Fixture festival',exact:true})}).screenshot({path:out+'/'+name+'-event-card.png'});
 await page.getByRole('button',{name:'Edit event',exact:true}).click();await page.getByLabel('Event artwork',{exact:true}).setInputFiles({name:'cover.png',mimeType:'image/png',buffer:png});await page.getByRole('img',{name:'Event artwork preview'}).waitFor();assert.equal(uploads[0],'events');checks++;
 await page.getByRole('button',{name:'Save event',exact:true}).click();await page.getByRole('button',{name:'Edit event',exact:true}).waitFor();assert.ok(saved[0].image.startsWith('/media/admin-events/'));checks++;
 await page.getByRole('button',{name:'+ New event',exact:true}).click();await page.getByLabel('Kind *',{exact:true}).selectOption('partner');
 assert.equal(await page.getByText('Ticket tiers (real prices — checkout charges exactly this)',{exact:true}).count(),0);checks++;
 await page.getByLabel('Name *',{exact:true}).fill('Partner listing fixture');await page.getByLabel('Presented / organised by',{exact:true}).fill('Actual organiser');await page.getByLabel('Contracting company',{exact:true}).fill('Sherehe Vibes Africa');await page.getByLabel('Our role & credited team',{exact:true}).fill('Eugine — hosting; Lucy — interviews');await page.getByLabel('Admission',{exact:true}).selectOption('free');await page.getByLabel('Date *',{exact:true}).fill('2026-11-06');await page.getByLabel('Location line',{exact:true}).fill('Graduation Square');
 await page.getByLabel('Event artwork',{exact:true}).setInputFiles({name:'cover.png',mimeType:'image/png',buffer:png});await page.getByRole('img',{name:'Event artwork preview'}).waitFor();
 await page.getByRole('button',{name:'+ Add poster variant',exact:true}).click();await page.getByLabel('Additional poster 2',{exact:true}).setInputFiles({name:'poster-2.png',mimeType:'image/png',buffer:png});await page.getByRole('img',{name:'Additional poster 2 preview'}).waitFor();await page.getByLabel('Caption / accessible description',{exact:true}).fill('Vendor call original poster');await page.getByLabel('Institutions (one per line)',{exact:true}).fill('University of Nairobi\n');await page.getByLabel('Status',{exact:true}).selectOption('published');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'partner editor fits viewport');checks++;await page.screenshot({path:out+'/'+name+'-partner-editor.png',fullPage:true});
 await page.getByRole('button',{name:'Save event',exact:true}).click();await page.getByRole('button',{name:'Edit event',exact:true}).waitFor();const partnerSaved=saved.at(-1);assert.equal(partnerSaved.kind,'partner');assert.equal(partnerSaved.partnerDetails.admission,'free');assert.deepEqual(partnerSaved.partnerDetails.institutions,['University of Nairobi']);assert.equal(partnerSaved.partnerDetails.posters[0].caption,'Vendor call original poster');assert.deepEqual(partnerSaved.tiers,[]);checks++;
 await page.goto(base+'/admin?tab=Content');await page.getByText('Supplied partner-event news drafts',{exact:true}).click();await page.getByRole('button',{name:'UniFest 2026',exact:true}).click();assert.equal(await page.getByPlaceholder('Headline *').inputValue(),'UniFest 2026 heads to the University of Nairobi on 6 November');assert.equal(await page.getByLabel('Published (visible on the site + sitemap)').isChecked(),false);checks++;await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.goto(base+'/admin?tab=Content');await page.getByRole('button',{name:/New post/}).click();await page.getByPlaceholder('Headline *').fill('Keep this headline');await page.getByLabel('Story cover image',{exact:true}).setInputFiles({name:'cover.png',mimeType:'image/png',buffer:png});await page.getByPlaceholder('Headline *').fill('Headline edited during upload');await page.getByRole('img',{name:'Story cover image preview'}).waitFor();assert.equal(await page.getByPlaceholder('Headline *').inputValue(),'Headline edited during upload');assert.equal(await page.getByLabel('Published (visible on the site + sitemap)').isChecked(),false);checks++;
 failUpload=true;await page.getByLabel('Story cover image',{exact:true}).setInputFiles({name:'retry.png',mimeType:'image/png',buffer:png});await page.getByRole('alert').filter({hasText:'Upload did not complete'}).waitFor();assert.equal(await page.getByRole('img',{name:'Story cover image preview'}).count(),1);checks++;
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'story form fits viewport');checks++;
 await page.screenshot({path:out+'/'+name+'-story-upload.png',fullPage:true});
 await page.goto(base+'/admin?tab=Campaigns');await page.getByRole('button',{name:'New campaign',exact:true}).click();await page.getByLabel('Campaign artwork',{exact:true}).waitFor();checks++;
 await page.goto(base+'/admin?tab=Gallery');await page.getByRole('button',{name:'+ Upload photo',exact:true}).waitFor();await page.locator('input[type=file]').setInputFiles({name:'gallery.png',mimeType:'image/png',buffer:png});await page.getByText('Photo uploaded',{exact:true}).waitFor();assert.equal(galleryUploads,1);assert.equal(gallerySaves,1);checks++;
 assert.deepEqual(errors,[]);await context.close();console.log('PASS',name,'status confirmation/conflicts, file uploads, preserved drafts and responsive reflow');
}
 const schoolContext=await browser.newContext({viewport:{width:412,height:915}});
 await schoolContext.route('**/api/admin/**',route=>route.fulfill({json:new URL(route.request().url()).pathname==='/api/admin/me'?{ok:true,scope:'super_admin',perms:[]}:{ok:true,rows:[{id:'fixture-school',kind:'school',name:'School stop fixture',status:'published',event_date:null,date_label:'Date to be confirmed',venue:'Nairobi',priority:0,tiers:[],image:'',updated_at:'2026-10-15 00:00:00+00'}]}}));
 const schoolPage=await schoolContext.newPage();await schoolPage.goto(base+'/admin?tab=Events');await schoolPage.getByRole('button',{name:'Edit event',exact:true}).waitFor();
 assert.equal(await schoolPage.getByRole('link',{name:'View public page',exact:true}).getAttribute('href'),'/tour-stops');checks++;
 assert.equal(await schoolPage.getByRole('button',{name:'Recover legacy events',exact:true}).isVisible(),false);checks++;
 await schoolPage.screenshot({path:out+'/school-events-mobile.png',fullPage:true});await schoolContext.close();
 const context=await browser.newContext({viewport:{width:412,height:915}});let phase='published';
 await context.addInitScript(()=>localStorage.setItem('ugt-consent','no'));
 await context.route('**/api/site-data/events',route=>route.fulfill({json:{ok:true,events:[{id:'fixture-public',slug:'fixture-public',kind:'ticketed',name:'Public fixture event',status:phase,eventDate:'2026-12-20',venue:'Nairobi',sellable:false},{id:'fixture-partner',slug:'fixture-partner',kind:'partner',name:'Partner fixture event',status:'published',eventDate:'2026-12-21',venue:'Nairobi',sellable:true,partnerDetails:{organizer:'Actual organiser',client:'Sherehe Vibes Africa',role:'Contracted hosting',admission:'free',ticketUrl:'',institutions:['University of Nairobi'],posters:[],newsSlug:''}}]}}));
 await context.route('**/api/event-interest',route=>route.fulfill({json:{signals:[]}}));
 await context.route('https://urban-gang-tour-events.euginemicah.workers.dev/events',route=>route.fulfill({json:{generatedAt:new Date().toISOString(),events:[],sources:[],refreshSeconds:180}}));
 const page=await context.newPage();await page.clock.install();await page.goto(base+'/events');await page.getByRole('heading',{name:'Public fixture event',exact:true}).waitFor();
 const partnerCard=page.getByRole('article').filter({has:page.getByRole('heading',{name:'Partner fixture event',exact:true})});await partnerCard.getByText('Free admission',{exact:true}).waitFor();assert.equal(await partnerCard.getByRole('link',{name:/View event details/}).getAttribute('href'),'/events/fixture-partner');assert.equal(await partnerCard.getByRole('link',{name:/View tickets|Get tickets/}).count(),0);checks++;
 assert.equal(await page.getByText('Event details updated. Check the latest status below.',{exact:true}).count(),0);checks++;
 phase='ongoing';await page.clock.runFor(21000);await page.getByText('Happening now',{exact:true}).waitFor();assert.equal(await page.getByText('Event details updated. Check the latest status below.',{exact:true}).count(),1);checks++;
 await page.getByRole('button',{name:'Dismiss event update',exact:true}).click();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:out+'/public-status-refresh.png',fullPage:true});await context.close();
 console.log(JSON.stringify({localOnly:true,checks,out}));}finally{await browser.close()}
