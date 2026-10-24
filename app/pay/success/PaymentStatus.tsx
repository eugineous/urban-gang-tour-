'use client';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
import {useEffect,useState} from 'react';
import {clearCheckoutAttempt} from '@/lib/client/checkout-attempt';
import {paymentPresentation} from '@/lib/client/payment-presentation';
export default function PaymentStatus({orderId}:{orderId:string}){
 const [status,setStatus]=useState('pending'),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[stopped,setStopped]=useState(false);
 const [remainingTickets,setRemainingTickets]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>,polls=0;
  setStopped(false);setError('');
  async function check(){
   try{const r=await fetchWithTimeout('/api/orders/status?id='+encodeURIComponent(orderId),{signal:controller.signal,cache:'no-store'});const d=await r.json();if(!r.ok||typeof d.status!=='string')throw Error();
    if(controller.signal.aborted)return;setRemainingTickets(d.remainingTicketsAvailable===true);setStatus(d.status==='pending'&&d.attemptState==='unknown'?'unknown':d.status);setError('');if(paymentPresentation(d.status).terminal)clearCheckoutAttempt(orderId);
    if(d.status==='paid'||d.status==='fulfilled'){try{const order=JSON.parse(sessionStorage.getItem('ugt-checkout-order')||'null');if(order?.id===orderId&&!order.eventId&&JSON.stringify(order.items)===localStorage.getItem('ugt-live-cart-v1')){localStorage.setItem('ugt-live-cart-v1','[]');localStorage.removeItem('ugt_cart');window.dispatchEvent(new Event('ugt-cart-changed'))}sessionStorage.removeItem('ugt-checkout-order')}catch{}}
    if(paymentPresentation(d.status).terminal){setStopped(true);return}
   }catch{if(controller.signal.aborted)return;setError('We could not check your payment. Your order reference is safe. Try again before starting another payment.')}
   if(++polls<10)timer=setTimeout(check,6000);else setStopped(true);
  }
  void check();return()=>{controller.abort();clearTimeout(timer)};
 },[orderId,attempt]);
 const view=paymentPresentation(status);
 return <section aria-live="polite"><h1>{view.title}</h1><p>{view.message}</p><ol aria-label="Payment progress"><li>Order reference recorded</li><li>{view.paid?'Payment confirmed by the payment provider':view.terminal?'Payment status received':'Waiting for the payment provider'}</li><li>{view.paid?'Receipt and downloads available':'Receipt available after confirmed payment'}</li></ol><p>Order reference: {orderId}</p>{error&&<p role="alert">{error}</p>}{view.paid?<a href={'/receipt/'+encodeURIComponent(orderId)} className="button">Open receipt and downloads</a>:(stopped||error)&&<button onClick={()=>setAttempt(n=>n+1)} style={{padding:14,font:'inherit'}}>Check payment again</button>}{remainingTickets&&<p><a className="button" href={'/tickets/'+encodeURIComponent(orderId)}>View remaining tickets</a></p>}<p><a href="/account">Your orders and receipts</a> · <a href="/contact-us">Get help with this order</a></p></section>
}
