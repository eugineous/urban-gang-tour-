import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {checkoutAttempt,CHECKOUT_ATTEMPT_KEY,rememberCheckoutOrder} from '@/lib/client/checkout-attempt';
let data:Map<string,string>;
const request=vi.fn();
beforeEach(()=>{data=new Map();vi.stubGlobal('localStorage',{getItem:(k:string)=>data.get(k)||null,setItem:(k:string,v:string)=>data.set(k,v),removeItem:(k:string)=>data.delete(k)});vi.stubGlobal('fetch',request);request.mockReset()});
afterEach(()=>vi.unstubAllGlobals());
const response=(body:object,status=200)=>new Response(JSON.stringify(body),{status});
it('persists the key before any order submission',async()=>{
 request.mockResolvedValue(response({ok:true,created:true}));const result=await checkoutAttempt();
 expect(JSON.parse(data.get(CHECKOUT_ATTEMPT_KEY)!).key).toBe(result.key);expect(request).toHaveBeenCalledTimes(1);
});
it('a missing acknowledgement never authorizes a new key',async()=>{
 rememberCheckoutOrder('a'.repeat(32),'existing','prepared');request.mockResolvedValueOnce(response({ok:true,created:false})).mockResolvedValueOnce(response({error:'not_found'},404));
 expect((await checkoutAttempt()).key).toBe('a'.repeat(32));
});
it('recovers an uncertain attempt without sending a payment request',async()=>{
 rememberCheckoutOrder('b'.repeat(32),'existing','unknown');request.mockResolvedValueOnce(response({ok:true,created:false})).mockResolvedValueOnce(response({ok:true,id:'existing',total:500,attemptState:'unknown',paymentStatus:'pending'}));
 expect((await checkoutAttempt()).recovered?.id).toBe('existing');expect(request).toHaveBeenCalledTimes(2);
});
it('fails closed if the signed session was lost',async()=>{
 rememberCheckoutOrder('c'.repeat(32),'existing','unknown');request.mockResolvedValue(response({ok:true,created:true}));
 await expect(checkoutAttempt()).rejects.toThrow('checkout_recovery_session_lost');expect(request).toHaveBeenCalledTimes(1);
});
it('corrupt local recovery data cannot silently create a new purchase',async()=>{
 data.set(CHECKOUT_ATTEMPT_KEY,'broken');await expect(checkoutAttempt()).rejects.toThrow('checkout_recovery_unavailable');expect(request).not.toHaveBeenCalled();
});
it('blocked storage prevents payment initiation',async()=>{
 vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{throw Error('blocked')}});request.mockResolvedValue(response({ok:true,created:true}));
 await expect(checkoutAttempt()).rejects.toThrow('checkout_storage_unavailable');
});
