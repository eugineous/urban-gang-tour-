'use client';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {accountMessages,factoryIssue} from '@/ui/i18n/catalogues/account';
import {paymentMessages,type PaymentMessageKey} from '@/ui/i18n/catalogues/payment';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
import {useEffect,useState} from 'react';
import {clearCheckoutAttempt} from '@/lib/client/checkout-attempt';
import {clearPaystackAttempt} from '@/lib/client/paystack-checkout-attempt';
import {paymentPresentation} from '@/lib/client/payment-presentation';
import {paymentFeedback,type PaymentDelivery} from '@/lib/client/payment-feedback';

export default function PaymentStatus({orderId}:{orderId:string}){
 const t=useMessages(accountMessages),p=useMessages(paymentMessages);
 const [result,setResult]=useState({orderId,status:'pending'}),[error,setError]=useState(false),[attempt,setAttempt]=useState(0),[stopped,setStopped]=useState(false);
 const [remainingTickets,setRemainingTickets]=useState(false),[delivery,setDelivery]=useState<PaymentDelivery>({tickets:'unknown',email:'unknown'});
 const [offline,setOffline]=useState(false),[checking,setChecking]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined,polls=0,inFlight=false,finished=false;
  const isOffline=()=>navigator.onLine===false;
  async function check(){
   if(controller.signal.aborted||inFlight||finished)return;
   if(isOffline()){setOffline(true);return}
   if(polls>=12){finished=true;setStopped(true);return}
   clearTimeout(timer);inFlight=true;polls++;setOffline(false);setChecking(true);
   try{
    const r=await fetchWithTimeout('/api/orders/status?id='+encodeURIComponent(orderId),{signal:controller.signal,cache:'no-store'});
    const d=await r.json();if(!r.ok||typeof d.status!=='string')throw Error();
    if(controller.signal.aborted)return;
    const feedback=paymentFeedback(d.status,d.delivery);
    setRemainingTickets(d.remainingTicketsAvailable===true);setDelivery(feedback.delivery);
    setResult({orderId,status:d.status==='pending'&&d.attemptState==='unknown'?'unknown':d.status});setError(false);
    if(paymentPresentation(d.status).terminal){clearCheckoutAttempt(orderId);clearPaystackAttempt(orderId)}
    if(feedback.paid){
     try{
      const order=JSON.parse(sessionStorage.getItem('ugt-checkout-order')||'null');
      if(order?.id===orderId){
       if(!order.eventId&&JSON.stringify(order.items)===localStorage.getItem('ugt-live-cart-v1')){
        localStorage.setItem('ugt-live-cart-v1','[]');localStorage.removeItem('ugt_cart');window.dispatchEvent(new Event('ugt-cart-changed'));
       }
       sessionStorage.removeItem('ugt-checkout-order');
      }
     }catch{}
    }
    finished=!feedback.keepChecking;
   }catch{
    if(controller.signal.aborted)return;
    if(isOffline())setOffline(true);else setError(true);
   }finally{
    inFlight=false;if(!controller.signal.aborted)setChecking(false);
   }
   if(controller.signal.aborted||finished)return;
   if(polls>=12){finished=true;setStopped(true);return}
   if(!isOffline())timer=setTimeout(check,polls<3?3000:polls<6?6000:12000);
  }
  const reconnect=()=>{setOffline(false);void check()};
  const disconnect=()=>{setOffline(true);clearTimeout(timer)};
  window.addEventListener('online',reconnect);window.addEventListener('offline',disconnect);
  timer=setTimeout(()=>{setStopped(false);setError(false);setOffline(isOffline());void check()},0);
  return()=>{finished=true;controller.abort();clearTimeout(timer);window.removeEventListener('online',reconnect);window.removeEventListener('offline',disconnect)};
 },[orderId,attempt]);
 const currentOrder=result.orderId===orderId;
 const view=paymentPresentation(currentOrder?result.status:'pending');
 const ticketKey=delivery.tickets==='not_required'?null:`tickets.${delivery.tickets}` as PaymentMessageKey;
 const emailKey=delivery.email==='not_requested'?'email.notRequested':`email.${delivery.email}` as PaymentMessageKey;
 return <section aria-live="polite">
  <h1>{t(factoryIssue(view.title).key)}</h1>
  <p>{view.paid?p('payment.confirmed'):t(factoryIssue(view.message).key)}</p>
  <ol aria-label={t('copy.payment_progress')}>
   <li>{t('copy.order_reference_recorded')}</li>
   <li>{view.paid?t('copy.payment_confirmed_by_the_payment_provider'):view.terminal?t('copy.payment_status_received'):t('copy.waiting_for_the_payment_provider')}</li>
   <li>{view.paid?p('receipt.available'):t('copy.receipt_available_after_confirmed_payment')}</li>
  </ol>
  <p>{t('copy.order_reference')} {orderId}</p>
  <p><a href={'/orders/track?ref='+encodeURIComponent(orderId)} referrerPolicy="no-referrer">{t('copy.track_order')}</a></p>
  {view.paid&&<>
   <p><a href={'/receipt/'+encodeURIComponent(orderId)} className="button">{p('receipt.open')}</a></p>
   {ticketKey&&<div><h2>{p('tickets.heading')}</h2><p>{p(ticketKey)}</p>{delivery.tickets==='ready'&&<p><a className="button" href={'/tickets/'+encodeURIComponent(orderId)}>{p('tickets.open')}</a></p>}</div>}
   <div><h2>{p('email.heading')}</h2><p>{p(emailKey)}</p></div>
  </>}
  {offline?<p role="status">{p('lookup.offline')}</p>:error&&<p role="alert">{p('lookup.failed')}</p>}
  {stopped&&!offline&&<p>{p('lookup.paused')}</p>}
  <p><button type="button" onClick={()=>setAttempt(n=>n+1)} disabled={checking||offline} style={{padding:14,font:'inherit'}}>{checking?p('lookup.checking'):t('copy.check_payment_again')}</button></p>
  <p>{p('lookup.safe')}</p>
  {currentOrder&&remainingTickets&&!view.paid&&<p><a className="button" href={'/tickets/'+encodeURIComponent(orderId)}>{t('copy.view_remaining_tickets')}</a></p>}
  <p><a href="/account">{t('copy.your_orders_and_receipts')}</a> · <a href="/contact-us">{p('order.help')}</a></p>
 </section>;
}
