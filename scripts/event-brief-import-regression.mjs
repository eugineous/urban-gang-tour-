import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4204';assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Local fixtures only');
const text=await readFile(new URL('../__tests__/fixtures/chatgpt-event-brief.txt',import.meta.url),'utf8');
const out=process.env.OUT_DIR||'/workspace/artifacts/event-brief-import-20261016';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
try{for(const [name,profile]of [['galaxy-s24',devices['Galaxy S24']],['desktop',{viewport:{width:1440,height:1000}}]]){
 const context=await browser.newContext({...profile,serviceWorkers:'block'}),saved=[];
 await context.addInitScript(()=>{try{localStorage.setItem('ugt-consent','no')}catch{}});
 await context.route('**/api/admin/**',route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.pathname==='/api/admin/me')return route.fulfill({json:{ok:true,scope:'super_admin',perms:[]}});
  if(request.method()==='POST'){const body=request.postDataJSON();saved.push(body);return route.fulfill({json:{ok:true,row:{id:'fixture',kind:body.data.kind,status:body.data.status,name:body.data.name,updated_at:'2026-10-16 00:00:00.123456+00'}}})}
  return route.fulfill({json:{ok:true,rows:[]}});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/admin?tab=Events');
 await page.getByRole('button',{name:'Paste from ChatGPT',exact:true}).click();await page.getByLabel('Event text',{exact:true}).fill(text);await page.getByRole('button',{name:'Preview import',exact:true}).click();
 await page.getByLabel('Choose an event (3 found)',{exact:true}).selectOption('1');await page.getByRole('heading',{name:'SATUK Award Gala 2026 | Technical University of Kenya',exact:true}).waitFor();assert.equal(saved.length,0);checks++;
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);checks++;await page.screenshot({path:out+'/'+name+'-preview.png',fullPage:true});
 await page.getByRole('button',{name:'Use this draft',exact:true}).click();assert.equal(await page.getByLabel('Name *',{exact:true}).inputValue(),'SATUK Award Gala 2026 | Technical University of Kenya');assert.equal(await page.getByLabel('Status',{exact:true}).inputValue(),'draft');assert.equal(await page.getByLabel('Date *',{exact:true}).inputValue(),'2026-11-05');assert.equal(await page.getByLabel('Time',{exact:true}).inputValue(),'4:00 PM');assert.equal(await page.getByLabel('Contracting company',{exact:true}).inputValue(),'');assert.equal(saved.length,0);checks++;
 assert.match(await page.getByLabel('Poster caption / accessible description',{exact:true}).inputValue(),/Blue, white and gold/);checks++;
 await page.getByRole('button',{name:'Save event',exact:true}).click();await page.getByRole('button',{name:'Paste from ChatGPT',exact:true}).waitFor();assert.equal(saved.length,1);assert.equal(saved[0].kind,'tourEvent.save');assert.equal(saved[0].data.status,'draft');assert.equal(saved[0].data.kind,'partner');assert.equal(saved[0].data.image,'');assert.deepEqual(saved[0].data.tiers,[]);checks++;
 assert.deepEqual(errors,[]);await context.close();console.log('PASS',name,'paste → choose event → review draft → existing authenticated save');
}console.log(JSON.stringify({checks,localOnly:true,out}));}finally{await browser.close()}
