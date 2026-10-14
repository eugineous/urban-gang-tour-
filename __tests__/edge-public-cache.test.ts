import {beforeEach,afterEach,it,expect,vi} from 'vitest';
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
  const first=await worker.fetch(request('/about'),{},context());await Promise.all(jobs);
  expect(first.headers.get('cache-control')).toContain('s-maxage=60');
  expect(first.headers.get('x-ugt-release')).toBe('audit-release-20261014-v1');
  const second=await worker.fetch(request('/about'),{},context());expect(await second.text()).toContain('Public page');
  expect(state.fetch).toHaveBeenCalledTimes(1);
  expect([...entries.keys()][0]).toContain('__ugt_release=audit-release-20261014-v1');
});
it.each(['/shop','/checkout','/cart','/account','/admin'])('keeps %s private and uncached',async path=>{
  const response=await worker.fetch(request(path),{},context());expect(response.headers.get('cache-control')).toBe('no-store');expect(jobs).toHaveLength(0);
});
it('bypasses authenticated visitors even when anonymous HTML is cached',async()=>{
  await worker.fetch(request('/about'),{},context());await Promise.all(jobs);
  await worker.fetch(request('/about',{cookie:'ugt_user=signed-session'}),{},context());expect(state.fetch).toHaveBeenCalledTimes(2);
});
it('never shares a response that sets a session cookie',async()=>{
  state.fetch.mockResolvedValue(new Response('private',{headers:{'content-type':'text/html','set-cookie':'ugt_user=test'}}));
  const response=await worker.fetch(request('/about'),{},context());expect(response.headers.get('cache-control')).toBe('no-store');expect(jobs).toHaveLength(0);
});
it('continues serving pages if Cloudflare cache reads fail',async()=>{
  vi.spyOn(console,'error').mockImplementation(()=>{});
  caches.default.match.mockRejectedValueOnce(new Error('unavailable'));
  const response=await worker.fetch(request('/about'),{},context());expect(response.status).toBe(200);
  vi.restoreAllMocks();
});
