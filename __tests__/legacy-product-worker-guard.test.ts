import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
// @ts-expect-error Independently testable production Worker ES module.
import {createWorker} from '../worker-runtime.mjs';
const app={fetch:vi.fn()};
const worker=createWorker(app);
const context={waitUntil:vi.fn()};
const request=(path='/shop/p1',method='GET',headers:Record<string,string>={})=>new Request('https://urbangangtour.co.ke'+path,{method,headers});
beforeEach(()=>{
 vi.clearAllMocks();
 app.fetch.mockImplementation(async(req:Request)=>new URL(req.url).pathname==='/api/site-data/products'
  ?Response.json({ok:true,products:[]})
  :new Response('<main>Current not-found shell</main>',{headers:{'Content-Type':'text/html'}}));
 vi.stubGlobal('caches',{default:{match:vi.fn(),put:vi.fn()}});
});
afterEach(()=>vi.unstubAllGlobals());
describe('legacy product retirement HTTP boundary',()=>{
 it.each(Array.from({length:14},(_,index)=>'p'+(index+1)))('returns a real no-store/noindex 404 for withdrawn %s while retaining the current shell',async id=>{
  const response=await worker.fetch(request('/shop/'+id),{},context);
  expect(response.status).toBe(404);expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
  expect(response.headers.get('Cache-Control')).toBe('no-store');expect(response.headers.get('Cloudflare-CDN-Cache-Control')).toBe('no-store');
  expect(await response.text()).toContain('Current not-found shell');expect(context.waitUntil).not.toHaveBeenCalled();
 });
 it('keeps a still-active or deliberately restored legacy product available',async()=>{
  app.fetch.mockImplementation(async(req:Request)=>new URL(req.url).pathname==='/api/site-data/products'?Response.json({ok:true,products:[{id:'p1'}]}):new Response('Real active product'));
  expect((await worker.fetch(request(),{},context)).status).toBe(200);
 });
 it.each(['/shop/cb-hoodie','/shop/lookbook','/shop/design-bag','/shop','/shop/p15','/shop/owner-new-item'])('does not add a legacy feed read to %s',async path=>{
  expect((await worker.fetch(request(path),{},context)).status).toBe(200);expect(app.fetch).toHaveBeenCalledTimes(1);
 });
 it.each(['HEAD','GET'])('uses a public GET feed for %s and strips RSC navigation headers',async method=>{
  const response=await worker.fetch(request('/shop/p1/',method,{RSC:'1','Next-Router-State-Tree':'fixture','Next-Router-Prefetch':'1','Next-Url':'/cart'}),{},context);
  expect(response.status).toBe(404);
  const feed=app.fetch.mock.calls[0][0] as Request;expect(feed.method).toBe('GET');expect(feed.headers.get('Accept')).toBe('application/json');
  for(const name of ['RSC','Next-Router-State-Tree','Next-Router-Prefetch','Next-Url'])expect(feed.headers.has(name)).toBe(false);
 });
 it.each([Response.json({ok:false}),Response.json({ok:true,products:null}),Response.json({ok:true,products:[null]}),Response.json({ok:true,products:[{}]}),Response.json({ok:true,products:[{id:12}]}),Response.json({ok:true,products:[{id:''}]}),Response.json({ok:true,products:[[]]}),Response.json({error:'catalog_unavailable'},{status:503}),new Response('not-json')])('fails temporarily closed rather than inventing a 404 when the catalogue is unavailable',async feed=>{
  app.fetch.mockResolvedValueOnce(feed);
  const response=await worker.fetch(request(),{},context);
  expect(response.status).toBe(503);expect(response.headers.get('Retry-After')).toBe('5');expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(app.fetch).toHaveBeenCalledTimes(1);expect(await response.text()).toContain('try again');
 });
 it('handles a feed exception without leaking errors or rendering an unchecked product',async()=>{
  app.fetch.mockRejectedValueOnce(Error('private-driver-detail'));
  const response=await worker.fetch(request(),{},context);expect(response.status).toBe(503);expect(await response.text()).not.toContain('private-driver-detail');
 });
 it('does not turn a downstream failure into a permanent missing-product response',async()=>{
  app.fetch.mockResolvedValueOnce(Response.json({ok:true,products:[]})).mockResolvedValueOnce(new Response('Temporary failure',{status:503}));
  expect((await worker.fetch(request(),{},context)).status).toBe(503);
 });
});
