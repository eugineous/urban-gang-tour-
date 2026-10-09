import {webkit} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.BASE||'http://127.0.0.1:4184';
const b=await webkit.launch({headless:true});
for(const width of[390,820,1440]){
 const c=await b.newContext({viewport:{width,height:844}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await c.route('https://www.youtube-nocookie.com/embed/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>YouTube test player</title>'}));
 await c.route('https://urban-gang-tour-events.euginemicah.workers.dev/**',r=>r.fulfill({json:{events:[]}}));
 await c.route('**/api/**',r=>r.fulfill({json:{ok:true,events:[],products:[],posts:[],photos:[],rows:[],user:null}}));
 for(const path of['/','/about','/events','/gallery','/blog','/contact-us','/shop','/book','/account','/organizer/login','/pay/success']){
  const response=await p.goto(base+path,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);await p.locator('h1').waitFor();await p.waitForFunction(()=>typeof document.documentElement.dataset.focusView==='string');await p.waitForLoadState('networkidle');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,`${width} ${path}`);
 }
 assert.deepEqual(errors,[]);console.log(`PASS Safari/WebKit ${width}: 11 public, commerce, account and organizer routes`);await c.close();
}await b.close();
