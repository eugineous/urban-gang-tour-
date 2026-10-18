import { NextResponse, after } from "next/server";
import { randomUUID } from "crypto";
import { serverTotalWithPromos } from "@/lib/server/catalog";
import { recordPromoCodeUseOnce } from "@/lib/server/promos";
import {
  rateLimit,
  clientIp,
  PURCHASE_NETWORK_LIMIT,
} from "@/lib/server/ratelimit";
import { mpesaConfigured, stkPush, normalizePhone } from "@/lib/server/mpesa";
import { sameOrigin } from "@/lib/server/origin";
import { alertCritical } from "@/lib/server/alert";
import { notifyNewOrder } from "@/lib/server/notify";
import { applyVerifiedMerchVariants } from "@/lib/server/merch-variants";
import { applyVerifiedMerchPersonalization } from "@/lib/server/merch-personalization";
import { normalizePrintableName } from "@/lib/shared/merch-personalization";
import { assertMerchStockAvailable } from "@/lib/server/inventory";
import { parseTierInventory, holdTickets } from "@/lib/server/ticket-inventory";
import {recordOrderReferral} from '@/lib/server/affiliate-program';
import {ensureCustomerAccountSchema,validatedCurrentBuyer} from '@/lib/server/customer-account';
import {resolveCheckoutFulfillment,ensureCheckoutFulfillmentSchema} from '@/lib/server/checkout-fulfillment';
import { q, hasDb } from "@/lib/server/db";
import { resolveEventTruth } from "@/lib/server/event-truth";

import {checkoutPrincipal} from '@/lib/server/checkout-session';
import {mpesaAttemptIdentity,recoverMpesaAttempt,prepareMpesaAttempt,savedMpesaPurchase,claimMpesaInitiation,recordMpesaReference,markMpesaInitiationUnknown,MpesaAttemptConflict,type MpesaAttempt} from '@/lib/server/mpesa-attempts';
const attemptResponse=(attempt:MpesaAttempt)=>NextResponse.json({ok:attempt.state==='reference_recorded',id:attempt.orderId,total:attempt.total,attemptState:attempt.state,payment:'checking'},{status:202,headers:{'Cache-Control':'no-store'}});

