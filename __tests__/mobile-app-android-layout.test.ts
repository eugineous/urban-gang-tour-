import {afterAll,beforeAll,expect,it} from 'vitest';
import {build} from 'esbuild';
import {chromium,type Browser,type Page} from 'playwright';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {VIEWPORT_BOOTSTRAP} from '@/lib/client/viewport-bootstrap';

const executablePath=process.env.CHROMIUM_PATH||'/usr/bin/chromium',enabled=existsSync(executablePath);
let browser:Browser,js:string,css:string;
beforeAll(async()=>{
 if(!enabled)return;
 const result=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./ui/i18n/LanguageProvider';import{MobileAppHero}from'./ui/components/MobileAppHero';import{MobileAppNavigation}from'./app/_components/MobileAppNavigation';createRoot(document.getElementById('app')).render(<LanguageProvider><main id="main-content"><MobileAppHero events={window.fixtureEvents||[]} now={1794214800000}/></main><MobileAppNavigation path="/"/></LanguageProvider>);`},bundle:true,write:false,outfile:'/tmp/ugt-android-fixture.js',jsx:'automatic',define:{'process.env':'{}','process.env.NODE_ENV':'"production"'}});
 js=result.outputFiles.find(file=>file.path.endsWith('.js'))!.text;
 css='';
 for(const name of ['globals','design','modern','refinements','mobile-experience','reconstruction','android-mobile','concise-media','interaction-foundations','international','responsive-continuation','premium-implementation','navigation','brand-palette','mobile-app'])css+=await readFile(`app/${name}.css`,'utf8');
 css+=result.outputFiles.find(file=>file.path.endsWith('.css'))!.text;
 browser=await chromium.launch({executablePath,args:['--no-sandbox']});
},30000);
afterAll(async()=>{await browser?.close()});

async function renderPhone(wide:boolean,height=710,width=390,locale='en',probe?:(page:Page)=>Promise<void>,motion:'reduce'|'no-preference'='reduce',events:unknown[]=[]){
 const context=await browser.newContext({viewport:wide?{width:980,height:Math.round(height*980/width)}:{width,height},screen:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:motion,serviceWorkers:'block'});
 await context.addInitScript(locale=>localStorage.setItem('ugt-interface-language-v1',locale),locale);
 await context.addInitScript(events=>Object.assign(window,{fixtureEvents:events}),events);
 const page=await context.newPage();
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!=='http://ugt-fixture.local')return route.abort();
  if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:`<meta name="viewport" content="width=device-width,initial-scale=1"><script>${VIEWPORT_BOOTSTRAP}</script><link rel="stylesheet" href="/fixture.css"><header style="height:68px"></header><div id="app"></div><script src="/fixture.js"></script>`});
  if(url.pathname==='/fixture.js')return route.fulfill({contentType:'text/javascript',body:js});
  if(url.pathname==='/fixture.css')return route.fulfill({contentType:'text/css',body:css});
  const path=resolve('public','.'+url.pathname);
  if(!path.startsWith(resolve('public')+'/'))return route.abort();
  try{return route.fulfill({body:await readFile(path),contentType:({'.mp4':'video/mp4','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'} as Record<string,string>)[extname(path)]||'application/octet-stream'})}catch{return route.abort()}
 });
 await page.goto('http://ugt-fixture.local/',{waitUntil:'load'});
 await page.locator('[data-mobile-app-hero] h1').waitFor();
 await page.waitForFunction(locale=>document.documentElement.lang===(locale==='en'?'en-KE':locale),locale);
 await page.evaluate(()=>document.fonts.ready);
 if(probe)await probe(page);
 const metrics=await page.evaluate(()=>{
  const hero=document.querySelector('[data-mobile-app-hero]')!,heading=hero.querySelector('h1')!,intro=hero.querySelector('[data-mobile-services]')!,card=hero.querySelector('[data-mobile-host-card]')!,zoom=Number(getComputedStyle(document.documentElement).zoom)||1;
  const nav=document.querySelector('[data-mobile-app-navigation]')!;
  const targets=Array.from(nav.querySelectorAll('a')).map(link=>{const box=link.getBoundingClientRect(),label=link.querySelector('span')!.getBoundingClientRect();return{width:box.width/zoom,height:box.height/zoom,labelFits:label.left>=box.left-1&&label.right<=box.right+1}});
  const home=nav.querySelector('a[href="/"]')!.getBoundingClientRect(),bar=nav.getBoundingClientRect();
  return{font:parseFloat(getComputedStyle(heading).fontSize),zoom,introBottom:intro.getBoundingClientRect().bottom/zoom,cardTop:card.getBoundingClientRect().top/zoom,cardsBottom:Math.max(...Array.from(hero.querySelectorAll('[data-mobile-host-card],[data-mobile-event-card]')).map(card=>card.getBoundingClientRect().bottom/zoom)),dockTop:bar.top/zoom,homeCentred:Math.abs(home.x+home.width/2-bar.x-bar.width/2)<1,targets,overflow:document.documentElement.scrollWidth>innerWidth+1};
 });
 if(process.env.UGT_ANDROID_SCREENSHOTS)await page.screenshot({path:`${process.env.UGT_ANDROID_SCREENSHOTS}/android-${wide?'wide':'normal'}-${width}-${height}-${locale}.png`});
 await context.close();return metrics;
}

