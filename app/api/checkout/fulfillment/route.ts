import {NextResponse} from 'next/server';
import {checkoutFulfillmentOptions} from '@/lib/server/checkout-fulfillment';
import {rateLimit,clientIp} from '@/lib/server/ratelimit';
export async function GET(req:Request){if(!rateLimit('fulfillment-options:'+clientIp(req),60,60000,req))return NextResponse.json({error:'too_many_requests'},{status:429});return NextResponse.json(checkoutFulfillmentOptions(),{headers:{'Cache-Control':'no-store'}});}