export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  // 8 per device per minute, with a wide per-network backstop underneath (see
  // lib/server/ratelimit.ts). This used to be 8 per IP, which meant a school
  // hall or a campus on one NAT — and Safaricom's CGNAT generally — got eight
  // ticket purchases a minute between everyone, and the rest were told to try
  // again later. One buyer still cannot open more than eight orders a minute.
  if (
    !rateLimit(
      "orders:" + clientIp(req),
      8,
      60_000,
      req,
      PURCHASE_NETWORK_LIMIT,
    )
  ) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const allowed = new Set([
    "items",
    "ticket",
    "name",
    "email",
    "phone",
    "idempotencyKey",
    "promoCode",
    "fulfillment",
    "referralCode",
  ]);
  for (const k of Object.keys(body)) {
    if (!allowed.has(k))
      return NextResponse.json(
        { error: `unexpected_field:${k}` },
        { status: 400 },
      );
  }
  const { items, ticket, name, email, phone, idempotencyKey, promoCode, fulfillment, referralCode } = body;
  if(referralCode!==undefined&&(typeof referralCode!=='string'||!/^[a-f0-9]{24}$/.test(referralCode)))return NextResponse.json({error:'invalid_referral_code'},{status:400});
  if (
    promoCode !== undefined &&
    (typeof promoCode !== "string" || promoCode.length > 60)
  ) {
    return NextResponse.json({ error: "invalid_promo_code" }, { status: 400 });
  }
  if ((items === undefined) === (ticket === undefined)) {
    // exactly one of items (merch) or ticket (event) must be present
    return NextResponse.json({ error: "items_or_ticket" }, { status: 400 });
  }

  if(items!==undefined){
    if (!Array.isArray(items) || items.length === 0 || items.length > 30)
      return NextResponse.json({ error: "invalid_items" }, { status: 400 });
    for (const it of items) {
      if (!it || typeof it !== "object" || Array.isArray(it)) {
        return NextResponse.json({ error: "invalid_item" }, { status: 400 });
      }
      for (const k of Object.keys(it)) {
        if (k !== "id" && k !== "qty" && k !== "variant" && k !== "printableName")
          return NextResponse.json(
            { error: `unexpected_field:items.${k}` },
            { status: 400 },
          );
      }
      if (
        typeof it.id !== "string" ||
        (it.variant !== undefined &&
          (typeof it.variant !== "string" || it.variant.length > 100)) ||
        !Number.isInteger(it.qty) ||
        it.qty < 1 ||
        it.qty > 20
      ) {
        return NextResponse.json({ error: "invalid_item" }, { status: 400 });
      }
      try { normalizePrintableName(it.printableName); } catch {
        return NextResponse.json({ error: 'invalid_printable_name' }, { status: 400 });
      }
    }
  }

  if (typeof name !== "string" || name.length < 2 || name.length > 100)
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  const emailStr = typeof email === "string" && email ? email : "";
  if (email!==undefined&&typeof email!=='string'||emailStr.length>254||emailStr && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailStr))
    return NextResponse.json({ error: "invalid_email" }, { status: 400 }); // email OPTIONAL: guests pay via M-Pesa with phone only
  const msisdn = normalizePhone(String(phone || ""));
  if (!msisdn)
    return NextResponse.json(
      { error: "invalid_phone_use_254" },
      { status: 400 },
    );

  if (
    (!idempotencyKey ||
    (typeof idempotencyKey !== "string" ||
      !/^[A-Za-z0-9_-]{32,128}$/.test(idempotencyKey)))
  ) {
    return NextResponse.json({ error: "invalid_idempotency_key" }, { status: 400 });
  }


  const principal=checkoutPrincipal(req);
  if(!principal)return NextResponse.json({error:'checkout_session_required'},{status:428});
  if(!hasDb())return NextResponse.json({error:'db_not_configured'},{status:503});
  let buyer:Awaited<ReturnType<typeof validatedCurrentBuyer>>=null;
  const purchaseInput=Object.fromEntries(Object.entries(body).filter(([key])=>key!=='idempotencyKey'));
  const identity=mpesaAttemptIdentity(principal,idempotencyKey,{...purchaseInput,phone:msisdn,email:emailStr});
  let prior:MpesaAttempt|null=null;
  try{
    await ensureCustomerAccountSchema();
    await ensureCheckoutFulfillmentSchema();
    buyer=await validatedCurrentBuyer(req);
    prior=await recoverMpesaAttempt(identity);
    if(prior&&prior.state!=='prepared')return attemptResponse(prior);
  }catch(error){
    return NextResponse.json({error:error instanceof MpesaAttemptConflict?'attempt_request_conflict':'recovery_unavailable'},{status:error instanceof MpesaAttemptConflict?409:503});
  }

  // orderItems is what gets persisted; total (and every unit price) comes
  // ONLY from the server — never trust a client-sent price. appliedPromoCode
  // is set when a buyer-supplied promoCode actually won a line's discount,
  // so its usage counter is recorded once (after the order is durably
  // created), not on every checkout attempt.
  let orderItems: {
    id: string;
    qty: number;
    name?: string;
    unit?: number;
    variant?: string;
    printableName?: string;
  }[];
  let total: number;
  let appliedPromoCode: { promoId: number; promoName: string } | null = null;

  if (ticket !== undefined) {
    if (!ticket || typeof ticket !== "object" || Array.isArray(ticket)) {
      return NextResponse.json({ error: "invalid_ticket" }, { status: 400 });
    }
    for (const k of Object.keys(ticket)) {
      if (k !== "eventId" && k !== "tier" && k !== "qty") {
        return NextResponse.json(
          { error: `unexpected_field:ticket.${k}` },
          { status: 400 },
        );
      }
    }
    const eventId = typeof ticket.eventId === "string" ? ticket.eventId : "";
    let event: { id: string; slug: string; name: string; tiers: unknown } | undefined;
    let truth: Awaited<ReturnType<typeof resolveEventTruth>>;
    try {
      const events = hasDb()
        ? await q<{ id: string; slug: string; name: string; tiers: unknown }>(
            `SELECT id, slug, name, tiers FROM tour_events
             WHERE id=$1 AND kind='ticketed' AND slug != '' LIMIT 1`,
            [eventId],
          )
        : [];
      event = events[0];
      truth = event ? await resolveEventTruth(event.slug) : null;
    } catch {
      return NextResponse.json({ error: "inventory_check_failed" }, { status: 503 });
    }
    const ev = event && (truth?.isSellable||prior?.state==='prepared')
      ? { name: event.name, tiers: parseTierInventory(event.tiers) }
      : undefined;
    if (!ev)
      return NextResponse.json({ error: "unknown_event" }, { status: 400 });
    if (
      !Number.isInteger(ticket.tier) ||
      ticket.tier < 0 ||
      ticket.tier >= ev.tiers.length
    ) {
      return NextResponse.json({ error: "invalid_tier" }, { status: 400 });
    }
    if (!Number.isInteger(ticket.qty) || ticket.qty < 1 || ticket.qty > 20) {
      return NextResponse.json({ error: "invalid_qty" }, { status: 400 });
    }
    const tier = ev.tiers[ticket.tier];
    total = tier.price * ticket.qty;
    orderItems = [
      {
        id: "ticket:" + eventId + ":" + ticket.tier,
        qty: ticket.qty,
        name: ev.name + " - " + tier.name,
        unit: tier.price,
      },
    ];
  } else {
    try {
      const priced = await serverTotalWithPromos(items, promoCode);
      total = priced.total;
      orderItems = priced.lines.map((l) => ({
        id: l.id,
        qty: l.qty,
        name: l.name,
        unit: l.unit,
      }));
      const variants = await applyVerifiedMerchVariants(
        items,
        orderItems as {
          id: string;
          qty: number;
          name: string;
          unit: number;
          variant?: string;
        }[],
      );
      orderItems = await applyVerifiedMerchPersonalization(items, variants.lines);
      total += variants.adjustment;
      await assertMerchStockAvailable(orderItems);
      appliedPromoCode = priced.appliedPromoCode;
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  }
  let resolvedFulfillment: ReturnType<typeof resolveCheckoutFulfillment> | undefined;
  try {
    if(ticket!==undefined&&fulfillment!==undefined)return NextResponse.json({error:'fulfillment_not_applicable'},{status:400});
    if(ticket===undefined){resolvedFulfillment=resolveCheckoutFulfillment(fulfillment);total+=resolvedFulfillment.fee;}
  } catch(e){return NextResponse.json({error:e instanceof Error?e.message:'invalid_fulfillment'},{status:400});}
  if (!Number.isSafeInteger(total) || total < 1) {
    return NextResponse.json({ error: "invalid_order_total" }, { status: 400 });
  }

  if (!mpesaConfigured()) return NextResponse.json({ok:false,payment:'not_configured',error:'payment_unavailable'},{status:503});
  let id='ORD-'+Date.now().toString(36).toUpperCase()+randomUUID().replace(/-/g,'').slice(0,24).toUpperCase();
  let claim:Awaited<ReturnType<typeof claimMpesaInitiation>>=null;
  let durable=false;
  try{
    const owner=buyer?await q('SELECT id FROM users WHERE id=$1',[buyer.id]):[];
    const prepared=await prepareMpesaAttempt(identity,{
      id,items:orderItems,total,name,email:emailStr,phone:msisdn,userId:owner[0]?.id??null,
      fulfillment:resolvedFulfillment?{method:resolvedFulfillment.choice.method,fee:resolvedFulfillment.fee,address:resolvedFulfillment.choice.address??null}:null,
      context:{promoId:appliedPromoCode?.promoId??null,referralCode:referralCode??null}
    });
    id=prepared.attempt.orderId;
    durable=true;
    if(prepared.attempt.state!=='prepared')return attemptResponse(prepared.attempt);
    // Replays use the accepted snapshot, never a newly calculated browser quote.
    const saved=await savedMpesaPurchase(identity);
    if(!Array.isArray(saved.items))throw Error('invalid_saved_purchase');
    orderItems=saved.items;total=saved.total;
    if(ticket!==undefined)await holdTickets({eventId:ticket.eventId,tierIndex:ticket.tier,qty:ticket.qty,orderId:id});
    else await assertMerchStockAvailable(orderItems);
    if(saved.context.promoId)await recordPromoCodeUseOnce(saved.context.promoId,id);
    if(saved.context.referralCode)await recordOrderReferral(id,saved.context.referralCode,buyer?.id);
    claim=await claimMpesaInitiation(identity);
    if(!claim){
      const current=await recoverMpesaAttempt(identity);
      return current?attemptResponse(current):NextResponse.json({error:'attempt_unavailable'},{status:503});
    }
    after(()=>notifyNewOrder({id,total,name,email:emailStr,phone:msisdn,status:'pending'}));
  }catch(error){
    const code=error instanceof Error?error.message:'order_create_failed';
    if(error instanceof MpesaAttemptConflict)return NextResponse.json({error:'attempt_request_conflict'},{status:409});
    const unavailable=['sold_out','insufficient_inventory','below_min','above_max','event_not_sellable','reservation_conflict','out_of_stock','variant_out_of_stock'].includes(code);
    return NextResponse.json({ok:false,...(durable?{id,total,attemptState:'prepared'}:{}),error:unavailable?code:'order_prepare_unavailable'},{status:unavailable?409:503});
  }
  try{
    const stk=await stkPush(msisdn,total,id,'UrbanGang');
    if(String(stk?.ResponseCode)!=='0'||typeof stk?.CheckoutRequestID!=='string')throw Error('provider_outcome_uncertain');
    if(!await recordMpesaReference(claim.attempt.id,claim.nonce,stk.CheckoutRequestID))throw Error('reference_not_recorded');
    return NextResponse.json({ok:true,id,total,attemptState:'reference_recorded'},{headers:{'Cache-Control':'no-store'}});
  }catch{
    await markMpesaInitiationUnknown(claim.attempt.id,claim.nonce).catch(()=>{});
    await alertCritical('M-Pesa initiation needs reconciliation','Order '+id+' has an uncertain initiation outcome. Do not automatically resend.').catch(()=>{});
    return NextResponse.json({ok:false,id,total,error:'payment_outcome_unknown',attemptState:'unknown'},{status:202,headers:{'Cache-Control':'no-store'}});
  }
}
