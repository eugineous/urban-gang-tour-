import {NextResponse} from 'next/server';
import {hasDb,q} from '@/lib/server/db';
import {verifyAdminSession,hasPerm,adminActor} from '@/lib/server/session';
import {affiliateProgram,saveAffiliateProgram,validateAffiliateProgram} from '@/lib/server/affiliate-program';
import {sameOrigin} from '@/lib/server/origin';
export const dynamic='force-dynamic';
// People permission required. Changes to commission conditions require a new terms version.
export async function GET(req:Request){if(!await verifyAdminSession(req)||!hasPerm(req,'people'))return NextResponse.json({error:'forbidden'},{status:403});if(!hasDb())return NextResponse.json({error:'unavailable'},{status:503});try{return NextResponse.json({program:await affiliateProgram(),eligibleEvents:await q("SELECT id,name FROM tour_events WHERE kind='ticketed' AND status='published' ORDER BY name LIMIT 200")},{headers:{'Cache-Control':'private, no-store'}})}catch{return NextResponse.json({error:'unavailable'},{status:503})}}
export async function PUT(req:Request){if(!sameOrigin(req)||!await verifyAdminSession(req)||!hasPerm(req,'people'))return NextResponse.json({error:'forbidden'},{status:403});const b=await req.json().catch(()=>null);if(!validateAffiliateProgram(b))return NextResponse.json({error:'invalid_program'},{status:400});if(!hasDb())return NextResponse.json({error:'unavailable'},{status:503});try{return NextResponse.json({program:await saveAffiliateProgram(b,adminActor(req))})}catch(error){const message=error instanceof Error?error.message:'';return NextResponse.json({error:['invalid_eligible_events','new_terms_version_required'].includes(message)?message:'unavailable'},{status:message==='new_terms_version_required'?409:message==='invalid_eligible_events'?400:503})}}
