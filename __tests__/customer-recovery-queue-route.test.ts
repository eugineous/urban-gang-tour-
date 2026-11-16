import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({queue:vi.fn(),deliver:vi.fn(),jobs:[] as Array<()=>Promise<void>>}));
vi.mock('@/lib/server/db',()=>({q:vi.fn(),hasDb:()=>true}));
vi.mock('@/lib/server/customer-account',()=>({ensureCustomerAccountSchema:async()=>{}}));
vi.mock('@/lib/server/customer-email-verification',()=>({queueCustomerPasswordReset:state.queue,deliverSecurityEmailJob:state.deliver}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'fixture'}));
vi.mock('next/server',async original=>({...await original<typeof import('next/server')>(),after:(job:()=>Promise<void>)=>state.jobs.push(job)}));
import {POST} from '@/app/api/account/recovery/route';
const request=(email:string)=>new Request('https://urbangangtour.co.ke/api/account/recovery',{method:'POST',headers:{Origin:'https://urbangangtour.co.ke'},body:JSON.stringify({action:'forgot',email})});
beforeEach(()=>{state.queue.mockReset();state.deliver.mockReset();state.jobs=[];vi.stubEnv('RESEND_API_KEY','fixture-key');vi.stubEnv('SESSION_SECRET','fixture-secret')});afterEach(()=>vi.unstubAllEnvs());
it('queues before acknowledging and returns the same public response for registered or unknown emails',async()=>{
 state.queue.mockResolvedValueOnce('fixture-job').mockResolvedValueOnce(null);const known=await POST(request(' Buyer@Example.Test '));expect(known.status).toBe(200);expect(state.queue).toHaveBeenCalledWith('buyer@example.test');expect(state.jobs).toHaveLength(1);
 const unknown=await POST(request('unknown@example.test'));expect(unknown.status).toBe(200);expect(await unknown.json()).toEqual(await known.json());expect(state.jobs).toHaveLength(1);
});
it('does not claim a queued reset when durable enqueue fails or expose its database error',async()=>{
 state.queue.mockRejectedValue(Error('PRIVATE connection detail'));const r=await POST(request('buyer@example.test'));expect(r.status).toBe(503);expect(await r.json()).toEqual({error:'recovery_unavailable'});expect(state.jobs).toEqual([]);
});
