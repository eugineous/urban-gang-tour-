// Real signature verification and in-memory limiter; database/notifications
// stay isolated. This is a policy/boundary test, not a load-capacity claim.
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
const state=vi.hoisted(()=>({active:new Set<string>(),q:vi.fn(async()=>[]),db:true}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>state.db,q:state.q}));
vi.mock('@/lib/server/admin-accounts',()=>({findAdminAccount:vi.fn(async(email:string)=>({email,role:'crew_admin',perms:['gate_scanner']}))}));
vi.mock('@/lib/server/admin-sessions',()=>({adminSessionActive:vi.fn(async(sid:string)=>state.active.has(sid)),legacyAdminSessionAllowed:vi.fn(async()=>true),recoveryStamp:()=>null}));
vi.mock('@/lib/server/tickets',()=>({codeAuthentic:()=>false,getTicket:vi.fn(),getEventName:vi.fn(),getEventMeta:vi.fn(),ensureTicketSchema:vi.fn()}));
vi.mock('@/lib/server/notify',()=>({notifyTicketScan:vi.fn()}));
let post:typeof import('@/app/api/tickets/verify/route').POST;
let sessions:typeof import('@/lib/server/session');
let limiter:typeof import('@/lib/server/ratelimit');
const ip='192.0.2.55';
beforeEach(async()=>{
 vi.resetModules();state.active.clear();state.q.mockClear();state.db=true;
 vi.stubEnv('SESSION_SECRET','isolated-gate-budget-key');
 ({POST:post}=await import('@/app/api/tickets/verify/route'));
 sessions=await import('@/lib/server/session');limiter=await import('@/lib/server/ratelimit');
});
afterEach(()=>vi.unstubAllEnvs());
function token(index=1,extra:object={}){const sid=index.toString(16).padStart(64,'0');state.active.add(sid);return sessions.signToken({role:'admin',scope:'crew_admin',perms:['gate_scanner'],sid,...extra});}
function request(cookie:string,headers:Record<string,string>={}){return new Request('https://urbangangtour.co.ke/api/tickets/verify',{method:'POST',headers:{origin:'https://urbangangtour.co.ke','content-type':'application/json','cf-connecting-ip':ip,cookie:'ugt_admin='+cookie,...headers},body:JSON.stringify({code:'MALFORMED-LOCAL-FIXTURE'})});}
describe('authenticated scanner budgets',()=>{
 it('demonstrates why the previous shared-IP allowance blocked a second scanner',()=>{
  for(let n=0;n<120;n++)expect(limiter.rateLimit('prior-gate:'+ip,120,60_000)).toBe(true);
  expect(limiter.rateLimit('prior-gate:'+ip,120,60_000)).toBe(false);
 });
 it('allows two independent signed scanner sessions behind one IP their own allowance',async()=>{
  const first=token(1),second=token(2);
  for(let n=0;n<120;n++){expect((await post(request(first))).status).toBe(200);expect((await post(request(second))).status).toBe(200);}
  expect((await post(request(first))).status).toBe(429);
  expect((await post(request(second))).status).toBe(429);
  expect(state.q).toHaveBeenCalledTimes(240);
 });
 it('does not grant a fresh scanner budget for rotating device, forwarded-IP or actor headers',async()=>{
  const signed=token();
  for(let n=0;n<120;n++)expect((await post(request(signed,{'cf-connecting-ip':'198.51.100.'+(n%200+1),cookie:'ugt_admin='+signed+'; ugt_did=device_'+n,'x-forwarded-for':'203.0.113.'+n,'x-admin-actor':'forged-'+n}))).status).toBe(200);
  expect((await post(request(signed,{'cf-connecting-ip':'203.0.113.200',cookie:'ugt_admin='+signed+'; ugt_did=fresh_device','x-admin-actor':'new-actor'}))).status).toBe(429);
 });
 it('keeps the separate venue network backstop across authenticated sessions',async()=>{
  for(let n=0;n<4_799;n++)expect(limiter.rateLimit('gate-network:'+ip,4_800,60_000)).toBe(true);
  expect((await post(request(token(1)))).status).toBe(200);
  expect((await post(request(token(2)))).status).toBe(429);
  expect(state.q).toHaveBeenCalledTimes(1);
 });
 it('rejects forged, revoked and unpermitted sessions before consuming a budget',async()=>{
  const take=vi.spyOn(limiter,'rateLimit');
  expect((await post(request('forged-cookie'))).status).toBe(401);
  const revoked=token();state.active.clear();expect((await post(request(revoked))).status).toBe(401);
  expect((await post(request(token(2,{perms:[]})))).status).toBe(403);
  expect(take).not.toHaveBeenCalled();expect(state.q).not.toHaveBeenCalled();
 });
 it('uses hashed signed identity, never raw session, contact, ticket or device identifiers as keys',async()=>{
  const take=vi.spyOn(limiter,'rateLimit'),signed=token();
  expect((await post(request(signed))).status).toBe(200);
  const sid='1'.padStart(64,'0'),digest=createHash('sha256').update('ugt-gate-session:'+sid).digest('hex');
  expect(take.mock.calls[0]).toEqual(['gate-session:'+digest,120,60_000]);
  expect(take.mock.calls[1]).toEqual(['gate-network:'+ip,4_800,60_000]);
  expect(take.mock.calls[0][0]).not.toContain(sid);
  expect(take.mock.calls[0][0]).not.toContain('MALFORMED');
 });
 it('keeps legacy authenticated owner scans bounded without a caller-controlled fallback',async()=>{
  const signed=sessions.signToken({role:'admin',authSource:'access_code'});
  for(let n=0;n<120;n++)expect((await post(request(signed))).status).toBe(200);
  expect((await post(request(signed,{'x-admin-actor':'another-owner'}))).status).toBe(429);
 });
});
