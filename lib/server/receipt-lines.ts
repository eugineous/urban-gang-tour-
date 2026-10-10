import {orderLines} from './catalog';
import {q,hasDb} from './db';

/** Use the order's already-discounted prices and recorded fee, never today's catalogue or delivery configuration. */
export async function receiptLines(order:{id:string;items:unknown;pay_method?:string|null}){
 const items=typeof order.items==='string'?JSON.parse(order.items):order.items;
 const lines=orderLines(Array.isArray(items)?items:[]);
 if(order.pay_method==='comp'||!hasDb())return lines;
 // Optional for historical orders created before delivery preferences existed.
 const rows=await q<{method:string;fee:number}>('SELECT method,fee FROM order_delivery_preferences WHERE order_id=$1',[order.id]).catch(error=>{
  if(error?.code==='42P01')return []; // Optional table absent on a historical installation.
  throw error; // Do not issue an incomplete receipt during a transient read failure.
 });
 const preference=rows[0],fee=Number(preference?.fee);
 if(preference?.method==='delivery'&&Number.isSafeInteger(fee)&&fee>0)lines.push({name:'Merchandise delivery',qty:1,unit:fee,total:fee});
 return lines;
}
