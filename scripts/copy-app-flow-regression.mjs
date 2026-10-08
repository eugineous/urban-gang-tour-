import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base=process.env.BASE||'http://localhost:3100';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
 for(const width of [320,390,768,1024,1440]){
  const c=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'});const p=await c.newPage();
  await p.goto(base+'/');await p.locator('#v25-host[data-ready="1"]').waitFor();
  assert.match(await p.locator('#dc-root h1').innerText(),/YOUR EVENT/i);
  await p.waitForTimeout(300);
  assert.ok(await p.locator('#dc-root video').evaluateAll(videos => videos.every(video => video.paused)), 'Reduced motion pauses decorative video');
  assert.equal(await p.getByText('Live & On Air · PPP TV Kenya').count(),0);
  await p.screenshot({path:`/workspace/copy-app-review/01-home-${width}.png`});
  for(const [label,type] of [['School event →','School Booking'],['Campus event →','Campus Rave'],['Festival or live event →','Mega Event']]){
   await p.getByRole('link',{name:label,exact:true}).click();await p.locator('#v25-host[data-ready="1"]').waitFor();
   assert.equal(new URL(p.url()).pathname,'/book');assert.equal(await p.locator('#dc-root select').inputValue(),type);
   await p.goBack();await p.locator('#v25-host[data-ready="1"]').waitFor();
  }
  if(width<=1024){
   const nav=p.locator('.ugt-tabbar');assert.ok((await nav.boundingBox()).height>=78);
   await p.getByRole('button',{name:'Open site menu'}).click();await p.locator('#ugt-sheet').getByRole('link',{name:'About Us',exact:true}).click();
  }else{await p.locator('#dc-root summary').click();await p.locator('#dc-root').getByRole('link',{name:'Our Story',exact:true}).click();}
  await p.locator('#v25-host[data-ready="1"]').waitFor();
  const heading=await p.locator('#dc-root h1').innerText();assert.equal(await p.locator('h1:visible').count(),1);
  await p.reload();await p.locator('#v25-host[data-ready="1"]').waitFor();assert.equal(await p.locator('#dc-root h1').innerText(),heading);
  await p.screenshot({path:`/workspace/copy-app-review/02-about-${width}.png`});
  if(width<=1024){await p.getByRole('link',{name:'Go back',exact:true}).click();await p.locator('#v25-host[data-ready="1"]').waitFor();assert.equal(new URL(p.url()).pathname,'/');}
  await p.goto(base+'/account');await p.getByRole('button',{name:'New here? Create an account →'}).click();
  assert.equal(await p.getByRole('checkbox').count(),2);assert.equal(await p.getByRole('checkbox').first().isChecked(),false);
  await p.screenshot({path:`/workspace/copy-app-review/03-signup-${width}.png`});
  await c.close();console.log(`PASS ${width}: audience bookings, navigation/back/refresh, signup confirmations`);
 }
 const c=await browser.newContext({javaScriptEnabled:false});const p=await c.newPage();
 for(const route of ['/','/about','/experience']){await p.goto(base+route);assert.equal(await p.locator('h1:visible').count(),1);if(route==='/')assert.match(await p.locator('h1').innerText(),/Your Event/i);}
 await c.close();console.log('PASS consistent no-JavaScript first paint');
}finally{await browser.close();}
