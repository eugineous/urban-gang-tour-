import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {CHECKOUT_ATTEMPT_KEY} from '@/lib/client/checkout-attempt';
import {PAYSTACK_ATTEMPT_KEY,paystackCheckoutAttempt,readPaystackAttempt,rememberPaystackOrder,clearPaystackAttempt} from '@/lib/client/paystack-checkout-attempt';

let data:Map<string,string>;
const request=vi.fn();
const response=(body:object,status=200)=>new Response(JSON.stringify(body),{status});
const key='a'.repeat(32);
beforeEach(()=>{
 data=new Map();request.mockReset();
 vi.stubGlobal('localStorage',{getItem:(name:string)=>data.get(name)||null,setItem:(name:string,value:string)=>data.set(name,value),removeItem:(name:string)=>data.delete(name)});
 vi.stubGlobal('fetch',request);
});
afterEach(()=>vi.unstubAllGlobals());

it('persists an opaque card key before submission without replacing an M-Pesa attempt',async()=>{
 data.set(CHECKOUT_ATTEMPT_KEY,JSON.stringify({key:'m'.repeat(32),orderId:'ORD-MPESA'}));
 request.mockResolvedValueOnce(response({ok:true,created:true}));
 const result=await paystackCheckoutAttempt();
 expect(result.recovered).toBeNull();expect(result.key).toMatch(/^[A-Za-z0-9_-]{32,128}$/);
 expect(JSON.parse(data.get('ugt-paystack-attempt-v1')!)).toEqual({key:result.key});
 expect(JSON.parse(data.get(CHECKOUT_ATTEMPT_KEY)!)).toEqual({key:'m'.repeat(32),orderId:'ORD-MPESA'});
 expect(request.mock.calls.map(([url])=>url)).toEqual(['/api/checkout/session']);
});
it('recovers the owned ready URL using the card provider without initiating payment',async()=>{
 rememberPaystackOrder(key,'ORD-CARD','ready');
 request.mockResolvedValueOnce(response({ok:true,created:false})).mockResolvedValueOnce(response({ok:true,id:'ORD-CARD',total:3500,attemptState:'ready',paymentStatus:'pending',authorizationUrl:'https://checkout.paystack.com/fixture'}));
 const result=await paystackCheckoutAttempt();
 expect(result.recovered).toEqual({id:'ORD-CARD',total:3500,attemptState:'ready',paymentStatus:'pending',authorizationUrl:'https://checkout.paystack.com/fixture'});
 expect(request.mock.calls.map(([url,init])=>[url,init.body?JSON.parse(init.body):null])).toEqual([
  ['/api/checkout/session',null],['/api/checkout/recovery',{key,provider:'paystack'}],
 ]);
 expect(readPaystackAttempt()).toEqual({key,orderId:'ORD-CARD',state:'ready'});
});
it.each(['initiating','unknown'])('retains a recovered %s attempt for its status page',async state=>{
 rememberPaystackOrder(key,'ORD-CARD',state);
 request.mockResolvedValueOnce(response({ok:true,created:false})).mockResolvedValueOnce(response({ok:true,id:'ORD-CARD',total:3500,attemptState:state,paymentStatus:'pending'}));
 expect((await paystackCheckoutAttempt()).recovered).toEqual({id:'ORD-CARD',total:3500,attemptState:state,paymentStatus:'pending'});
 expect(request).toHaveBeenCalledTimes(2);
});
it('only a prepared recovered attempt remains available for the same-key submission',async()=>{
 rememberPaystackOrder(key,'ORD-CARD','prepared');
 request.mockResolvedValueOnce(response({ok:true,created:false})).mockResolvedValueOnce(response({ok:true,id:'ORD-CARD',total:3500,attemptState:'prepared',paymentStatus:'pending'}));
 expect(await paystackCheckoutAttempt()).toEqual({key,recovered:{id:'ORD-CARD',total:3500,attemptState:'prepared',paymentStatus:'pending'}});
});
it('a recovery404 preserves an unacknowledged key for the preparation race',async()=>{
 data.set(PAYSTACK_ATTEMPT_KEY,JSON.stringify({key}));
 request.mockResolvedValueOnce(response({ok:true,created:false})).mockResolvedValueOnce(response({error:'attempt_not_found'},404));
 expect(await paystackCheckoutAttempt()).toEqual({key,recovered:null});expect(readPaystackAttempt()).toEqual({key});
});
it('a recovery404 never resubmits an already acknowledged uncertain order',async()=>{
 rememberPaystackOrder(key,'ORD-CARD','unknown');
 request.mockResolvedValueOnce(response({ok:true,created:false})).mockResolvedValueOnce(response({error:'attempt_not_found'},404));
 const saved=await paystackCheckoutAttempt();
 expect(saved.key).toBe(key);expect(saved.recovered).toMatchObject({id:'ORD-CARD',attemptState:'unknown',paymentStatus:'pending'});
 expect(readPaystackAttempt()).toEqual({key,orderId:'ORD-CARD',state:'unknown'});
});
it('blocks a new signed browser scope while a card key exists',async()=>{
 rememberPaystackOrder(key,'ORD-CARD','ready');request.mockResolvedValueOnce(response({ok:true,created:true}));
 await expect(paystackCheckoutAttempt()).rejects.toThrow('checkout_recovery_session_lost');
 expect(request).toHaveBeenCalledTimes(1);expect(readPaystackAttempt()?.key).toBe(key);
});
it.each(['paid','fulfilled','failed','declined','timed_out','cancelled','refunded','partially_refunded'])('retains a verified %s order for its status page without replacing its card key',async paymentStatus=>{
 rememberPaystackOrder(key,'ORD-CARD','unknown');
 request.mockResolvedValueOnce(response({ok:true,created:false})).mockResolvedValueOnce(response({ok:true,id:'ORD-CARD',total:3500,attemptState:'ready',paymentStatus,authorizationUrl:'https://checkout.paystack.com/stale'}));
 const result=await paystackCheckoutAttempt();
 expect(result).toEqual({key,recovered:{id:'ORD-CARD',total:3500,attemptState:'ready',paymentStatus}});
 expect(readPaystackAttempt()).toEqual({key,orderId:'ORD-CARD',state:'ready'});
});
it.each([['unknown',200],['failed',503]])('does not rotate on an unverified %s recovery (%i)',async(state,status)=>{
 rememberPaystackOrder(key,'ORD-CARD','unknown');
 request.mockResolvedValueOnce(response({ok:true,created:false})).mockResolvedValueOnce(response({ok:true,id:'ORD-CARD',total:3500,attemptState:state,paymentStatus:state},status));
 if(status===200)expect((await paystackCheckoutAttempt()).key).toBe(key);else await expect(paystackCheckoutAttempt()).rejects.toThrow('checkout_recovery_unavailable');
 expect(readPaystackAttempt()?.key).toBe(key);
});
it('corrupt card storage prevents a new checkout session or purchase',async()=>{
 data.set(PAYSTACK_ATTEMPT_KEY,'broken');await expect(paystackCheckoutAttempt()).rejects.toThrow('checkout_recovery_unavailable');expect(request).not.toHaveBeenCalled();
});
it('storage refusal prevents an untracked card checkout',async()=>{
 vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{throw Error('blocked')}});request.mockResolvedValueOnce(response({ok:true,created:true}));
 await expect(paystackCheckoutAttempt()).rejects.toThrow('checkout_storage_unavailable');
});
it('clears only the matching card reference',()=>{
 rememberPaystackOrder(key,'ORD-CARD','ready');clearPaystackAttempt('ORD-OTHER');expect(readPaystackAttempt()?.orderId).toBe('ORD-CARD');
 clearPaystackAttempt('ORD-CARD');expect(readPaystackAttempt()).toBeNull();
});

