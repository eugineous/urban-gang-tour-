// Rendered proof for the premium media treatment. Local frozen Worker only.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const origin=process.env.QA_ORIGIN||'http://127.0.0.1:4184';
const target=new URL(origin);
assert.ok(target.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(target.hostname)&&target.pathname==='/'&&!target.username&&!target.password&&!target.search&&!target.hash,'Only loopback frozen-Worker previews are permitted');
const artifacts=process.env.ARTIFACT_DIR||'/workspace/artifacts/ugt-premium-20261027';
await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[],checks=[],blocked=[];
try{
 for(const width of [390,768,1440]){
  for(const reduced of [true,false]){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:reduced?'reduce':'no-preference',serviceWorkers:'block'});
   await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.origin!==target.origin){blocked.push(url.hostname+url.pathname);return route.abort();}
    if(!['GET','HEAD'].includes(request.method())){
     let body;try{body=request.postDataJSON()}catch{}
     if(url.pathname==='/api/auth'&&body?.action==='me')return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"user":null}'});
     blocked.push(request.method()+' '+url.pathname);return route.abort();
    }
    return route.continue();
   });
   const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
   const response=await page.goto(origin+'/',{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
   await page.waitForFunction(()=>document.querySelector('[data-language-control] select')&&Object.getOwnPropertyNames(document.querySelector('[data-language-control] select')).some(key=>key.startsWith('__reactProps$')));
   const reject=page.getByRole('button',{name:'Reject',exact:true});if(await reject.isVisible())await reject.click();
   await page.evaluate(()=>document.fonts.ready);
   const hero=page.locator('[data-home-hero]');
   assert.equal(await hero.locator('img').first().evaluate(img=>getComputedStyle(img).filter),'none','The fallback poster must remain sharp');
   const video=hero.locator('video.hero-video');
   if(reduced){
    assert.equal(await video.getAttribute('src'),null,'Reduced motion must keep the poster and avoid auto-loading video');
    await hero.screenshot({path:`${artifacts}/hero-poster-${width}.png`});
    checks.push({width,mode:'poster',reducedMotion:true});
   }else{
    await page.waitForFunction(()=>{const video=document.querySelector('[data-home-hero] video');return video?.readyState>=2&&getComputedStyle(video).opacity==='1'&&!video.paused},{},{timeout:30000});
    for(const time of [.5,3.5,6.5]){
     await video.evaluate(async(video,time)=>{video.pause();await new Promise((resolve,reject)=>{video.addEventListener('seeked',resolve,{once:true});video.addEventListener('error',reject,{once:true});video.currentTime=time});},time);
     await hero.screenshot({path:`${artifacts}/hero-video-${width}-${time}.png`});
    }
    const details=await video.evaluate(video=>({src:new URL(video.currentSrc).pathname,width:video.videoWidth,height:video.videoHeight,filter:getComputedStyle(video).filter,opacity:getComputedStyle(video).opacity}));
    assert.equal(details.filter,'none');assert.equal(details.opacity,'1');
    const control=hero.locator('button.video-control');const box=await control.boundingBox();assert.ok(box.height>=44);
    await control.click();await page.waitForFunction(()=>!document.querySelector('[data-home-hero] video').paused);
    await control.click();assert.equal(await video.evaluate(video=>video.paused),true);
    checks.push({width,mode:'moving video',frames:[.5,3.5,6.5],details,playPause:true});
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'No horizontal overflow at '+width);
   await context.close();
  }
 }
 assert.deepEqual(errors,[],'No JavaScript startup/runtime errors');
 await writeFile(`${artifacts}/hero-browser-proof.json`,JSON.stringify({checks,errors,blocked},null,2)+'\n');
 console.log(JSON.stringify({checks:checks.length,screenshots:12,errors:errors.length}));
}finally{await browser.close();}
