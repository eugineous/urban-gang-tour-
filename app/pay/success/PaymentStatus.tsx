'use client';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
import {useEffect,useState} from 'react';
export default function PaymentStatus({orderId}:{orderId:string}){
 const [status,setStatus]=useState('pending'),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[stopped,setStopped]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>,polls=0;
  setStopped(false);setError('');
  async function check(){
   try{const r=await fetchWithTimeout('/api/orders/status?id='+encodeURIComponent(orderId),{signal:controller.signal,cache:'no-store'});const d=await r.json();if(!r.ok||typeof d.status!=='string')throw Error();
    if(controller.signal.aborted)return;setStatus(d.status);setError('');
    if(d.status==='paid'||d.status==='fulfilled'){try{const order=JSON.parse(sessionStorage.getItem('ugt-checkout-order')||'null');if(order?.id===orderId&&!order.eventId&&JSON.stringify(order.items)===localStorage.getItem('ugt-live-cart-v1')){localStorage.setItem('ugt-live-cart-v1','[]');localStorage.removeItem('ugt_cart')}sessionStorage.removeItem('ugt-checkout-order')}catch{}}
    if(['paid','fulfilled','failed','cancelled','refunded'].includes(d.status)){setStopped(true);return}
   }catch{if(controller.signal.aborted)return;setError('We could not check your payment. Your order reference is safe. Try again before starting another payment.')}
   if(++polls<10)timer=setTimeout(check,6000);else setStopped(true);
  }
  void check();return()=>{controller.abort();clearTimeout(timer)};
 },[orderId,attempt]);
 const paid=status==='paid'||status==='fulfilled',ended=['failed','cancelled','refunded'].includes(status);
 return <section aria-live="polite"><h1 > {paid?'Payment confirmed':ended?'Payment '+status:'Payment confirmation pending'}</h1><p>{paid?'Your payment is recorded. Open your receipt to download your documents.':ended?'This order is not a paid admission. Check your account or contact us with your order reference.':'We are checking for the payment confirmation. Please do not pay again while this order is pending.'}</p><p>Order reference: {orderId}</p>{error&&<p role="alert">{error}</p>}{paid?<a href={'/receipt/'+encodeURIComponent(orderId)} className="button">Open receipt and downloads</a>:(stopped||error)&&<button onClick={()=>setAttempt(n=>n+1)} style={{padding:14,font:'inherit'}}>Check payment again</button>}</section>
}
