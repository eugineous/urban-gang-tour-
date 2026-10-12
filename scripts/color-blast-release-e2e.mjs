import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base=(process.env.BASE_URL||'http://127.0.0.1:4184').replace(/\/$/,''),out=process.env.SHOTDIR||'/workspace/artifacts/ugt-main-release';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
try{for(const width of [320,390,820,1440]){
 const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(()=>{localStorage.setItem('ugt-consent','no');localStorage.setItem('ugt-booking-invitation-seen-v1','tested')});
 const response=await page.goto(base+'/shop',{waitUntil:'networkidle'});assert.equal(response.status(),200);
 assert.equal(await page.locator('[data-studio-product]').count(),25);
 const urls=await page.locator('#collection article h2 a').evaluateAll(nodes=>nodes.map(a=>a.getAttribute('href')));assert.equal(urls.length,24);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'shop overflow '+width);
 if(width<800)assert.equal(await page.locator('.mobile-shop-link').isVisible(),true);
 await page.screenshot({path:out+'/shop-'+width+'.png',fullPage:false});
 await page.goto(base+'/shop/cb-oversized-tee',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Eugine',exact:true}).click();assert.equal(await page.locator('[data-gallery-kind="eugine"]').count(),1);
 await page.getByRole('button',{name:/^Lucy/}).click();assert.equal(await page.locator('[data-gallery-kind="lucy"]').count(),1);
 await page.getByRole('button',{name:'Choose Hot pink',exact:true}).click();assert.equal(await page.locator('fieldset').first().textContent().then(x=>x.includes('Hot pink')),true);
 await page.getByRole('button',{name:/Enlarge/}).click();await page.locator('dialog[open]').waitFor();await page.getByRole('button',{name:'Zoom in',exact:true}).click();assert.equal(await page.locator('[data-zoom-scale]').getAttribute('data-zoom-scale'),'1.50');await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);
 await page.getByRole('button',{name:'Source artwork',exact:true}).click();assert.equal(await page.locator('section[aria-label="Product images"] img').getAttribute('src'),'/assets/color-blast/original-artwork.png');
 await page.getByRole('button',{name:/Save to design bag/}).click();assert.equal(await page.evaluate(()=>localStorage.getItem('ugt-live-cart-v1')),null);
 await page.goto(base+'/shop/design-bag',{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Color Blast Oversized Tee',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:/checkout|pay|order/i}).count(),0);assert.match(await page.locator('body').textContent(),/Proposed total/);
 await page.goto(base+'/shop/cb-hoodie',{waitUntil:'networkidle'});await page.getByRole('button',{name:/^Lucy/}).click();assert.equal(await page.getByRole('button',{name:'Choose Cream',exact:true}).getAttribute('aria-pressed'),'true');await page.screenshot({path:out+'/hoodie-lucy-'+width+'.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'detail overflow '+width);
 if(width===390)for(const url of urls){const r=await context.request.get(base+url);assert.equal(r.status(),200,url);const html=await r.text();assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,url);assert.ok(html.includes('href="https://urbangangtour.co.ke'+url+'"'),url+' canonical');}
 assert.deepEqual(errors,[]);await context.close();console.log('PASS collection, models, colours, zoom, isolated design bag at '+width+'px');
}}finally{await browser.close()}
