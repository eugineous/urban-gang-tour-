import {fetchWithTimeout} from './fetch-with-timeout';
export const CHECKOUT_ATTEMPT_KEY='ugt-mpesa-attempt-v1';
export type CheckoutAttempt={key:string;orderId?:string;state?:string};
export type Recovery={id:string;total:number;attemptState:string;paymentStatus:string};
const terminal=['paid','fulfilled','declined','timed_out','failed','refunded','partially_refunded'];
export function readCheckoutAttempt():CheckoutAttempt|null{
 try{const value=JSON.parse(localStorage.getItem(CHECKOUT_ATTEMPT_KEY)||'null');return value&&typeof value.key==='string'&&/^[A-Za-z0-9_-]{32,128}$/.test(value.key)?{key:value.key,...(typeof value.orderId==='string'?{orderId:value.orderId}:{}),...(typeof value.state==='string'?{state:value.state}:{})}:null}catch{return null}
}
function save(record:CheckoutAttempt){
 try{localStorage.setItem(CHECKOUT_ATTEMPT_KEY,JSON.stringify(record));if(readCheckoutAttempt()?.key!==record.key)throw Error()}
 catch{throw Error('checkout_storage_unavailable')}
}
export function rememberCheckoutOrder(key:string,id:string,state:string){save({key,orderId:id,state})}
export function clearCheckoutAttempt(orderId:string){const stored=readCheckoutAttempt();if(stored?.orderId===orderId)try{localStorage.removeItem(CHECKOUT_ATTEMPT_KEY)}catch{}}
/** Persist an opaque key before sending. No contact details or cart in storage.
 * A 404 does NOT authorize a new key: an earlier request might still be preparing.
 */
export async function checkoutAttempt():Promise<{key:string;recovered:Recovery|null}>{
 let stored=readCheckoutAttempt();
 try{if(localStorage.getItem(CHECKOUT_ATTEMPT_KEY)&&!stored)throw Error('checkout_recovery_unavailable')}catch{throw Error('checkout_recovery_unavailable')}
 const session=await fetchWithTimeout('/api/checkout/session',{method:'POST'},10000);
 const sessionData=await session.json();if(!session.ok||!sessionData.ok)throw Error('checkout_session_unavailable');
 if(stored&&sessionData.created)throw Error('checkout_recovery_session_lost');
 if(stored){
  const response=await fetchWithTimeout('/api/checkout/recovery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:stored.key})},10000);
  const data=await response.json();
  if(response.ok&&data.ok&&typeof data.id==='string'&&typeof data.attemptState==='string'&&typeof data.paymentStatus==='string'){
   if(!terminal.includes(data.paymentStatus)){rememberCheckoutOrder(stored.key,data.id,data.attemptState);return {key:stored.key,recovered:data}}
   localStorage.removeItem(CHECKOUT_ATTEMPT_KEY);stored=null;
  }else if(response.status!==404)throw Error('checkout_recovery_unavailable');
 }
 if(!stored){stored={key:crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','')};save(stored)}
 return {key:stored.key,recovered:null};
}
