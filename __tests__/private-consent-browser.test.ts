import {afterAll,beforeAll,expect,it} from 'vitest';
import {build} from 'esbuild';
import {chromium,type Browser,type Page} from 'playwright';
import {VIEWPORT_BOOTSTRAP} from '@/lib/client/viewport-bootstrap';
import {existsSync} from 'node:fs';

const enabled=existsSync('/usr/bin/chromium');
let browser:Browser,script:string,css:string;
beforeAll(async()=>{
 if(!enabled)return;
 const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
 import React,{useEffect,useLayoutEffect} from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
 import {usePathname} from 'next/navigation';
 import {LanguageProvider} from './ui/i18n/LanguageProvider';import {AppShell} from './app/_components/AppShell';
 import {CookieConsent,PrivacyPreferencesButton} from './app/_components/CookieConsent';
 import {AdSenseLoader} from './app/_components/Ads';import {GoogleAnalytics} from './app/_components/GoogleAnalytics';
 import {eventShare} from './lib/analytics';
 window.navigate=path=>flushSync(()=>{history.pushState({},'',path);dispatchEvent(new PopStateEvent('popstate'))});
 window.reportEvent=()=>eventShare('public-event','whatsapp');
 function Fixture(){const path=usePathname();useLayoutEffect(()=>{window.routePanels.push([path,!!document.querySelector('[data-privacy-preferences]')])},[path]);useEffect(()=>{document.body.dataset.ready=path},[path]);return <LanguageProvider><AppShell newsMode={window.newsFixture===true}><p>Private workflow fixture</p>{path==='/cookie-policy'&&<PrivacyPreferencesButton/>}</AppShell><CookieConsent/><AdSenseLoader/><GoogleAnalytics/></LanguageProvider>}
 createRoot(document.getElementById('app')).render(<Fixture/>);`},bundle:true,write:false,outfile:'/tmp/ugt-private-consent-fixture.js',jsx:'automatic',define:{'process.env':'{}','process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID':'"G-PRIVATE-TEST"','process.env.NEXT_PUBLIC_ADSENSE_CLIENT':'"ca-private-test"'},plugins:[{name:'navigation-fixture',setup(builder){
 builder.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}));
 builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({resolveDir:process.cwd(),contents:`import {useSyncExternalStore} from 'react';const subscribe=cb=>{addEventListener('popstate',cb);return()=>removeEventListener('popstate',cb)};export const usePathname=()=>useSyncExternalStore(subscribe,()=>location.pathname);export const useSearchParams=()=>new URLSearchParams(location.search);`}));
 }}]});
 script=bundle.outputFiles.find(file=>file.path.endsWith('.js'))!.text;
 css=bundle.outputFiles.find(file=>file.path.endsWith('.css'))!.text;
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
},30000);
afterAll(async()=>{await browser?.close()});

async function open(path:string,choice?:'yes'|'no',blockedStorage=false,options:{newsMode?:boolean;width?:number;height?:number;wide?:boolean}={}){
 const context=await browser.newContext({reducedMotion:'reduce',serviceWorkers:'block',viewport:{width:options.width||1280,height:options.height||900},...(options.wide?{screen:{width:390,height:844},isMobile:true,hasTouch:true}:{})}),page=await context.newPage(),requests:string[]=[];
 await context.addInitScript(({choice,blockedStorage,newsMode})=>{
  if(choice)localStorage.setItem('ugt-consent',choice);
  const state=window as unknown as {newsFixture?:boolean;consentWrites:string[];consentUpdates:unknown[][];routePanels:unknown[][];gtag:(...args:unknown[])=>void;adsbygoogle:unknown[]};
  state.newsFixture=newsMode;state.consentWrites=[];state.consentUpdates=[];state.routePanels=[];state.gtag=(...args)=>state.consentUpdates.push(args);state.adsbygoogle=[];
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){if(key==='ugt-consent')state.consentWrites.push(value);if(blockedStorage)throw Error('blocked');return original.call(this,key,value)};
  if(blockedStorage)Storage.prototype.getItem=()=>{throw Error('blocked')};
 },{choice,blockedStorage,newsMode:options.newsMode===true});
 await context.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());requests.push(request.method()+' '+url.href);
  if(url.origin!=='http://127.0.0.1')return route.abort();
  if(url.pathname==='/fixture.js')return route.fulfill({contentType:'text/javascript',body:script});
  if(url.pathname==='/fixture.css')return route.fulfill({contentType:'text/css',body:css});
  if(url.pathname==='/api/campaigns')return route.fulfill({json:{campaigns:[],validForMs:1000,serverTime:Date.now()}});
  if(url.pathname==='/api/site-data/events')return route.fulfill({json:{events:[]}});
  if(request.method()!=='GET')return route.fulfill({json:{ok:true}});
  if(request.resourceType()==='document')return route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"></div><link rel="stylesheet" href="/fixture.css"><script src="/fixture.js"></script>'});
  return route.abort();
 });
 await page.goto('http://127.0.0.1'+path);await ready(page,path);
 return{context,page,requests};
}
async function ready(page:Page,path:string){await page.waitForFunction(path=>document.body.dataset.ready===path,path);await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve())))}
async function navigate(page:Page,path:string){await page.evaluate(path=>(window as unknown as {navigate:(path:string)=>void}).navigate(path),path);await ready(page,path)}
const panel='[data-privacy-preferences]';

it.skipIf(!enabled).each(['/search','/my-tickets','/account','/cart','/checkout','/pay/success','/orders/track','/t/private','/tickets/private','/receipt/private','/organizer/login','/book/status','/cookie-policy'])('does not prompt, write consent or report on a fresh private/quiet %s',async path=>{
 const{context,page,requests}=await open(path);try{
  expect(await page.locator(panel).count()).toBe(0);
  expect(await page.evaluate(()=>localStorage.getItem('ugt-consent'))).toBeNull();
  expect(await page.evaluate(()=>(window as unknown as {consentWrites:string[]}).consentWrites)).toEqual([]);
  expect(requests.some(request=>/\/api\/track|googletagmanager|googlesyndication|\/api\/campaigns/.test(request))).toBe(false);
 }finally{await context.close()}
},20000);

it.skipIf(!enabled)('hides automatic and deliberately opened panels on route changes without assuming consent',async()=>{
 const{context,page}=await open('/about');try{
  await page.locator(panel).waitFor();await navigate(page,'/my-tickets');expect(await page.locator(panel).count()).toBe(0);
  expect(await page.evaluate(()=>(window as unknown as {routePanels:unknown[][]}).routePanels.at(-1))).toEqual(['/my-tickets',false]);
  await page.getByRole('button',{name:'Cookie settings',exact:true}).click();await page.locator(panel).waitFor();
  await navigate(page,'/account');expect(await page.locator(panel).count()).toBe(0);
  expect(await page.evaluate(()=>(window as unknown as {routePanels:unknown[][]}).routePanels.at(-1))).toEqual(['/account',false]);
  await navigate(page,'/about');await page.locator(panel).waitFor();
  expect(await page.evaluate(()=>localStorage.getItem('ugt-consent'))).toBeNull();
 }finally{await context.close()}
},20000);

it.skipIf(!enabled).each(['yes','no'] as const)('preserves saved %s while allowing deliberate footer preferences and revocation',async choice=>{
 const{context,page,requests}=await open('/my-tickets',choice);try{
  expect(await page.locator(panel).count()).toBe(0);expect(await page.evaluate(()=>localStorage.getItem('ugt-consent'))).toBe(choice);
  await page.getByRole('button',{name:'Cookie settings',exact:true}).click();await page.locator(panel).waitFor();
  await page.getByRole('button',{name:'Close privacy preferences',exact:true}).click();
  expect(await page.evaluate(()=>localStorage.getItem('ugt-consent'))).toBe(choice);
  await page.getByRole('button',{name:'Cookie settings',exact:true}).click();await page.getByRole('button',{name:'Reject',exact:true}).click();
  expect(await page.evaluate(()=>localStorage.getItem('ugt-consent'))).toBe('no');
  expect(requests.some(request=>/\/api\/track|googletagmanager|googlesyndication/.test(request))).toBe(false);
 }finally{await context.close()}
},20000);

it.skipIf(!enabled)('records deliberate acceptance but never grants or queues optional reporting on the private route',async()=>{
 const{context,page,requests}=await open('/my-tickets');try{
  await page.getByRole('button',{name:'Cookie settings',exact:true}).click();await page.getByRole('button',{name:'Accept',exact:true}).click();
  await page.evaluate(()=>(window as unknown as {reportEvent:()=>void}).reportEvent());
  expect(await page.evaluate(()=>localStorage.getItem('ugt-consent'))).toBe('yes');
  expect(await page.evaluate(()=>(window as unknown as {consentUpdates:unknown[][]}).consentUpdates.some(update=>JSON.stringify(update).includes('granted')))).toBe(false);
  expect(await page.evaluate(()=>(window as unknown as {dataLayer?:unknown[]}).dataLayer??[])).toEqual([]);
  expect(requests.some(request=>/\/api\/track|googletagmanager|googlesyndication/.test(request))).toBe(false);
  await navigate(page,'/about');
  await page.waitForFunction(()=>document.getElementById('ugt-ga4')!==null&&document.getElementById('ugt-adsense')!==null);
  expect(await page.locator(panel).count()).toBe(0);
  await page.evaluate(()=>(window as unknown as {reportEvent:()=>void}).reportEvent());
  expect(await page.evaluate(()=>(window as unknown as {dataLayer?:unknown[]}).dataLayer?.length)).toBe(1);
  await navigate(page,'/account');
  await page.evaluate(()=>(window as unknown as {reportEvent:()=>void}).reportEvent());
  expect(await page.evaluate(()=>(window as unknown as {dataLayer?:unknown[]}).dataLayer?.length)).toBe(1);
  expect(await page.evaluate(()=>(window as unknown as Record<string,unknown>)['ga-disable-G-PRIVATE-TEST'])).toBe(true);
  expect(await page.evaluate(()=>(window as unknown as {adsbygoogle:{pauseAdRequests:number}}).adsbygoogle.pauseAdRequests)).toBe(1);
  await page.getByRole('button',{name:'Cookie settings',exact:true}).click();
  await page.getByRole('button',{name:'Reject',exact:true}).click();
  await page.getByRole('button',{name:'Keep browsing',exact:true}).waitFor();
  expect(await page.evaluate(()=>localStorage.getItem('ugt-consent'))).toBe('no');
 }finally{await context.close()}
},20000);

it.skipIf(!enabled)('opens preferences deliberately from a quiet legal page without writing a choice',async()=>{
 const{context,page}=await open('/cookie-policy');try{
  expect(await page.locator(panel).count()).toBe(0);
  await page.locator('main').getByRole('button',{name:'Cookie settings',exact:true}).click();await page.locator(panel).waitFor();
  await page.getByRole('button',{name:'Close privacy preferences',exact:true}).click();
  expect(await page.evaluate(()=>localStorage.getItem('ugt-consent'))).toBeNull();
  expect(await page.evaluate(()=>(window as unknown as {consentWrites:string[]}).consentWrites)).toEqual([]);
 }finally{await context.close()}
},20000);

it.skipIf(!enabled)('keeps private preferences usable when browser storage is unavailable',async()=>{
 const{context,page}=await open('/my-tickets',undefined,true);try{
  expect(await page.locator(panel).count()).toBe(0);await page.getByRole('button',{name:'Cookie settings',exact:true}).click();
  await page.getByRole('button',{name:'Reject',exact:true}).click();expect(await page.locator(panel).count()).toBe(0);
  await navigate(page,'/about');expect(await page.locator(panel).count()).toBe(0);
 }finally{await context.close()}
},20000);

it.skipIf(!enabled)('treats private order recovery as a transaction without marketing but retains footer preferences',async()=>{
 const{context,page}=await open('/orders/track','no');try{
  expect(await page.locator('main[data-public-surface="transaction"]').count()).toBe(1);
  expect(await page.locator('[data-contact-launcher]').count()).toBe(0);
  expect(await page.locator('[data-site-footer] [class*="invitation"]').count()).toBe(0);
  await page.getByRole('button',{name:'Cookie settings',exact:true}).click();await page.locator(panel).waitFor();
 }finally{await context.close()}
},20000);

it.skipIf(!enabled).each([{width:320,height:568},{width:390,height:844},{width:980,height:1800,wide:true}])('keeps News reachable without choosing cookies at $width px',async options=>{const {context,page,requests}=await open('/about',undefined,false,{...options,newsMode:true});try{if(options.wide)await page.evaluate(script=>{const node=document.createElement('script');node.textContent=script;document.head.append(node)},VIEWPORT_BOOTSTRAP);await page.locator(panel).waitFor();const dock=page.locator('[data-mobile-app-navigation]'),notice=page.locator(panel);const bounds=await Promise.all([dock.boundingBox(),notice.boundingBox()]);expect(bounds[0]).not.toBeNull();expect(bounds[1]).not.toBeNull();expect(bounds[1]!.y+bounds[1]!.height).toBeLessThanOrEqual(bounds[0]!.y-4);await dock.locator('a[href="/blog"]').click({timeout:3000});await page.waitForURL('**/blog');expect(await page.evaluate(()=>localStorage.getItem('ugt-consent'))).toBeNull();expect(requests.some(r=>/\/api\/track|googletagmanager|googlesyndication/.test(r))).toBe(false)}finally{await context.close()}},20000);

it.skipIf(!enabled)('keeps search quiet even with saved reporting consent',async()=>{const {context,page,requests}=await open('/search','yes');try{await page.evaluate(()=>(window as unknown as {reportEvent:()=>void}).reportEvent());expect(requests.some(request=>/\/api\/track|googletagmanager|googlesyndication|\/api\/campaigns/.test(request))).toBe(false);expect(await page.evaluate(()=>localStorage.getItem('ugt-consent'))).toBe('yes')}finally{await context.close()}},20000);
