import {NextResponse} from 'next/server';
import {checkoutFulfillmentOptions} from '@/lib/server/checkout-fulfillment';
import {checkoutPaymentOptions} from '@/lib/server/checkout-payment-options';
import {rateLimit,clientIp,PUBLIC_READ_NETWORK_LIMIT} from '@/lib/server/ratelimit';
// Public (anonymous): pickup/delivery and configured payment booleans only.
// No provider requests or customer data. A true flag is not merchant approval.
export async function GET(req:Request){if(!rateLimit('fulfillment-options:'+clientIp(req),60,60000,req,PUBLIC_READ_NETWORK_LIMIT))return NextResponse.json({error:'too_many_requests'},{status:429});return NextResponse.json({...checkoutFulfillmentOptions(),payments:checkoutPaymentOptions()},{headers:{'Cache-Control':'no-store'}});}
