import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const hooks=vi.hoisted(()=>({values:[] as unknown[],index:0,effect:undefined as undefined|(()=>void|(()=>void))}));
// Keep the real component and storage helpers; control only browser state and
// effects because this suite has no DOM runtime.
vi.mock('react',async original=>({...await original<typeof import('react')>(),
 useState:(initial:unknown)=>{const index=hooks.index++;if(!(index in hooks.values))hooks.values[index]=initial;return [hooks.values[index],(value:unknown)=>{hooks.values[index]=typeof value==='function'?value(hooks.values[index]):value;}];},
 useEffect:(effect:()=>void|(()=>void))=>{hooks.effect=effect;},
}));
import PaymentStatus from '@/app/pay/success/PaymentStatus';

const mpesaKey='ugt-mpesa-attempt-v1',paystackKey='ugt-paystack-attempt-v1';
const orderId='ORD-STATUS-OWNED';
const request=vi.fn();
let storage:Map<string,string>,stop:(()=>void)|undefined;
const render=()=>{hooks.index=0;return renderToStaticMarkup(createElement(PaymentStatus,{orderId}));};
const saved=(key:string,id:string)=>JSON.stringify({key,orderId:id,state:'unknown'});
async function check(body:object,httpStatus=200){
 request.mockResolvedValueOnce(new Response(JSON.stringify(body),{status:httpStatus}));
 render();const cleanup=hooks.effect!();if(typeof cleanup==='function')stop=cleanup;
 await vi.advanceTimersByTimeAsync(0);
 expect(request).toHaveBeenCalledTimes(1);
 return render();
}
beforeEach(()=>{
 vi.useFakeTimers();hooks.values=[];hooks.index=0;hooks.effect=undefined;request.mockReset();storage=new Map();stop=undefined;
 vi.stubGlobal('localStorage',{getItem:(key:string)=>storage.get(key)||null,setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)});
 vi.stubGlobal('sessionStorage',{getItem:()=>null,removeItem:()=>{}});
 vi.stubGlobal('fetch',request);
});
afterEach(()=>{stop?.();vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();});

it('clears the matching Paystack reference after verified payment while preserving another M-Pesa order',async()=>{
 storage.set(paystackKey,saved('a'.repeat(32),orderId));storage.set(mpesaKey,saved('b'.repeat(32),'ORD-MPESA-OTHER'));
 const html=await check({status:'paid',attemptState:'paid',remainingTicketsAvailable:false});
 expect(storage.has(paystackKey)).toBe(false);
 expect(JSON.parse(storage.get(mpesaKey)!)).toMatchObject({orderId:'ORD-MPESA-OTHER'});
 expect(html).toContain('Payment confirmed');expect(html).toContain('href="/receipt/ORD-STATUS-OWNED"');
 expect(request.mock.calls[0][0]).toBe('/api/orders/status?id=ORD-STATUS-OWNED');
});

it('clears the matching M-Pesa reference while preserving another Paystack order',async()=>{
 storage.set(paystackKey,saved('a'.repeat(32),'ORD-PAYSTACK-OTHER'));storage.set(mpesaKey,saved('b'.repeat(32),orderId));
 const html=await check({status:'declined',attemptState:'declined',remainingTicketsAvailable:false});
 expect(storage.has(mpesaKey)).toBe(false);
 expect(JSON.parse(storage.get(paystackKey)!)).toMatchObject({orderId:'ORD-PAYSTACK-OTHER'});
 expect(html).toContain('Payment declined');expect(html).not.toContain('href="/receipt/');
});

it.each(['pending','reconciling','unknown'])('keeps both references while server payment is %s',async status=>{
 const paystack=saved('a'.repeat(32),orderId),mpesa=saved('b'.repeat(32),orderId);
 storage.set(paystackKey,paystack);storage.set(mpesaKey,mpesa);
 const html=await check({status,attemptState:'unknown',remainingTicketsAvailable:false});
 expect(storage.get(paystackKey)).toBe(paystack);expect(storage.get(mpesaKey)).toBe(mpesa);
 expect(html).not.toContain('href="/receipt/');expect(html).toContain('ORD-STATUS-OWNED');
});

it('keeps recovery references when an unsuccessful status response claims payment',async()=>{
 const paystack=saved('a'.repeat(32),orderId),mpesa=saved('b'.repeat(32),orderId);
 storage.set(paystackKey,paystack);storage.set(mpesaKey,mpesa);
 const html=await check({status:'paid',attemptState:'paid',remainingTicketsAvailable:false},503);
 expect(storage.get(paystackKey)).toBe(paystack);expect(storage.get(mpesaKey)).toBe(mpesa);
 expect(html).toContain('role="alert"');expect(html).not.toContain('href="/receipt/');
});
