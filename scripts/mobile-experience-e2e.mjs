import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const base=process.env.BASE||'http://127.0.0.1:4188',out='evidence/mobile-refinement';await mkdir(out,{recursive:true});
const routes=[...JSON.parse(await readFile('data/public-page-routes.json','utf8')),'/shop','/book','/account','/cart','/checkout','/organizer/login','/organizer/signup','/privacy-policy','/terms'];
const results=[];
for(const engine of process.env.ENGINE==='webkit'?[webkit]:[chromium]){
 const b=await engine.launch(engine===chromium?{executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']}:{headless:true});
 for(const [name,w,h,touch] of [['phone',390,844,true],['small',360,740,true],['landscape',844,390,true],['tablet',820,1180,true],['desktop',1440,900,false]]){
 const c=await b.newContext({viewport:{width:w,height:h},hasTouch:touch,isMobile:touch,serviceWorkers:'block',reducedMotion:'reduce'});
 await c.addInitScript(()=>{localStorage.setItem('ugt-consent','no');localStorage.setItem('ugt-booking-invitation-seen-v1','test')});
 await c.route('https://www.youtube-nocookie.com/**',r=>r.fulfill({body:'player fixture',contentType:'text/html'}));
 // Preserve real seed listings so filtering and poster layouts are exercised.
 const feed=JSON.parse(await readFile('ui/data/event-discovery.json','utf8'));feed.generatedAt=new Date().toISOString();
 await c.route('https://urban-gang-tour-events.euginemicah.workers.dev/**',r=>r.fulfill({body:JSON.stringify(feed),contentType:'application/json',headers:{'access-control-allow-origin':'*'}}));
 const errors=[];for(const route of routes){const p=await c.newPage();p.on('pageerror',e=>errors.push(route+': '+e.message));try{
 const r=await p.goto(base+route,{waitUntil:'domcontentloaded'});assert.equal(r.status(),200,route);await p.locator('h1').waitFor({state:'attached'});assert.equal(await p.locator('h1').count(),1,`${name} ${route} heading`);await p.waitForFunction(()=>document.documentElement.dataset.focusView!==undefined);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,`${name} ${route} horizontal overflow`);
 if(route==='/'){
 const frame=p.locator('.rail-preview').first();await frame.scrollIntoViewIfNeeded();const box=await frame.boundingBox();assert.ok(Math.abs(box.width/box.height-16/9)<.02,`${name} film 16:9`);assert.ok(box.width<=w,`${name} film width`);assert.ok(box.height<=h-100,`${name} film height`);
 if(await p.locator('.menu-toggle').isVisible()){await p.getByRole('button',{name:'Open menu',exact:true}).click();const menu=await p.locator('#site-menu').boundingBox();assert.ok(menu.x>=0&&menu.x+menu.width<=w+1&&menu.y+menu.height<=h+1,`${name} menu fits`);assert.equal(await p.locator('.menu-label').count(),0);await p.locator('#site-menu').screenshot({path:`${out}/${engine.name()}-${name}-menu.png`});await p.keyboard.press('Escape');assert.equal(await p.locator('.menu-toggle').getAttribute('aria-expanded'),'false');}
 }
 if(route==='/events'){
 await p.getByRole('button',{name:'Filters',exact:false}).click();await p.getByRole('combobox',{name:'Where',exact:true}).selectOption('All Kenya');await p.getByRole('combobox',{name:'When',exact:true}).selectOption('all');
 const input=p.getByRole('searchbox',{name:'Find an event'});await input.fill('no-such-event-xyz');await p.getByRole('heading',{name:'No matches for these filters.'}).waitFor();await p.getByRole('button',{name:'Reset filters'}).click();assert.equal(await input.inputValue(),'');
 }
 if(['/','/events','/gallery','/shop','/book','/contact-us','/blog','/about','/reels'].includes(route)){await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:`${out}/${engine.name()}-${name}-${route==='/'?'home':route.slice(1).replaceAll('/','-')}.png`});}
 results.push({engine:engine.name(),name,route,pass:true});
 }catch(e){throw new Error(`${engine.name()} ${name} ${route}: ${e.message}`,{cause:e})}finally{await p.close()}}
 assert.deepEqual(errors,[],`${name} script errors`);console.log('PASS',engine.name(),name,routes.length,'routes + menu, 16:9 video and event filters');await c.close();
 }await b.close();
}
await writeFile(`${out}/${process.env.ENGINE||'chromium'}-results.json`,JSON.stringify(results,null,2));
