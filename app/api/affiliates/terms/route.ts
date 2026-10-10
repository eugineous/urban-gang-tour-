import {NextResponse} from 'next/server';
import {q,hasDb} from '@/lib/server/db';
import {validatedCurrentBuyer} from '@/lib/server/customer-account';
import {affiliateProgram,ensureAffiliateLedger} from '@/lib/server/affiliate-program';
import {sameOrigin} from '@/lib/server/origin';
import {rateLimit,clientIp} from '@/lib/server/ratelimit';
export const dynamic='force-dynamic';
// Buyer may accept terms only for their own reviewed application.
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'bad_origin'},{status:403});
 const buyer=await validatedCurrentBuyer(req).catch(()=>null);if(!buyer)return NextResponse.json({error:'sign_in_required'},{status:401});
 if(!rateLimit('affiliate-terms:'+clientIp(req),10,60000,req))return NextResponse.json({error:'too_many_requests'},{status:429});
 const b=await req.json().catch(()=>null);if(!b||Object.keys(b).some(k=>k!=='termsVersion')||typeof b.termsVersion!=='string'||b.termsVersion.length>80)return NextResponse.json({error:'invalid_terms'},{status:400});
 if(!hasDb())return NextResponse.json({error:'unavailable'},{status:503});
 try{await ensureAffiliateLedger();const program=await affiliateProgram();if(!program.enabled||program.termsVersion!==b.termsVersion)return NextResponse.json({error:'terms_changed'},{status:409});const rows=await q("UPDATE affiliate_codes SET accepted_terms_version=$2,accepted_at=now() WHERE user_id=$1 AND status='approved' RETURNING id,status,accepted_terms_version",[buyer.id,b.termsVersion]);return NextResponse.json({application:rows[0]||null},{status:rows.length?200:404,headers:{'Cache-Control':'private, no-store'}})}catch{return NextResponse.json({error:'unavailable'},{status:503})}
}
