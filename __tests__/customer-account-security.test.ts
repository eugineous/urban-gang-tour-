import { beforeEach, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({user:null as any, q:vi.fn(), origin:true, limit:true, jobs:[] as Array<()=>Promise<void>>}));
vi.mock('next/server',async original=>({...await original<typeof import('next/server')>(),after:(job:()=>Promise<void>)=>state.jobs.push(job)}));
vi.mock('@/lib/server/db',()=>({q:state.q,hasDb:()=>true}));
vi.mock('@/lib/server/session',()=>({currentUser:()=>state.user,hashPassword:(p:string)=>'hashed:'+p,clearCookie:()=> 'ugt_user=; Max-Age=0'}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>state.limit,clientIp:()=> 'test'}));
vi.mock('@/lib/server/origin',()=>({requireOrigin:()=>state.origin}));
vi.mock('@/lib/server/customer-account',()=>({ensureCustomerAccountSchema:()=>Promise.resolve(),customerOrders:(id:number)=>state.q('owned-orders',[id]),validatedCurrentBuyer:()=>Promise.resolve(state.user)}));
import {GET} from '@/app/api/account/route';
import {POST as recover} from '@/app/api/account/recovery/route';
import {POST as privacy} from '@/app/api/account/privacy/route';
beforeEach(()=>{state.user=null;state.origin=true;state.limit=true;state.jobs=[];state.q.mockReset();});
it('rejects anonymous wallet access without a database query',async()=>{const r=await GET(new Request('https://urbangangtour.co.ke/api/account'));expect(r.status).toBe(401);expect(state.q).not.toHaveBeenCalled();});
it('scopes ticket and privacy reads to signed user ID',async()=>{state.user={id:7};state.q.mockResolvedValueOnce([{id:7}]).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);const r=await GET(new Request('https://urbangangtour.co.ke/api/account'));expect(r.status).toBe(200);const ticketCall=state.q.mock.calls.find(([sql])=>sql.includes('FROM tickets'));expect(ticketCall?.[0]).toContain('o.user_id=$1');expect(ticketCall?.[1]).toEqual([7]);expect(r.headers.get('Cache-Control')).toContain('no-store');});
it('rejects cross-origin recovery before any query',async()=>{state.origin=false;const r=await recover(new Request('https://urbangangtour.co.ke/api/account/recovery',{method:'POST',body:'{}'}));expect(r.status).toBe(403);expect(state.q).not.toHaveBeenCalled();});
it('atomically consumes a reset token and rejects replay',async()=>{state.q.mockResolvedValueOnce([]);const r=await recover(new Request('https://urbangangtour.co.ke/api/account/recovery',{method:'POST',body:JSON.stringify({action:'reset',token:'a'.repeat(43),password:'strong-password'})}));expect(r.status).toBe(400);expect(state.q.mock.calls[0][0]).toContain('DELETE FROM customer_reset_tokens');expect(state.q.mock.calls[0][0]).toContain('expires_at>now()');expect(state.q.mock.calls[0][1][0]).not.toBe('a'.repeat(43));});
it('requires explicit deletion confirmation before any write',async()=>{state.user={id:7};const r=await privacy(new Request('https://urbangangtour.co.ke/api/account/privacy',{method:'POST',body:JSON.stringify({confirmation:'delete'})}));expect(r.status).toBe(400);expect(state.q).not.toHaveBeenCalled();});
it('does not reveal account existence when the reset provider times out',async()=>{
  vi.stubEnv('RESEND_API_KEY','test-provider-key');
  const error=vi.spyOn(console,'error').mockImplementation(()=>{});
  vi.stubGlobal('fetch',vi.fn(async()=>{throw new Error('timeout')}));
  try {
    const request=()=>new Request('https://urbangangtour.co.ke/api/account/recovery',{method:'POST',body:JSON.stringify({action:'forgot',email:'buyer@example.test'})});
    const unknown=await recover(request());expect(state.q).not.toHaveBeenCalled();state.q.mockResolvedValueOnce([]);await state.jobs[0]();
    state.jobs=[];state.q.mockClear();
    const known=await recover(request());state.q.mockResolvedValueOnce([{id:7}]).mockResolvedValueOnce([]);await state.jobs[0]();
    expect(known.status).toBe(200);expect(unknown.status).toBe(200);expect(await known.json()).toEqual(await unknown.json());
    const insert=state.q.mock.calls.find(([sql])=>sql.startsWith('INSERT INTO customer_reset_tokens'));
    expect(insert?.[0]).toContain('ON CONFLICT(user_id)');expect(insert?.[1][0]).toMatch(/^[a-f0-9]{64}$/);
  } finally {error.mockRestore();vi.unstubAllEnvs();vi.unstubAllGlobals()}
});
it('returns a new-login response and revokes all old device sessions after a successful reset',async()=>{
  state.q.mockResolvedValueOnce([{id:7}]);
  const r=await recover(new Request('https://urbangangtour.co.ke/api/account/recovery',{method:'POST',body:JSON.stringify({action:'reset',token:'a'.repeat(43),password:'strong-password'})}));
  expect(r.status).toBe(200);expect(r.headers.get('set-cookie')).toContain('Max-Age=0');
  expect(state.q.mock.calls[0][0]).toContain('session_version=users.session_version+1');
});