it.skipIf(!enabled)('keeps the same readable heading size in Android normal and zoom-normalised wide viewports',async()=>{
 for(const [width,height] of [[320,710],[320,844],[390,710],[390,844]]){
  const normal=await renderPhone(false,height,width),wide=await renderPhone(true,height,width);
  expect(wide.zoom).toBeGreaterThan(2);
  expect(Math.abs(wide.font-normal.font)).toBeLessThanOrEqual(2);
  expect(wide.overflow).toBe(false);
 }
},30000);
it.skipIf(!enabled)('fits five navigation targets and a long translated contact label on a narrow phone',async()=>{
 for(const wide of [false,true]){
  const metrics=await renderPhone(wide,710,320,'sw');
  expect(metrics.targets).toHaveLength(5);
  expect(metrics.homeCentred).toBe(true);
  for(const target of metrics.targets){expect(target.width).toBeGreaterThanOrEqual(44);expect(target.height).toBeGreaterThanOrEqual(44);expect(target.labelFits).toBe(true)}
 }
},30000);
it.skipIf(!enabled)('fits complete rectangular host and event images without circular cropping on short Android viewports',async()=>{
 for(const wide of [false,true]){
  await renderPhone(wide,710,390,'en',async page=>{
   for(const selector of ['[data-host-artwork="welcome"] picture img','[data-mobile-event-card] img']){
    const fit=await page.locator(selector).evaluate(img=>({fit:getComputedStyle(img).objectFit,radius:getComputedStyle(img).borderRadius}));
    expect(fit.fit).toBe('contain');expect(fit.radius).not.toBe('50%');
   }
   await page.locator('[data-mobile-event-card] a').scrollIntoViewIfNeeded();
   expect(await page.locator('[data-mobile-event-card] a').isVisible()).toBe(true);
  });
 }
},30000);
it.skipIf(!enabled)('autoplays muted visible clips in a gapless moving rail and pauses both motion and playback',async()=>{
 await renderPhone(false,844,390,'en',async page=>{
  expect(await page.locator('[data-reel-track] video[src]').count()).toBe(0);
  await page.locator('[data-mobile-booking-video]').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('[data-reel-track]')?.getAttribute('data-running')==='true');
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-reel-track] video')].some(v=>!(v as HTMLVideoElement).paused&&(v as HTMLVideoElement).currentTime>0));
  const films=await page.locator('[data-reel-group]').first().locator('[data-reel-film]').evaluateAll(items=>items.map(item=>{const box=item.getBoundingClientRect();return{left:box.left,right:box.right}}));
  expect(Math.abs(films[0].right-films[1].left)).toBeLessThan(1);expect(Math.abs(films[1].right-films[2].left)).toBeLessThan(1);
  expect(await page.locator('[data-reel-track] video').evaluateAll(items=>items.every(v=>(v as HTMLVideoElement).muted&&(v as HTMLVideoElement).loop))).toBe(true);
  await page.getByRole('button',{name:'Pause videos',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-reel-track] video')].every(v=>(v as HTMLVideoElement).paused));
  const transform=await page.locator('[data-reel-track]').evaluate(el=>getComputedStyle(el).transform);await page.waitForTimeout(200);
  expect(await page.locator('[data-reel-track]').evaluate(el=>getComputedStyle(el).transform)).toBe(transform);
 },'no-preference');
},30000);
it.skipIf(!enabled)('does not download video or move the rail under reduced motion',async()=>{
 await renderPhone(false,844,390,'en',async page=>{
  await page.locator('[data-mobile-booking-video]').scrollIntoViewIfNeeded();await page.waitForTimeout(300);
  expect(await page.locator('[data-reel-track] video[src]').count()).toBe(0);
  expect(await page.locator('[data-reel-track]').getAttribute('data-running')).toBe('false');
  expect(await page.getByRole('button',{name:'Play video',exact:true}).count()).toBe(3);
 });
},30000);
it.skipIf(!enabled)('lets a reduced-motion visitor manually play, pause and resume with the shared controls',async()=>{
 await renderPhone(false,844,390,'en',async page=>{
  await page.locator('[data-mobile-booking-video]').scrollIntoViewIfNeeded();
  await page.getByRole('button',{name:'Play video',exact:true}).first().click();
  await page.waitForFunction(()=>{const v=document.querySelector('[data-reel-track] video') as HTMLVideoElement;return !v.paused&&v.currentTime>0});
  await page.getByRole('button',{name:'Pause videos',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-reel-track] video')].every(v=>(v as HTMLVideoElement).paused),undefined,{timeout:2000});
  await page.getByRole('button',{name:'Resume videos',exact:true}).click();
  await page.waitForFunction(()=>!(document.querySelector('[data-reel-track] video') as HTMLVideoElement).paused,undefined,{timeout:2000});
 });
},30000);
it.skipIf(!enabled)('keeps every manual clip reachable when focus view stops ambient motion',async()=>{
 await renderPhone(false,844,390,'en',async page=>{
  await page.locator('[data-mobile-booking-video]').scrollIntoViewIfNeeded();
  await page.evaluate(()=>{localStorage.setItem('ugt-new-preview-v1focusView','true');dispatchEvent(new Event('ugt-focus-view'))});
  await page.waitForFunction(()=>document.querySelector('[data-reel-track]')?.getAttribute('data-running')==='false');
  const window=page.locator('[data-reel-window]');expect(await window.evaluate(el=>getComputedStyle(el).overflowX)).toBe('auto');
  await window.evaluate(el=>{el.scrollLeft=el.scrollWidth});
  expect(await window.evaluate(el=>el.scrollLeft)).toBeGreaterThan(100);
  expect(await page.locator('[data-reel-group][aria-hidden="true"]').isVisible()).toBe(false);
 },'no-preference');
},30000);
it.skipIf(!enabled)('recovers from an initial video delivery failure with one retry click',async()=>{
 await renderPhone(false,844,390,'en',async page=>{
  let failing=true;await page.route('**/media-library/9097bd98571de3de.mp4',route=>failing?route.fulfill({status:503,body:'Unavailable'}):route.fallback());
  await page.locator('[data-mobile-booking-video]').scrollIntoViewIfNeeded();
  await page.locator('[data-reel-track]').evaluate(el=>{(el as HTMLElement).style.animationPlayState='paused'});
  const film=page.locator('[data-reel-film]').first();
  await film.getByRole('button',{name:'Try video again'}).waitFor({timeout:5000}).catch(async error=>{throw new Error(error.message+' '+JSON.stringify(await film.evaluate(el=>{const v=el.querySelector('video')!;return{html:el.innerHTML,src:v.currentSrc,error:v.error?.code,paused:v.paused}})))});
  failing=false;await film.getByRole('button',{name:'Try video again'}).click();
  await page.waitForFunction(()=>{const v=document.querySelector('[data-reel-track] video') as HTMLVideoElement;return !v.paused&&v.currentTime>0},undefined,{timeout:3000});
 },'no-preference');
},30000);
const upcomingFixtures=[{id:'first',slug:'first',name:'First event',kind:'ticketed',eventDate:'2026-11-12',status:'published',image:'/assets/ugt-logo.png'},{id:'second',slug:'second',name:'Second event',kind:'ticketed',eventDate:'2026-11-20',status:'published',image:'/icon-144.png'}];
it.skipIf(!enabled)('rotates upcoming posters every second and preserves a visitor pause',async()=>{
 await renderPhone(false,844,390,'en',async page=>{
  const image=page.locator('[data-mobile-event-card] img');expect(await image.getAttribute('alt')).toBe('First event');
  await page.waitForFunction(()=>document.querySelector('[data-mobile-event-card] img')?.getAttribute('alt')==='Second event',{timeout:3000});
  await page.getByRole('button',{name:'Pause event rotation'}).click();const held=await image.getAttribute('alt');
  await page.waitForTimeout(1200);expect(await image.getAttribute('alt')).toBe(held);
  await page.getByRole('button',{name:'Resume event rotation'}).click();
  await page.waitForFunction(held=>document.querySelector('[data-mobile-event-card] img')?.getAttribute('alt')!==held,held);
 },'no-preference',upcomingFixtures);
},30000);
it.skipIf(!enabled)('keeps one poster static and also disables automatic rotation for reduced motion',async()=>{
 await renderPhone(false,844,390,'en',async page=>{
  expect(await page.getByRole('button',{name:/event rotation/}).count()).toBe(0);await page.waitForTimeout(1100);
  expect(await page.locator('[data-mobile-event-card] img').getAttribute('alt')).toBe('First event');
 },'no-preference',upcomingFixtures.slice(0,1));
 await renderPhone(false,844,390,'en',async page=>{await page.waitForTimeout(1200);expect(await page.locator('[data-mobile-event-card] img').getAttribute('alt')).toBe('First event')},'reduce',upcomingFixtures);
},30000);
it.skipIf(!enabled)('keeps introductory text clear of the cards on short Android screens',async()=>{
 for(const wide of [false,true]){
  const metrics=await renderPhone(wide);
  expect(metrics.introBottom).toBeLessThanOrEqual(metrics.cardTop);
 }
},30000);
it.skipIf(!enabled)('uses integrated printed-shirt hero artwork without floating logo layers or card overlap',async()=>{
 await renderPhone(false,710,390,'en',async page=>{
  expect(await page.locator('[data-host-artwork="hero"] [data-exact-shirt-logo]').count()).toBe(0);
  expect(await page.locator('[data-host-artwork="hero"] picture').count()).toBe(1);
  expect(await page.locator('[data-host-artwork="hero"] picture img').evaluate(img=>(img as HTMLImageElement).currentSrc)).toContain('/hosts-printed-mono.webp');
  const bounds=await page.evaluate(()=>({portrait:document.querySelector('[data-host-artwork="hero"]')!.getBoundingClientRect().bottom,card:document.querySelector('[data-mobile-host-card]')!.getBoundingClientRect().top}));
  expect(bounds.portrait).toBeLessThanOrEqual(bounds.card);
 });
},30000);
