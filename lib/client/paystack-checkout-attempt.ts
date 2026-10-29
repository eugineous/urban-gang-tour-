import {fetchWithTimeout} from './fetch-with-timeout';
import {paymentPresentation} from './payment-presentation';

export const PAYSTACK_ATTEMPT_KEY='ugt-paystack-attempt-v1';
type PaystackAttempt={key:string;orderId?:string;state?:string};
type PaystackRecovery={id:string;total:number;attemptState:string;paymentStatus:string;authorizationUrl?:string};

export function readPaystackAttempt():PaystackAttempt|null{
 try{
  const value=JSON.parse(localStorage.getItem(PAYSTACK_ATTEMPT_KEY)||'null');
  return value&&typeof value.key==='string'&&/^[A-Za-z0-9_-]{32,128}$/.test(value.key)?{key:value.key,...(typeof value.orderId==='string'?{orderId:value.orderId}:{}),...(typeof value.state==='string'?{state:value.state}:{})}:null;
 }catch{return null}
}
function save(record:PaystackAttempt){
 try{localStorage.setItem(PAYSTACK_ATTEMPT_KEY,JSON.stringify(record));if(readPaystackAttempt()?.key!==record.key)throw Error()}
 catch{throw Error('checkout_storage_unavailable')}
}
function requireCurrentKey(key:string|undefined){
 const current=readPaystackAttempt();
 try{if(localStorage.getItem(PAYSTACK_ATTEMPT_KEY)&&!current||current?.key!==key)throw Error()}
 catch{throw Error('checkout_recovery_unavailable')}
}
export function rememberPaystackOrder(key:string,id:string,state:string){
 const current=readPaystackAttempt();
 if(current&&(current.key!==key||current.orderId&&current.orderId!==id))throw Error('checkout_recovery_unavailable');
 save({key,orderId:id,state});
}
export function clearPaystackAttempt(orderId:string){
 if(readPaystackAttempt()?.orderId===orderId)try{localStorage.removeItem(PAYSTACK_ATTEMPT_KEY)}catch{}
}

/** Keep only an opaque reference. A lost acknowledgement never permits a new
 * attempt key: the earlier request may still be preparing its durable order. */
export async function paystackCheckoutAttempt():Promise<{key:string;recovered:PaystackRecovery|null}>{
 let stored=readPaystackAttempt();
 try{if(localStorage.getItem(PAYSTACK_ATTEMPT_KEY)&&!stored)throw Error()}
 catch{throw Error('checkout_recovery_unavailable')}
 const session=await fetchWithTimeout('/api/checkout/session',{method:'POST'},10000);
 const sessionData=await session.json();
 if(!session.ok||!sessionData.ok)throw Error('checkout_session_unavailable');
 requireCurrentKey(stored?.key);
 if(stored&&sessionData.created)throw Error('checkout_recovery_session_lost');
 if(stored){
  const response=await fetchWithTimeout('/api/checkout/recovery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:stored.key,provider:'paystack'})},10000);
  const data=await response.json();
  requireCurrentKey(stored.key);
  if(response.ok&&data.ok&&typeof data.id==='string'&&data.id&&Number.isSafeInteger(data.total)&&data.total>0&&typeof data.attemptState==='string'&&typeof data.paymentStatus==='string'){
   if(stored.orderId&&stored.orderId!==data.id)throw Error('checkout_recovery_unavailable');
   // A completed order may have missed its browser return. Keep its reference
   // so retrying checkout opens status instead of creating another purchase.
   rememberPaystackOrder(stored.key,data.id,data.attemptState);
   return {key:stored.key,recovered:{id:data.id,total:data.total,attemptState:data.attemptState,paymentStatus:data.paymentStatus,...(!paymentPresentation(data.paymentStatus).terminal&&data.attemptState==='ready'&&typeof data.authorizationUrl==='string'?{authorizationUrl:data.authorizationUrl}:{})}};
  }else if(response.status===404){
   if(stored.orderId&&stored.state!=='prepared')return {key:stored.key,recovered:{id:stored.orderId,total:0,attemptState:stored.state||'unknown',paymentStatus:'pending'}};
  }else throw Error('checkout_recovery_unavailable');
 }
 if(!stored){stored={key:crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','')};save(stored)}
 return {key:stored.key,recovered:null};
}
