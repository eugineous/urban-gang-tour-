import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.BASE||'http://localhost:3101';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
 for(const width of [320,390,768,1024,1280,1440]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  const page=await context.newPage();
  for(const path of ['/book','/privacy-policy','/faq','/partners','/blog','/']){
   await page.goto(base+path,{waitUntil:'domcontentloaded'});
   if(await page.locator('[data-v25-page]').count())await page.locator('#v25-host[data-ready="1"]').waitFor();
   await page.waitForTimeout(450);
   const root=page.locator('#dc-root main').or(page.locator('#ssr-shell main:visible')).first();
   const outside=await root.locator('h1,h2,h3,p,input:not([type="checkbox"]),textarea').evaluateAll(es=>es.filter(e=>e.getClientRects().length&&(e.getBoundingClientRect().right>innerWidth+3||e.getBoundingClientRect().left < -3)).map(e=>e.tagName+':'+e.textContent.slice(0,50)));
   assert.deepEqual(outside,[],`${width} ${path}: readable content stays inside viewport`);
   if(path==='/book'){
    const field=root.getByPlaceholder('Your name',{exact:true});
    if(width<=600)assert.ok((await field.boundingBox()).width>width*.65,'Phone form fields use full column');
    const checkbox=await root.locator('input[type="checkbox"]').boundingBox();assert.ok(Math.abs(checkbox.width-20)<1);assert.ok(Math.abs(checkbox.height-20)<1);
    await field.fill('Responsive layout check');assert.equal(await field.inputValue(),'Responsive layout check');
   }
   if(path==='/privacy-policy'||path==='/faq')assert.equal(await root.locator('h2').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)),22);
   if(path==='/blog'&&width<=1024){
    const breaking=page.locator('.ugt-news-breaking');if(await breaking.count()){const headline=breaking.locator(':scope>span').nth(1);assert.ok((await headline.boundingBox()).width>(await breaking.boundingBox()).width*.65,'Published news headline has usable reading width');}
    const bar=page.locator('.ugt-news-desks');await page.locator('.ugt-news-desks[data-ready="1"]').waitFor();assert.ok((await bar.boundingBox()).height<=70,'Filters do not consume the first screen');
    const last=bar.getByRole('button').last();await last.scrollIntoViewIfNeeded();await last.click();await page.waitForFunction(()=>document.querySelector('.ugt-news-desks button:last-child')?.getAttribute('aria-pressed')==='true');
   }
   if(path==='/'&&width>1024){assert.ok(await root.locator('h1').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))<=92);const portrait=root.locator('img[alt*="Co-Founder"]').first();const frame=await portrait.evaluate(e=>e.parentElement.getBoundingClientRect().height);assert.ok(frame<=520,'Founder frame fits inside the desktop viewport');assert.ok((await portrait.boundingBox()).height>=frame-12,'Portrait fills its frame');}
  }
  await context.close();console.log(`PASS proportions ${width}: content bounds, booking fields, reading hierarchy, reachable news filters`);
 }
}finally{await browser.close();}
