// Real rendered navigation, local-only; no remote services or backend writes.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:4185',target=new URL(origin);
assert.ok(target.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(target.hostname)&&target.pathname==='/'&&!target.username&&!target.password&&!target.search&&!target.hash,'Loopback preview only');
const artifacts=process.env.ARTIFACT_DIR||'/workspace/artifacts/ugt-gallery-navigation-20261027';
await mkdir(artifacts,{recursive:true});
const hrefs=['/events','/portfolio','/gallery','/clients','/about','/shop','/book'];
const labels={en:'Gallery',sw:'Picha',fr:'Galerie','zh-Hans':'图库',ru:'Галерея',es:'Galería'};
const errors=[],checks=[],blocked=[];
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({locale:'fr-FR',serviceWorkers:'block'});
 await context.addInitScript(()=>localStorage.setItem('ugt-consent','no'));
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!==target.origin)return route.abort();
  if(!['GET','HEAD'].includes(request.method())){
   let body;try{body=request.postDataJSON()}catch{}
   if(url.pathname==='/api/auth'&&body?.action==='me')return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"user":null}'});
   blocked.push(request.method()+' '+url.pathname);return route.abort();
  }
  return route.continue();
 });
 const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 const response=await page.goto(origin+'/gallery',{waitUntil:'domcontentloaded',timeout:90000});assert.equal(response.status(),200);
 await page.locator('main h1').first().waitFor();
 await page.waitForFunction(()=>{const select=document.querySelector('[data-language-control] select');return select&&Object.getOwnPropertyNames(select).some(key=>key.startsWith('__reactProps$')&&typeof select[key]?.onChange==='function')});
 assert.equal(await page.locator('html').getAttribute('lang'),'en-KE');
 for(const width of [390,768,1024,1100,1440]){
  await page.setViewportSize({width,height:900});
  for(const [locale,label] of Object.entries(labels)){
   await page.locator('[data-language-control] select').first().selectOption(locale);
   await page.waitForFunction(expected=>document.querySelector('.desktop-nav a[href="/gallery"]')?.textContent===expected,label);
   await page.evaluate(async()=>{scrollTo(0,0);await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))});
   assert.deepEqual(await page.locator('.desktop-nav a').evaluateAll(links=>links.map(link=>link.getAttribute('href'))),hrefs);
   assert.equal(await page.locator('.desktop-nav a[href="/gallery"]').getAttribute('aria-current'),'page');
   const dimensions=await page.locator('.site-header').evaluate(header=>{
    const nav=header.querySelector('.desktop-nav'),actions=header.querySelector('.header-actions'),rect=nav.getBoundingClientRect();
    return {overflow:document.documentElement.scrollWidth>innerWidth+1,navWidth:nav.clientWidth,navScroll:nav.scrollWidth,navRight:rect.right,actionsLeft:actions.getBoundingClientRect().left,links:[...nav.querySelectorAll('a')].map(link=>{const box=link.getBoundingClientRect();return {left:box.left,right:box.right,height:box.height}})};
   });
   assert.equal(dimensions.overflow,false,locale+' document reflow '+width);
   if(width>=1024){
    assert.ok(await page.locator('.desktop-nav').isVisible());
    assert.ok(dimensions.navScroll<=dimensions.navWidth+1,JSON.stringify({locale,width,...dimensions}));
    assert.ok(dimensions.navRight<=dimensions.actionsLeft,locale+' actions overlap '+width);
    assert.ok(dimensions.links.every(link=>link.left>=0&&link.right<=width&&link.height>=44),locale+' link bounds '+width);
   }else{
    const trigger=page.locator('.menu-toggle');assert.ok(await trigger.isVisible());
    await trigger.click();const menu=page.locator('#site-menu');assert.ok(await menu.isVisible());
    assert.deepEqual(await menu.locator('.menu-groups a').evaluateAll(links=>links.map(link=>link.getAttribute('href'))),hrefs);
    assert.equal(await menu.locator('a[href="/gallery"]').innerText(),label+'\n→');
    assert.equal(await menu.locator('a[href="/gallery"]').getAttribute('aria-current'),'page');
    await page.keyboard.press('Escape');assert.equal(await menu.isVisible(),false);
    assert.equal(await trigger.evaluate(button=>document.activeElement===button),true);
   }
   if(locale==='en'||locale==='ru'&&width===1024)await page.screenshot({path:`${artifacts}/navigation-${width}-${locale}.png`});
   checks.push({width,locale,gallery:label,overflow:dimensions.overflow});
  }
 }
 assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);
 await writeFile(artifacts+'/gallery-navigation-proof.json',JSON.stringify({checks,errors,unexpectedWrites:blocked},null,2)+'\n');
 console.log(JSON.stringify({checks:checks.length,errors:errors.length,unexpectedWrites:blocked.length}));
}finally{await browser.close();}
