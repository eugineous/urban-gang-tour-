'use client';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
import {useEffect,useState} from 'react';
import {clearCheckoutAttempt} from '@/lib/client/checkout-attempt';
import {clearPaystackAttempt} from '@/lib/client/paystack-checkout-attempt';
import {paymentPresentation} from '@/lib/client/payment-presentation';
import {paymentFeedback,type PaymentDelivery} from '@/lib/client/payment-feedback';
import PaymentResultScreen from './PaymentResultScreen';

export default function PaymentStatus({orderId}:{orderId:string}){
 const [result,setResult]=useState<{orderId:string;status:string;total?:number;method?:string}>({orderId,status:'pending'}),[error,setError]=useState(false),[attempt,setAttempt]=useState(0),[stopped,setStopped]=useState(false);
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
    setResult({orderId,status:d.status==='pending'&&d.attemptState==='unknown'?'unknown':d.status,total:typeof d.total==='number'&&Number.isFinite(d.total)&&d.total>=0?d.total:undefined,method:['mpesa','card','comp'].includes(d.method)?d.method:undefined});setError(false);
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
 return <PaymentResultScreen key={orderId} orderId={orderId} status={currentOrder?result.status:'pending'} delivery={currentOrder?delivery:{tickets:'unknown',email:'unknown'}} total={currentOrder?result.total:undefined} method={currentOrder?result.method:undefined} remainingTickets={currentOrder&&remainingTickets} offline={offline} error={error} stopped={stopped} checking={checking} onCheck={()=>setAttempt(n=>n+1)}/>;
}
