// Records attested EXTERNAL money returns. Never initiates a gateway refund.
import {createHash} from 'node:crypto';
import type {PoolClient} from '@neondatabase/serverless';
import {db,hasDb,qSchema} from './db';
export interface RefundInput{orderId:string;amountKes:number;reason:string;actor:string;requestId:string;externalReference:string;externalConfirmed:boolean;ticketCodes:string[]}
let ready:Promise<void>|undefined;
export function ensureRefundSchema(){
 if(!ready)ready=qSchema(`CREATE TABLE IF NOT EXISTS refunds(id SERIAL PRIMARY KEY,order_id TEXT NOT NULL,amount INT NOT NULL,reason TEXT NOT NULL,actor TEXT NOT NULL,created_at TIMESTAMPTZ DEFAULT now());
 CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(order_id);
 ALTER TABLE refunds ADD COLUMN IF NOT EXISTS request_id TEXT;
 ALTER TABLE refunds ADD COLUMN IF NOT EXISTS request_hash TEXT;
 ALTER TABLE refunds ADD COLUMN IF NOT EXISTS external_reference TEXT;
 ALTER TABLE refunds ADD COLUMN IF NOT EXISTS ticket_codes JSONB;
 ALTER TABLE refunds ADD COLUMN IF NOT EXISTS resulting_status TEXT;
 CREATE UNIQUE INDEX IF NOT EXISTS idx_refund_request ON refunds(order_id,request_id) WHERE request_id IS NOT NULL;
 CREATE UNIQUE INDEX IF NOT EXISTS idx_refund_external ON refunds(order_id,external_reference) WHERE external_reference IS NOT NULL;
 ALTER TABLE orders ADD COLUMN IF NOT EXISTS ticket_refund_policy TEXT;
 ALTER TABLE tickets ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;`).catch(error=>{ready=undefined;throw error});
 return ready;
}
function validate(i:RefundInput){
 if(!i||!/^ORD-[A-Z0-9-]{4,40}$/.test(i.orderId))throw Error('invalid_order_id');
 if(!Number.isSafeInteger(i.amountKes)||i.amountKes<1)throw Error('invalid_refund_amount');
 if(typeof i.reason!=='string'||i.reason.trim().length<3||i.reason.length>500)throw Error('refund_reason_required');
 if(typeof i.actor!=='string'||!i.actor||i.actor.length>200)throw Error('invalid_actor');
 if(typeof i.requestId!=='string'||!/^[A-Za-z0-9_-]{32,128}$/.test(i.requestId))throw Error('refund_request_id_required');
 if(i.externalConfirmed!==true)throw Error('external_refund_confirmation_required');
 if(typeof i.externalReference!=='string'||!/^[A-Za-z0-9][A-Za-z0-9 ._:/-]{2,119}$/.test(i.externalReference.trim()))throw Error('external_refund_reference_required');
 if(!Array.isArray(i.ticketCodes)||i.ticketCodes.length>200||i.ticketCodes.some(c=>typeof c!=='string'||!/^TKT-[A-Z0-9-]{4,80}$/.test(c))||new Set(i.ticketCodes).size!==i.ticketCodes.length)throw Error('invalid_ticket_allocation');
}
export async function recordRefund(input:RefundInput){
 validate(input);if(!hasDb())throw Error('db_not_configured');await ensureRefundSchema();
 const reference=input.externalReference.trim().toUpperCase(),codes=[...input.ticketCodes].sort(),reason=input.reason.trim();
 const fingerprint=createHash('sha256').update(JSON.stringify({amount:input.amountKes,reference,reason,codes})).digest('hex');
 const pool=db();if(!pool)throw Error('db_not_configured');let client:PoolClient|undefined;
 try{
  client=await pool.connect();await client.query('BEGIN');await client.query("SET LOCAL statement_timeout='5s'");
  const orders=await client.query('SELECT id,total,status,items,ticket_refund_policy FROM orders WHERE id=$1 FOR UPDATE',[input.orderId]);
  const order=orders.rows[0];if(!order)throw Error('order_not_found');
  const prior=await client.query('SELECT id,request_hash,resulting_status FROM refunds WHERE order_id=$1 AND (request_id=$2 OR external_reference=$3)',[input.orderId,input.requestId,reference]);
  if(prior.rows.length){if(prior.rows.length!==1||prior.rows[0].request_hash!==fingerprint)throw Error('refund_request_conflict');await client.query('COMMIT');return {refundId:Number(prior.rows[0].id),status:String(prior.rows[0].resulting_status),deduped:true,moneyMovement:'external_record_attested' as const}}
  if(!['paid','fulfilled','partially_refunded'].includes(order.status))throw Error('order_not_refundable');
  const sums=await client.query('SELECT COALESCE(SUM(amount),0)::text AS total FROM refunds WHERE order_id=$1',[input.orderId]);
  const previous=Number(sums.rows[0]?.total||0),total=Number(order.total),cumulative=previous+input.amountKes;
  if(!Number.isSafeInteger(previous)||previous<0)throw Error('legacy_refund_review_required');
  if(!Number.isSafeInteger(total)||total<1||!Number.isSafeInteger(cumulative)||cumulative>total)throw Error('refund_exceeds_total');
  if(order.status==='partially_refunded'&&(previous===0||previous>=total))throw Error('legacy_refund_review_required');
  const full=cumulative===total,status=full?'refunded':'partially_refunded';
  const items=typeof order.items==='string'?JSON.parse(order.items):order.items;if(!Array.isArray(items))throw Error('refund_items_unverifiable');
  const ticketLines=items.filter(line=>typeof line?.id==='string'&&line.id.startsWith('ticket:'));
  const tickets=await client.query('SELECT code,event_id,position,voided_at,used_at FROM tickets WHERE order_id=$1 ORDER BY position FOR UPDATE',[input.orderId]);
  let allocated:string[]=[];const allocationKnown=previous===0||order.ticket_refund_policy==='allocated';
  if(!full&&ticketLines.length){
   if(!allocationKnown)throw Error('legacy_refund_review_required');
   if(items.length!==ticketLines.length)throw Error('mixed_refund_allocation_unavailable');
   const entitlement:{eventId:string;unit:number}[]=[];
   for(const line of ticketLines){const parts=line.id.split(':');if(parts.length!==3||!Number.isSafeInteger(line.qty)||line.qty<1||line.qty>200||!Number.isSafeInteger(line.unit)||line.unit<1)throw Error('ticket_allocation_unverifiable');for(let i=0;i<line.qty;i++)entitlement.push({eventId:parts[1],unit:line.unit})}
   if(tickets.rows.length!==entitlement.length||new Set(tickets.rows.map(t=>Number(t.position))).size!==entitlement.length||tickets.rows.some(t=>!entitlement[Number(t.position)-1]||entitlement[Number(t.position)-1].eventId!==t.event_id))throw Error('ticket_allocation_unverifiable');
   if(!codes.length)throw Error('ticket_allocation_required');
   const selected=tickets.rows.filter(t=>codes.includes(t.code));if(selected.length!==codes.length||selected.some(t=>t.voided_at||t.used_at))throw Error('ticket_not_refundable');
   if(selected.reduce((sum,t)=>sum+entitlement[Number(t.position)-1].unit,0)!==input.amountKes)throw Error('ticket_refund_amount_mismatch');
   allocated=codes;
  }else if(full){
   if(codes.some(code=>!tickets.rows.some(t=>t.code===code&&!t.voided_at)))throw Error('ticket_not_refundable');
   if(codes.length&&codes.length!==tickets.rows.filter(t=>!t.voided_at).length)throw Error('ticket_full_allocation_mismatch');
   allocated=tickets.rows.map(t=>t.code);
  }
  else if(codes.length||tickets.rows.length)throw Error('invalid_ticket_allocation');
  const saved=await client.query(`INSERT INTO refunds(order_id,amount,reason,actor,request_id,request_hash,external_reference,ticket_codes,resulting_status)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) RETURNING id`,[input.orderId,input.amountKes,reason,input.actor,input.requestId,fingerprint,reference,JSON.stringify(allocated),status]);
  if(allocated.length)await client.query('UPDATE tickets SET voided_at=COALESCE(voided_at,now()) WHERE order_id=$1 AND code=ANY($2::text[])',[input.orderId,allocated]);
  await client.query('UPDATE orders SET status=$2,ticket_refund_policy=$3 WHERE id=$1',[input.orderId,status,ticketLines.length&&allocationKnown?'allocated':null]);
  await client.query('INSERT INTO audit_log(actor,action,detail) VALUES($1,$2,$3)',[input.actor,'external_refund_recorded',JSON.stringify({id:input.orderId,refundId:saved.rows[0].id,amount:input.amountKes,status,ticketCodes:allocated,externalReference:reference,providerVerified:false})]);
  await client.query('COMMIT');return {refundId:Number(saved.rows[0].id),status,deduped:false,moneyMovement:'external_record_attested' as const};
 }catch(error){await client?.query('ROLLBACK').catch(()=>{});throw error}finally{client?.release();await pool.end().catch(()=>{})}
}
