import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';

const state=vi.hoisted(()=>({app:vi.fn(),guard:vi.fn(),match:vi.fn(),put:vi.fn()}));
vi.mock('../shared-rate-limit.mjs',()=>({sharedRateGuard:state.guard}));
// @ts-expect-error The independent Worker wrapper is an unbundled ES module.
import {createWorker} from '../worker-runtime.mjs';
const worker=createWorker({fetch:state.app});
const env={},context={waitUntil:vi.fn()};
beforeEach(()=>{
 vi.clearAllMocks();state.guard.mockResolvedValue(null);
 state.app.mockImplementation(async()=>new Response('Application response',{headers:{'Content-Type':'text/plain'}}));
 state.match.mockResolvedValue(undefined);state.put.mockResolvedValue(undefined);
 vi.stubGlobal('caches',{default:{match:state.match,put:state.put}});
});
afterEach(()=>vi.unstubAllGlobals());

describe('production browser HTTP upgrade',()=>{
 it.each(['GET','HEAD'])('upgrades %s on both exact production hosts before app, limiter or cache work',async method=>{
  state.guard.mockRejectedValue(new Error('This must not be reached'));
  for(const host of ['urbangangtour.co.ke','www.urbangangtour.co.ke']){
   const response=await worker.fetch(new Request('http://'+host+':8080/events?date=2026-12-01&return=%2Faccount',{method}),env,context);
   expect(response.status).toBe(308);
   expect(response.headers.get('Location')).toBe('https://'+host+'/events?date=2026-12-01&return=%2Faccount');
   expect(response.headers.get('Cache-Control')).toBe('no-store');
   expect(response.headers.get('Cloudflare-CDN-Cache-Control')).toBe('no-store');
 expect(response.headers.get('X-UGT-Release')).toBe('fast-entry-recovery-20261030-v1');
   expect(await response.text()).toBe('');
  }
  expect(state.app).not.toHaveBeenCalled();expect(state.guard).not.toHaveBeenCalled();
  expect(state.match).not.toHaveBeenCalled();expect(state.put).not.toHaveBeenCalled();expect(context.waitUntil).not.toHaveBeenCalled();
 });
 it('does not build redirect destinations from Host or forwarding headers',async()=>{
  const response=await worker.fetch(new Request('http://urbangangtour.co.ke/about?x=%2F%2Fevil.example',{headers:{Host:'evil.example','X-Forwarded-Host':'evil.example','X-Forwarded-Proto':'https',Forwarded:'host=evil.example;proto=https'}}),env,context);
  expect(response.headers.get('Location')).toBe('https://urbangangtour.co.ke/about?x=%2F%2Fevil.example');
 });
 it.each(['http://localhost:3011/events','http://127.0.0.1/events','http://worker.internal/events','http://urban-gang-tour.euginemicah.workers.dev/events','http://urbangangtour.co.ke.evil.example/events','http://evil-urbangangtour.co.ke/events'])('does not redirect non-production URL %s even with forged production headers',async url=>{
  const request=new Request(url,{headers:{Host:'urbangangtour.co.ke','X-Forwarded-Host':'www.urbangangtour.co.ke','X-Forwarded-Proto':'http'}});
  const response=await worker.fetch(request,env,context);
  expect(response.status).toBe(200);expect(response.headers.has('Location')).toBe(false);
  expect(state.guard).toHaveBeenCalledWith(request,env);expect(state.app).toHaveBeenCalledWith(request,env,context);
 });
 it.each(['https://urbangangtour.co.ke/events?view=calendar','https://www.urbangangtour.co.ke/account?return=%2Fevents','https://www.urbangangtour.co.ke/admin?tab=Events'])('preserves HTTPS URL, host, auth cookies and query for %s',async url=>{
  const request=new Request(url,{headers:{cookie:'ugt_admin=fixture','X-Forwarded-Proto':'http'}});
  const response=await worker.fetch(request,env,context);
  expect(response.status).toBe(200);expect(response.headers.has('Location')).toBe(false);
  expect(state.app).toHaveBeenCalledWith(request,env,context);
  expect(request.url).toBe(url);expect(request.headers.get('cookie')).toBe('ugt_admin=fixture');
 });
 it.each(['/api','/api/','/api/site-data/events','/api/auth/google?state=private-state&code=private-code','/api/admin/gmail/callback?state=private-state&code=private-code'])('leaves HTTP GET/HEAD API semantics unchanged at %s',async path=>{
  for(const method of ['GET','HEAD']){
   const request=new Request('http://www.urbangangtour.co.ke'+path,{method});
   const response=await worker.fetch(request,env,context);
   expect(response.status).toBe(200);expect(response.headers.has('Location')).toBe(false);
   expect(state.guard).toHaveBeenCalledWith(request,env);expect(state.app).toHaveBeenCalledWith(request,env,context);
  }
 });
 it.each(['POST','PUT','PATCH','DELETE','OPTIONS'])('does not redirect or replay %s bodies or change existing mutation guards',async method=>{
  const request=new Request('http://www.urbangangtour.co.ke/api/auth?return=%2Fadmin',{method,body:method==='OPTIONS'?undefined:'fixture-body',headers:{Origin:'https://www.urbangangtour.co.ke'}});
  const response=await worker.fetch(request,env,context);
  expect(response.status).toBe(200);expect(response.headers.has('Location')).toBe(false);
  expect(state.guard).toHaveBeenCalledWith(request,env);expect(state.app).toHaveBeenCalledWith(request,env,context);
  if(method!=='OPTIONS')expect(await request.text()).toBe('fixture-body');
 });
 it('upgrades same-host login navigation while preserving its query',async()=>{
  const response=await worker.fetch(new Request('http://www.urbangangtour.co.ke/admin?tab=Bookings&return=%2Fadmin%3Ftab%3DEvents'),env,context);
  expect(response.status).toBe(308);
  expect(response.headers.get('Location')).toBe('https://www.urbangangtour.co.ke/admin?tab=Bookings&return=%2Fadmin%3Ftab%3DEvents');
  expect(state.guard).not.toHaveBeenCalled();expect(state.app).not.toHaveBeenCalled();
 });
 it('retains existing limiter responses for API and mutation requests',async()=>{
  state.guard.mockResolvedValue(new Response('Limited',{status:429}));
  const response=await worker.fetch(new Request('http://urbangangtour.co.ke/api/orders',{method:'POST',body:'{}'}),env,context);
  expect(response.status).toBe(429);expect(await response.text()).toBe('Limited');expect(state.app).not.toHaveBeenCalled();
 });
});
