import {afterAll,beforeAll,expect,it} from 'vitest';
import {build} from 'esbuild';
import {chromium,type Browser} from 'playwright';
import {existsSync,readFileSync} from 'node:fs';
const enabled=existsSync('/usr/bin/chromium');let browser:Browser,js:string;
const hash='a'.repeat(64),id='ig-17800000000000001-'+hash.slice(0,16);
const archive={version:1,account:'urban_newsgang',posts:[{id:'17800000000000001',code:'PUBLIC123',caption:'Original imported caption #own',permalink:'https://www.instagram.com/p/PUBLIC123/',timestamp:null,published:true,audience:'general',assets:[{id,kind:'video',width:720,height:1280,bytes:100,sha256:hash,file:id+'.mp4',release:'instagram-media',duration:35}]}]};
beforeAll(async()=>{if(!enabled)return;const result=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`import React from'react';import{createRoot}from'react-dom/client';import{MediaCatalogProvider}from'./ui/components/MediaLibrary';import{ReelsFeed}from'./ui/components/ReelsFeed';createRoot(document.getElementById('app')).render(<MediaCatalogProvider><ReelsFeed/></MediaCatalogProvider>);`},bundle:true,write:false,outfile:'/tmp/ugt-instagram-reels.js',jsx:'automatic',define:{'process.env':'{}','process.env.NODE_ENV':'"production"'}});js=result.outputFiles.find(file=>file.path.endsWith('.js'))!.text;browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})},30000);
afterAll(async()=>{await browser?.close()});
it.skipIf(!enabled)('preserves an imported film deep link while the catalogue loads and selects that exact film',async()=>{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve});
 await page.route('**/*',async route=>{const path=new URL(route.request().url()).pathname;
  if(path==='/reels/')return route.fulfill({contentType:'text/html',body:'<style>.reels-scroll{height:640px;overflow:auto}.reels-frame{height:640px}[hidden]{display:none!important}</style><div id="app"></div><script src="/app.js"></script>'});
  if(path==='/app.js')return route.fulfill({contentType:'text/javascript',body:js});
  if(path==='/api/instagram-library'){await gate;return route.fulfill({json:{ok:true,archive}})}
  if(path==='/instagram-media/'+id)return route.fulfill({contentType:'video/mp4',body:readFileSync('public/media-library/9097bd98571de3de.mp4')});
  return route.abort();
 });
 try{
  await page.goto('http://reels.local/reels/?film='+id,{waitUntil:'domcontentloaded'});await page.locator('.reels-page h1').waitFor();await page.waitForTimeout(100);
  expect(new URL(page.url()).searchParams.get('film')).toBe(id);
  release();await page.locator('[data-active="true"] video[src="/instagram-media/'+id+'"]').waitFor();
  expect(new URL(page.url()).searchParams.get('film')).toBe(id);expect(await page.locator('[data-active="true"] .reels-caption').textContent()).toContain('Original imported caption #own');
 }finally{release();await page.close()}
},30000);
it.skipIf(!enabled)('keeps an unavailable imported link explicit rather than opening an unrelated video',async()=>{
 const page=await browser.newPage({reducedMotion:'reduce'});
 await page.route('**/*',route=>{const path=new URL(route.request().url()).pathname;
  if(path==='/reels/')return route.fulfill({contentType:'text/html',body:'<div id="app"></div><script src="/app.js"></script>'});
  if(path==='/app.js')return route.fulfill({contentType:'text/javascript',body:js});
  if(path==='/api/instagram-library')return route.fulfill({status:503,json:{ok:false}});
  return route.abort();
 });
 try{await page.goto('http://reels.local/reels/?film='+id);await page.locator('a[href="/reels/"]').waitFor();expect(await page.locator('video').count()).toBe(0);expect(new URL(page.url()).searchParams.get('film')).toBe(id)}finally{await page.close()}
},30000);
