import {beforeEach,describe,expect,it,vi} from 'vitest';

const boundary=vi.hoisted(()=>({
 owner:'checkout:'+'a'.repeat(64) as string|null,
 allowed:true,
 mpesa:vi.fn(),
 paystack:vi.fn(),
}));
vi.mock('@/lib/server/checkout-session',()=>({checkoutPrincipal:()=>boundary.owner}));
vi.mock('@/lib/server/mpesa-attempts',()=>({findOwnedMpesaAttempt:boundary.mpesa}));
vi.mock('@/lib/server/paystack-attempts',()=>({findOwnedPaystackAttempt:boundary.paystack}));
vi.mock('@/lib/server/ratelimit',()=>({clientIp:()=> '192.0.2.41',rateLimit:()=>boundary.allowed,PUBLIC_READ_NETWORK_LIMIT:3000}));
import {POST} from '@/app/api/checkout/recovery/route';

const key='0123456789abcdef0123456789abcdef';
const authorizationUrl='https://checkout.paystack.com/recover_fixture';
const saved={orderId:'ORD-CARD-RECOVERY',total:3500,state:'ready',paymentStatus:'pending',authorizationUrl};
const request=(body:unknown,origin='https://urbangangtour.co.ke')=>new Request('https://urbangangtour.co.ke/api/checkout/recovery',{
 method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(body),
});
beforeEach(()=>{
 boundary.owner='checkout:'+'a'.repeat(64);boundary.allowed=true;
 boundary.mpesa.mockReset().mockResolvedValue({orderId:'ORD-MPESA-RECOVERY',total:900,state:'unknown',paymentStatus:'pending'});
 boundary.paystack.mockReset().mockResolvedValue(saved);
});

describe('owned checkout recovery provider contract',()=>{
 it('returns the ready Paystack checkout URL with only the public recovery fields',async()=>{
  boundary.paystack.mockResolvedValue({...saved,token:key,tokenHash:'private-hash',email:'private@example.invalid',context:{private:true}});
  const response=await POST(request({key,provider:'paystack'}));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ok:true,id:'ORD-CARD-RECOVERY',total:3500,attemptState:'ready',paymentStatus:'pending',authorizationUrl});
  expect(response.headers.get('cache-control')).toContain('no-store');
  expect(boundary.paystack).toHaveBeenCalledWith('checkout:'+'a'.repeat(64),key);
  expect(boundary.mpesa).not.toHaveBeenCalled();
 });

 it.each([
  ['unknown','pending'],['initiating','pending'],['prepared','pending'],['closed','paid'],['ready','paid'],['ready','failed'],['ready','processing'],
 ])('withholds a saved URL for attempt %s and payment %s',async(state,paymentStatus)=>{
  boundary.paystack.mockResolvedValue({...saved,state,paymentStatus});
  const response=await POST(request({key,provider:'paystack'}));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ok:true,id:'ORD-CARD-RECOVERY',total:3500,attemptState:state,paymentStatus});
 });

 it.each(['pending','unknown','reconciling'])('recovers a ready owned URL for canonical payment status %s',async paymentStatus=>{
  boundary.paystack.mockResolvedValue({...saved,paymentStatus});
  const result=await POST(request({key,provider:'paystack'}));
  expect(await result.json()).toEqual({ok:true,id:'ORD-CARD-RECOVERY',total:3500,attemptState:'ready',paymentStatus,authorizationUrl});
 });

 it.each([undefined,'mpesa'])('preserves the M-Pesa recovery response with provider %s',async provider=>{
  const response=await POST(request({key,...(provider?{provider}:{})}));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ok:true,id:'ORD-MPESA-RECOVERY',total:900,attemptState:'unknown',paymentStatus:'pending'});
  expect(boundary.mpesa).toHaveBeenCalledWith('checkout:'+'a'.repeat(64),key);
  expect(boundary.paystack).not.toHaveBeenCalled();
 });

 it.each([
  {key,provider:'stripe'}, {key,provider:null}, {key,provider:7}, {key,provider:'paystack',orderId:'ORD-FORGED'},
  {key:'short',provider:'paystack'}, ['paystack',key], null,
 ])('rejects invalid recovery input before looking up any attempt: %j',async body=>{
  const response=await POST(request(body));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({error:'invalid_attempt_token'});
  expect(boundary.mpesa).not.toHaveBeenCalled();expect(boundary.paystack).not.toHaveBeenCalled();
 });

 it('returns the same absent response when the token is not owned by this guest',async()=>{
  boundary.paystack.mockResolvedValue(null);
  const response=await POST(request({key,provider:'paystack'}));
  expect(response.status).toBe(404);expect(await response.json()).toEqual({error:'attempt_not_found'});
  expect(response.headers.get('cache-control')).toContain('no-store');
 });

 it('requires the signed guest owner before any provider lookup',async()=>{
  boundary.owner=null;
  const response=await POST(request({key,provider:'paystack'}));
  expect(response.status).toBe(428);expect(await response.json()).toEqual({error:'checkout_session_required'});
  expect(boundary.mpesa).not.toHaveBeenCalled();expect(boundary.paystack).not.toHaveBeenCalled();
 });

 it('preserves origin protection before any provider lookup',async()=>{
  const response=await POST(request({key,provider:'paystack'},'https://attacker.invalid'));
  expect(response.status).toBe(403);expect(await response.json()).toEqual({error:'bad_origin'});
  expect(boundary.mpesa).not.toHaveBeenCalled();expect(boundary.paystack).not.toHaveBeenCalled();
 });

 it('preserves rate limiting before any provider lookup',async()=>{
  boundary.allowed=false;
  const response=await POST(request({key,provider:'paystack'}));
  expect(response.status).toBe(429);expect(await response.json()).toEqual({error:'too_many_requests'});
  expect(boundary.mpesa).not.toHaveBeenCalled();expect(boundary.paystack).not.toHaveBeenCalled();
 });

 it('does not leak persistence errors into a recovery response',async()=>{
  boundary.paystack.mockRejectedValue(Error('database private-hash private@example.invalid'));
  const response=await POST(request({key,provider:'paystack'}));
  expect(response.status).toBe(503);expect(await response.json()).toEqual({error:'recovery_unavailable'});
 });
});
