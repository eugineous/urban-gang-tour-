import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const base=process.env.BASE||'http://127.0.0.1:4184',dir=process.env.EVIDENCE_DIR||'evidence/retirement/after';
const routes=[...JSON.parse(await readFile('data/public-page-routes.json','utf8')),'/shop','/book','/account','/cart','/checkout','/marketplace','/organizer/login','/organizer/signup','/press','/privacy-policy','/terms','/refund-policy','/ticket-terms','/offline'];
await mkdir(dir,{recursive:true});const checks=[];
// RSC must be produced by the actual Next route, never by an HTML interceptor.
for(const path of ['/about','/blog','/contact-us','/shop','/gallery/school-koinange']){const r=await fetch(base+path+'?_rsc=retirement',{headers:{RSC:'1'}});assert.equal(r.status,200,path);assert.match(r.headers.get('content-type'),/text\/x-component/);assert.match(r.headers.get('cache-control'),/no-store/);console.log('PASS native RSC',path)}
for(const path of ['/_design-pages/index.html','/_design/_next/static/old.js','/fonts/v25-anton-latin.woff2'])assert.equal((await fetch(base+path)).status,404,'Retired asset '+path);
for(const engine of (process.env.ENGINE?[chromium,webkit].filter(e=>e.name()===process.env.ENGINE):[chromium,webkit])){
 const browser=await engine.launch(engine===chromium?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{headless:true});
 try{for(const [name,settings]of [['mobile',{...devices[engine===chromium?'Pixel 7':'iPhone 13'],viewport:{width:390,height:844}}],['tablet',{viewport:{width:820,height:1180}}],['desktop',{viewport:{width:1440,height:900}}]]){
 const c=await browser.newContext(settings),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await c.addInitScript(()=>{try{localStorage.setItem('ugt-consent','no');localStorage.setItem('ugt-booking-invitation-seen-v1','tested')}catch{}});
 await c.route('https://www.youtube-nocookie.com/**',r=>r.fulfill({body:'<title>External player fixture</title>',contentType:'text/html'}));
 await c.route('https://urban-gang-tour-events.euginemicah.workers.dev/**',r=>r.fulfill({json:{events:[],sources:[],refreshSeconds:180,generatedAt:new Date().toISOString()},headers:{'access-control-allow-origin':'*'}}));
 for(const path of routes){const r=await p.goto(base+path,{waitUntil:'domcontentloaded'});assert.equal(r.status(),200,path);await p.waitForFunction(()=>document.documentElement.dataset.focusView!==undefined);assert.equal(await p.locator('.site-header').count(),1,`${name} ${path} header`);assert.equal(await p.locator('h1').count(),1,`${name} ${path} heading`);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,`${name} ${path} overflow`);const bad=await p.evaluate(()=>[...document.querySelectorAll('link[href],script[src]')].map(e=>e.getAttribute('href')||e.getAttribute('src')).filter(v=>/v25|_design\/|_design-pages/.test(v)));assert.deepEqual(bad,[],path+' legacy resources');assert.equal(await p.locator('#v25-host,#boot-veil,.ugt-tabbar,[data-v25-page]').count(),0,path);checks.push({engine:engine.name(),screen:name,path,result:'pass'});}
 // Actual same-session navigation, back and refresh: catches hidden fallback renderers.
 await p.goto(base,{waitUntil:'domcontentloaded'});
 for(const [label,target]of [['Shop','/shop'],['Contact','/contact-us'],['About','/about'],['News','/blog'],['Gallery','/gallery'],['Events','/events']]){
  if(await p.locator('.menu-toggle').isVisible()){await p.getByRole('button',{name:'Open menu',exact:true}).click();await p.locator('#site-menu nav a').filter({hasText:new RegExp('^\\d+\\s*'+label+'$')}).click()}else await p.locator('.desktop-nav a[href="'+target+'"]').click();
  await p.waitForURL(base+target);await p.waitForFunction(()=>document.documentElement.dataset.focusView!==undefined);const h1=await p.locator('h1').innerText();await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.documentElement.dataset.focusView!==undefined);assert.equal(await p.locator('h1').innerText(),h1);assert.equal(await p.locator('.site-header').count(),1);if(engine===chromium)await p.screenshot({path:`${dir}/${name}-${label.toLowerCase()}.png`});
 }
 await p.goBack({waitUntil:'domcontentloaded'});assert.equal(await p.locator('.site-header').count(),1);const r=await p.goto(base+'/missing-retired-page');assert.equal(r.status(),404);await p.getByRole('heading',{name:'Let’s get you back.'}).waitFor();if(engine===chromium)await p.screenshot({path:`${dir}/${name}-404.png`});assert.deepEqual(errors,[],`${engine.name()} ${name} script errors`);console.log('PASS',engine.name(),name,routes.length,'routes + click/refresh/back');await c.close();
 }}finally{await browser.close()}
}
await writeFile(dir+'/results.json',JSON.stringify(checks,null,2));console.log('PASS',checks.length,'unified route checks');
