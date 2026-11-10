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
let storage:Map<string,string>,session:Map<string,string>,network:{onLine:boolean},events:EventTarget,stop:(()=>void)|undefined;
const render=(id=orderId)=>{hooks.index=0;return renderToStaticMarkup(createElement(PaymentStatus,{orderId:id}));};
const saved=(key:string,id:string)=>JSON.stringify({key,orderId:id,state:'unknown'});
async function check(body:object,httpStatus=200){
 request.mockResolvedValueOnce(new Response(JSON.stringify(body),{status:httpStatus}));
 render();const cleanup=hooks.effect!();if(typeof cleanup==='function')stop=cleanup;
 await vi.advanceTimersByTimeAsync(0);
 expect(request).toHaveBeenCalledTimes(1);
 return render();
}
beforeEach(()=>{
 vi.useFakeTimers();hooks.values=[];hooks.index=0;hooks.effect=undefined;request.mockReset();storage=new Map();session=new Map();network={onLine:true};events=new EventTarget();stop=undefined;
 vi.stubGlobal('localStorage',{getItem:(key:string)=>storage.get(key)||null,setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)});
 vi.stubGlobal('sessionStorage',{getItem:(key:string)=>session.get(key)||null,removeItem:(key:string)=>session.delete(key)});
 vi.stubGlobal('navigator',network);vi.stubGlobal('window',events);
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

it('presents the verified server amount and usable order-reference controls on the success screen',async()=>{
 const html=await check({status:'paid',total:1250,method:'card',delivery:{tickets:'not_required',email:'accepted'}});
 expect(html).toContain('KES 1,250');expect(html).toContain('Payment method');
 expect(html).toContain('aria-label="Copy order reference"');expect(html).toContain('href="/orders/track?ref=ORD-STATUS-OWNED"');
 expect(html).toContain('data-payment-state="success"');
});
it('renders the verified Paystack gateway without guessing that the customer used a card',async()=>{
 const html=await check({status:'paid',total:1250,method:'paystack',delivery:{tickets:'not_required',email:'accepted'}});
 expect(html).toContain('Payment method');expect(html).toContain('Paystack');expect(html).not.toContain('>Card<');
});

it('never renders a success badge or paid documents for an unconfirmed request',async()=>{
 const html=await check({status:'pending',total:1250,method:'mpesa',delivery:{tickets:'ready',email:'accepted'}});
 expect(html).not.toContain('data-payment-state="success"');expect(html).not.toContain('href="/receipt/');
 expect(html).toContain('data-payment-state="pending"');expect(html).toContain('ORD-STATUS-OWNED');
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

it('keeps confirmed funds separate from preparing tickets and queued email, and keeps checking',async()=>{
 const result={status:'paid',attemptState:'paid',remainingTicketsAvailable:false,delivery:{tickets:'preparing',email:'queued'}};
 request.mockResolvedValue(new Response(JSON.stringify(result)));
 const html=await check(result);
 expect(html).toContain('Payment confirmed');expect(html).toContain('preparing your tickets');expect(html).toContain('queued to send');
 expect(html).not.toContain('Receipt and downloads available');expect(html).not.toContain('href="/tickets/');
 await vi.advanceTimersByTimeAsync(6000);
 expect(request.mock.calls.length).toBeGreaterThan(1);
 expect(request.mock.calls.every(([url,init])=>String(url).startsWith('/api/orders/status?')&&(!init?.method||init.method==='GET'))).toBe(true);
});

it('shows ready tickets and email acceptance without promising inbox delivery',async()=>{
 const html=await check({status:'paid',attemptState:'paid',remainingTicketsAvailable:false,delivery:{tickets:'ready',email:'accepted'}});
 expect(html).toContain('href="/tickets/ORD-STATUS-OWNED"');expect(html).toContain('does not confirm inbox delivery');
 await vi.advanceTimersByTimeAsync(180000);expect(request).toHaveBeenCalledTimes(1);
});

it('preserves the newer checkout session while viewing an older paid order',async()=>{
 const newer=JSON.stringify({id:'ORD-NEWER-CHECKOUT',items:[{id:'NEW',qty:1}]});session.set('ugt-checkout-order',newer);
 await check({status:'paid',attemptState:'paid',remainingTicketsAvailable:false,delivery:{tickets:'not_required',email:'not_requested'}});
 expect(session.get('ugt-checkout-order')).toBe(newer);
});

it('waits offline and resumes a read-only check on reconnect',async()=>{
 network.onLine=false;render();const cleanup=hooks.effect!();if(typeof cleanup==='function')stop=cleanup;
 await vi.advanceTimersByTimeAsync(60000);
 expect(request).not.toHaveBeenCalled();expect(render()).toContain('You are offline');expect(render()).toContain(orderId);
 request.mockResolvedValue(new Response(JSON.stringify({status:'paid',delivery:{tickets:'ready',email:'accepted'}})));
 network.onLine=true;events.dispatchEvent(new Event('online'));await vi.advanceTimersByTimeAsync(0);
 expect(request).toHaveBeenCalledTimes(1);expect(render()).toContain('Payment confirmed');
});

it('bounds automatic checks even when confirmed documents remain unavailable',async()=>{
 const body={status:'paid',delivery:{tickets:'preparing',email:'processing'}};
 request.mockImplementation(()=>Promise.resolve(new Response(JSON.stringify(body))));
 await check(body);await vi.advanceTimersByTimeAsync(240000);
 const count=request.mock.calls.length;expect(count).toBeGreaterThan(1);expect(count).toBeLessThanOrEqual(12);
 expect(render()).toContain('Automatic checks are paused');expect(render()).toContain('Check payment again');
 await vi.advanceTimersByTimeAsync(240000);expect(request).toHaveBeenCalledTimes(count);
});

it('never overlaps checks during reconnect and aborts the outstanding read on cleanup',async()=>{
 let signal:AbortSignal|undefined;
 request.mockImplementation((_url,init)=>{signal=init.signal;return new Promise(()=>{});});
 render();const cleanup=hooks.effect!();if(typeof cleanup==='function')stop=cleanup;
 events.dispatchEvent(new Event('online'));events.dispatchEvent(new Event('online'));
 await vi.advanceTimersByTimeAsync(3000);expect(request).toHaveBeenCalledTimes(1);
 stop?.();stop=undefined;expect(signal?.aborted).toBe(true);
 events.dispatchEvent(new Event('online'));await vi.advanceTimersByTimeAsync(60000);expect(request).toHaveBeenCalledTimes(1);
});

it.each(['declined','refunded','partially_refunded'])('does not show delivery claims for %s even if a response includes them',async status=>{
 const html=await check({status,remainingTicketsAvailable:false,delivery:{tickets:'ready',email:'accepted'}});
 expect(html).not.toContain('href="/tickets/');expect(html).not.toContain('does not confirm inbox delivery');expect(html).not.toContain('href="/receipt/');
});

it('does not carry a previous order payment confirmation into a different order link',async()=>{
 await check({status:'paid',delivery:{tickets:'ready',email:'accepted'}});
 const html=render('ORD-NEW-UNCHECKED');
 expect(html).not.toContain('Payment confirmed');expect(html).not.toContain('href="/receipt/ORD-NEW-UNCHECKED"');
 expect(html).toContain('ORD-NEW-UNCHECKED');
});

it('keeps provider-confirmed payment visible when a later delivery lookup fails',async()=>{
 await check({status:'paid',delivery:{tickets:'preparing',email:'queued'}});
 request.mockRejectedValue(new Error('network unavailable'));await vi.advanceTimersByTimeAsync(3000);
 const html=render();expect(html).toContain('Payment confirmed');expect(html).toContain('latest status');
 expect(html).toContain('href="/receipt/ORD-STATUS-OWNED"');expect(html).not.toContain('Payment was not completed');
});
