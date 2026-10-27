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
const choice=vi.hoisted(()=>({locale:'en' as InterfaceLocale}));
vi.mock('@/ui/i18n/LanguageProvider',async original=>({...await original<typeof import('@/ui/i18n/LanguageProvider')>(),useInterfaceLanguage:()=>({locale:choice.locale}),useMessages:(catalogue:Catalogue<string>)=>(key:string,values?:MessageValues)=>formatMessage(catalogue,choice.locale,key,values).text}));
it('provides complete native forms, account, documents, help and organizer catalogues',async()=>{
 for(const name of ['forms','account','documents','help','organizer-auth']){
  const catalogue=await import('../ui/i18n/catalogues/'+name);
  expect(catalogueProblems(Object.values(catalogue).find(value=>typeof value==='object'&&value&&'en' in value) as Catalogue<string>)).toEqual([]);
 }
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
