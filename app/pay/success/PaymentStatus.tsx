'use client';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {accountMessages,type CustomerIssue,factoryIssue} from '@/ui/i18n/catalogues/account';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
import {useEffect,useState} from 'react';
import {clearCheckoutAttempt} from '@/lib/client/checkout-attempt';
import {paymentPresentation} from '@/lib/client/payment-presentation';
export default function PaymentStatus({orderId}:{orderId:string}){
 const t=useMessages(accountMessages);
 const [status,setStatus]=useState('pending'),[error,setError]=useState<CustomerIssue|null>(null),[attempt,setAttempt]=useState(0),[stopped,setStopped]=useState(false);
 const [remainingTickets,setRemainingTickets]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>,polls=0;
  setStopped(false);setError(null);
  async function check(){
   try{const r=await fetchWithTimeout('/api/orders/status?id='+encodeURIComponent(orderId),{signal:controller.signal,cache:'no-store'});const d=await r.json();if(!r.ok||typeof d.status!=='string')throw Error();
    if(controller.signal.aborted)return;setRemainingTickets(d.remainingTicketsAvailable===true);setStatus(d.status==='pending'&&d.attemptState==='unknown'?'unknown':d.status);setError(null);if(paymentPresentation(d.status).terminal)clearCheckoutAttempt(orderId);
    if(d.status==='paid'||d.status==='fulfilled'){try{const order=JSON.parse(sessionStorage.getItem('ugt-checkout-order')||'null');if(order?.id===orderId&&!order.eventId&&JSON.stringify(order.items)===localStorage.getItem('ugt-live-cart-v1')){localStorage.setItem('ugt-live-cart-v1','[]');localStorage.removeItem('ugt_cart');window.dispatchEvent(new Event('ugt-cart-changed'))}sessionStorage.removeItem('ugt-checkout-order')}catch{}}
    if(paymentPresentation(d.status).terminal){setStopped(true);return}
   }catch{if(controller.signal.aborted)return;setError({"key":"copy.we_could_not_check_your_payment_your_order_reference_is_safe"})}
   if(++polls<10)timer=setTimeout(check,6000);else setStopped(true);
  }
  void check();return()=>{controller.abort();clearTimeout(timer)};
 },[orderId,attempt]);
 const view=paymentPresentation(status);
 return <section aria-live="polite"><h1>{t(factoryIssue(view.title).key)}</h1><p>{t(factoryIssue(view.message).key)}</p><ol aria-label={t("copy.payment_progress")}><li>{t("copy.order_reference_recorded")}</li><li>{view.paid?t("copy.payment_confirmed_by_the_payment_provider"):view.terminal?t("copy.payment_status_received"):t("copy.waiting_for_the_payment_provider")}</li><li>{view.paid?t("copy.receipt_and_downloads_available"):t("copy.receipt_available_after_confirmed_payment")}</li></ol><p>{t("copy.order_reference")} {orderId}</p>{error&&<p role="alert">{error?t(error.key,error.values):null}</p>}{view.paid?<a href={'/receipt/'+encodeURIComponent(orderId)} className="button">{t("copy.open_receipt_and_downloads")}</a>:(stopped||error)&&<button onClick={()=>setAttempt(n=>n+1)} style={{padding:14,font:'inherit'}}>{t("copy.check_payment_again")}</button>}{remainingTickets&&<p><a className="button" href={'/tickets/'+encodeURIComponent(orderId)}>{t("copy.view_remaining_tickets")}</a></p>}<p><a href="/account">{t("copy.your_orders_and_receipts")}</a> · <a href="/contact-us">{t("copy.get_help_with_this_order")}</a></p></section>
}
