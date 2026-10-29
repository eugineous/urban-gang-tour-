import {recordOrderReferral} from '@/lib/server/affiliate-program';
import { NextResponse,after } from 'next/server';
import { randomUUID } from 'crypto';
import { getProducts, serverTotalWithPromos } from '@/lib/server/catalog';
import { recordPromoCodeUse } from '@/lib/server/promos';
import { rateLimit, clientIp, PURCHASE_NETWORK_LIMIT } from '@/lib/server/ratelimit';
import { sameOrigin } from '@/lib/server/origin';
import { alertCritical } from '@/lib/server/alert';
import { paystackConfigured, paystackInit } from '@/lib/server/paystack';
import { applyVerifiedMerchVariants } from '@/lib/server/merch-variants';
import { applyVerifiedMerchPersonalization } from '@/lib/server/merch-personalization';
import { normalizePrintableName } from '@/lib/shared/merch-personalization';
import {checkoutDeliveryContact,resolveCheckoutFulfillment,ensureCheckoutFulfillmentSchema} from '@/lib/server/checkout-fulfillment';
import {validatedCurrentBuyer,ensureCustomerAccountSchema} from '@/lib/server/customer-account';
import { assertMerchStockAvailable } from '@/lib/server/inventory';
import {checkoutPrincipal} from '@/lib/server/checkout-session';
import {q,hasDb} from '@/lib/server/db';
import {paystackAttemptIdentity,recoverPaystackAttempt,preparePaystackAttempt,claimPaystackInitiation,recordPaystackAuthorization,markPaystackInitiationUnknown,savedPaystackPurchase,PaystackAttemptConflict,type PaystackAttempt} from '@/lib/server/paystack-attempts';

// Card checkout via Paystack (KES, Kenyan settlement). Mirrors the Stripe
// route: strict schema, prices ONLY from lib/server/catalog.ts, ledger row
// written before the processor call so the webhook always reconciles.

export const runtime = 'nodejs';

const CALLBACK_URL = 'https://urbangangtour.co.ke/pay/success';
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

let columnsReady = false;
async function ensureColumns(q: (sql: string, params?: any[]) => Promise<any[]>) {
  if (columnsReady) return;
  await q(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS pay_method TEXT DEFAULT 'mpesa'`);
  await q(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS paystack_ref TEXT`);
  columnsReady = true;
}

