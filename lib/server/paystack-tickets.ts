// Owned-event capacity and hosted-payment boundaries. No provider cancellation
// or refund API is called here. Event -> order -> attempt is the lock order.
import {randomUUID} from 'node:crypto';
import type {PoolClient} from '@neondatabase/serverless';
import {db,q,qSchema} from './db';
import {CAPACITY_COUNTS_SQL,canSellQty,ensureTicketInventorySchema,parseTierInventory} from './ticket-inventory';
import {ensurePaystackAttemptSchema,type AttemptIdentity,type PaystackAttempt} from './paystack-attempts';
import type {OrderRow} from './receipt-email';

export type TicketSelection={eventId:string;tier:number;qty:number};
export type TicketPurchase=TicketSelection&{tierName:string;unit:number;name:string};
type EventRow={id:string;slug:string;name:string;kind:string;status:string;event_date:string;venue:string;tiers:unknown;sales_start_at:string|null;sales_end_at:string|null};
const EVENT_SQL='SELECT id,slug,name,kind,status,event_date::text,venue,tiers,sales_start_at::text,sales_end_at::text FROM tour_events WHERE id=$1';
let schema:Promise<void>|undefined;
export function ensurePaystackTicketSchema():Promise<void>{
 if(!schema)schema=(async()=>{
  await ensureTicketInventorySchema();await ensurePaystackAttemptSchema();
  await qSchema(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS paystack_ticket JSONB;
   ALTER TABLE orders ADD COLUMN IF NOT EXISTS ticket_fulfillment_status TEXT;
   ALTER TABLE orders ADD COLUMN IF NOT EXISTS ticket_payment_received_at TIMESTAMPTZ;`);
 })().catch(error=>{schema=undefined;throw error});return schema;
}
export function parseTicketSelection(value:unknown):TicketSelection{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid_ticket');
 const v=value as Record<string,unknown>;
 if(Object.keys(v).some(key=>!['eventId','tier','qty'].includes(key))||typeof v.eventId!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(v.eventId)
  ||!Number.isSafeInteger(v.tier)||Number(v.tier)<0||!Number.isSafeInteger(v.qty)||Number(v.qty)<1||Number(v.qty)>20)throw Error('invalid_ticket');
 return {eventId:v.eventId,tier:Number(v.tier),qty:Number(v.qty)};
}
function scheduleReady(event:EventRow):boolean{
 const date=event.event_date||'';const parsed=/^\d{4}-\d{2}-\d{2}$/.test(date)?new Date(date+'T12:00:00+03:00'):null;
 return !!event.venue?.trim()&&!!parsed&&Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===date&&Date.parse(date+'T23:59:59+03:00')>=Date.now();
}
function windowOpen(event:EventRow):boolean{
 const now=Date.now();return (!event.sales_start_at||Number.isFinite(Date.parse(event.sales_start_at))&&Date.parse(event.sales_start_at)<=now)
  &&(!event.sales_end_at||Number.isFinite(Date.parse(event.sales_end_at))&&Date.parse(event.sales_end_at)>now);
}
function offer(event:EventRow|undefined,selection:TicketSelection):TicketPurchase{
 const tier=parseTierInventory(event?.tiers)[selection.tier];
 if(!event||event.kind!=='ticketed'||!event.slug||event.status!=='published'||!scheduleReady(event)||!windowOpen(event)||!tier||tier.capacity===null||tier.price<1)throw Error('event_not_sellable');
 const check=canSellQty({...tier,sold:0,reserved:0,qty:selection.qty});if(!check.ok)throw Error(check.reason);
 return {...selection,tierName:tier.name,unit:tier.price,name:event.name+' - '+tier.name};
}
export async function pricePaystackTicket(selection:TicketSelection):Promise<TicketPurchase>{
 const rows=await q<EventRow>(EVENT_SQL,[selection.eventId]);return offer(rows[0],selection);
}
function storedPurchase(value:unknown):TicketPurchase{
 const v=typeof value==='string'?JSON.parse(value):value;
 if(!v||typeof v!=='object')throw Error('ticket_snapshot_invalid');
 const selection=parseTicketSelection({eventId:v.eventId,tier:v.tier,qty:v.qty});
 if(typeof v.tierName!=='string'||!v.tierName||typeof v.name!=='string'||!Number.isSafeInteger(v.unit)||v.unit<1||v.unit*selection.qty>2147483647)throw Error('ticket_snapshot_invalid');
 return {...selection,tierName:v.tierName,unit:v.unit,name:v.name};
}
export async function savedPaystackTicket(orderId:string):Promise<TicketPurchase>{
 const rows=await q<{paystack_ticket:unknown}>('SELECT paystack_ticket FROM orders WHERE id=$1',[orderId]);return storedPurchase(rows[0]?.paystack_ticket);
}
async function transaction<T>(work:(client:PoolClient)=>Promise<T>):Promise<T>{
 const pool=db();if(!pool)throw Error('db_not_configured');let client:PoolClient|undefined;
 try{client=await pool.connect();await client.query('BEGIN');await client.query("SET LOCAL statement_timeout='5s'");const result=await work(client);await client.query('COMMIT');return result}
 catch(error){await client?.query('ROLLBACK').catch(()=>{});throw error}finally{client?.release();await pool.end().catch(()=>{})}
}
function samePurchase(a:TicketPurchase,b:TicketPurchase){return a.eventId===b.eventId&&a.tier===b.tier&&a.qty===b.qty&&a.tierName===b.tierName&&a.unit===b.unit&&a.name===b.name}
function matchingLines(raw:unknown,purchase:TicketPurchase):boolean{
 try{
  const lines=typeof raw==='string'?JSON.parse(raw):raw;if(!Array.isArray(lines)||lines.length!==1)return false;
  const line=lines[0];return line?.id==='ticket:'+purchase.eventId+':'+purchase.tier&&line.qty===purchase.qty&&line.unit===purchase.unit&&line.name===purchase.name;
 }catch{return false}
}
async function reserve(client:PoolClient,orderId:string,purchase:TicketPurchase){
 const holds=await client.query('SELECT * FROM ticket_reservations WHERE order_id=$1 FOR UPDATE',[orderId]);
 if(holds.rows.length>1||holds.rows.some(r=>r.event_id!==purchase.eventId||Number(r.tier_index)!==purchase.tier||Number(r.qty)!==purchase.qty||r.status==='consumed'))throw Error('reservation_conflict');
 if(holds.rows.length)await client.query("UPDATE ticket_reservations SET status='held',expires_at=now()+interval '15 minutes' WHERE order_id=$1",[orderId]);
 else await client.query("INSERT INTO ticket_reservations(id,event_id,tier_index,qty,order_id,status,expires_at) VALUES($1,$2,$3,$4,$5,'held',now()+interval '15 minutes')",['RSV-'+randomUUID(),purchase.eventId,purchase.tier,purchase.qty,orderId]);
}
// Hold and send permission commit together. No browser/timer can reclaim it.
export async function claimPaystackTicket(identity:AttemptIdentity,orderId:string,purchase:TicketPurchase):Promise<{attempt:PaystackAttempt;nonce:string}|null>{
 await ensurePaystackTicketSchema();
 return transaction(async client=>{
  const event=(await client.query<EventRow>(EVENT_SQL+' FOR UPDATE',[purchase.eventId])).rows[0];
  const order=(await client.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[orderId])).rows[0];
  const attempt=(await client.query("SELECT * FROM paystack_checkout_attempts WHERE order_id=$1 AND scope_hash=$2 AND token_hash=$3 AND request_hash=$4 FOR UPDATE",[orderId,identity.scopeHash,identity.tokenHash,identity.requestHash])).rows[0];
  if(!attempt||attempt.state!=='prepared')return null;
  if(!order||order.status!=='pending'||order.pay_method!=='card'||order.paystack_ref!==orderId||Number(order.total)!==purchase.unit*purchase.qty||!samePurchase(storedPurchase(order.paystack_ticket),purchase)||!matchingLines(order.items,purchase))throw Error('reservation_conflict');
  const current=offer(event,purchase);if(current.tierName!==purchase.tierName)throw Error('ticket_snapshot_conflict');
  const tier=parseTierInventory(event.tiers)[purchase.tier];
  const counts=(await client.query(CAPACITY_COUNTS_SQL,[purchase.eventId,purchase.tier,purchase.tierName,orderId,'ticket:'+purchase.eventId+':'+purchase.tier])).rows[0];
  const check=canSellQty({...tier,qty:purchase.qty,sold:Number(counts.sold),reserved:Number(counts.reserved)});if(!check.ok)throw Error(check.reason);
  await reserve(client,orderId,purchase);const nonce=randomUUID();
  await client.query("UPDATE paystack_checkout_attempts SET state='initiating',claim_nonce=$2,updated_at=now() WHERE id=$1",[attempt.id,nonce]);
  return {attempt:{id:attempt.id,orderId,total:Number(order.total),state:'initiating'},nonce};
 });
}

/** Return handled=true even for duplicate/refunded/review outcomes so the
 * generic merchandise settlement cannot reopen the ledger afterward. */
export async function settleOwnedPaystackTicket(input:{orderId:string;reference:string;amountKes:number}):Promise<{handled:boolean;order:OrderRow|null}>{
 const markers=await q<{paystack_ticket:unknown}>("SELECT to_jsonb(o)->'paystack_ticket' AS paystack_ticket FROM orders o WHERE id=$1",[input.orderId]);
 if(markers[0]?.paystack_ticket==null)return {handled:false,order:null};
 const purchase=storedPurchase(markers[0].paystack_ticket);await ensurePaystackTicketSchema();
 const order=await transaction(async client=>{
  const event=(await client.query<EventRow>(EVENT_SQL+' FOR UPDATE',[purchase.eventId])).rows[0];
  const order=(await client.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[input.orderId])).rows[0];
  if(!order||order.pay_method!=='card'||order.paystack_ref!==input.reference||Number(order.total)!==input.amountKes||purchase.unit*purchase.qty!==input.amountKes
   ||!samePurchase(storedPurchase(order.paystack_ticket),purchase)||order.ticket_payment_received_at
   ||!['pending','unknown','reconciling','failed','declined','timed_out'].includes(order.status))return null;
  const holds=await client.query("SELECT * FROM ticket_reservations WHERE order_id=$1 AND status='held' FOR UPDATE",[input.orderId]);
  const held=holds.rows.length===1&&holds.rows[0].event_id===purchase.eventId&&Number(holds.rows[0].tier_index)===purchase.tier&&Number(holds.rows[0].qty)===purchase.qty;
  const tier=parseTierInventory(event?.tiers)[purchase.tier];
  let fulfill=matchingLines(order.items,purchase)&&!!event&&event.kind==='ticketed'&&scheduleReady(event)&&!!tier&&tier.capacity!==null&&tier.name===purchase.tierName
   &&(held?['published','sales_paused','sold_out','ongoing'].includes(event.status):event.status==='published'&&windowOpen(event));
  if(fulfill){
   const counts=(await client.query(CAPACITY_COUNTS_SQL,[purchase.eventId,purchase.tier,purchase.tierName,input.orderId,'ticket:'+purchase.eventId+':'+purchase.tier])).rows[0];
   fulfill=Number(counts.sold)+Number(counts.reserved)+purchase.qty<=tier.capacity!;
  }
  if(fulfill)await reserve(client,input.orderId,purchase);
  else await client.query("UPDATE ticket_reservations SET status='released' WHERE order_id=$1 AND status='held'",[input.orderId]);
  const paid=(await client.query("UPDATE orders SET status='paid',ticket_fulfillment_status=$2,ticket_payment_received_at=now() WHERE id=$1 RETURNING *",[input.orderId,fulfill?'reserved':'refund_review'])).rows[0];
  await client.query(`INSERT INTO payment_effect_outbox(order_id,effect,gateway)
   SELECT $1,effect.name,'paystack' FROM (VALUES ('reservation'),('inventory'),('tickets'),('receipt')) AS effect(name)
   ON CONFLICT(order_id,effect) DO NOTHING`,[input.orderId]);
  return fulfill?paid as OrderRow:null;
 });return {handled:true,order};
}
