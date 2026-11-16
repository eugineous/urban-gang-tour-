import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({buyer:null as {id:number}|null,q:vi.fn(),send:vi.fn(),confirm:vi.fn(),jobs:[] as Array<()=>Promise<unknown>>}));
vi.mock('@/lib/server/db',()=>({q:state.q,hasDb:()=>true}));
vi.mock('@/lib/server/customer-account',()=>({validatedCurrentBuyer:async()=>state.buyer}));
vi.mock('@/lib/server/customer-identity',()=>({ensureCustomerIdentitySchema:async()=>{}}));
vi.mock('@/lib/server/customer-email-verification',()=>({requestEmailVerification:state.send,confirmEmailVerification:state.confirm,deliverSecurityEmailJob:async()=> 'accepted'}));
vi.mock('next/server',async original=>({...await original<typeof import('next/server')>(),after:(job:()=>Promise<unknown>)=>state.jobs.push(job)}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'fixture'}));
import {hashPassword} from '@/lib/server/session';
import {POST} from '@/app/api/account/verification/route';
const request=(body:object,origin='https://urbangangtour.co.ke')=>new Request('https://urbangangtour.co.ke/api/account/verification',{method:'POST',headers:{Origin:origin},body:JSON.stringify(body)});
beforeEach(()=>{state.buyer=null;state.q.mockReset();state.send.mockReset();state.confirm.mockReset();state.jobs=[];vi.stubEnv('RESEND_API_KEY','fixture-only');vi.stubEnv('SESSION_SECRET','fixture-only')});afterEach(()=>vi.unstubAllEnvs());
it('rejects anonymous or foreign-origin requests without queueing email',async()=>{
 expect((await POST(request({action:'send'},'https://evil.test'))).status).toBe(403);expect((await POST(request({action:'send'}))).status).toBe(401);expect(state.q).not.toHaveBeenCalled();expect(state.send).not.toHaveBeenCalled();
});
it('requires the current password before sending a proof or adding recovery email',async()=>{
 state.buyer={id:4};state.q.mockResolvedValue([{email:null,pass_hash:hashPassword('correct-password'),session_version:2}]);
 expect((await POST(request({action:'send',email:'buyer@example.test',password:'wrong-password'}))).status).toBe(401);expect(state.send).not.toHaveBeenCalled();
});
it('queues a bound proof for a phone-only account without returning a credential',async()=>{
 state.buyer={id:4};state.q.mockResolvedValue([{email:null,pass_hash:hashPassword('correct-password'),session_version:2}]);state.send.mockResolvedValue('account-fixture');
 const r=await POST(request({action:'send',email:'Buyer@Example.Test',password:'correct-password'}));expect(r.status).toBe(202);expect(await r.json()).toEqual({ok:true,state:'queued'});expect(state.send).toHaveBeenCalledWith(4,2,'buyer@example.test');expect(state.jobs).toHaveLength(1);
});
it('does not turn a verification request into replacing an existing email',async()=>{
 state.buyer={id:4};state.q.mockResolvedValue([{email:'old@example.test',pass_hash:hashPassword('correct-password'),session_version:2}]);
 expect((await POST(request({action:'send',email:'other@example.test',password:'correct-password'}))).status).toBe(400);expect(state.send).not.toHaveBeenCalled();
});
it('verifies only for the signed account and reports invalid codes honestly',async()=>{
 state.buyer={id:4};state.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
 const first=await POST(request({action:'confirm',code:'12345678'}));expect(first.status).toBe(400);expect(await first.json()).toEqual({error:'invalid_or_expired_code'});
 const second=await POST(request({action:'confirm',code:'12345678'}));expect(second.status).toBe(200);expect(state.confirm).toHaveBeenLastCalledWith(4,'12345678');
});
