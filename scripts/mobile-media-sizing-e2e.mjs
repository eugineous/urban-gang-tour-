import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.BASE||'http://127.0.0.1:4189';
for(const engine of process.env.ENGINE==='webkit'?[webkit]:[chromium]){
const b=await engine.launch(engine===chromium?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{headless:true});
for(const [name,width,height,orientation] of [['portrait',390,844,'portrait-primary'],['landscape-fixed-screen',844,390,'landscape-primary']]){
const c=await b.newContext({viewport:{width,height},screen:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce'});
await c.addInitScript(type=>{Object.defineProperty(screen,'orientation',{get:()=>({type})});localStorage.setItem('ugt-consent','no');localStorage.setItem('ugt-booking-invitation-seen-v1','tested')},orientation);
await c.route('https://www.youtube-nocookie.com/**',r=>r.fulfill({body:'Player fixture',contentType:'text/html'}));const p=await c.newPage();
await p.goto(base);await p.waitForFunction(()=>document.documentElement.dataset.focusView!==undefined);
assert.equal(await p.evaluate(()=>document.documentElement.style.getPropertyValue('--ugt-phone-zoom')),'1',`${name} no unintended zoom`);
for(const selector of ['.youtube-panel','.rail-preview']){const frame=p.locator(selector).first();await frame.scrollIntoViewIfNeeded();const box=await frame.boundingBox();assert.ok(Math.abs(box.width/box.height-16/9)<.02,`${name} ${selector} 16:9`);assert.ok(box.width<=width,`${name} ${selector} width fits`);assert.ok(box.height<=height-100,`${name} ${selector} height fits`)}
assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,`${name} no horizontal overflow`);
console.log('PASS',engine.name(),name,'embedded film, scrolling film and page proportions');await c.close();}
await b.close();}
