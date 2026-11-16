import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {paystackTicketsEnabled} from './paystack-ticket-policy';
import {checkoutDeliveryContact,ensureCheckoutFulfillmentSchema} from './checkout-fulfillment';
import {checkoutPrincipal} from './checkout-session';
import {ensureCustomerAccountSchema,validatedCurrentBuyer} from './customer-account';
import {paystackInit} from './paystack';
import {q} from './db';
import {paystackAttemptIdentity,recoverPaystackAttempt,preparePaystackAttempt,recordPaystackAuthorization,markPaystackInitiationUnknown,PaystackAttemptConflict,type PaystackAttempt} from './paystack-attempts';
import {claimPaystackTicket,ensurePaystackTicketSchema,parseTicketSelection,pricePaystackTicket,savedPaystackTicket} from './paystack-tickets';
const respond=(attempt:PaystackAttempt)=>NextResponse.json({ok:true,id:attempt.orderId,orderId:attempt.orderId,total:attempt.total,attemptState:attempt.state,...(attempt.authorizationUrl?{authorizationUrl:attempt.authorizationUrl}:{})},{status:attempt.authorizationUrl?200:202});
/** The parent route already enforces same-origin, crowd budgets and JSON shape. */
export async function checkoutPaystackTicket(req:Request,body:Record<string,unknown>):Promise<Response>{
 if(!paystackTicketsEnabled())return NextResponse.json({error:'ticket_payments_unavailable'},{status:503});
 let contact:ReturnType<typeof checkoutDeliveryContact>,selection:ReturnType<typeof parseTicketSelection>,email:string;
 try{
  if(Object.keys(body).some(key=>!['ticket','name','phone','email','idempotencyKey'].includes(key)))throw Error('invalid_ticket_checkout');
  selection=parseTicketSelection(body.ticket);contact=checkoutDeliveryContact(body,false);
  if(body.email!==undefined&&typeof body.email!=='string')throw Error('invalid_email');
  email=typeof body.email==='string'?body.email.trim():'';if(email&&(email.length>200||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)))throw Error('invalid_email');
  if(typeof body.idempotencyKey!=='string'||!/^[A-Za-z0-9_-]{32,128}$/.test(body.idempotencyKey))throw Error('invalid_idempotency_key');
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'invalid_ticket'},{status:400})}
 const owner=checkoutPrincipal(req);if(!owner)return NextResponse.json({error:'checkout_session_required'},{status:428});
 const identity=paystackAttemptIdentity(owner,body.idempotencyKey as string,{ticket:selection,...contact,email});
 let attempt:PaystackAttempt|null=null;
 try{
  await q("ALTER TABLE orders ADD COLUMN IF NOT EXISTS pay_method TEXT DEFAULT 'mpesa'");await q('ALTER TABLE orders ADD COLUMN IF NOT EXISTS paystack_ref TEXT');
  await ensurePaystackTicketSchema();await ensureCheckoutFulfillmentSchema();await ensureCustomerAccountSchema();
  attempt=await recoverPaystackAttempt(identity);if(attempt&&attempt.state!=='prepared')return respond(attempt);
  let purchase=attempt?await savedPaystackTicket(attempt.orderId):await pricePaystackTicket(selection);
  if(!attempt){
   const buyer=await validatedCurrentBuyer(req),id='ORD-'+randomUUID().replaceAll('-','').toUpperCase();
   const prepared=await preparePaystackAttempt(identity,{id,items:[{id:'ticket:'+purchase.eventId+':'+purchase.tier,qty:purchase.qty,name:purchase.name,unit:purchase.unit}],total:purchase.unit*purchase.qty,...contact,email,userId:buyer?.id||null,fulfillment:null,ticket:purchase});
   attempt=prepared.attempt;
   // Recover the accepted immutable price even if another concurrent prepare won.
   if(!prepared.created){const recovered=await recoverPaystackAttempt(identity);if(recovered&&recovered.state!=='prepared')return respond(recovered);purchase=await savedPaystackTicket(attempt.orderId)}
  }
  const claim=await claimPaystackTicket(identity,attempt.orderId,purchase);
  if(!claim){const recovered=await recoverPaystackAttempt(identity);if(!recovered)throw Error('recovery_unavailable');return respond(recovered)}
  try{
   const result=await paystackInit({email:email||'guest+'+attempt.orderId.toLowerCase()+'@urbangangtour.co.ke',amountKes:claim.attempt.total,reference:attempt.orderId,callbackUrl:'https://urbangangtour.co.ke/pay/success?ref='+encodeURIComponent(attempt.orderId),metadata:{order_id:attempt.orderId},channels:['card','mobile_money']});
   if(!result.ok||!result.url||!await recordPaystackAuthorization(claim.attempt.id,claim.nonce,result.url))throw Error('initialization_uncertain');
   return respond({...claim.attempt,state:'ready',authorizationUrl:result.url});
  }catch{await markPaystackInitiationUnknown(claim.attempt.id,claim.nonce).catch(()=>false);return respond({...claim.attempt,state:'unknown'})}
 }catch(error){
  const code=error instanceof Error?error.message:'';
  const invalid=['invalid_ticket','event_not_sellable','sold_out','insufficient_inventory','below_min','above_max','ticket_snapshot_conflict','reservation_conflict'].includes(code);
  return NextResponse.json({error:error instanceof PaystackAttemptConflict?'attempt_request_conflict':invalid?code:'ticket_checkout_unavailable',...(attempt?{id:attempt.orderId,orderId:attempt.orderId,total:attempt.total,attemptState:attempt.state}:{})},{status:error instanceof PaystackAttemptConflict?409:invalid?400:503});
 }
}
