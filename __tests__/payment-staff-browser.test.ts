import {afterAll,beforeAll,expect,it} from 'vitest';
import {build} from 'esbuild';
import {chromium,type Browser} from 'playwright';
import {existsSync,readFileSync} from 'node:fs';
let browser:Browser,script:string;
const enabled=existsSync('/usr/bin/chromium');
beforeAll(async()=>{
 if(!enabled)return;
 const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Panel from './app/admin/EmailDeliveryPanel';createRoot(document.getElementById('app')).render(<Panel/>);`},bundle:true,write:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
 script=bundle.outputFiles[0].text;
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
},30000);
afterAll(async()=>{await browser?.close();});
it.skipIf(!enabled)('keeps concurrent staff views truthful, responsive and explicit about an unsuccessful email retry',async()=>{
 const context=await browser.newContext({viewport:{width:320,height:780},serviceWorkers:'block'});
 let state='queued',reads=0,retries=0;const unexpected:string[]=[];
 await context.route('**/*',route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin!=='http://127.0.0.1'){unexpected.push(req.url());return route.abort();}
  if(url.pathname==='/api/admin/email-delivery'){
   if(req.method()==='POST'){retries++;state='blocked';return route.fulfill({status:409,json:{outcome:'manual_review_required'}});}
   reads++;return route.fulfill({json:{configured:true,module_errors:{},contact_jobs:[],jobs:[{id:'receipt-fixture',order_id:'ORD-STAFF123',status:state,attempts:1,updated_at:'2026-11-02T00:00:00Z'}],payment_jobs:[{order_id:'ORD-STAFF123',gateway:'paystack',effect:'tickets',status:state==='blocked'?'blocked':'queued',attempts:1,updated_at:'2026-11-02T00:00:00Z'}]}});
  }
  if(url.pathname==='/fixture.js')return route.fulfill({contentType:'application/javascript',body:script});
  if(url.pathname==='/global.css')return route.fulfill({contentType:'text/css',body:readFileSync('app/globals.css','utf8')});
  if(req.isNavigationRequest())return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/global.css"><style>*{box-sizing:border-box}body{margin:0;padding:12px;font-family:Arial}button{max-width:100%;white-space:normal}</style></head><body><div id="app"></div><script src="/fixture.js"></script></body></html>'});
  return route.fulfill({status:204});
 });
 try{
  const first=await context.newPage(),second=await context.newPage();
  first.setDefaultTimeout(10000);second.setDefaultTimeout(10000);
  await first.goto('http://127.0.0.1/admin/email-delivery');await second.goto('http://127.0.0.1/admin/email-delivery');
  await first.getByRole('button',{name:'Retry saved email'}).waitFor();await second.getByRole('button',{name:'Retry saved email'}).waitFor();
  expect(retries).toBe(0);expect(reads).toBeGreaterThanOrEqual(2);
  await first.getByRole('button',{name:'Retry saved email'}).click();
  await first.getByText('This message needs operator review. Do not keep retrying it.',{exact:true}).waitFor();
  await first.getByText(/Inspect this order and provider record/).waitFor();
  await second.getByRole('button',{name:'Refresh status',exact:true}).click();await second.getByText(/Inspect this order and provider record/).waitFor();
  expect(retries).toBe(1);
  expect(await first.getByText('This message needs operator review. Do not keep retrying it.',{exact:true}).isVisible()).toBe(true);
  expect(await first.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await first.getByRole('button',{name:'Refresh status',exact:true}).evaluate(node=>node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  expect(unexpected).toEqual([]);
 }finally{await context.close();}
},30000);