it.each(['ready','failed'])('preserves a newer browser reference when an older %s recovery finishes',async state=>{
 rememberPaystackOrder(key,'ORD-OLD','unknown');
 let finish!: (value:Response)=>void;
 request.mockResolvedValueOnce(response({ok:true,created:false})).mockReturnValueOnce(new Promise<Response>(resolve=>{finish=resolve}));
 const recovery=paystackCheckoutAttempt();
 await vi.waitFor(()=>expect(request).toHaveBeenCalledTimes(2));
 data.set(PAYSTACK_ATTEMPT_KEY,JSON.stringify({key:'b'.repeat(32),orderId:'ORD-NEW',state:'ready'}));
 finish(response({ok:true,id:'ORD-OLD',total:3500,attemptState:state,paymentStatus:state==='failed'?'failed':'pending'}));
 await expect(recovery).rejects.toThrow('checkout_recovery_unavailable');
 expect(readPaystackAttempt()).toEqual({key:'b'.repeat(32),orderId:'ORD-NEW',state:'ready'});
});

it('concurrent empty starts do not replace an already persisted card key',async()=>{
 let finish!: (value:Response)=>void;
 request.mockResolvedValueOnce(response({ok:true,created:false})).mockReturnValueOnce(new Promise<Response>(resolve=>{finish=resolve}));
 const first=paystackCheckoutAttempt(),second=paystackCheckoutAttempt();
 const saved=await first;
 finish(response({ok:true,created:false}));
 await expect(second).rejects.toThrow('checkout_recovery_unavailable');
 expect(readPaystackAttempt()).toEqual({key:saved.key});
});

it.each(['ready','failed'])('rejects a %s recovery for a different acknowledged order',async state=>{
 rememberPaystackOrder(key,'ORD-CARD','unknown');
 request.mockResolvedValueOnce(response({ok:true,created:false})).mockResolvedValueOnce(response({ok:true,id:'ORD-DIFFERENT',total:3500,attemptState:state,paymentStatus:state==='failed'?'failed':'pending'}));
 await expect(paystackCheckoutAttempt()).rejects.toThrow('checkout_recovery_unavailable');
 expect(readPaystackAttempt()).toEqual({key,orderId:'ORD-CARD',state:'unknown'});
});

it('an old checkout acknowledgement cannot overwrite a newer card reference',()=>{
 rememberPaystackOrder('b'.repeat(32),'ORD-NEW','ready');
 expect(()=>rememberPaystackOrder(key,'ORD-OLD','unknown')).toThrow('checkout_recovery_unavailable');
 expect(readPaystackAttempt()).toEqual({key:'b'.repeat(32),orderId:'ORD-NEW',state:'ready'});
});
