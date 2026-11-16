import crypto from 'node:crypto';
import Stripe from 'stripe';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const state=vi.hoisted(()=>({q:vi.fn(async()=>[])}));
vi.mock('@/lib/server/stripe',async()=>{const {default:Stripe}=await import('stripe');return {stripe:()=>new Stripe('sk_test_isolated_fixture')}});
vi.mock('@/lib/server/db',()=>({q:state.q,hasDb:()=>true}));
import {POST as paystack} from '@/app/api/paystack/webhook/route';
import {POST as stripe} from '@/app/api/stripe/webhook/route';
const key='isolated-webhook-body-fixture';
const headersFor=(provider:string,body:Buffer=Buffer.from('{}'))=>provider==='paystack'
 ? {'x-paystack-signature':crypto.createHmac('sha512',key).update(body).digest('hex')}
 : {'stripe-signature':Stripe.webhooks.generateTestHeaderString({payload:body.toString('utf8'),secret:key})};
const providers=[['paystack',paystack],['stripe',stripe]] as const;
function request(provider:string,body:BodyInit,headers:Record<string,string>={}){
 return new Request('https://urbangangtour.co.ke/api/'+provider+'/webhook',{method:'POST',headers,body,duplex:'half'} as RequestInit);
}
beforeEach(()=>{vi.stubEnv('PAYSTACK_SECRET_KEY',key);vi.stubEnv('STRIPE_WEBHOOK_SECRET',key);vi.clearAllMocks()});
afterEach(()=>{vi.unstubAllEnvs();vi.useRealTimers()});
describe('bounded raw webhook bodies',()=>{
 it('retains exact bytes across arbitrary streamed chunks',async()=>{
  const {readWebhookBody}=await import('@/lib/server/webhook-body');
  const bytes=Buffer.from(' { "message": "☃" }\n');
  const stream=new ReadableStream({start(c){c.enqueue(bytes.subarray(0,17));c.enqueue(bytes.subarray(17));c.close()}});
  const result=await readWebhookBody(request('fixture',stream));
  expect(result.ok).toBe(true);if(result.ok)expect(result.body.equals(bytes)).toBe(true);
 });
 it('cancels stalled reads at a finite deadline',async()=>{
  const {readWebhookBody}=await import('@/lib/server/webhook-body');
  vi.useFakeTimers();let cancelled=false;
  const stream=new ReadableStream({cancel(){cancelled=true}});
  const pending=readWebhookBody(request('fixture',stream),1024,20);
  await vi.advanceTimersByTimeAsync(21);
  expect(await pending).toMatchObject({ok:false,status:408});expect(cancelled).toBe(true);
 });
 for(const [provider,handler] of providers){
  it.each(['','invalid'])(provider+' rejects absent/malformed signatures before reading (%s)',async signature=>{
   const req=request(provider,'{}',provider==='paystack'?{'x-paystack-signature':signature}:{'stripe-signature':signature});
   const getReader=vi.spyOn(req.body!,'getReader');const text=vi.spyOn(req,'text');
   expect((await handler(req)).status).toBe(400);expect(getReader).not.toHaveBeenCalled();expect(text).not.toHaveBeenCalled();expect(state.q).not.toHaveBeenCalled();
  });
  it(provider+' rejects declared oversize without reading',async()=>{
   const req=request(provider,'{}',{...headersFor(provider),'content-length':String(1024*1024+1)});
   const getReader=vi.spyOn(req.body!,'getReader');
   expect((await handler(req)).status).toBe(413);expect(getReader).not.toHaveBeenCalled();expect(state.q).not.toHaveBeenCalled();
  });
  it.each([undefined,'1'])(provider+' bounds actual stream bytes with length %s',async length=>{
   const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(1024*1024));c.enqueue(new Uint8Array(1));c.close()}});
   const req=request(provider,stream,{...headersFor(provider),...(length?{'content-length':length}:{})});
   expect((await handler(req)).status).toBe(413);expect(state.q).not.toHaveBeenCalled();
  });
  it(provider+' accepts correctly signed raw UTF-8 whitespace-preserving bytes',async()=>{
   const body=Buffer.from(' {"event":"ignored","type":"fixture.ignored","data":{"note":"☃"}} \n');
   expect((await handler(request(provider,body,headersFor(provider,body)))).status).toBe(200);expect(state.q).not.toHaveBeenCalled();
  });
 }
});
