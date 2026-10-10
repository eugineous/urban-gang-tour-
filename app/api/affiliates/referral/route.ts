import {NextResponse} from 'next/server';
import {hasDb} from '@/lib/server/db';
import {validReferral} from '@/lib/server/affiliate-program';
import {rateLimit,clientIp} from '@/lib/server/ratelimit';
import {cached} from '@/lib/server/microcache';
export const dynamic='force-dynamic';
// Public anonymous validation. Never returns names, audience, email or earnings.
export async function GET(req:Request){
 if(!rateLimit('referral:'+clientIp(req),30,60000,req))return NextResponse.json({error:'too_many_requests'},{status:429});
 const code=new URL(req.url).searchParams.get('code')||'';if(!/^[a-f0-9]{24}$/.test(code))return NextResponse.json({valid:false},{status:400});
 if(!hasDb())return NextResponse.json({error:'unavailable'},{status:503});
 try{const valid=await cached('affiliate-code:'+code,5000,()=>validReferral(code));return NextResponse.json({valid:!!valid,...valid},{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'unavailable'},{status:503})}
}
