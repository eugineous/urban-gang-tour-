import {chromium,devices} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const base=(process.env.BASE_URL||'http://127.0.0.1:4201').replace(/\/$/,'');
const out=process.env.SHOTDIR||'/workspace/artifacts/ultimate-audit-20261014/release-mobile';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];
const product={id:'fixture-shirt',name:'Fixture shirt',price:900,image:'/assets/ugt-logo.png',category:'Apparel',description:'A fictional test product.',variants:[{label:'Medium',priceAdjustment:0},{label:'Large',priceAdjustment:100}]};
const startsAt=new Date(Date.now()+86400000).toISOString();
const listings=Array.from({length:18},(_,i)=>({id:'fixture-event-'+i,title:'Fixture show '+i,startsAt,endsAt:new Date(Date.now()+172800000).toISOString(),dateOnly:false,image:'/assets/ugt-logo.png',venue:'Fixture Hall',region:'Nairobi & nearby',category:'Music & nightlife',priority:1,price:900,currency:'KES',sourceId:'fixture',sourceName:'Fixture seller',sourceType:'Ticket seller',url:'https://example.invalid/event/'+i,checkedAt:new Date().toISOString()}));
try {
  for(const [name,profile] of [['galaxy-s24',devices['Galaxy S24']],['galaxy-a55',devices['Galaxy A55']],['android-landscape',{...devices['Galaxy S24'],viewport:{width:780,height:360},screen:{width:780,height:360}}],['desktop',{viewport:{width:1440,height:900}}]]){
    const context=await browser.newContext({...profile,serviceWorkers:'block'}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await context.addInitScript(()=>{try{localStorage.setItem('ugt-consent','no')}catch{}window.print=()=>{};});
    // Fixtures cover every mutation; this suite never creates real orders or messages.
    await context.route('**/api/**',r=>r.fulfill({json:{ok:true,rows:[],events:[],products:[],posts:[],photos:[]}}));
    await context.route('**/api/site-data/products',r=>r.fulfill({json:{ok:true,products:[product]}}));
    await context.route('https://urban-gang-tour-events.euginemicah.workers.dev/events',r=>r.fulfill({json:{generatedAt:new Date().toISOString(),refreshSeconds:180,events:listings,sources:[{id:'fixture',name:'Fixture seller',url:'https://example.invalid',type:'Ticket seller',scope:'Kenya',count:18,status:'Live'}]}}));
    for(const path of ['/','/shop','/shop/lookbook','/experience','/portfolio','/book','/partners','/events','/reels']){
      const res=await page.goto(base+path,{waitUntil:'domcontentloaded'});await page.waitForTimeout(700);
      assert.equal(res.status(),200,name+path);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+path+' horizontal overflow');
      const screenshot=out+'/'+name+'-'+(path.slice(1).replaceAll('/','-')||'home')+'.png';
      await page.screenshot({path:screenshot,scale:'css'});
      results.push({profile:name,path,status:res.status(),file:screenshot});
    }
    await page.goto(base+'/shop');await page.getByRole('heading',{name:'Wear the culture.'}).waitFor();
    await page.getByRole('searchbox',{name:'Find merchandise'}).fill('no-match');
    await page.getByRole('heading',{name:'No matching merchandise.'}).waitFor();
    await page.getByRole('button',{name:'View all merchandise',exact:true}).click();
    await page.getByLabel('Variation for Fixture shirt').selectOption('Large');await page.getByRole('button',{name:'Add to cart',exact:true}).click();
    await page.goto(base+'/cart');await page.getByRole('heading',{name:'Total KES 1,000'}).waitFor();
    await page.getByRole('link',{name:'Continue to secure checkout'}).click();
    await page.getByRole('button',{name:'Pay KES 1,000 with M-Pesa'}).waitFor();
    assert.equal(await page.getByLabel('Your full name').isVisible(),true);
    assert.equal(await page.getByLabel('M-Pesa phone number').isVisible(),true);
    await page.screenshot({path:out+'/'+name+'-checkout.png',fullPage:true,scale:'css'});
    await page.goto(base+'/events');await page.getByRole('tab',{name:'Urban Gang Tour',exact:true}).waitFor();
    assert.equal(await page.locator('#kenya-panel').isVisible(),false);
    await page.getByRole('tab',{name:'Kenya picks',exact:true}).click();
    await page.locator('.discovery-grid .discovery-card').first().waitFor();
    assert.equal(await page.locator('.discovery-grid .discovery-card').count(),9);
    await page.getByRole('button',{name:/Show more events/}).click();
    assert.equal(await page.locator('.discovery-grid .discovery-card').count(),18);
    await page.getByRole('searchbox',{name:'Search independent listings'}).fill('Fixture show 17');
    await page.waitForTimeout(150);assert.equal(await page.locator('.discovery-grid .discovery-card').count(),1);
    await page.getByRole('tab',{name:'Kenya picks',exact:true}).focus();await page.keyboard.press('Home');
    assert.equal(await page.getByRole('tab',{name:'Urban Gang Tour',exact:true}).getAttribute('aria-selected'),'true');
    await page.keyboard.press('End');assert.equal(await page.getByRole('tab',{name:'Kenya picks',exact:true}).getAttribute('aria-selected'),'true');
    await page.goto(base+'/reels');await page.locator('.reels-frame[aria-hidden="false"] video').waitFor();
    assert.ok(await page.locator('.reels-frame video').count()<=3,name+' bounds mounted videos');
    await page.getByRole('button',{name:'Next reel',exact:true}).click();await page.waitForTimeout(650);
    assert.ok(await page.locator('.reels-frame video').count()<=3,name+' still bounded after changing reel');
    if(name==='galaxy-s24'){
      const malicious='<img src=x onerror="window.pwned=true"><script>window.pwned=true</script>';
      await context.route('**/api/admin/me',r=>r.fulfill({json:{ok:true,scope:'super_admin',perms:[]}}));
      await context.route('**/api/admin/data?view=orders',r=>r.fulfill({json:{rows:[{id:'ORD-PRINT-FIXTURE',name:malicious,email:malicious,phone:malicious,mpesa_receipt:malicious,total:900,status:'paid',created_at:'2026-10-14',items:[{id:malicious,qty:1}]}]}}));
      await page.goto(base+'/admin?tab=Orders');await page.getByRole('button',{name:'Receipt',exact:true}).first().waitFor();
      const [popup]=await Promise.all([page.waitForEvent('popup'),page.getByRole('button',{name:'Receipt',exact:true}).first().click()]);
      await popup.waitForLoadState('domcontentloaded');
      assert.equal(await popup.locator('script,img').count(),0,'receipt never turns values into markup');
      assert.match(await popup.locator('body').innerText(),/onerror=/);
      assert.equal(await popup.evaluate(()=>window.pwned===true),false,'receipt injection cannot execute');
      assert.equal(await popup.evaluate(()=>window.opener),null,'printed receipt is isolated from admin');
      await popup.close();
    }
    assert.deepEqual(errors,[],name+' browser errors');
    console.log('PASS '+name+' public layouts, live shop, checkout, event tabs/search/pagination, three reel players'+(name==='galaxy-s24'?', safe admin receipt':''));
    await context.close();
  }
}finally{await writeFile(out+'/results.json',JSON.stringify(results,null,2));await browser.close()}
