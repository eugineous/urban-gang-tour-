// Marketplace capacity adapter. Never sends a provider request or issues refunds.
import {randomUUID} from 'node:crypto';
import type {PoolClient} from '@neondatabase/serverless';
import {db,q,qSchema} from './db';
import {ensureMarketplaceColumns,getMarketplaceEventById,checkoutCommissionPercent,computeSplit} from './marketplace';
import {CAPACITY_COUNTS_SQL,canSellQty,ensureTicketInventorySchema} from './ticket-inventory';
import type {AttemptIdentity,PaystackAttempt} from './paystack-attempts';
import type {OrderRow} from './receipt-email';
export type MarketplaceSelection={eventId:string;tier:number;qty:number};
export type MarketplacePurchase=MarketplaceSelection&{
 version:1;organizerId:string;eventName:string;tierName:string;name:string;eventDate:string;venue:string;
 unit:number;total:number;currency:'KES';commissionPercent:number;commissionAmount:number;organizerAmount:number;
 subaccountCode:string;bearer:'account';channels:['card','mobile_money'];
};
type Event={id:string;organizer_id:string;name:string;event_date:string;venue:string;city:string;description:string;image:string;status:string;tiers:unknown};
type Organizer={id:string;status:string;paystack_subaccount_code:string};
export async function ensureMarketplaceTicketSchema(){await ensureMarketplaceColumns();await ensureTicketInventorySchema()}
export function parseMarketplaceSelection(v:Record<string,unknown>):MarketplaceSelection{
 if(typeof v.eventId!=='string'||!/^mkt-[A-Za-z0-9_-]{1,76}$/.test(v.eventId)||!Number.isSafeInteger(v.tier)||Number(v.tier)<0||Number(v.tier)>11||!Number.isSafeInteger(v.qty)||Number(v.qty)<1||Number(v.qty)>20)throw Error('invalid_ticket');
 return {eventId:v.eventId,tier:Number(v.tier),qty:Number(v.qty)};
}
function tierAt(event:Event|undefined,index:number):{name:string;price:number;capacity:number|null}|null{
 const raw=typeof event?.tiers==='string'?JSON.parse(event.tiers):event?.tiers;
 const tier=Array.isArray(raw)?raw[index]:null;
 return tier&&typeof tier.name==='string'&&tier.name.trim()&&Number.isSafeInteger(tier.price)&&tier.price>0
  ?{name:tier.name,price:tier.price,capacity:Number.isSafeInteger(tier.capacity)&&tier.capacity>=0?tier.capacity:null}:null;
}
function scheduled(event:Pick<Event,'event_date'|'venue'>|undefined){
 const date=event?.event_date||'';return !!event?.venue?.trim()&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date+'T23:59:59+03:00'))&&Date.parse(date+'T23:59:59+03:00')>=Date.now();
}
export async function priceMarketplaceTicket(selection:MarketplaceSelection):Promise<MarketplacePurchase>{
 const event=await getMarketplaceEventById(selection.eventId),tier=tierAt(event as Event|undefined,selection.tier);
 if(!event||event.status!=='published'||event.organizer_status!=='approved'||!event.organizer_subaccount_code||!scheduled(event as Event)||!tier||tier.capacity===null)throw Error('event_not_sellable');
 const total=tier.price*selection.qty;if(!Number.isSafeInteger(total)||total<1||total>2147483647)throw Error('invalid_total');
 const commissionPercent=await checkoutCommissionPercent(),split=computeSplit(total,commissionPercent);
 return {...selection,version:1,organizerId:event.organizer_id,eventName:event.name,tierName:tier.name,name:event.name+' - '+tier.name,eventDate:event.event_date!,venue:event.venue,unit:tier.price,total,currency:'KES',commissionPercent,...split,subaccountCode:event.organizer_subaccount_code,bearer:'account',channels:['card','mobile_money']};
}
export function marketplacePurchase(value:unknown):MarketplacePurchase{
 const p=typeof value==='string'?JSON.parse(value):value;if(!p||typeof p!=='object')throw Error('marketplace_snapshot_invalid');
 parseMarketplaceSelection(p);
 if(p.version!==1||p.currency!=='KES'||p.bearer!=='account'||JSON.stringify(p.channels)!=='["card","mobile_money"]'||!['organizerId','eventName','tierName','name','eventDate','venue','subaccountCode'].every(k=>typeof p[k]==='string'&&p[k].length>0)
  ||!Number.isSafeInteger(p.unit)||p.unit<1||!Number.isSafeInteger(p.total)||p.total!==p.unit*p.qty||p.total>2147483647||!Number.isFinite(p.commissionPercent)||p.commissionPercent<0||p.commissionPercent>100
  ||p.commissionAmount!==computeSplit(p.total,p.commissionPercent).commissionAmount||p.organizerAmount!==p.total-p.commissionAmount)throw Error('marketplace_snapshot_invalid');
 return p as MarketplacePurchase;
}
export async function savedMarketplaceTicket(orderId:string){const rows=await q<{paystack_marketplace:unknown}>('SELECT paystack_marketplace FROM orders WHERE id=$1',[orderId]);return marketplacePurchase(rows[0]?.paystack_marketplace)}
/** Every money/material-edit path uses organizer -> event -> order -> prepared attempt. */
export async function marketplaceTransaction<T>(organizerId:string,eventId:string,work:(client:PoolClient,event:Event|undefined,organizer:Organizer|undefined)=>Promise<T>):Promise<T>{
 const pool=db();if(!pool)throw Error('db_not_configured');let client:PoolClient|undefined;
 try{client=await pool.connect();await client.query('BEGIN');await client.query("SET LOCAL statement_timeout='5s'");
  const organizer=(await client.query<Organizer>('SELECT id,status,paystack_subaccount_code FROM marketplace_organizers WHERE id=$1 FOR UPDATE',[organizerId])).rows[0];
  const event=(await client.query<Event>('SELECT *,event_date::text AS event_date FROM marketplace_events WHERE id=$1 AND organizer_id=$2 FOR UPDATE',[eventId,organizerId])).rows[0];
  const value=await work(client,event,organizer);await client.query('COMMIT');return value;
 }catch(error){await client?.query('ROLLBACK').catch(()=>{});throw error}finally{client?.release();await pool.end().catch(()=>{})}
}
function linesMatch(raw:unknown,p:MarketplacePurchase){
 const lines=typeof raw==='string'?JSON.parse(raw):raw;return Array.isArray(lines)&&lines.length===1&&lines[0]?.id==='ticket:'+p.eventId+':'+p.tier&&lines[0].qty===p.qty&&lines[0].unit===p.unit&&lines[0].name===p.name;
}
async function reserve(client:PoolClient,id:string,p:MarketplacePurchase){
 const prior=(await client.query('SELECT * FROM ticket_reservations WHERE order_id=$1 FOR UPDATE',[id])).rows;
 if(prior.length>1||prior.some(r=>r.event_id!==p.eventId||Number(r.tier_index)!==p.tier||Number(r.qty)!==p.qty||r.status==='consumed'))throw Error('reservation_conflict');
 if(prior.length)await client.query("UPDATE ticket_reservations SET status='held',expires_at=now()+interval '15 minutes' WHERE order_id=$1",[id]);
 else await client.query("INSERT INTO ticket_reservations(id,event_id,tier_index,qty,order_id,status,expires_at) VALUES($1,$2,$3,$4,$5,'held',now()+interval '15 minutes')",['RSV-'+randomUUID(),p.eventId,p.tier,p.qty,id]);
}
function orderMatches(order:Record<string,any>|undefined,p:MarketplacePurchase,reference:string){
 return !!order&&order.pay_method==='card'&&order.paystack_ref===reference&&Number(order.total)===p.total&&order.source==='marketplace'&&order.organizer_id===p.organizerId&&order.marketplace_event_id===p.eventId&&Number(order.commission_amount)===p.commissionAmount&&Number(order.organizer_amount)===p.organizerAmount&&Object.entries(p).every(([key,value])=>JSON.stringify((marketplacePurchase(order.paystack_marketplace) as unknown as Record<string,unknown>)[key])===JSON.stringify(value))&&linesMatch(order.items,p);
}
export async function claimMarketplaceTicket(identity:AttemptIdentity,id:string,p:MarketplacePurchase):Promise<{attempt:PaystackAttempt;nonce:string}|null>{
 return marketplaceTransaction(p.organizerId,p.eventId,async(client,event,organizer)=>{
  const order=(await client.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[id])).rows[0];
  const attempt=(await client.query("SELECT * FROM paystack_checkout_attempts WHERE order_id=$1 AND scope_hash=$2 AND token_hash=$3 AND request_hash=$4 AND state='prepared' FOR UPDATE",[id,identity.scopeHash,identity.tokenHash,identity.requestHash])).rows[0];
  if(!attempt)return null;
  if(!orderMatches(order,p,id)||order.status!=='pending'||Number(attempt.total)!==p.total)throw Error('reservation_conflict');
  const tier=tierAt(event,p.tier);
  if(!event||event.status!=='published'||organizer?.status!=='approved'||organizer.paystack_subaccount_code!==p.subaccountCode||!scheduled(event)||!tier||tier.capacity===null)throw Error('event_not_sellable');
  if(tier.name!==p.tierName||tier.price!==p.unit||event.event_date!==p.eventDate||event.venue!==p.venue)throw Error('ticket_snapshot_conflict');
  const counts=(await client.query(CAPACITY_COUNTS_SQL,[p.eventId,p.tier,p.tierName,id,'ticket:'+p.eventId+':'+p.tier])).rows[0];
  const check=canSellQty({capacity:tier.capacity,sold:Number(counts.sold),reserved:Number(counts.reserved),qty:p.qty,per_order_min:1,per_order_max:20});if(!check.ok)throw Error(check.reason);
  await reserve(client,id,p);const nonce=randomUUID();await client.query("UPDATE paystack_checkout_attempts SET state='initiating',claim_nonce=$2,updated_at=now() WHERE id=$1",[attempt.id,nonce]);
  return {attempt:{id:attempt.id,orderId:id,total:p.total,state:'initiating'},nonce};
 });
}
/** Recognized snapshots never fall through to unconstrained merchandise settlement. */
export async function settleMarketplaceTicket(input:{orderId:string;reference:string;amountKes:number}):Promise<{handled:boolean;order:OrderRow|null}>{
 const markers=await q<{purchase:unknown;source?:string}>("SELECT NULLIF(to_jsonb(o)->'paystack_marketplace','null'::jsonb) AS purchase,to_jsonb(o)->>'source' AS source FROM orders o WHERE id=$1",[input.orderId]);
 if(markers[0]?.purchase==null){
  if(markers[0]?.source!=='marketplace')return {handled:false,order:null};
  // Legacy payable sessions have no proven capacity/split snapshot. Record any
  // new money for operator review, including old uncertain initiations marked
  // failed. Existing paid/fulfilled/refunded orders are untouched.
  await qSchema(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS paystack_marketplace JSONB;
   ALTER TABLE orders ADD COLUMN IF NOT EXISTS ticket_fulfillment_status TEXT;
   ALTER TABLE orders ADD COLUMN IF NOT EXISTS ticket_payment_received_at TIMESTAMPTZ;`);
  await q(`WITH paid AS (
   UPDATE orders SET status='paid',ticket_fulfillment_status='refund_review',ticket_payment_received_at=now()
   WHERE id=$1 AND paystack_ref=$2 AND total=$3 AND pay_method='card' AND source='marketplace'
    AND paystack_marketplace IS NULL AND status=ANY($4::text[]) RETURNING id
  ) INSERT INTO payment_effect_outbox(order_id,effect,gateway)
   SELECT paid.id,effect.name,'paystack' FROM paid CROSS JOIN (VALUES ('reservation'),('inventory'),('tickets'),('receipt')) AS effect(name)
   ON CONFLICT(order_id,effect) DO NOTHING`,[input.orderId,input.reference,input.amountKes,['pending','unknown','reconciling','failed','declined','timed_out']]);
  return {handled:true,order:null};
 }
 const p=marketplacePurchase(markers[0].purchase);await ensureMarketplaceTicketSchema();
 const order=await marketplaceTransaction(p.organizerId,p.eventId,async(client,event)=>{
  const order=(await client.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[input.orderId])).rows[0];
  if(!orderMatches(order,p,input.reference)||p.total!==input.amountKes||order.ticket_payment_received_at||!['pending','unknown','reconciling','failed','declined','timed_out'].includes(order.status))return null;
  const holds=(await client.query("SELECT * FROM ticket_reservations WHERE order_id=$1 AND status='held' FOR UPDATE",[input.orderId])).rows;
  const held=holds.length===1&&holds[0].event_id===p.eventId&&Number(holds[0].tier_index)===p.tier&&Number(holds[0].qty)===p.qty,tier=tierAt(event,p.tier);
  let fulfill=!!event&&scheduled(event)&&!!tier&&tier.capacity!==null&&tier.name===p.tierName&&event.event_date===p.eventDate&&event.venue===p.venue&&event.status==='published';
  if(fulfill){const counts=(await client.query(CAPACITY_COUNTS_SQL,[p.eventId,p.tier,p.tierName,input.orderId,'ticket:'+p.eventId+':'+p.tier])).rows[0];fulfill=Number(counts.sold)+Number(counts.reserved)+p.qty<=tier!.capacity!}
  if(fulfill)await reserve(client,input.orderId,p);else if(held)await client.query("UPDATE ticket_reservations SET status='released' WHERE order_id=$1 AND status='held'",[input.orderId]);
  const paid=(await client.query("UPDATE orders SET status='paid',ticket_fulfillment_status=$2,ticket_payment_received_at=now() WHERE id=$1 RETURNING *",[input.orderId,fulfill?'reserved':'refund_review'])).rows[0];
  await client.query(`INSERT INTO payment_effect_outbox(order_id,effect,gateway) SELECT $1,effect.name,'paystack' FROM (VALUES ('reservation'),('inventory'),('tickets'),('receipt')) AS effect(name) ON CONFLICT(order_id,effect) DO NOTHING`,[input.orderId]);
  return fulfill?paid as OrderRow:null;
 });return {handled:true,order};
}
