import {chromium,devices} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.BASE_URL||'https://urbangangtour.co.ke';
const out=process.env.EVIDENCE_DIR||'/workspace/artifacts/concise-video-20261013/before';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const evidence=[];
try{
 const context=await browser.newContext({...devices['Galaxy S24'],serviceWorkers:'block'});
 await context.addInitScript(()=>{localStorage.setItem('ugt-consent','no');localStorage.setItem('ugt-booking-invitation-seen-v1','tested')});
 const page=await context.newPage();
 for(const [i,route] of ['/', '/experience','/tour-stops','/about','/portfolio','/author/eugine-micah','/author/lucy-ogunde','/work-with-us','/gallery/uon-mr-miss-2022','/reels','/shop'].entries()){
  const response=await page.goto(base+route,{waitUntil:'domcontentloaded'});await page.locator('h1').first().waitFor();await page.waitForTimeout(700);
  await page.evaluate(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=Math.max(320,innerHeight*.75)){scrollTo(0,y);await new Promise(resolve=>setTimeout(resolve,80))}scrollTo(0,0)});await page.waitForTimeout(350);
  const record=await page.evaluate(()=>({title:document.querySelector('h1')?.textContent,words:document.querySelector('main')?.innerText.trim().split(/\s+/).length,canonical:document.querySelector('link[rel=canonical]')?.href,links:[...document.querySelectorAll('.site-header a, #site-menu a')].map(a=>({text:a.textContent,href:a.getAttribute('href')})),videos:[...document.querySelectorAll('video,iframe')].map(el=>({tag:el.tagName,class:el.className,src:el.getAttribute('src'),width:el.clientWidth,height:el.clientHeight,fit:getComputedStyle(el).objectFit,aspect:getComputedStyle(el).aspectRatio,natural:el instanceof HTMLVideoElement?[el.videoWidth,el.videoHeight]:null}))}));
  const file=out+'/'+String(i+1).padStart(2,'0')+'-'+(route.slice(1).replaceAll('/','-')||'home')+'.png';await page.screenshot({path:file,fullPage:true,scale:'css'});
  evidence.push({route,status:response.status(),...record,file});console.log(route+' '+record.words+' words '+JSON.stringify(record.videos));
 }
 await context.close();
}finally{await browser.close();await writeFile(out+'/audit.json',JSON.stringify(evidence,null,2))}
