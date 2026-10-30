import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {WELCOME_LANGUAGES} from '@/lib/welcome-languages';
const state=vi.hoisted(()=>({fetch:vi.fn()}));
// @ts-expect-error The Worker runtime is an unbundled ES module.
import {createWorker} from '../worker-runtime.mjs';
const worker=createWorker({fetch:state.fetch});
let entries:Map<string,Response>;
let jobs:Promise<unknown>[];
const request=(path:string,headers:Record<string,string>={})=>new Request('https://urbangangtour.co.ke'+path,{headers});
const context=()=>({waitUntil:(task:Promise<unknown>)=>jobs.push(task)});
beforeEach(()=>{
  jobs=[];entries=new Map();vi.clearAllMocks();
  state.fetch.mockImplementation(async()=>new Response('<h1>Public page</h1>',{headers:{'content-type':'text/html','cache-control':'no-store'}}));
  vi.stubGlobal('caches',{default:{match:vi.fn(async(key:Request)=>entries.get(key.url)?.clone()),put:vi.fn(async(key:Request,value:Response)=>entries.set(key.url,value.clone()))}});
});
afterEach(()=>vi.unstubAllGlobals());
it('reuses anonymous public HTML under the deployment-specific key',async()=>{
  const first=await worker.fetch(request('/experience'),{},context());await Promise.all(jobs);
  expect(first.headers.get('cache-control')).toContain('s-maxage=60');
  expect(first.headers.get('x-ugt-release')).toBe('fast-entry-recovery-20261030-v1');
  const second=await worker.fetch(request('/experience'),{},context());expect(await second.text()).toContain('Public page');
  expect(state.fetch).toHaveBeenCalledTimes(1);
  expect([...entries.keys()][0]).toContain('__ugt_release=fast-entry-recovery-20261030-v1');
});
it.each(['/international','/accessibility','/welcome/en','/welcome/sw','/welcome/fr','/welcome/zh-Hans','/welcome/ru','/welcome/es'])('caches the non-personalized %s without locale cookies',async path=>{
 await worker.fetch(request(path),{},context());await Promise.all(jobs);
 await worker.fetch(request(path),{},context());expect(state.fetch).toHaveBeenCalledTimes(1);
 await worker.fetch(request(path,{cookie:'ugt_user=test'}),{},context());expect(state.fetch).toHaveBeenCalledTimes(2);
});
it('passes every supported welcome page to the app and redirects the language index',async()=>{
 for(const language of Object.keys(WELCOME_LANGUAGES))expect((await worker.fetch(request('/welcome/'+language),{},context())).status).toBe(200);
 for(const path of ['/welcome','/welcome/']){
  const response=await worker.fetch(request(path),{},context());expect(response.status).toBe(308);expect(response.headers.get('Location')).toBe('https://urbangangtour.co.ke/welcome/en');
 }
});
it.each(['/welcome/de','/welcome/constructor','/welcome/__proto__','/welcome/fr/nested','/welcome/%3Cscript%3E'])('returns a real, unreflected noindex 404 for %s before starting Next',async path=>{
 const response=await worker.fetch(request(path),{},context());
 expect(response.status).toBe(404);expect(response.headers.get('X-Robots-Tag')).toBe('noindex');expect(response.headers.get('Cache-Control')).toBe('no-store');
 expect(response.headers.get('X-UGT-Release')).toBeTruthy();expect(state.fetch).not.toHaveBeenCalled();expect(jobs).toHaveLength(0);
 const body=await response.text();for(const language of Object.keys(WELCOME_LANGUAGES))expect(body).toContain('href="/welcome/'+language+'"');
 expect(body).not.toContain(path);expect(body).toContain('Contact the team');
});
it.each(['/shop','/checkout','/cart','/account','/admin'])('keeps %s private and uncached',async path=>{
  const response=await worker.fetch(request(path),{},context());expect(response.headers.get('cache-control')).toBe('no-store');expect(jobs).toHaveLength(0);
});
it('bypasses authenticated visitors even when anonymous HTML is cached',async()=>{
  await worker.fetch(request('/experience'),{},context());await Promise.all(jobs);
  await worker.fetch(request('/experience',{cookie:'ugt_user=signed-session'}),{},context());expect(state.fetch).toHaveBeenCalledTimes(2);
});
it('never shares a response that sets a session cookie',async()=>{
  state.fetch.mockResolvedValue(new Response('private',{headers:{'content-type':'text/html','set-cookie':'ugt_user=test'}}));
  const response=await worker.fetch(request('/experience'),{},context());expect(response.headers.get('cache-control')).toBe('no-store');expect(jobs).toHaveLength(0);
});
it('continues serving pages if Cloudflare cache reads fail',async()=>{
  vi.spyOn(console,'error').mockImplementation(()=>{});
  caches.default.match.mockRejectedValueOnce(new Error('unavailable'));
  const response=await worker.fetch(request('/experience'),{},context());expect(response.status).toBe(200);
  vi.restoreAllMocks();
});
it.each(['/api/admin/accounts','/api/account','/api/auth','/api/organizer/me','/api/orders/status?id=ORD-TEST','/api/bookings/status?token=test','/api/tickets/verify','/api/receipts/ORD-TEST/pdf','/api/internal/cron/email-delivery'])('prohibits storing sensitive JSON at %s even if a route says public',async path=>{
  state.fetch.mockResolvedValue(new Response('{"private":"fixture"}',{headers:{'content-type':'application/json','cache-control':'public, max-age=3600'}}));
  const response=await worker.fetch(request(path),{},context());
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('cloudflare-cdn-cache-control')).toBe('no-store');
  expect(jobs).toHaveLength(0);
});
it('does not retain authenticated JSON, mutations or session-setting responses on public paths',async()=>{
  state.fetch.mockImplementation(async()=>new Response('{}',{headers:{'content-type':'application/json','cache-control':'public, max-age=3600'}}));
  for(const req of [request('/api/reviews',{cookie:'ugt_user=test'}),request('/api/reviews',{Authorization:'Bearer test'}),new Request('https://urbangangtour.co.ke/api/reviews',{method:'POST',body:'{}'})]){
    expect((await worker.fetch(req,{},context())).headers.get('cache-control')).toBe('no-store');
  }
  state.fetch.mockResolvedValue(new Response('{}',{headers:{'content-type':'application/json','set-cookie':'ugt_user=test'}}));
  expect((await worker.fetch(request('/api/reviews'),{},context())).headers.get('cache-control')).toBe('no-store');
});
