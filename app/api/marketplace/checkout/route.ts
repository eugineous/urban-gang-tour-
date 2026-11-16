import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {rateLimit,clientIp,PURCHASE_NETWORK_LIMIT} from '@/lib/server/ratelimit';
import {sameOrigin} from '@/lib/server/origin';
import {paystackConfigured,paystackInit} from '@/lib/server/paystack';
import {checkoutPrincipal} from '@/lib/server/checkout-session';
import {ensureCheckoutFulfillmentSchema} from '@/lib/server/checkout-fulfillment';
import {ensureCustomerAccountSchema,validatedCurrentBuyer} from '@/lib/server/customer-account';
import {readJsonObject} from '@/lib/server/json-body';
import {paystackAttemptIdentity,recoverPaystackAttempt,preparePaystackAttempt,recordPaystackAuthorization,markPaystackInitiationUnknown,PaystackAttemptConflict,type PaystackAttempt} from '@/lib/server/paystack-attempts';
import {ensureMarketplaceTicketSchema,parseMarketplaceSelection,priceMarketplaceTicket,savedMarketplaceTicket,claimMarketplaceTicket} from '@/lib/server/paystack-marketplace-tickets';
export const runtime='nodejs';
// Public, same-origin signed guest scope; optional buyer account. Never trusts prices.
const reply=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const respond=(a:PaystackAttempt)=>reply({ok:true,id:a.orderId,orderId:a.orderId,total:a.total,attemptState:a.state,...(a.authorizationUrl?{authorizationUrl:a.authorizationUrl}:{})},a.authorizationUrl?200:202);
export async function POST(req:Request){
 if(!sameOrigin(req))return reply({error:'bad_origin'},403);
 if(!rateLimit('mkt-checkout:'+clientIp(req),8,60000,req,PURCHASE_NETWORK_LIMIT))return reply({error:'too_many_requests'},429);
 if(!paystackConfigured())return reply({error:'paystack_not_configured'},503);
 const parsed=await readJsonObject(req);
 if(!parsed.ok)return reply({error:parsed.error},parsed.status);
 const body=parsed.value;
 if(Object.keys(body).some(k=>!['eventId','tier','qty','name','email','idempotencyKey'].includes(k)))return reply({error:'unexpected_field'},400);
 let selection:ReturnType<typeof parseMarketplaceSelection>;
 try{selection=parseMarketplaceSelection(body)}catch{return reply({error:'invalid_ticket'},400)}
 if(typeof body.name!=='string'||body.name.trim().length<2||body.name.length>100||/[\u0000-\u001f]/.test(body.name))return reply({error:'invalid_name'},400);
 if(body.email!==undefined&&typeof body.email!=='string')return reply({error:'invalid_email'},400);
 const name=body.name.trim(),email=typeof body.email==='string'?body.email.trim():'';
 if(email&&(email.length>200||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)))return reply({error:'invalid_email'},400);
 if(typeof body.idempotencyKey!=='string'||!/^[A-Za-z0-9_-]{32,128}$/.test(body.idempotencyKey))return reply({error:'invalid_idempotency_key'},400);
 const owner=checkoutPrincipal(req);if(!owner)return reply({error:'checkout_session_required'},428);
 const identity=paystackAttemptIdentity(owner,body.idempotencyKey,{marketplace:selection,name,email});let attempt:PaystackAttempt|null=null;
 try{
  await ensureMarketplaceTicketSchema();await ensureCheckoutFulfillmentSchema();await ensureCustomerAccountSchema();
  attempt=await recoverPaystackAttempt(identity);if(attempt&&attempt.state!=='prepared')return respond(attempt);
  let purchase=attempt?await savedMarketplaceTicket(attempt.orderId):await priceMarketplaceTicket(selection);
  if(!attempt){
   const buyer=await validatedCurrentBuyer(req),prepared=await preparePaystackAttempt(identity,{id:'ORD-'+randomUUID().replaceAll('-','').toUpperCase(),items:[{id:'ticket:'+purchase.eventId+':'+purchase.tier,qty:purchase.qty,name:purchase.name,unit:purchase.unit}],total:purchase.total,name,email,phone:'',userId:buyer?.id||null,fulfillment:null,marketplace:purchase});attempt=prepared.attempt;
   if(!prepared.created){const recovered=await recoverPaystackAttempt(identity);if(recovered&&recovered.state!=='prepared')return respond(recovered);purchase=await savedMarketplaceTicket(attempt.orderId)}
  }
  const claim=await claimMarketplaceTicket(identity,attempt.orderId,purchase);
  if(!claim){const recovered=await recoverPaystackAttempt(identity);if(!recovered)throw Error('recovery_unavailable');return respond(recovered)}
  try{
   const result=await paystackInit({email:email||'guest+'+attempt.orderId.toLowerCase()+'@urbangangtour.co.ke',amountKes:purchase.total,reference:attempt.orderId,callbackUrl:'https://urbangangtour.co.ke/pay/success?ref='+encodeURIComponent(attempt.orderId),metadata:{order_id:attempt.orderId,marketplace_event_id:purchase.eventId,organizer_id:purchase.organizerId},channels:purchase.channels,subaccountCode:purchase.subaccountCode,transactionChargeKes:purchase.commissionAmount,bearer:purchase.bearer});
   if(!result.ok||!result.url||!await recordPaystackAuthorization(claim.attempt.id,claim.nonce,result.url))throw Error('initialization_uncertain');
   return respond({...claim.attempt,state:'ready',authorizationUrl:result.url});
  }catch{await markPaystackInitiationUnknown(claim.attempt.id,claim.nonce).catch(()=>false);return respond({...claim.attempt,state:'unknown'})}
 }catch(error){
  const code=error instanceof Error?error.message:'',invalid=['invalid_ticket','event_not_sellable','invalid_total','sold_out','insufficient_inventory','ticket_snapshot_conflict','reservation_conflict'].includes(code);
  return reply({error:error instanceof PaystackAttemptConflict?'attempt_request_conflict':invalid?code:'marketplace_checkout_unavailable',...(attempt?{id:attempt.orderId,total:attempt.total,attemptState:attempt.state}:{})},error instanceof PaystackAttemptConflict?409:invalid?400:503);
 }
}
