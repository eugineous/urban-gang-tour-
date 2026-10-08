import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = process.env.BASE || 'http://localhost:3100';
const out = '/tmp/v25-commerce-regression';
await mkdir(out, { recursive: true });
const product = { id: 'regression-shirt', name: 'Regression Shirt', price: 1000, image: '/assets/gal/g-street.jpg', category: 'Apparel', description: 'Local test fixture', variants: [{label:'M',priceAdjustment:0},{label:'XL',priceAdjustment:200}] };
const event = { id:'regression-event', slug:'regression-event', name:'Regression Concert', kind:'ticketed', sellable:true, eventDate:'2027-12-01', eventTime:'18:00', venue:'Test Venue', city:'Nairobi', image:'/assets/gal/g-runway.jpg', accent:'#FFD400', description:'Local test fixture', tiers:[{name:'General',price:500},{name:'VIP',price:1000}] };
const results = [];
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args:['--no-sandbox'] });
for (const width of [390,1440]) {
  const context = await browser.newContext({ viewport:{width,height:900} });
  let bookingFail = true;
  let productDelay = 0;
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(base).origin) return route.abort();
    const json = data => route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
    if(url.pathname === '/api/site-data/products') { if(productDelay) await new Promise(r=>setTimeout(r,productDelay)); return json({products:[product]}); }
    if(url.pathname === '/api/site-data/events') return json({events:[event]});
    if(url.pathname === '/api/site-data/gallery') return json({photos:[]});
    if(url.pathname === '/api/promos') return json({promos:[]});
    if(url.pathname === '/api/orders') return route.abort('internetdisconnected');
    if(url.pathname === '/api/bookings') return bookingFail ? route.fulfill({status:503,body:'{}'}) : json({ok:true,id:'LOCAL-ONLY'});
    if(url.pathname.startsWith('/api/paystack/') || url.pathname.startsWith('/api/stripe/')) return route.fulfill({status:503,contentType:'application/json',body:'{"error":"not_configured"}'});
    if(route.request().method() !== 'GET' && url.pathname.startsWith('/api/')) return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const host = page.locator('#v25-host');
  const boot = async path => { await page.goto(base+path,{waitUntil:"domcontentloaded"}); await page.locator('#v25-host[data-ready="1"]').waitFor({timeout:30000}); };
  const check = async (name, fn) => {
    console.log(`CHECK ${width} ${name}`);
    try { await fn(); results.push({width,name,ok:true}); }
    catch(e) { results.push({width,name,ok:false,error:e.message}); console.log(`FAIL ${width} ${name}: ${e.message}`); await page.screenshot({path:`${out}/${width}-${name}.png`,fullPage:true}); }
  };
  await check('ticket', async()=> {
    await boot('/events?event=');
    await host.getByRole('button',{name:'Get Tickets',exact:true}).click();
    await host.getByRole('button',{name:/VIP.*KES 1,000/}).click();
    await host.getByRole('button',{name:'+',exact:true}).click();
    assert(await host.getByText('KES 2,000',{exact:true}).count());
    await host.locator('form').filter({has:host.getByPlaceholder('Full name (goes on the ticket)')}).locator('input[type=checkbox]').check();
    await host.getByRole('button',{name:'Pay & Get Ticket',exact:true}).click();
    await host.getByText('Enter the name that goes on the ticket.',{exact:true}).waitFor();
    await host.getByPlaceholder('Full name (goes on the ticket)').fill('Local Buyer');
    await host.getByPlaceholder('M-Pesa number',{exact:true}).fill('bad');
    await host.getByRole('button',{name:'Pay & Get Ticket',exact:true}).click();
    await host.getByText(/Enter a valid M-Pesa number/).waitFor();
    await host.getByPlaceholder('M-Pesa number',{exact:true}).fill('0712345678');
    await host.getByRole('button',{name:'Pay & Get Ticket',exact:true}).click();
    await host.getByText(/Network error/).waitFor();
    assert.equal(await host.getByPlaceholder('Full name (goes on the ticket)').inputValue(),'Local Buyer');
    assert.equal(await host.getByText('Payment confirmed',{exact:true}).count(),0);
    await page.screenshot({path:`${out}/${width}-ticket.png`,fullPage:true});
  });
  await check('shop', async()=> {
    await boot('/shop?item=regression-shirt');
    await host.getByRole('button',{name:'XL',exact:true}).click();
    await host.getByRole('button',{name:'+',exact:true}).click();
    await host.getByRole('button',{name:'ADD TO BAG',exact:true}).click();
    const bag = host.locator('aside');
    await bag.getByRole('button',{name:'+',exact:true}).click();
    await bag.getByRole('button',{name:'−',exact:true}).click();
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('ugt_cart'))),[{id:product.id,qty:2,size:'XL'}]);
    await bag.getByRole('button',{name:/CHECKOUT/}).click();
    assert.equal(await host.getByText('KES 2,400',{exact:true}).count(),2);
    await host.getByPlaceholder('Full name',{exact:true}).fill('Local Buyer');
    await host.getByPlaceholder('M-Pesa number & delivery contact').fill('0712345678');
    await host.locator('form').filter({has:host.getByPlaceholder('Full name',{exact:true})}).locator('input[type=checkbox]').check();
    await host.getByRole('button',{name:'Pay & Get Receipt',exact:true}).click();
    await host.getByText(/Network error/).waitFor();
    assert.equal(await host.getByPlaceholder('Full name',{exact:true}).inputValue(),'Local Buyer');
    const noticeHandled = new Promise(resolve => page.once('dialog', async notice => {
      const message = notice.message(); await notice.dismiss(); resolve(message);
    }));
    await host.getByRole('button',{name:/Pay with Card/}).click();
    assert.match(await noticeHandled,/not available/);
    await page.screenshot({path:`${out}/${width}-checkout.png`,fullPage:true});
    await boot('/shop');
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('ugt_cart'))),[{id:product.id,qty:2,size:'XL'}]);
    await host.getByRole('button',{name:'Open shopping bag',exact:true}).click();
    await host.locator('aside').getByRole('button',{name:/Remove/i}).click();
    await host.getByText('Your bag is empty',{exact:true}).waitFor();
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('ugt_cart'))),[]);
  });
  await check('booking', async()=> {
    await boot('/book');
    const form=host.locator('form').filter({has:page.getByRole('button',{name:'SEND IT',exact:true})});
    await form.locator('input').nth(0).fill('Local Adult');
    await form.locator('input').nth(1).fill('Test Organisation');
    await form.locator('input[type=email]').fill('local@example.test');
    await form.getByPlaceholder('Tell us the date, the ground, and the vision.').fill('Local mock booking request for regression testing.');
    await form.locator('input[type=checkbox]').check();
    await form.getByRole('button',{name:'SEND IT',exact:true}).click();
    await host.getByText('Could not send that yet. Please try again.',{exact:true}).waitFor();
    assert.equal(await form.locator('input').nth(0).inputValue(),'Local Adult');
    bookingFail=false;
    await form.getByRole('button',{name:'SEND IT',exact:true}).click();
    await host.getByText('Your request is in. We will review the details before confirming anything in writing.',{exact:true}).waitFor();
    assert.equal(await form.count(),0);
  });
  await check('school-timeline-navigation', async()=> {
    await page.goto(base+'/');
    await page.locator('.home-experiences a').first().click();
    await page.waitForURL(url=>url.pathname.replace(/\/$/,'')==='/tour-stops');
    await page.reload();await page.locator('h1').waitFor();
    assert.equal(await page.locator('h1').count(),1);
    await page.goBack();assert.equal(new URL(page.url()).pathname,'/');
  });
  await check('late-catalog-cart', async()=> {
    await boot('/shop');
    await page.evaluate(id=>localStorage.setItem('ugt_cart',JSON.stringify([{id,qty:3,size:'XL'}])),product.id);
    productDelay=3500;
    await boot('/shop');
    await host.getByText(product.name,{exact:true}).first().waitFor({timeout:15000});
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('ugt_cart'))),[{id:product.id,qty:3,size:'XL'}]);
  });
  await context.close();
}
await browser.close();
console.log(JSON.stringify({out,results},null,2));
if(results.some(r=>!r.ok)) process.exitCode=1;
