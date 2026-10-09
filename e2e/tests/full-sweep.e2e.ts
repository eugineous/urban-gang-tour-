import {test} from '@e2e-dev/web';
import {expect} from 'e2e';
const routes=['/','/about','/the-gang','/portfolio','/proof','/experience','/tour-stops','/events','/gallery','/work-with-us','/clients','/partners','/blog','/contact-us','/faq','/author/eugine-micah','/author/lucy-ogunde','/shop','/cart','/checkout','/book','/account','/marketplace','/organizer/login','/organizer/signup','/organizer/forgot','/organizer/reset','/organizer/verify','/privacy-policy','/terms','/refund-policy','/ticket-terms','/offline'];
test.beforeEach(async({browser})=>{
 await browser.route('**/api/**',async r=>{
  const u=new URL(r.request.url);
  if(u.pathname==='/api/admin/me')return r.fulfill({status:200,json:{ok:true,scope:'super_admin',perms:[]}});
  if(u.pathname.startsWith('/api/admin/'))return r.fulfill({json:{ok:true,rows:[],items:[]}});
  if(u.pathname==='/api/auth')return r.fulfill({json:{ok:true,user:null}});
  if(u.pathname==='/api/organizer/me')return r.fulfill({status:401,json:{error:'unauthorized'}});
  if(u.pathname==='/api/organizer/events')return r.fulfill({json:{ok:true,rows:[{id:'brand-a',name:'Branded event',ticket_design:{design:'electric',name:'Blue Promoter',accent:'#0088ff'}},{id:'brand-b',name:'New event',ticket_design:null}]}});
  if(!['GET','HEAD','OPTIONS'].includes(r.request.method))return r.abort();
  return r.fulfill({json:{ok:true,events:[],products:[],posts:[],photos:[],promos:[],rows:[]}});
 });
});
for(const route of routes)test(`${route}: load, readable content, refresh and no loose bindings`,async({app,browser})=>{
 await app.open(route);
 await expect(browser.locator('h1:visible')).toHaveCount(1);
 expect(await browser.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
 expect(await browser.evaluate(()=>document.body.innerText.includes('{{'))).toBe(false);
 expect(await browser.evaluate(()=>document.querySelectorAll('#v25-host,#boot-veil,.ugt-tabbar,[data-v25-page]').length)).toBe(0);
 await browser.reload();
 await expect(browser.locator('h1:visible')).toHaveCount(1);
 expect(await browser.evaluate(()=>document.body.innerText.includes('{{'))).toBe(false);
 expect(await browser.evaluate(()=>document.querySelectorAll('#v25-host,#boot-veil,.ugt-tabbar,[data-v25-page]').length)).toBe(0);
 await app.screenshot(route.replaceAll('/','-')||'home');
});
test('Control Room preserves Documents deep link after session probe and refresh',async({app,browser,screen})=>{
 await app.open('/admin?tab=Documents');
 await expect(browser.locator('.cr-shell h1')).toContainText('Documents');
 await expect(screen.getByRole('link',/Ticket, receipt and email design studio/)).toBeVisible();
 await browser.reload();
 await expect(browser.locator('.cr-shell h1')).toContainText('Documents');
});
test('Switching to an unbranded event resets previous organizer identity',async({app,screen})=>{
 await app.open('/organizer/dashboard/designs');
 await expect(screen.getByLabel('Issuer name')).toHaveValue('Blue Promoter');
 await screen.getByLabel('Event').selectOption({value:'brand-b'});
 await expect(screen.getByLabel('Issuer name')).toHaveValue('Urban Gang Tour');
});

test('Payment return without an order never claims a successful payment',async({app,screen})=>{
 await app.open('/pay/success');
 await expect(screen.getByRole('heading','Check your payment')).toBeVisible();
 await expect(screen.getByRole('heading','Payment received')).toHaveCount(0);
});
test('Payment return waits for settlement, then exposes receipt downloads',async({app,browser,screen})=>{
 let confirmed=false;
 await browser.route('**/api/orders/status?*',r=>r.fulfill({json:{status:confirmed?'fulfilled':'pending',total:1500}}));
 await app.open('/pay/success?ref=ORD-LOCAL-EXAMPLE');
 await expect(screen.getByRole('heading','Payment confirmation pending')).toBeVisible();
 confirmed=true;
 await expect(screen.getByRole('heading','Payment confirmed')).toBeVisible();
 await expect(screen.getByRole('link','Open receipt and downloads')).toBeVisible();
});
test('Completed school stops open their gallery and survive refresh',async({app,screen,browser})=>{
 await app.open('/tour-stops');
 await screen.getByRole('link','Explore this stop').first().click();
 await expect(browser).toHaveURL(/gallery\/school-koinange/);
 await expect(screen.getByRole('heading','Senior Chief Koinange Girls')).toBeVisible();
 await browser.reload();
 await expect(screen.getByRole('heading','Senior Chief Koinange Girls')).toBeVisible();
});
test('Verification connection failure offers retry without calling the link invalid',async({app,browser,screen})=>{
 let fails=true;await browser.route('**/api/organizer/verify?*',r=>fails?r.abort():r.fulfill({json:{ok:true}}));
 await app.open('/organizer/verify?token=local-test');
 await expect(screen.getByRole('button','Try verification again')).toBeVisible();
 await expect(screen.getByText('That link is invalid or already used.')).toHaveCount(0);
 fails=false;await screen.getByRole('button','Try verification again').click();
 await expect(screen.getByText(/Address confirmed/)).toBeVisible();
});
test('A scoped admin deep link cannot open an unassigned module',async({app,browser})=>{
 await browser.route('**/api/admin/me',r=>r.fulfill({json:{ok:true,scope:'crew_admin',perms:['gallery']}}));
 await app.open('/admin?tab=Documents');
 await expect(browser.locator('.cr-shell h1')).toContainText('Gallery');
});
test('Organizer studio returns to Documents through a real Control Room route',async({app,screen,browser})=>{
 // The organizer version shares its component with the server-protected admin studio.
 await app.open('/organizer/dashboard/designs');
 expect(await browser.evaluate(()=>document.querySelector('main a')?.getAttribute('href'))).toBe('/organizer/dashboard');
});
test('Newsletter failures retain the email and allow a successful retry',async({app,browser,screen})=>{
 let fails=true;await browser.route('**/api/subscribe',r=>r.fulfill({status:fails?503:200,json:{ok:!fails}}));
 await app.open('/events');
 await screen.getByRole('textbox','Email address').fill('review@example.invalid');
 await browser.locator('.newsletter-card input[type=checkbox]').check();
 await screen.getByRole('button','Send me event updates').click();
 await expect(screen.getByText(/Couldn’t subscribe right now/)).toBeVisible();
 await expect(screen.getByRole('textbox','Email address')).toHaveValue('review@example.invalid');
 fails=false;await screen.getByRole('button','Send me event updates').click();
 await expect(screen.getByText(/You’re subscribed/)).toBeVisible();
});

test('Signing in from a Documents deep link returns to the requested workspace',async({app,browser,screen})=>{
 let signedIn=false;
 await browser.route('**/api/admin/me',r=>r.fulfill({status:signedIn?200:401,json:signedIn?{ok:true,scope:'super_admin',perms:[]}:{error:'unauthorized'}}));
 await browser.route('**/api/admin/login',r=>{signedIn=true;return r.fulfill({json:{ok:true}})});
 await app.open('/admin?tab=Documents');
 await browser.locator('input[type=password]').fill('fictional-review-code');
 await screen.getByRole('button','Sign in to Control Room').click();
 await expect(browser.locator('.cr-shell h1')).toContainText('Documents');
});

test('Document workspace controls fit the viewport and its library remains searchable',async({app,browser,screen})=>{
 await app.open('/admin?tab=Documents');
 const search=screen.getByRole('textbox','Search document library');await expect(search).toBeVisible();
 expect(await browser.evaluate(()=>document.querySelector('.ugt-docgen')!.getBoundingClientRect().right<=innerWidth)).toBe(true);
 expect(await browser.evaluate(()=>document.querySelector('[aria-label="Search document library"]')!.getBoundingClientRect().right<=innerWidth)).toBe(true);
 await search.fill('invoice');await expect(screen.getByRole('button','Invoice',{exact:true})).toBeVisible();
});
test('An unavailable event can be retried without claiming it does not exist',async({app,browser,screen})=>{
 await browser.route('**/api/organizer/me',r=>r.fulfill({json:{organizer:{id:'fixture-org'}}}));
 let fails=true;
 await browser.route('**/api/organizer/events/fixture-event',r=>r.fulfill({status:fails?503:200,json:fails?{error:'unavailable'}:{row:{name:'Review event',status:'draft',event_date:'2026-11-12',venue:'Example venue',city:'Nairobi',description:'Fixture only',image:'',tiers:[]},ticketsSold:0}}));
 await app.open('/organizer/events/fixture-event/edit');await expect(screen.getByRole('button','Try loading again')).toBeVisible();
 await expect(screen.getByText('Event not found.')).toHaveCount(0);fails=false;await screen.getByRole('button','Try loading again').click();await expect(screen.getByRole('heading','Edit event')).toBeVisible();
});
test('Organizer application retries its bank list while retaining entered details',async({app,browser,screen})=>{
 let fails=true;await browser.route('**/api/organizer/banks',r=>r.fulfill({status:fails?503:200,json:fails?{error:'unavailable'}:{banks:[{name:'Fixture bank',code:'FIXTURE',currency:'KES'}]}}));
 await app.open('/organizer/signup');await screen.getByLabel('Business / organizer name *').fill('Review Organizer');await expect(screen.getByRole('button','Retry bank list')).toBeVisible();fails=false;await screen.getByRole('button','Retry bank list').click();await expect(browser.locator('#org-bank option')).toHaveCount(2);await expect(screen.getByLabel('Business / organizer name *')).toHaveValue('Review Organizer');
});
