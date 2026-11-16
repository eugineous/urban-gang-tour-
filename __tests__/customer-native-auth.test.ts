import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({q:vi.fn()}));
vi.mock('@/lib/server/db',()=>({q:state.q,hasDb:()=>true}));
vi.mock('@/lib/server/customer-account',()=>({ensureBuyerSessionSchema:async()=>{},validatedCurrentBuyer:async()=>null}));
vi.mock('@/lib/server/customer-identity',()=>({ensureCustomerIdentitySchema:async()=>{}}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'fixture'}));
vi.mock('next/server',async original=>({...await original<typeof import('next/server')>(),after:()=>{}}));
import {hashPassword} from '@/lib/server/session';
import {POST} from '@/app/api/auth/route';
const request=(body:object)=>new Request('https://urbangangtour.co.ke/api/auth',{method:'POST',headers:{Origin:'https://urbangangtour.co.ke'},body:JSON.stringify(body)});
const signup={action:'signup',email:'buyer@example.test',password:'safe-password',adultConfirmed:true,termsAccepted:true};
beforeEach(()=>{state.q.mockReset();vi.stubEnv('SESSION_SECRET','fixture-session-secret')});afterEach(()=>vi.unstubAllEnvs());
it('rejects new six-character passwords before touching customer records',async()=>{
 const r=await POST(request({...signup,password:'abcdef'}));expect(r.status).toBe(400);expect(await r.json()).toEqual({error:'password_min_8'});expect(state.q).not.toHaveBeenCalled();
});
it('persists a canonical phone while retaining the same native signup',async()=>{
 state.q.mockResolvedValueOnce([]).mockResolvedValueOnce([{id:1,email:signup.email,phone:'+254712345678',name:'Buyer',session_version:0}]);
 const r=await POST(request({...signup,phone:'(0712) 345-678'}));expect(r.status).toBe(200);
 const insert=state.q.mock.calls.find(([sql])=>sql.startsWith('INSERT INTO users'));expect(insert?.[1][1]).toBe('+254712345678');
});
it('treats a database concurrent-duplicate rejection as a conflict, not an outage',async()=>{
 state.q.mockResolvedValueOnce([]).mockRejectedValueOnce(Object.assign(Error('private database detail'),{code:'23505'}));
 const r=await POST(request(signup));expect(r.status).toBe(409);expect(await r.json()).toEqual({error:'account_exists'});
});
it('keeps legacy six-character password sign-in working',async()=>{
 state.q.mockResolvedValueOnce([{id:2,email:signup.email,name:'Buyer',phone:null,pass_hash:hashPassword('abcdef'),session_version:0}]);
 const r=await POST(request({action:'login',email:signup.email,password:'abcdef'}));expect(r.status).toBe(200);expect(r.headers.get('set-cookie')).toContain('ugt_user=');
});
