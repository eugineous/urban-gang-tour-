import {chromium,devices} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const base=(process.env.BASE_URL||'http://127.0.0.1:4190').replace(/\/$/,''),out=process.env.SHOTDIR||'/workspace/artifacts/mobile-repair-20261013/after';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];
const routes=(process.env.MOBILE_ROUTES||'/,/shop,/portfolio,/blog,/experience,/tour-stops,/events,/gallery,/reels,/about,/partners,/book,/contact-us,/cart,/shop/available,/shop/design-bag,/account,/privacy-policy,/terms,/faq,/clients,/the-gang,/work-with-us,/press,/affiliates,/refund-policy,/ticket-terms,/cookie-policy,/account/preferences,/orders/track,/book/status,/checkout,/organizer/login,/organizer/signup').split(',');
const profiles=[
 ['galaxy-s24',devices['Galaxy S24']],
 ['galaxy-a55',devices['Galaxy A55']],
 ['android-wide',{...devices['Galaxy S24'],viewport:{width:980,height:1800},screen:{width:360,height:780}}],
 ['android-landscape',{...devices['Galaxy S24'],viewport:{width:780,height:360},screen:{width:780,height:360}}],
];
async function swipe(page,context,start,delta){
 const cdp=await context.newCDPSession(page);
 try{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});
  for(let step=1;step<=10;step++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+delta.x*step/10,y:start.y+delta.y*step/10}]});await page.waitForTimeout(20)}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300);
 }finally{await cdp.detach()}
}
try{for(const [name,profile] of profiles){
 const context=await browser.newContext({...profile,serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await context.addInitScript(wide=>{try{localStorage.setItem('ugt-consent','no');localStorage.setItem('ugt-booking-invitation-seen-v1','tested')}catch{}if(wide)Object.defineProperty(screen,'orientation',{value:{type:'portrait-primary'}})},name==='android-wide');
 for(const route of routes){
  const start=Date.now(),response=await page.goto(base+route,{waitUntil:'domcontentloaded'});
  await page.locator('.site-header').waitFor();
  await page.waitForTimeout(500);
  const metrics=await page.evaluate(()=>{const root=document.documentElement,body=document.body,zoom=Number.parseFloat(root.style.zoom)||1,width=body.getBoundingClientRect().width/zoom;const head=document.querySelector('h1'),rect=head?.getBoundingClientRect();return {viewport:innerWidth,screen:screen.width,zoom,contentWidth:width,heading:head?.textContent,headingWidth:rect?.width/zoom,headingLeft:rect?.left/zoom,headingOverflows:head?head.scrollWidth>head.clientWidth+2:false,header:getComputedStyle(document.querySelector('.site-header')).backgroundColor,floating:!!document.querySelector('.floating-talk')&&getComputedStyle(document.querySelector('.floating-talk')).display!=='none',domMs:performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd}});
  assert.equal(response.status(),200,route);
  if(name!=='android-landscape'){
   assert.equal(metrics.header,'rgb(244, 244, 244)',name+route+' opaque header');
   assert.equal(metrics.floating,false,name+route+' floating video');
   if(metrics.headingWidth)assert.ok(metrics.headingWidth<=metrics.contentWidth+2,name+route+' heading overflow '+JSON.stringify(metrics));
   assert.equal(metrics.headingOverflows,false,name+route+' clipped heading text');
  }
  if(route==='/experience'&&name!=='android-landscape')assert.equal(await page.locator('.service-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),1,name+' stacked experience cards');
  if(route==='/shop'){
   const grid=await page.locator('#collection article').first().evaluate(el=>getComputedStyle(el.parentElement).gridTemplateColumns.split(' ').length);
   assert.ok(grid<=2||name==='android-landscape',name+' readable collection');
   assert.equal(await page.locator('#collection article').count(),24);
   assert.doesNotMatch(await page.locator('body').innerText(),/AI[- ]generated|AI[- ]styled/i);
  }
  console.log('CHECK '+name+' '+route);
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:out+'/'+name+'-'+(route.slice(1).replaceAll('/','-')||'home')+'.png',scale:'css'});
  results.push({profile:name,route,elapsedMs:Date.now()-start,...metrics});
 }
 await page.goto(base+'/shop',{waitUntil:'networkidle'});
 if(name!=='android-landscape'){
  await page.getByRole('button',{name:'Open menu',exact:true}).click();
  await page.locator('#site-menu').getByRole('link',{name:/Book Urban Gang Tour/}).waitFor();
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Open menu',exact:true}).getAttribute('aria-expanded'),'false');
 }
 const search=page.getByRole('searchbox',{name:'Find your merch'});
 const filterStart=Date.now();
 await search.fill('  oversized  ');assert.equal(await page.locator('#collection article').count(),1);
 results.push({profile:name,action:'filter-with-trimmed-query',elapsedMs:Date.now()-filterStart});
 await search.fill('');assert.equal(await page.locator('#collection article').count(),24);
 if(name!=='android-landscape'){
  const bar=page.getByRole('group',{name:'Product categories'});await bar.scrollIntoViewIfNeeded();await page.waitForTimeout(400);const rect=await bar.boundingBox();
  const beforeScroll=await page.evaluate(()=>scrollY);
  await swipe(page,context,{x:rect.x+rect.width*.7,y:rect.y+rect.height*.5},{x:0,y:-100});
  assert.ok(await page.evaluate(()=>scrollY)>beforeScroll+20,name+' vertical swipe over category strip');
  await bar.scrollIntoViewIfNeeded();await page.waitForTimeout(400);const r=await bar.boundingBox();
  await swipe(page,context,{x:r.x+r.width*.8,y:r.y+r.height*.5},{x:-r.width*.6,y:0});
  assert.ok(await bar.evaluate(el=>el.scrollLeft)>10,name+' horizontal category swipe');
 }
 await page.goto(base+'/shop/cb-oversized-tee',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Eugine',exact:true}).click();
 await page.getByRole('button',{name:/^Lucy/}).click();
 await page.getByRole('button',{name:'Choose Hot pink',exact:true}).click();
 await page.getByRole('button',{name:/Enlarge/}).click();await page.locator('dialog[open]').waitFor();
 const dialogBounds=await page.locator('dialog[open]').boundingBox(),viewport=page.viewportSize();
 assert.ok(dialogBounds.x>=-2&&dialogBounds.y>=-2&&dialogBounds.x+dialogBounds.width<=viewport.width+2&&dialogBounds.y+dialogBounds.height<=viewport.height+2,name+' zoom dialog fits the actual viewport');
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();assert.equal(await page.locator('[data-zoom-scale]').getAttribute('data-zoom-scale'),'1.50');
 const imageRect=await page.locator('[data-zoom-scale]').boundingBox(),cdp=await context.newCDPSession(page),cx=imageRect.x+imageRect.width/2,cy=imageRect.y+imageRect.height/2;
 try{
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:cx-30,y:cy},{id:2,x:cx+30,y:cy}]});
  for(let step=1;step<=5;step++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:cx-30-step*6,y:cy},{id:2,x:cx+30+step*6,y:cy}]});await page.waitForTimeout(30)}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(Number(await page.locator('[data-zoom-scale]').getAttribute('data-zoom-scale'))>2,name+' genuine two-finger pinch');
 }finally{await cdp.detach()}
 await page.screenshot({path:out+'/'+name+'-zoom.png',scale:'css'});await page.keyboard.press('Escape');
 await page.getByRole('button',{name:/Save to design bag/}).click();assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('ugt-live-cart-v1')||'[]')),[]);
 await page.goto(base+'/shop/design-bag',{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Color Blast Oversized Tee',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:/checkout|pay|order/i}).count(),0);
 assert.deepEqual(errors,[],name+' browser errors');await context.close();console.log('PASS '+name+' ('+routes.length+' routes), navigation, search, models, colours, zoom, isolated design bag');
}}finally{await writeFile(out+'/metrics.json',JSON.stringify(results,null,2));await browser.close()}
