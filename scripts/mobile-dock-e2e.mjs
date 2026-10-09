import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const base=process.env.BASE||'http://127.0.0.1:4184';
for(const engine of [chromium,webkit]){
const browser=await engine.launch(engine===chromium?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{headless:true});
for(const width of [390,820,1440]){
 const page=await browser.newPage({viewport:{width,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.focusView!==undefined);
 assert.equal(await page.locator('.talk-drag-handle').count(),0);
 if(width===390){assert.ok(await page.locator('.hero').evaluate(el=>el.getBoundingClientRect().height)>=830);assert.equal(await page.locator('.hero-inner').evaluate(el=>getComputedStyle(el).position),'relative');}
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 const trigger=page.locator('.floating-talk-preview');await trigger.focus();await page.keyboard.press('Alt+ArrowLeft');await page.waitForFunction(()=>document.querySelector('.floating-talk').classList.contains('dock-left'));
 await page.keyboard.press('Alt+ArrowRight');await page.waitForFunction(()=>!document.querySelector('.floating-talk').classList.contains('dock-left'));
 await page.evaluate(()=>{window.__dockCaptured=false;document.querySelector('.floating-talk').addEventListener('gotpointercapture',()=>{window.__dockCaptured=true},{once:true})});const box=await trigger.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(700);await page.mouse.move(box.x+box.width/2-2,box.y+box.height/2);await page.waitForFunction(()=>window.__dockCaptured);await page.mouse.move(24,box.y+box.height/2,{steps:10});await page.mouse.up();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ugt-talk-dock')).side==='left');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('.floating-talk')?.classList.contains('dock-left'));
 await page.locator('.floating-talk-preview').click();await page.locator('.floating-talk-link').waitFor({state:'visible'});assert.match(await page.locator('.floating-talk-link').getAttribute('href'),/^\/contact-us\/?$/);
 assert.deepEqual(errors,[]);console.log(`PASS ${engine.name()} ${width}: mobile proportions, no grip, keyboard docking, long press, persistence, normal click`);await page.close();
}await browser.close();}
