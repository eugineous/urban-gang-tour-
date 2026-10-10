import {resolveCheckoutFulfillment} from '@/lib/server/checkout-fulfillment';
import {NextResponse} from 'next/server';
import {sameOrigin} from '@/lib/server/origin';
import {rateLimit,clientIp,PURCHASE_NETWORK_LIMIT} from '@/lib/server/ratelimit';
import {serverTotalWithPromos} from '@/lib/server/catalog';
import {applyVerifiedMerchVariants} from '@/lib/server/merch-variants';
import {assertMerchStockAvailable} from '@/lib/server/inventory';
// Public quote: reads server prices and stock, never creates an order or redeems a code.
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'bad_origin'},{status:403});
 if(!rateLimit('quote:'+clientIp(req),20,60000,req,PURCHASE_NETWORK_LIMIT))return NextResponse.json({error:'too_many_requests'},{status:429});
 let b:any;try{b=await req.json()}catch{return NextResponse.json({error:'invalid_json'},{status:400})}
 if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!['items','promoCode','fulfillment'].includes(k))||!Array.isArray(b.items)||!b.items.length||b.items.length>30||b.promoCode!==undefined&&(typeof b.promoCode!=='string'||b.promoCode.length>60))return NextResponse.json({error:'invalid_quote'},{status:400});
 for(const it of b.items)if(!it||typeof it!=='object'||Array.isArray(it)||Object.keys(it).some(k=>!['id','qty','variant'].includes(k))||typeof it.id!=='string'||it.id.length>80||!Number.isInteger(it.qty)||it.qty<1||it.qty>20||it.variant!==undefined&&(typeof it.variant!=='string'||it.variant.length>100))return NextResponse.json({error:'invalid_item'},{status:400});
 try{const fulfillment=resolveCheckoutFulfillment(b.fulfillment);const priced=await serverTotalWithPromos(b.items,b.promoCode),variants=await applyVerifiedMerchVariants(b.items,priced.lines);await assertMerchStockAvailable(variants.lines);const total=priced.total+variants.adjustment+fulfillment.fee;if(!Number.isSafeInteger(total)||total<1)throw Error();const savings=priced.lines.reduce((sum,line)=>sum+Math.max(0,Number(line.basePrice)-line.unit)*line.qty,0);return NextResponse.json({total,promoApplied:!!priced.appliedPromoCode,savings:Number.isSafeInteger(savings)?savings:0,deliveryFee:fulfillment.fee},{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'quote_unavailable'},{status:400,headers:{'Cache-Control':'no-store'}})}
}
