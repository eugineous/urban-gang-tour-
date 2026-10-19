import {beforeEach,expect,it,vi} from 'vitest';
vi.mock('../shared-rate-limit.mjs',()=>({sharedRateGuard:async()=>null}));
import {createWorker} from '../worker-runtime.mjs';
const app={fetch:vi.fn()},context={waitUntil:vi.fn()},request=(path:string)=>new Request('https://urbangangtour.co.ke'+path,{headers:{'cf-connecting-ip':'192.0.2.5',cookie:'ugt_did=fixture_device_id',RSC:'1'}});
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('caches',{default:{match:vi.fn(),put:vi.fn()}})});
it('returns a genuine private 404 without starting the article renderer',async()=>{
 app.fetch.mockResolvedValue(Response.json({ok:true,posts:[]}));
 const response=await createWorker(app).fetch(request('/blog/unpublished-fixture'),{},context);expect(response.status).toBe(404);expect(response.headers.get('Cache-Control')).toBe('no-store');expect(app.fetch).toHaveBeenCalledTimes(1);const read=app.fetch.mock.calls[0][0] as Request;expect(new URL(read.url).pathname).toBe('/api/site-data/posts');expect(read.headers.get('RSC')).toBeNull();expect(read.headers.get('cf-connecting-ip')).toBe('192.0.2.5');expect(read.headers.get('cookie')).toContain('ugt_did=');
});
it('lets only a public eligible article reach the normal renderer',async()=>{
 app.fetch.mockResolvedValueOnce(Response.json({ok:true,posts:[{id:'published-fixture'}]})).mockResolvedValueOnce(new Response('Published article',{headers:{'Content-Type':'text/html'}}));
 const response=await createWorker(app).fetch(request('/blog/published-fixture'),{},context);expect(response.status).toBe(200);expect(await response.text()).toBe('Published article');expect(app.fetch).toHaveBeenCalledTimes(2);
});
it('fails closed on an unavailable feed rather than exposing a stale article',async()=>{
 app.fetch.mockResolvedValueOnce(new Response('Unavailable',{status:503}));const response=await createWorker(app).fetch(request('/blog/fixture'),{},context);expect(response.status).toBe(503);expect(response.headers.get('Retry-After')).toBe('5');expect(app.fetch).toHaveBeenCalledTimes(1);
});
