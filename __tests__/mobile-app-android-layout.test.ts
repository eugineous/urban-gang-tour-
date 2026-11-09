import {afterAll,beforeAll,expect,it} from 'vitest';
import {build} from 'esbuild';
import {chromium,type Browser} from 'playwright';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {VIEWPORT_BOOTSTRAP} from '@/lib/client/viewport-bootstrap';

const executablePath=process.env.CHROMIUM_PATH||'/usr/bin/chromium',enabled=existsSync(executablePath);
let browser:Browser,js:string,css:string;
beforeAll(async()=>{
 if(!enabled)return;
 const result=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./ui/i18n/LanguageProvider';import{MobileAppHero}from'./ui/components/MobileAppHero';import{MobileAppNavigation}from'./app/_components/MobileAppNavigation';createRoot(document.getElementById('app')).render(<LanguageProvider><main id="main-content"><MobileAppHero/></main><MobileAppNavigation path="/"/></LanguageProvider>);`},bundle:true,write:false,outfile:'/tmp/ugt-android-fixture.js',jsx:'automatic',define:{'process.env':'{}','process.env.NODE_ENV':'"production"'}});
 js=result.outputFiles.find(file=>file.path.endsWith('.js'))!.text;
 css='';
 for(const name of ['globals','design','modern','refinements','mobile-experience','reconstruction','android-mobile','concise-media','interaction-foundations','international','responsive-continuation','premium-implementation','navigation','brand-palette','mobile-app'])css+=await readFile(`app/${name}.css`,'utf8');
 css+=result.outputFiles.find(file=>file.path.endsWith('.css'))!.text;
 browser=await chromium.launch({executablePath,args:['--no-sandbox']});
},30000);
afterAll(async()=>{await browser?.close()});

async function renderPhone(wide:boolean,height=710,width=390,locale='en'){
 const context=await browser.newContext({viewport:wide?{width:980,height:Math.round(height*980/width)}:{width,height},screen:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce',serviceWorkers:'block'});
 await context.addInitScript(locale=>localStorage.setItem('ugt-interface-language-v1',locale),locale);
 const page=await context.newPage();
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!=='http://ugt-fixture.local')return route.abort();
  if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:`<meta name="viewport" content="width=device-width,initial-scale=1"><script>${VIEWPORT_BOOTSTRAP}</script><link rel="stylesheet" href="/fixture.css"><header style="height:68px"></header><div id="app"></div><script src="/fixture.js"></script>`});
  if(url.pathname==='/fixture.js')return route.fulfill({contentType:'text/javascript',body:js});
  if(url.pathname==='/fixture.css')return route.fulfill({contentType:'text/css',body:css});
  const path=resolve('public','.'+url.pathname);
  if(!path.startsWith(resolve('public')+'/'))return route.abort();
  try{return route.fulfill({body:await readFile(path),contentType:({'.woff2':'font/woff2','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'} as Record<string,string>)[extname(path)]||'application/octet-stream'})}catch{return route.abort()}
 });
 await page.goto('http://ugt-fixture.local/',{waitUntil:'load'});
 await page.locator('[data-mobile-app-hero] h1').waitFor();
 await page.waitForFunction(locale=>document.documentElement.lang===(locale==='en'?'en-KE':locale),locale);
 await page.evaluate(()=>document.fonts.ready);
 const metrics=await page.evaluate(()=>{
  const hero=document.querySelector('[data-mobile-app-hero]')!,heading=hero.querySelector('h1')!,intro=hero.querySelector('p')!,card=hero.querySelector('a')!,zoom=Number(getComputedStyle(document.documentElement).zoom)||1;
  const nav=document.querySelector('[data-mobile-app-navigation]')!;
  const targets=Array.from(nav.querySelectorAll('a')).map(link=>{const box=link.getBoundingClientRect(),label=link.querySelector('span')!.getBoundingClientRect();return{width:box.width/zoom,height:box.height/zoom,labelFits:label.left>=box.left-1&&label.right<=box.right+1}});
  return{font:parseFloat(getComputedStyle(heading).fontSize),zoom,introBottom:intro.getBoundingClientRect().bottom/zoom,cardTop:card.getBoundingClientRect().top/zoom,cardsBottom:Math.max(...Array.from(hero.querySelectorAll('a')).map(card=>card.getBoundingClientRect().bottom/zoom)),dockTop:nav.getBoundingClientRect().top/zoom,targets,overflow:document.documentElement.scrollWidth>innerWidth+1};
 });
 if(process.env.UGT_ANDROID_SCREENSHOTS)await page.screenshot({path:`${process.env.UGT_ANDROID_SCREENSHOTS}/android-${wide?'wide':'normal'}-${width}-${height}-${locale}.png`});
 await context.close();return metrics;
}

it.skipIf(!enabled)('keeps the same readable heading size in Android normal and zoom-normalised wide viewports',async()=>{
 for(const height of [710,844]){
  const normal=await renderPhone(false,height),wide=await renderPhone(true,height);
  expect(wide.zoom).toBeGreaterThan(2);
  expect(Math.abs(wide.font-normal.font)).toBeLessThanOrEqual(2);
  expect(wide.overflow).toBe(false);
 }
},30000);
it.skipIf(!enabled)('fits five navigation targets and a long translated contact label on a narrow phone',async()=>{
 for(const wide of [false,true]){
  const metrics=await renderPhone(wide,710,320,'sw');
  expect(metrics.targets).toHaveLength(5);
  for(const target of metrics.targets){expect(target.width).toBeGreaterThanOrEqual(44);expect(target.height).toBeGreaterThanOrEqual(44);expect(target.labelFits).toBe(true)}
 }
},30000);
it.skipIf(!enabled)('keeps the English card actions above the navigation on a short Android viewport',async()=>{
 for(const wide of [false,true]){
  const metrics=await renderPhone(wide);
  expect(metrics.cardsBottom).toBeLessThanOrEqual(metrics.dockTop);
 }
},30000);
it.skipIf(!enabled)('keeps introductory text clear of the cards on short Android screens',async()=>{
 for(const wide of [false,true]){
  const metrics=await renderPhone(wide);
  expect(metrics.introBottom).toBeLessThanOrEqual(metrics.cardTop);
 }
},30000);
