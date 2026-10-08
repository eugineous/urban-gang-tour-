import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.BASE||'http://127.0.0.1:4177';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
for(const width of [390,820,1440]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/api/site-data/events',r=>r.fulfill({json:{ok:true,events:[]}}));
 await context.route('**/api/site-data/posts',r=>r.fulfill({json:{ok:true,posts:[]}}));
 await context.route('**/api/subscribe',r=>{assert.equal(JSON.parse(r.request().postData()).email,'review@example.invalid');return r.fulfill({json:{ok:true}})});
 for(const path of ['/','/about','/events','/gallery','/portfolio','/contact-us','/reels']){
  const response=await page.goto(base+path);assert.equal(response.status(),200,path);await page.waitForTimeout(500);
  assert.equal(await page.locator('h1').count(),1,`${width} ${path}: one h1`);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,`${width} ${path}: overflow`);
  assert.equal(await page.locator('.preview-label').count(),0);assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'index, follow');
  assert.ok((await page.locator('link[rel=canonical]').getAttribute('href')).startsWith('https://urbangangtour.co.ke'));
 }
 await page.goto(base+'/gallery/uon-mr-miss-2022');const first=page.locator('.media-photo-grid button').first();await first.click();const image=page.locator('.lightbox figure>img');await image.waitFor();await page.waitForFunction(()=>{const i=document.querySelector('.lightbox figure>img');return i?.complete&&i.naturalWidth>0});const original=await image.getAttribute('src');
 for(let n=0;n<4;n++){const previous=await image.getAttribute('src');await page.getByRole('button',{name:'Next image',exact:true}).click();await page.waitForFunction(src=>document.querySelector('.lightbox figure>img')?.getAttribute('src')!==src,previous);await page.waitForFunction(()=>{const i=document.querySelector('.lightbox figure>img');return i?.complete&&i.naturalWidth>0})}
 assert.notEqual(await image.getAttribute('src'),original);await page.keyboard.press('Escape');
 await first.click();const old=await image.getAttribute('src');await page.locator('.lightbox figure').dispatchEvent('touchstart',{touches:[{identifier:0,clientX:280,clientY:200}]});await page.locator('.lightbox figure').dispatchEvent('touchend',{changedTouches:[{identifier:0,clientX:100,clientY:205}]});await page.waitForFunction(src=>document.querySelector('.lightbox figure>img')?.getAttribute('src')!==src,old);await page.keyboard.press('Escape');
 await page.goto(base+'/reels');const reel=page.locator('.reels-stage>video');const before=await reel.getAttribute('src');await page.getByRole('button',{name:'Next reel',exact:true}).click();assert.notEqual(await reel.getAttribute('src'),before);await page.getByRole('button',{name:'Previous reel',exact:true}).click();assert.equal(await reel.getAttribute('src'),before);assert.equal(await page.locator('.reels-stage>video').count(),1);
 await page.goto(base+'/events');await page.locator('.newsletter-card input[type=email]').fill('review@example.invalid');await page.locator('.newsletter-card input[type=checkbox]').check();await page.getByRole('button',{name:'Send me event updates'}).click();await page.getByText('You’re subscribed.',{exact:false}).waitFor();
 await page.goto(base+'/');await page.locator('.talk-drag-handle').waitFor();await page.locator('.talk-drag-handle').focus();await page.keyboard.press('ArrowLeft');const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ugt-talk-dock')));assert.equal(saved.x,12);
 assert.deepEqual(errors,[],`${width}: JS errors`);console.log(`PASS ${width}: public routes, gallery next/swipe, reels, newsletter, contact docking`);await context.close();
}
const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();await page.goto(base+'/');await page.waitForTimeout(500);assert.equal(await page.locator('.logo-roll.is-moving').count(),0);await context.close();await browser.close();
console.log('PASS reduced-motion controls');
