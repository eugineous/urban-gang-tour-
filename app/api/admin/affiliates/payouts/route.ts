import {NextResponse} from 'next/server';
import {hasDb} from '@/lib/server/db';
import {verifyAdminSession,hasPerm,adminActor} from '@/lib/server/session';
import {recordAffiliatePayout} from '@/lib/server/affiliate-program';
import {sameOrigin} from '@/lib/server/origin';
export const dynamic='force-dynamic';
// Finance staff with ops_payouts may record an already-made payout, never transfer money.
export async function POST(req:Request){if(!sameOrigin(req)||!await verifyAdminSession(req)||!hasPerm(req,'ops_payouts'))return NextResponse.json({error:'forbidden'},{status:403});const b=await req.json().catch(()=>null);if(!b||Object.keys(b).some(k=>!['affiliateId','amount','reference'].includes(k))||typeof b.affiliateId!=='string'||!/^[a-f0-9]{24}$/.test(b.affiliateId)||!Number.isSafeInteger(b.amount)||b.amount<1||b.amount>100000000||typeof b.reference!=='string'||!b.reference.trim()||b.reference.length>100)return NextResponse.json({error:'invalid_payout'},{status:400});if(!hasDb())return NextResponse.json({error:'unavailable'},{status:503});try{return NextResponse.json({record:await recordAffiliatePayout(b.affiliateId,b.amount,b.reference.trim(),adminActor(req))})}catch(error){const message=error instanceof Error?error.message:'';return NextResponse.json({error:message==='payout_exceeds_balance'?message:message==='affiliate_not_found'?message:'payout_not_recorded'},{status:message==='payout_exceeds_balance'?409:message==='affiliate_not_found'?404:503})}}
