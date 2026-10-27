import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import {catalogueProblems,formatMessage,type Catalogue,type MessageValues} from '@/lib/i18n/messages';
import {INTERFACE_LOCALES,type InterfaceLocale} from '@/lib/i18n/locale';
import {BookingForm} from '@/app/_components/BookingForm';
import AccountApp from '@/app/account/AccountApp';
import {LegalPage} from '@/app/_components/LegalPage';
import NotificationPreferences from '@/ui/components/NotificationPreferences';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
import {accountMessages,statusIssue} from '@/ui/i18n/catalogues/account';
const choice=vi.hoisted(()=>({locale:'en' as InterfaceLocale}));
vi.mock('@/ui/i18n/LanguageProvider',async original=>({...await original<typeof import('@/ui/i18n/LanguageProvider')>(),useInterfaceLanguage:()=>({locale:choice.locale}),useMessages:(catalogue:Catalogue<string>)=>(key:string,values?:MessageValues)=>formatMessage(catalogue,choice.locale,key,values).text}));
it('provides complete native forms, account, documents, help and organizer catalogues',async()=>{
 for(const name of ['forms','account','documents','help','organizer-auth']){
  const catalogue=await import('../ui/i18n/catalogues/'+name);
  expect(catalogueProblems(Object.values(catalogue).find(value=>typeof value==='object'&&value&&'en' in value) as Catalogue<string>)).toEqual([]);
 }
});
const domainLabels={
 en:{received:'Request received',review:'Under review',closed:'Closed',cancelled:'Cancelled',collection:'Collection',delivery:'Delivery',courier:'Courier',other:'Other',unknown:'Unknown'},
 sw:{received:'Ombi limepokelewa',review:'Inakaguliwa',closed:'Imefungwa',cancelled:'Imeghairiwa',collection:'Kuchukua',delivery:'Uwasilishaji',courier:'Msafirishaji',other:'Nyingine',unknown:'Haijulikani'},
 fr:{received:'Demande reçue',review:'En cours d’examen',closed:'Fermée',cancelled:'Annulée',collection:'Retrait',delivery:'Livraison',courier:'Transporteur',other:'Autre',unknown:'Inconnu'},
 'zh-Hans':{received:'已收到请求',review:'审核中',closed:'已关闭',cancelled:'已取消',collection:'自取',delivery:'送货',courier:'快递',other:'其他',unknown:'未知'},
 ru:{received:'Запрос получен',review:'На рассмотрении',closed:'Закрыт',cancelled:'Отменено',collection:'Самовывоз',delivery:'Доставка',courier:'Курьер',other:'Другое',unknown:'Неизвестно'},
 es:{received:'Solicitud recibida',review:'En revisión',closed:'Cerrada',cancelled:'Cancelado',collection:'Recogida',delivery:'Entrega',courier:'Mensajería',other:'Otro',unknown:'Desconocido'},
};
it.each(INTERFACE_LOCALES)('keeps privacy, fulfillment and handoff meanings in their own finite domains in %s',locale=>{
 const label=domainLabels[locale];
 for(const [domain,code,expected]of [
  ['privacy','received',label.received],['privacy','reviewing',label.review],['privacy','closed',label.closed],
  ['fulfillment','cancelled',label.cancelled],['handoff','collection',label.collection],['handoff','delivery',label.delivery],['handoff','courier',label.courier],['handoff','other',label.other],
 ] as const){expect(formatMessage(accountMessages,locale,statusIssue(code,domain).key).text).toBe(expected);}
 for(const domain of ['order','privacy','fulfillment','handoff'] as const){
  for(const code of ['unrecognized','constructor',null])expect(formatMessage(accountMessages,locale,statusIssue(code,domain).key).text).toBe(label.unknown);
 }
 expect(formatMessage(accountMessages,locale,statusIssue('confirmed','privacy').key).text).toBe(label.unknown);
 expect(formatMessage(accountMessages,locale,statusIssue('closed','fulfillment').key).text).toBe(label.unknown);
});
it.each(INTERFACE_LOCALES)('translates first-party fields without changing booking values or legal source in %s',locale=>{
 choice.locale=locale;
 const booking=renderToStaticMarkup(createElement(BookingForm));
 for(const value of ['School Booking','Campus Rave','Mega Event','Media','Sponsorship','Partnership','Join the Crew'])expect(booking).toContain('value="'+value+'"');
 expect(booking).toContain('name="expectedAttendance"');expect(booking).toContain('href="/privacy-policy"');
 const legal=renderToStaticMarkup(createElement(LegalPage,{title:'Original legal title',updated:'Original date',sections:[{h:'Original legal heading',p:['Original legal body.']}]}));
 for(const value of ['Original legal title','Original date','Original legal heading','Original legal body.'])expect(legal).toContain(value);
 expect(legal).toContain('lang="en-KE"');
 const account=renderToStaticMarkup(createElement(AccountApp));
 const preferences=renderToStaticMarkup(createElement(NotificationPreferences));
 if(locale!=='en'){expect(booking).not.toContain('>Your name<');expect(account).not.toContain('Checking your account…');expect(preferences).not.toContain('Loading your preferences…');}
});
it.skipIf(!existsSync('/usr/bin/chromium'))('retains filled booking and login forms, consent, active errors and request identity through all native choices without resubmission',async()=>{
 const {formsMessages,factoryIssue}=await import('@/ui/i18n/catalogues/forms');
 const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
 import React from 'react';import {createRoot} from 'react-dom/client';import {LanguageProvider} from './ui/i18n/LanguageProvider';import LanguageChooser from './app/_components/LanguageChooser';import {BookingForm} from './app/_components/BookingForm';import AccountApp from './app/account/AccountApp';
 createRoot(document.getElementById('app')).render(<LanguageProvider><LanguageChooser path="/book"/><div id="booking"><BookingForm/></div><div id="account"><AccountApp/></div></LanguageProvider>);
 `},bundle:true,write:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'native-form-fixture',setup(builder){builder.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}));builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const usePathname=()=>"/book";'}));builder.onLoad({filter:/\.css$/},()=>({contents:'export default {};',loader:'js'}));}}]});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(5000);const requests:string[]=[],posts:unknown[]=[];
  await context.route('**/*',route=>{const request=route.request(),url=new URL(request.url());requests.push(request.method()+' '+url.pathname);
   if(url.origin!=='http://127.0.0.1')return route.abort();
   if(url.pathname==='/fixture')return route.fulfill({contentType:'text/html; charset=utf-8',body:'<meta charset="utf-8"><div id="app"></div>'});
   if(url.pathname==='/api/auth/google')return route.fulfill({json:{}});
   if(url.pathname==='/api/auth')return route.fulfill({json:{ok:true,user:null}});
   if(url.pathname==='/api/bookings'){posts.push(request.postDataJSON());return route.fulfill({status:409,json:{error:'request_details_changed'}})}return route.abort();
  });
  await page.goto('http://127.0.0.1/fixture');await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.locator('#account input[type="password"]').waitFor();
  for(const [name,value]of Object.entries({name:'Original Buyer',org:'Original School',email:'buyer@example.test',message:'Original event brief retained.'}))await page.locator('#booking [name="'+name+'"]').fill(value);
  await page.locator('#booking input[type="checkbox"]').nth(0).check();await page.locator('#booking input[type="checkbox"]').nth(1).check();
  await page.locator('#account input[type="password"]').fill('OriginalPassword8');
  await page.locator('#booking button[type="submit"]').click();await page.locator('#booking [role="alert"]').waitFor();
  const baseline=[...requests];expect(posts).toHaveLength(1);expect(posts[0]).toMatchObject({name:'Original Buyer',org:'Original School',message:'Original event brief retained.',schoolContactConfirmed:true,type:'School Booking'});
  await page.evaluate(()=>{const nodes=[...document.querySelectorAll('#booking form,#booking input,#booking textarea,#account input')];(window as any).preservedForm={nodes,values:nodes.map((node:any)=>[node.value,node.checked]),draft:sessionStorage.getItem('ugt-booking-draft'),id:sessionStorage.getItem('ugt-booking-request-id')};});
  for(const locale of INTERFACE_LOCALES){
   await page.evaluate(locale=>{(document.querySelector('#booking input[name="name"]') as HTMLInputElement).focus();const chooser=document.querySelector('[data-language-control] select') as HTMLSelectElement;chooser.value=locale;chooser.dispatchEvent(new Event('change',{bubbles:true}));},locale);
   const issue=factoryIssue('A request with this saved reference has different details. Contact us to update it; we have kept your current text.');
   await page.locator('#booking [role="alert"]').filter({hasText:formatMessage(formsMessages,locale,issue.key).text}).waitFor();
   expect(await page.evaluate(()=>{const b=(window as any).preservedForm,nodes=[...document.querySelectorAll('#booking form,#booking input,#booking textarea,#account input')];return nodes.length===b.nodes.length&&nodes.every((node:any,index)=>node===b.nodes[index]&&node.isConnected&&node.value===b.values[index][0]&&node.checked===b.values[index][1])&&sessionStorage.getItem('ugt-booking-draft')===b.draft&&sessionStorage.getItem('ugt-booking-request-id')===b.id&&document.activeElement===document.querySelector('#booking input[name="name"]');})).toBe(true);
   expect(requests).toEqual(baseline);expect(posts).toHaveLength(1);
  }
 }finally{await browser.close()}
},30000);

it.skipIf(!existsSync('/usr/bin/chromium'))('renders a fictional signed-in ticket wallet and actual tracking codes through six languages without crashes, data changes or extra requests',async()=>{
 const orderId='ORD-FICTIONAL-0001';
 const wallet={orders:[{id:orderId,status:'paid',total:1250.5,created_at:'2026-10-26T21:30:00Z'}],tickets:[
  {order_id:orderId,code:'TKT-FICTIONAL-0001',tier_name:'Original VIP / M',event_id:'event-original-1',holder:'Fictional Holder One',used_at:null},
  {order_id:orderId,code:'TKT-FICTIONAL-0002',tier_name:'Original Student',event_id:'event-original-2',holder:'Fictional Holder Two',used_at:'2026-10-27T09:00:00Z'},
 ],requests:[{id:'PR-FICTIONAL',status:'closed'}]};
 const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
 import React from 'react';import {createRoot} from 'react-dom/client';import {LanguageProvider} from './ui/i18n/LanguageProvider';import LanguageChooser from './app/_components/LanguageChooser';import AccountApp from './app/account/AccountApp';import CustomerFulfillment from './app/_components/CustomerFulfillment';
 window.fixtureErrors=[];window.addEventListener('error',event=>window.fixtureErrors.push(String(event.error)));
 const json=Response.prototype.json;Response.prototype.json=async function(){const data=await json.call(this);if(new URL(this.url).pathname==='/api/account')window.receivedWallet=data;return data};
 createRoot(document.getElementById('app')).render(<LanguageProvider><LanguageChooser path="/account"/><div id="wallet"><AccountApp/></div>{['collection','delivery','courier','other','unrecognized'].map(method=><div id={'tracking-'+method} key={method}><CustomerFulfillment orderId={method}/></div>)}</LanguageProvider>);
 `},bundle:true,write:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'fictional-wallet',setup(builder){builder.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}));builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const usePathname=()=>"/account";'}));builder.onLoad({filter:/\.css$/},()=>({contents:'export default {};',loader:'js'}));}}]});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(5000);const requests:{path:string;method:string;body:unknown}[]=[],unexpected:string[]=[];
  await context.route('**/*',route=>{const request=route.request(),url=new URL(request.url());requests.push({path:url.pathname+url.search,method:request.method(),body:request.postDataJSON()});
   if(url.origin!=='http://127.0.0.1'){unexpected.push(request.url());return route.abort();}
   if(url.pathname==='/fixture')return route.fulfill({contentType:'text/html; charset=utf-8',body:'<meta charset="utf-8"><div id="app"></div>'});
   if(url.pathname==='/api/auth'&&request.method()==='POST')return route.fulfill({json:{ok:true,user:{id:123,name:'Fictional Buyer',email:'buyer@example.test'}}});
   if(url.pathname==='/api/account'&&request.method()==='GET')return route.fulfill({json:wallet});
   if(url.pathname==='/api/orders/tracking'&&request.method()==='GET')return route.fulfill({json:{paymentStatus:'paid',fulfillment:{status:'cancelled',handoff_method:url.searchParams.get('id'),reference:'TRACK-FICTIONAL'},history:[{status:'cancelled',created_at:'2026-10-27T09:00:00Z'}]}});
   unexpected.push(request.method()+' '+request.url());return route.abort();
  });
  await page.goto('http://127.0.0.1/fixture');await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForFunction(()=>!!document.querySelector('#wallet a[href="/api/tickets/TKT-FICTIONAL-0001/pdf"]')||(window as any).fixtureErrors.length>0);
  expect(await page.evaluate(()=>(window as any).fixtureErrors)).toEqual([]);
  await page.locator('#tracking-other').getByText('TRACK-FICTIONAL',{exact:false}).waitFor();
  const baseline=[...requests];expect(requests.filter(request=>request.method==='POST')).toEqual([{path:'/api/auth',method:'POST',body:{action:'me'}}]);
  for(const locale of INTERFACE_LOCALES){
   await page.locator('[data-language-control] select').selectOption(locale);
   const heading=formatMessage(accountMessages,locale,'copy.my_orders_tickets').text;await page.locator('#wallet').getByRole('heading',{name:heading,exact:true}).waitFor();
   for(const ticket of wallet.tickets){
    const link=page.locator('#wallet a[href="/api/tickets/'+ticket.code+'/pdf"]');
    expect(await link.textContent()).toBe(formatMessage(accountMessages,locale,'copy.download').text+' '+ticket.tier_name+' '+formatMessage(accountMessages,locale,'copy.ticket').text);
    expect(await link.locator('..').textContent()).toContain(formatMessage(accountMessages,locale,ticket.used_at?'copy.scanned_at_gate':'copy.not_yet_scanned').text);
   }
   expect(await page.locator('#wallet a[href="/receipt/'+orderId+'"]').count()).toBe(1);expect(await page.locator('#wallet a[href="/orders/track?ref='+orderId+'"]').count()).toBe(1);
   expect(await page.locator('#wallet').textContent()).toContain('PR-FICTIONAL: '+domainLabels[locale].closed);
   for(const method of ['collection','delivery','courier','other','unrecognized'] as const){
    const text=await page.locator('#tracking-'+method).textContent();expect(text).toContain(domainLabels[locale].cancelled);expect(text).toContain(method==='unrecognized'?domainLabels[locale].unknown:domainLabels[locale][method]);expect(text).toContain('TRACK-FICTIONAL');
   }
   expect(await page.evaluate(()=>(window as any).receivedWallet)).toEqual(wallet);expect(await page.evaluate(()=>(window as any).fixtureErrors)).toEqual([]);expect(requests).toEqual(baseline);expect(unexpected).toEqual([]);
  }
 }finally{await browser.close()}
},30000);