export async function POST(req: Request) {
  const response=await checkout(req);
  response.headers.set('Cache-Control','no-store');
  return response;
}
function attemptResponse(attempt:PaystackAttempt){
 return NextResponse.json({ok:true,id:attempt.orderId,orderId:attempt.orderId,total:attempt.total,attemptState:attempt.state,...(attempt.authorizationUrl?{authorizationUrl:attempt.authorizationUrl}:{})},{status:attempt.authorizationUrl?200:202});
}
async function checkout(req:Request){
  if (!sameOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  // Per device, not per IP — a venue on one NAT must not share one budget.
  // See lib/server/ratelimit.ts.
  if (!rateLimit('paystack:' + clientIp(req), 8, 60_000, req, PURCHASE_NETWORK_LIMIT)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const allowed = new Set(['items', 'email', 'promoCode', 'fulfillment', 'referralCode', 'name', 'phone','idempotencyKey']);
  for (const k of Object.keys(body)) {
    if (!allowed.has(k)) return NextResponse.json({ error: `unexpected_field:${k}` }, { status: 400 });
  }
  const { items, email, promoCode, fulfillment, referralCode, name, phone,idempotencyKey } = body;
  if(referralCode!==undefined&&(typeof referralCode!=='string'||!/^[a-f0-9]{24}$/.test(referralCode)))return NextResponse.json({error:'invalid_referral_code'},{status:400});
  let contact:ReturnType<typeof checkoutDeliveryContact>;
  try{contact=checkoutDeliveryContact({name,phone},false)}catch(e:any){return NextResponse.json({error:String(e.message)},{status:400})}
  if (promoCode !== undefined && (typeof promoCode !== 'string' || promoCode.length > 60)) {
    return NextResponse.json({ error: 'invalid_promo_code' }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
    return NextResponse.json({ error: 'invalid_items' }, { status: 400 });
  }
  for (const it of items) {
    if (!it || typeof it !== 'object' || Array.isArray(it)) {
      return NextResponse.json({ error: 'invalid_item' }, { status: 400 });
    }
    for (const k of Object.keys(it)) {
      if (k !== 'id' && k !== 'qty' && k !== 'variant' && k !== 'printableName') return NextResponse.json({ error: `unexpected_field:items.${k}` }, { status: 400 });
    }
    if (typeof it.id !== 'string' || !it.id || it.id.length>200) {
      return NextResponse.json({ error: 'unknown_product' }, { status: 400 });
    }
    if (!Number.isInteger(it.qty) || it.qty < 1 || it.qty > 20) {
      return NextResponse.json({ error: 'invalid_item' }, { status: 400 });
    }
    if (it.variant !== undefined && (typeof it.variant !== 'string' || it.variant.length > 100)) {
      return NextResponse.json({ error: 'invalid_item' }, { status: 400 });
    }
    try { normalizePrintableName(it.printableName); } catch {
      return NextResponse.json({ error: 'invalid_printable_name' }, { status: 400 });
    }
  }
  const emailStr = typeof email === 'string' && email ? email.trim() : '';
  if (email !== undefined && typeof email !== 'string') {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (emailStr && (emailStr.length > 200 || !EMAIL_RE.test(emailStr))) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  if (!paystackConfigured()) return NextResponse.json({ error: 'card_not_configured' }, { status: 503 });
  if(typeof idempotencyKey!=='string'||!/^[A-Za-z0-9_-]{32,128}$/.test(idempotencyKey))return NextResponse.json({error:'invalid_idempotency_key'},{status:400});
  const owner=checkoutPrincipal(req);
  if(!owner)return NextResponse.json({error:'checkout_session_required'},{status:428});
  if(!hasDb())return NextResponse.json({error:'db_not_configured'},{status:503});
  const identity=paystackAttemptIdentity(owner,idempotencyKey,{...Object.fromEntries(Object.entries(body).filter(([key])=>key!=='idempotencyKey')),name:contact.name,phone:contact.phone,email:emailStr,fulfillment:fulfillment===undefined?{method:'pickup'}:fulfillment});
  let prior:PaystackAttempt|null;
  let buyer:Awaited<ReturnType<typeof validatedCurrentBuyer>>;
  try{
    await ensureColumns(q);await ensureCheckoutFulfillmentSchema();await ensureCustomerAccountSchema();
    prior=await recoverPaystackAttempt(identity);
    if(prior&&prior.state!=='prepared')return attemptResponse(prior);
    buyer=await validatedCurrentBuyer(req);
  }catch(error){return NextResponse.json({error:error instanceof PaystackAttemptConflict?'attempt_request_conflict':'recovery_unavailable'},{status:error instanceof PaystackAttemptConflict?409:503});}

  let total: number;
  let lines: { id: string; qty: number; name: string; unit: number; variant?: string; printableName?: string }[];
  let appliedPromoCode: { promoId: number; promoName?: string } | null=null;
  let delivery:ReturnType<typeof resolveCheckoutFulfillment>|null=null;
  try {
    const saved=prior?await savedPaystackPurchase(identity):null;
    if(prior&&!saved)throw Error('saved_purchase_unavailable');
    if(saved){
      total=saved.total;lines=saved.items as typeof lines;
      appliedPromoCode=saved.context?.promoId?{promoId:saved.context.promoId}:null;
      const current=await getProducts();
      if(lines.some(line=>!current[line.id]))throw Error('unknown_product');
    }else{
    delivery=resolveCheckoutFulfillment(fulfillment);
    contact=checkoutDeliveryContact({name,phone},delivery.choice.method==='delivery');
    const catalogPrices=await getProducts();
    if(items.some((item:{id:string})=>!catalogPrices[item.id]))throw Error('unknown_product');
    const priced = await serverTotalWithPromos(
      items.map((it: any) => ({ id: it.id, qty: it.qty })),
      promoCode
    );
    total = priced.total;
    lines = priced.lines.map((l) => ({ id: l.id, qty: l.qty, name: l.name, unit: l.unit }));
    const variants = await applyVerifiedMerchVariants(items, lines);
    lines = await applyVerifiedMerchPersonalization(items, variants.lines);
    total += variants.adjustment + delivery.fee;
    if (!Number.isSafeInteger(total) || total < 1) throw new Error('invalid_order_total');
    appliedPromoCode = priced.appliedPromoCode;
    }
    // A prepared attempt has not dispatched a provider request yet. Preserve
    // its accepted prices, but never initiate now-unavailable physical stock.
    await assertMerchStockAvailable(lines);
  } catch (e: any) { return NextResponse.json({ error: String(e.message) }, { status: 400 }); }

  const id = 'ORD-' + Date.now().toString(36).toUpperCase() + randomUUID().replace(/-/g, '').slice(0, 24).toUpperCase();

  let attempt:PaystackAttempt=prior??{id:'',orderId:id,total,state:'prepared'};
  let claim:Awaited<ReturnType<typeof claimPaystackInitiation>>;
  try{
    if(!prior){
      const prepared=await preparePaystackAttempt(identity,{id,items:lines,total,name:contact.name,email:emailStr,phone:contact.phone,userId:buyer?.id||null,fulfillment:delivery?{method:delivery.choice.method,fee:delivery.fee,address:delivery.choice.address??null}:null,context:{promoId:appliedPromoCode?.promoId??null,referralCode:referralCode??null}});
      attempt=prepared.attempt;
      if(prepared.created){
        if(referralCode)await recordOrderReferral(attempt.orderId,referralCode,buyer?.id).catch(()=>false);
        if(appliedPromoCode)await recordPromoCodeUse(appliedPromoCode.promoId);
      }
    }
    claim=await claimPaystackInitiation(identity);
    if(!claim){const recovered=await recoverPaystackAttempt(identity);return recovered?attemptResponse(recovered):NextResponse.json({error:'recovery_unavailable'},{status:503});}
  }catch(error){return NextResponse.json({error:error instanceof PaystackAttemptConflict?'attempt_request_conflict':'order_prepare_unavailable',...(attempt.id?{id:attempt.orderId,orderId:attempt.orderId,total:attempt.total,attemptState:attempt.state}:{})},{status:error instanceof PaystackAttemptConflict?409:503});}
  // Only the durable claim winner may dispatch initialization. Its persisted
  // total/reference survive reload, price changes and a lost provider response.
  const reference=claim.attempt.orderId;
  const payerEmail = emailStr || `guest+${reference.toLowerCase()}@urbangangtour.co.ke`;
  try{
  const r = await paystackInit({
    email: payerEmail,
    amountKes: claim.attempt.total,
    reference,
    callbackUrl: `${CALLBACK_URL}?ref=${reference}`,
    metadata: { order_id: reference },
  });
  if(!r.ok||!r.url||!await recordPaystackAuthorization(claim.attempt.id,claim.nonce,r.url))throw Error('initialization_uncertain');
  return attemptResponse({...claim.attempt,state:'ready',authorizationUrl:r.url});
  }catch{
    await markPaystackInitiationUnknown(claim.attempt.id,claim.nonce).catch(()=>false);
    // Do not terminal-fail a session which may already be payable at Paystack.
    try{after(()=>alertCritical('Paystack initialization needs reconciliation','Order '+reference+' has an uncertain checkout outcome; do not automatically initialize another payment.').catch(()=>{}))}catch{/* Recovery does not depend on alert delivery. */}
    return NextResponse.json({ok:false,id:reference,orderId:reference,total:claim.attempt.total,attemptState:'unknown',error:'payment_outcome_unknown'},{status:202});
  }
}
