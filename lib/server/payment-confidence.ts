import {q} from './db';
import {isConfirmedPayment} from './payment-status';

export type DeliveryStatus={
 tickets:'not_required'|'preparing'|'ready'|'review'|'unknown';
 email:'not_requested'|'preparing'|'queued'|'processing'|'accepted'|'review'|'unknown';
};
type Order={id:string;status?:string|null;items?:unknown;email?:string|null};
type EffectRow={effect:string;status:string};

function ticketCount(items:unknown):number|null{
 try{
  const lines=typeof items==='string'?JSON.parse(items):items;
  if(!Array.isArray(lines))return null;
  let count=0;
  for(const item of lines){
   if(!item||typeof item.id!=='string')return null;
   if(!item.id.startsWith('ticket:'))continue;
   if(!/^ticket:[^:]+:\d+$/.test(item.id)||!Number.isSafeInteger(item.qty)||item.qty<1)return null;
   count+=item.qty;
   if(!Number.isSafeInteger(count))return null;
  }
  return count;
 }catch{return null;}
}

/** Read-only and deliberately conservative: neither this poll nor a missing
 * historical table may mint documents, create jobs or imply delivery. */
export async function orderDeliveryStatus(order:Order):Promise<DeliveryStatus>{
 const result:DeliveryStatus={tickets:'unknown',email:'unknown'};
 if(!isConfirmedPayment(order.status))return result;
 const expected=ticketCount(order.items);
 const needsEmail=!!String(order.email||'').trim();
 const [effects,tickets,email]=await Promise.all([
  needsEmail||expected!==null&&expected>0?q<EffectRow>('SELECT effect,status FROM payment_effect_outbox WHERE order_id=$1',[order.id]).catch(()=>null):Promise.resolve(null),
  expected!==null&&expected>0?q<{count:number|string}>('SELECT COUNT(*)::int AS count FROM tickets WHERE order_id=$1 AND voided_at IS NULL',[order.id]).catch(()=>null):Promise.resolve(null),
  needsEmail?q<{status:string}>("SELECT status FROM email_delivery_outbox WHERE order_id=$1 AND delivery='payment' ORDER BY created_at DESC LIMIT 1",[order.id]).catch(()=>null):Promise.resolve(null),
 ]);
 if(expected===0)result.tickets='not_required';
 else if(expected!==null){
  const count=tickets?.[0]?.count;
  const actual=typeof count==='number'||typeof count==='string'&&/^\d+$/.test(count)?Number(count):NaN;
  if(Number.isSafeInteger(actual)&&actual>=expected)result.tickets='ready';
  else if(effects?.some(job=>job.effect==='tickets'&&job.status==='blocked'))result.tickets='review';
  else if(effects?.some(job=>job.effect==='tickets'&&['queued','processing','complete'].includes(job.status)))result.tickets='preparing';
 }
 if(!needsEmail)result.email='not_requested';
 else if(email){
  const status=email[0]?.status;
  if(!email.length)result.email=effects?.some(job=>job.effect==='receipt'&&['blocked','skipped'].includes(job.status))?'review':'preparing';
  else if(['queued','processing','accepted'].includes(status))result.email=status as DeliveryStatus['email'];
  else if(['blocked','failed'].includes(status))result.email='review';
 }
 return result;
}

export type PaymentEffectRecord={order_id:string;gateway:string;effect:string;status:string;attempts:number;updated_at:string};
/** Authorized administrator summaries only; never return a payload/raw error. */
export async function paymentEffectStatus():Promise<PaymentEffectRecord[]>{
 const rows=await q<PaymentEffectRecord>(`SELECT order_id,gateway,effect,status,attempts,updated_at::text
  FROM payment_effect_outbox ORDER BY updated_at DESC LIMIT 100`);
 return rows.filter(row=>/^ORD-[A-Z0-9-]{4,40}$/.test(row.order_id)
  &&['mpesa','stripe','paystack'].includes(row.gateway)
  &&['reservation','inventory','tickets','receipt'].includes(row.effect)
  &&['queued','processing','complete','skipped','blocked'].includes(row.status))
  .map(row=>({order_id:row.order_id,gateway:row.gateway,effect:row.effect,status:row.status,
   attempts:Number.isSafeInteger(Number(row.attempts))?Number(row.attempts):0,updated_at:String(row.updated_at)}));
}
