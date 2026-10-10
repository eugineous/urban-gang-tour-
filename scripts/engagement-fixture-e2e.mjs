import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.BASE||'http://127.0.0.1:4189';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const code='a'.repeat(24),invalid='b'.repeat(24);
try{
 for(const width of [390,820,1440]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.addInitScript(()=>{localStorage.setItem('ugt-consent','no');localStorage.setItem('ugt-booking-invitation-seen-v1','fixture-test');});
  let enabled=false,termsAccepted=false,prefsGetFails=true,prefsPutFails=true,affiliateSignedIn=true;const requests=[];
  const program=()=>({enabled,rateBps:enabled?500:null,termsVersion:enabled?'fixture-v1':'',terms:enabled?'Fictional review terms: eligible paid owned-event ticket revenue after refunds. No automatic money transfer.':'',eligibleEventIds:enabled?['fixture-event']:[]});
  await context.route('**/api/**',async route=>{
   const request=route.request(),url=new URL(request.url()),path=url.pathname,method=request.method();
   if(method!=='GET')requests.push({path,body:request.postDataJSON()});
   let json={},status=200;
   if(path==='/api/affiliates'&&method==='GET'){if(!affiliateSignedIn){status=401;json={error:'sign_in_required'};}else json={application:{id:code,status:'approved',accepted_terms_version:termsAccepted?'fixture-v1':null},program:program(),earnings:{earned_kes:25,recorded_payout_kes:0,balance_kes:25,sales:[],payouts:[]}};}
   else if(path==='/api/affiliates/terms'){termsAccepted=true;json={application:{id:code,status:'approved',accepted_terms_version:'fixture-v1'}};}
   else if(path==='/api/affiliates/referral')json=url.searchParams.get('code')===code?{valid:true,code,termsVersion:'fixture-v1'}:{valid:false};
   else if(path==='/api/account/preferences'&&method==='GET'){if(prefsGetFails){status=503;json={error:'unavailable'};}else json={preferences:{marketing_email:false,event_interests:[]}};}
   else if(path==='/api/account/preferences'&&method==='PUT'){if(prefsPutFails){status=503;json={error:'unavailable'};}else json={preferences:request.postDataJSON()};}
   else if(path==='/api/site-data/events')json={ok:true,events:[{id:'fixture-event',name:'Fixture concert',sellable:true,tiers:[{name:'General',price:500}]}]};
   else if(path==='/api/site-data/products')json={ok:true,products:[]};
   else if(path==='/api/orders'){status=503;json={error:'fixture_payment_disabled'};}
   else if(path==='/api/account/orders')json={orders:[]};
   else if(path.includes('events'))json={ok:true,events:[],sources:[]};
   await route.fulfill({status,json});
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(process.env.SKIP_AFFILIATE!=='1'){await page.goto(base+'/affiliates');await page.getByRole('heading',{name:/Share the event/}).waitFor();
  await page.getByText('The team has not enabled commission terms.',{exact:false}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'Your referral link'}).count(),0,'Inactive programme does not promise an active link');
  enabled=true;await page.getByRole('button',{name:'Refresh programme'}).click();
  await page.getByLabel('I have read and accept programme terms fixture-v1.').check();
  await page.getByRole('button',{name:'Accept terms and activate link'}).click();
  await page.getByRole('heading',{name:'Your referral link'}).waitFor();
  assert.equal(requests.find(r=>r.path==='/api/affiliates/terms')?.body.termsVersion,'fixture-v1');
  await page.screenshot({path:`/tmp/ugt-affiliate-${width}.png`,fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Affiliate layout fits viewport');
  affiliateSignedIn=false;await page.getByRole('button',{name:'Refresh programme'}).click();await page.getByText('Sign in to submit or view your application.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'Your referral link'}).count(),0,'Expired sign-in hides the old referral link');
  assert.equal(await page.getByRole('heading',{name:'Your commission ledger'}).count(),0,'Expired sign-in clears old earnings');
  assert.equal(await page.getByText('The team has not enabled commission terms.',{exact:false}).count(),0,'Unknown programme availability is not claimed to be disabled');}

  await page.goto(base+'/account/preferences');await page.getByText('Preferences are unavailable. Please retry.',{exact:true}).waitFor();
  assert.ok(await page.getByRole('button',{name:'Save preferences',exact:true}).isDisabled());
  prefsGetFails=false;await page.getByRole('button',{name:'Retry loading'}).click();
  await page.getByRole('button',{name:'Save preferences',exact:true}).waitFor();
  await page.getByLabel('Email me event and merchandise updates').check();await page.getByLabel('concerts',{exact:true}).check();
  await page.getByRole('button',{name:'Save preferences',exact:true}).click();
  await page.getByText('Could not save. Your selection remains here; please retry.',{exact:true}).waitFor();
  assert.ok(await page.getByLabel('concerts',{exact:true}).isChecked(),'Failed saves keep selected interests');
  prefsPutFails=false;await page.getByRole('button',{name:'Save preferences',exact:true}).click();
  await page.getByText('Preferences saved.',{exact:true}).waitFor();
  assert.deepEqual(requests.filter(r=>r.path==='/api/account/preferences').at(-1).body,{marketing_email:true,event_interests:['concerts']});
  await page.screenshot({path:`/tmp/ugt-preferences-${width}.png`,fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Preferences layout fits viewport');
  await page.goto(base+'/events?ref='+code);await page.getByRole('button',{name:'Remove referral',exact:true}).waitFor();
  const captured=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('ugt-affiliate-referral')));assert.equal(captured.code,code);
  await page.goto(base+'/checkout?event=fixture-event');await page.getByRole('heading',{name:'Fixture concert',exact:true}).waitFor();
  await page.getByLabel('Your full name').fill('Fixture Buyer');await page.getByLabel('M-Pesa phone number').fill('0712345678');
  await page.locator('form input[type=checkbox]').check();await page.getByRole('button',{name:'Pay KES 500 with M-Pesa',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'We could not start payment.'}).waitFor();
  assert.equal(requests.filter(r=>r.path==='/api/orders').at(-1).body.referralCode,code,'Validated captured referral travels to checkout');
  await page.getByRole('button',{name:'Remove referral',exact:true}).click();
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('ugt-affiliate-referral')),null);
  await page.getByRole('button',{name:'Pay KES 500 with M-Pesa',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'We could not start payment.'}).waitFor();
  assert.equal('referralCode' in requests.filter(r=>r.path==='/api/orders').at(-1).body,false,'Removal clears checkout attribution');
  await page.goto(base+'/events?ref='+invalid);await page.waitForLoadState('networkidle');
  assert.equal(await page.getByRole('button',{name:'Remove referral',exact:true}).count(),0,'Unapproved referral never appears');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('ugt-affiliate-referral')),null);
  assert.deepEqual(errors,[]);console.log('PASS',width,process.env.SKIP_AFFILIATE==='1'?'preferences recovery and referral capture/checkout/remove (affiliate route excluded pending rebuild)':'inactive programme, terms acceptance, preferences recovery, referral capture/checkout/remove');
  await context.close();
 }
}finally{await browser.close();}
