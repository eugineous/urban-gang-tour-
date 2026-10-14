import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=(process.env.BASE_URL||'http://127.0.0.1:4195').replace(/\/$/,'');
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});

function assertFits(box,viewport,label){
 assert.ok(box&&box.x>=-2&&box.y>=-2&&box.x+box.width<=viewport.width+2&&box.y+box.height<=viewport.height+2,label+' fits viewport');
}

try{
 for(const [name,viewport] of [['portrait',{width:360,height:780}],['landscape',{width:780,height:360}]]){
  const context=await browser.newContext({viewport,screen:viewport,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await context.addInitScript(()=>{localStorage.setItem('ugt-consent','no')});
  await context.route('https://www.youtube-nocookie.com/**',route=>route.fulfill({contentType:'text/html',body:'<title>Video fixture</title>'}));
  const page=await context.newPage();

  await page.goto(base,{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('.youtube-panel iframe').count(),0,name+' YouTube waits for a tap');
  const youtube=page.locator('.youtube-panel');await youtube.scrollIntoViewIfNeeded();
  const youtubeBox=await youtube.boundingBox();assertFits(youtubeBox,viewport,name+' YouTube preview');
  assert.ok(Math.abs(youtubeBox.width/youtubeBox.height-16/9)<.03,name+' YouTube preview is 16:9');
  await youtube.getByRole('button').click();await page.locator('.youtube-panel iframe').waitFor();
  const iframeBox=await page.locator('.youtube-panel iframe').boundingBox();assertFits(iframeBox,viewport,name+' YouTube player');
  assert.ok(Math.abs(iframeBox.width/iframeBox.height-16/9)<.03,name+' YouTube player is 16:9');
  assert.equal(await page.locator('.floating-talk,.booking-invitation').count(),0,name+' has no repeated floating overlays');

  await page.goto(base+'/portfolio',{waitUntil:'domcontentloaded'});
  const film=page.locator('.film-card').first();await film.scrollIntoViewIfNeeded();await film.getByRole('button').click();
  const inlineVideo=film.locator('video');await inlineVideo.waitFor({state:'visible'});
  const inlineBox=await inlineVideo.boundingBox();assert.ok(inlineBox.width<=viewport.width+2&&inlineBox.height<=viewport.height-80,name+' inline film is bounded');
  assert.equal(await inlineVideo.getAttribute('loop'),null,name+' user-controlled film does not loop');
  assert.equal(await inlineVideo.evaluate(el=>getComputedStyle(el).objectFit),'contain',name+' inline film preserves its frame');

  await page.goto(base+'/work-with-us',{waitUntil:'domcontentloaded'});
  const preview=page.locator('.rail-preview').first();await preview.scrollIntoViewIfNeeded();await preview.click();
  const viewer=page.locator('.film-viewer');await viewer.waitFor({state:'visible'});
  assertFits(await viewer.boundingBox(),viewport,name+' film viewer');
  const modalVideo=viewer.locator('video');assert.equal(await modalVideo.evaluate(el=>getComputedStyle(el).objectFit),'contain',name+' modal film preserves its frame');
  assertFits(await modalVideo.boundingBox(),viewport,name+' modal film');
  await page.keyboard.press('Escape');

  await page.goto(base+'/reels',{waitUntil:'domcontentloaded'});
  const reel=page.locator('.reels-frame[aria-hidden="false"] video').first();await reel.waitFor({state:'visible'});
  assert.equal(await reel.evaluate(el=>getComputedStyle(el).objectFit),'contain',name+' reel preserves its frame');
  assertFits(await reel.boundingBox(),viewport,name+' reel');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' no horizontal overflow');
  console.log('PASS concise mobile media '+name);
  await context.close();
 }
}finally{await browser.close()}
