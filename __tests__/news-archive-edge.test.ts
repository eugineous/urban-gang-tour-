import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
// @ts-expect-error Independently testable production Worker ES module.
import {createWorker} from '../worker-runtime.mjs';
const app={fetch:vi.fn()},context={waitUntil:vi.fn()},worker=createWorker(app);
const posts=Array.from({length:29},(_,i)=>({id:`owned-${i}`,headline:`Owned headline ${i}`,section:i%2?'Schools':'Updates',date:'2026-11-16',dek:'Approved introduction'}));
const request=(query:string,method='GET',headers:Record<string,string>={})=>new Request('https://urbangangtour.co.ke/blog'+query,{method,headers});
beforeEach(()=>{
 vi.clearAllMocks();vi.stubGlobal('caches',{default:{match:vi.fn(),put:vi.fn()}});
 app.fetch.mockImplementation(async(req:Request)=>new URL(req.url).pathname==='/api/site-data/posts'?Response.json({ok:true,posts}):new Response('Current archive shell',{headers:{'Content-Type':'text/html'}}));
});
afterEach(()=>vi.unstubAllGlobals());
describe('news archive HTTP status before Next streams',()=>{
 it.each(['GET','HEAD'])('returns real noindex/no-store 404 for a current out-of-range %s page',async method=>{
  const response=await worker.fetch(request('?page=4',method,{RSC:'1','Next-Router-State-Tree':'fixture'}),{},context);
  expect(response.status).toBe(404);expect(response.headers.get('X-Robots-Tag')).toBe('noindex');expect(response.headers.get('Cache-Control')).toBe('no-store');expect(app.fetch).toHaveBeenCalledTimes(1);
  const feed=app.fetch.mock.calls[0][0] as Request;expect(feed.method).toBe('GET');expect(feed.headers.has('RSC')).toBe(false);expect(feed.headers.has('Next-Router-State-Tree')).toBe(false);
  expect(await response.text()).toContain(method==='HEAD'?'':'archive page');
 });
 it.each(['?page=2','?page=3','?category=schools&page=2'])('allows available archive windows: %s',async query=>{expect((await worker.fetch(request(query),{},context)).status).toBe(200);expect(app.fetch).toHaveBeenCalledTimes(2)});
 it.each(['?category=schools&page=3','?q=absent&page=2'])('uses the same filtered page counts: %s',async query=>{expect((await worker.fetch(request(query),{},context)).status).toBe(404)});
 it.each(['','?page=-1','?page=2&page=3'])('does not add a redundant feed read to normalized first-page %s',async query=>{expect((await worker.fetch(request(query),{},context)).status).toBe(200);expect(app.fetch).toHaveBeenCalledTimes(1)});
 it('deduplicates public records before counting windows',async()=>{app.fetch.mockResolvedValueOnce(Response.json({ok:true,posts:[...posts,...posts]}));expect((await worker.fetch(request('?page=4'),{},context)).status).toBe(404)});
 it.each([new Response('outage',{status:503}),Response.json({ok:false}),Response.json({ok:true,posts:null}),Response.json({ok:true,posts:[null]}),Response.json({ok:true,posts:[{id:'missing-headline'}]}),new Response('not json')])('returns temporary unavailability rather than a false permanent 404',async feed=>{
  app.fetch.mockResolvedValueOnce(feed);const response=await worker.fetch(request('?page=999'),{},context);expect(response.status).toBe(503);expect(response.headers.get('Retry-After')).toBe('5');expect(response.headers.get('Cache-Control')).toBe('no-store');expect(app.fetch).toHaveBeenCalledTimes(1);
 });
});
