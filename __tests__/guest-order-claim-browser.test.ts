import {afterAll,beforeAll,expect,it} from 'vitest';
import {build} from 'esbuild';
import {chromium,type Browser} from 'playwright';
import {existsSync,readFileSync} from 'node:fs';

const enabled=existsSync('/usr/bin/chromium');
let browser:Browser,script:string,css:string;
const reference='ORD-A1B2C3D4E5F60718293A4B5C6D7E8F90';
const globalCss=['globals','design','modern','refinements','interaction-foundations','premium-implementation','navigation'].map(name=>readFileSync('app/'+name+'.css','utf8')).join('\n');
beforeAll(async()=>{
 if(!enabled)return;
 const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
 import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
 import {LanguageProvider} from './ui/i18n/LanguageProvider';import LanguageChooser from './app/_components/LanguageChooser';
 import GuestOrderClaim from './app/account/GuestOrderClaim';
 function App(){const[count,setCount]=useState(0);return <LanguageProvider><LanguageChooser path="/account"/><GuestOrderClaim verified={!new URLSearchParams(location.search).has('unverified')} onClaimed={()=>setCount(v=>v+1)}/><span id="claims">{count}</span></LanguageProvider>}
 createRoot(document.getElementById('app')).render(<App/>);
 `},bundle:true,write:false,outfile:'/tmp/ugt-guest-order-claim-test.js',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'local-claim-fixture',setup(builder){
  builder.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}));
  builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const usePathname=()=>"/account";'}));
 }}]});
 script=bundle.outputFiles.find(file=>file.path.endsWith('.js'))!.text;
 css=bundle.outputFiles.find(file=>file.path.endsWith('.css'))!.text;
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
},30000);
afterAll(async()=>{await browser?.close()});

type Reply={status:number;json:Record<string,unknown>};
async function open({verified=true,width=390,replies=[{status:200,json:{ok:true}}]}:{verified?:boolean;width?:number;replies?:Reply[]}={}){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage();
 page.setDefaultTimeout(2500);
 const posts:{ref:string}[]=[],otherRequests:string[]=[];
 const state={gate:undefined as Promise<void>|undefined};
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!=='http://127.0.0.1'){otherRequests.push(request.method()+' '+url.origin+url.pathname);return route.abort()}
  if(url.pathname==='/fixture.js'&&request.method()==='GET')return route.fulfill({contentType:'text/javascript',body:script});
  if(url.pathname==='/fixture.css'&&request.method()==='GET')return route.fulfill({contentType:'text/css',body:css});
  if(url.pathname==='/account'&&request.isNavigationRequest())return route.fulfill({contentType:'text/html; charset=utf-8',body:'<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+globalCss+'</style><link rel="stylesheet" href="/fixture.css"><main style="max-width:720px;margin:16px auto;padding:16px;box-sizing:border-box"><div id="app"></div></main><script src="/fixture.js"></script>'});
  if(url.pathname==='/api/account/orders/claim'&&request.method()==='POST'){
   posts.push(request.postDataJSON());if(state.gate)await state.gate;
   const reply=replies.shift()??{status:503,json:{error:'accounts_unavailable'}};
   return route.fulfill({status:reply.status,json:reply.json});
  }
  if(url.pathname.startsWith('/fonts/')&&existsSync('public'+url.pathname))return route.fulfill({body:readFileSync('public'+url.pathname)});
  otherRequests.push(request.method()+' '+url.pathname);return route.abort();
 });
 await page.goto('http://127.0.0.1/account'+(verified?'':'?unverified=1'));
 await page.getByText('Add a guest order',{exact:true}).waitFor();
 return {context,page,posts,otherRequests,state};
}

it.skipIf(!enabled)('rejects external links, individual tickets and weak references locally without persisting them',async()=>{
 const {context,page,posts,otherRequests}=await open();
 try{
  expect(await page.getByLabel('Order reference or confirmation link').isVisible()).toBe(false);
  await page.getByText('Add a guest order',{exact:true}).click();
  const input=page.getByLabel('Order reference or confirmation link');
  for(const value of ['https://external.invalid/receipt/'+reference,'ORD-ABC123','TKT-ABCDEFGHJKLMNPQRSTUVWX-ABCDEFGHJKLM','https://urbangangtour.co.ke/t/TKT-ABCDEFGHJKLMNPQRSTUVWX-ABCDEFGHJKLM']){
   await input.fill(value);await input.press('Enter');await page.getByRole('alert').waitFor();
   expect(await input.inputValue()).toBe(value);expect(await input.evaluate(node=>node===document.activeElement)).toBe(true);
  }
  expect(posts).toEqual([]);expect(otherRequests).toEqual([]);
  expect(await page.evaluate(()=>Object.values(localStorage).some(value=>value.includes('ORD-')||value.includes('TKT-')))).toBe(false);
 }finally{await context.close()}
},20000);

it.skipIf(!enabled)('retains a denied reference, then adds it only after a successful response and invokes the callback once',async()=>{
 const {context,page,posts,otherRequests}=await open({replies:[{status:404,json:{error:'order_not_claimable'}},{status:200,json:{ok:true}}]});
 try{
  await page.getByText('Add a guest order',{exact:true}).click();
  const input=page.getByLabel('Order reference or confirmation link');await input.fill(reference);await input.press('Enter');
  await page.getByRole('alert').waitFor();expect(await input.inputValue()).toBe(reference);expect(await input.evaluate(node=>node===document.activeElement)).toBe(true);expect(await page.locator('#claims').textContent()).toBe('0');
  await input.press('Enter');await page.getByText('Order added to your account',{exact:true}).waitFor();
  expect(posts).toEqual([{ref:reference},{ref:reference}]);expect(await page.locator('#claims').textContent()).toBe('1');expect(otherRequests).toEqual([]);
  expect(await page.getByText('Payment confirmed',{exact:true}).count()).toBe(0);
 }finally{await context.close()}
},20000);

it.skipIf(!enabled)('requires verification without probing verification or submitting on Enter',async()=>{
 const {context,page,posts,otherRequests}=await open({verified:false});
 try{
  await page.getByText('Add a guest order',{exact:true}).click();await page.getByText('Verify your account email first to add a guest order.',{exact:true}).waitFor();
  expect(await page.getByRole('button',{name:'Add order',exact:true}).isDisabled()).toBe(true);
  await page.getByLabel('Order reference or confirmation link').fill(reference);await page.getByLabel('Order reference or confirmation link').press('Enter');
  expect(posts).toEqual([]);expect(otherRequests).toEqual([]);expect(await page.locator('#claims').textContent()).toBe('0');
 }finally{await context.close()}
},20000);

it.skipIf(!enabled)('accepts owned confirmation links, submits only the bounded reference and prevents concurrent duplicates',async()=>{
 const {context,page,posts,state}=await open();let release!:()=>void;
 state.gate=new Promise<void>(resolve=>{release=resolve});
 try{
  await page.getByText('Add a guest order',{exact:true}).click();const input=page.getByLabel('Order reference or confirmation link');
  await input.fill('https://urbangangtour.co.ke/receipt/'+reference+'?private=ignored');await input.press('Enter');
  await page.getByRole('status').getByText('Adding order…',{exact:true}).waitFor();await input.press('Enter');
  await page.locator('details form').evaluate(form=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))});
  expect(posts).toEqual([{ref:reference}]);expect(await page.getByRole('button',{name:'Adding order…',exact:true}).isDisabled()).toBe(true);
  release();await page.getByText('Order added to your account',{exact:true}).waitFor();expect(await page.locator('#claims').textContent()).toBe('1');
 }finally{release();await context.close()}
},20000);

it.skipIf(!enabled).each([
 'https://urbangangtour.co.ke/tickets/'+reference,
 'https://www.urbangangtour.co.ke/receipt/'+reference,
 'https://urbangangtour.co.ke/pay/success?ref='+reference,
])('accepts an owned order confirmation link through the existing parser (%s)',async value=>{
 const {context,page,posts}=await open();
 try{
  await page.getByText('Add a guest order',{exact:true}).click();const input=page.getByLabel('Order reference or confirmation link');await input.fill(value);await input.press('Enter');
  await page.getByText('Order added to your account',{exact:true}).waitFor();expect(posts).toEqual([{ref:reference}]);expect(await page.locator('#claims').textContent()).toBe('1');
 }finally{await context.close()}
},20000);

it.skipIf(!enabled).each([
 {status:200,json:{ok:false}},{status:400,json:{error:'invalid_reference'}},{status:429,json:{error:'too_many_requests'}},{status:503,json:{error:'accounts_unavailable'}},
])('keeps input and avoids success on $status without explicit ok:true',async reply=>{
 const {context,page,posts}=await open({replies:[reply]});
 try{
  await page.getByText('Add a guest order',{exact:true}).click();const input=page.getByLabel('Order reference or confirmation link');await input.fill(reference);await input.press('Enter');await page.getByRole('alert').waitFor();
  expect(posts).toEqual([{ref:reference}]);expect(await input.inputValue()).toBe(reference);expect(await page.locator('#claims').textContent()).toBe('0');
 }finally{await context.close()}
},20000);

it.skipIf(!enabled)('keeps native controls readable and within a 320px viewport across all six languages',async()=>{
 const {context,page,posts}=await open({width:320});
 const translations=[['en','Add a guest order'],['sw','Ongeza agizo la mgeni'],['fr','Ajouter une commande sans compte'],['zh-Hans','添加游客订单'],['ru','Добавить гостевой заказ'],['es','Añadir un pedido de invitado']];
 try{
  const summary=page.locator('summary');await summary.focus();await summary.press('Enter');
  const input=page.getByLabel('Order reference or confirmation link');await input.fill(reference);
  for(const [locale,label] of translations){
   await page.locator('[data-language-control] select').selectOption(locale);await page.locator('summary').getByText(label,{exact:true}).waitFor();
   expect(await page.locator('details input').inputValue()).toBe(reference);
   expect(await page.locator('details input').getAttribute('maxlength')).toBe('512');
   expect(await page.locator('details input').evaluate(node=>parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(16);
   for(const control of [page.locator('summary'),page.locator('details input'),page.locator('details button')])expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  expect(posts).toEqual([]);
 }finally{await context.close()}
},30000);
