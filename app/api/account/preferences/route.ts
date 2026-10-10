import {NextResponse} from 'next/server';
import {q,hasDb} from '@/lib/server/db';
import {validatedCurrentBuyer} from '@/lib/server/customer-account';
import {sameOrigin} from '@/lib/server/origin';
import {rateLimit,clientIp} from '@/lib/server/ratelimit';
import {ensureEngagementSchema,EVENT_INTERESTS} from '@/lib/server/engagement';
export const dynamic='force-dynamic';
async function handle(req:Request,write=false){
 if(write&&!sameOrigin(req))return NextResponse.json({error:'bad_origin'},{status:403});
 if(!rateLimit('prefs:'+clientIp(req),30,60000,req))return NextResponse.json({error:'too_many_requests'},{status:429});
 try{const u=await validatedCurrentBuyer(req);if(!u)return NextResponse.json({error:'sign_in_required'},{status:401});if(!hasDb())return NextResponse.json({error:'unavailable'},{status:503});
 let b;if(write){b=await req.json().catch(()=>null);if(!b||Object.keys(b).some(k=>!['marketing_email','event_interests'].includes(k))||typeof b.marketing_email!=='boolean'||!Array.isArray(b.event_interests)||b.event_interests.length>5||b.event_interests.some((v:unknown)=>typeof v!=='string'||!EVENT_INTERESTS.includes(v as typeof EVENT_INTERESTS[number])))return NextResponse.json({error:'invalid_preferences'},{status:400})}
 await ensureEngagementSchema();
 if(write){await q('INSERT INTO notification_preferences(user_id,marketing_email,event_interests) VALUES($1,$2,$3::jsonb) ON CONFLICT(user_id) DO UPDATE SET marketing_email=EXCLUDED.marketing_email,event_interests=EXCLUDED.event_interests,updated_at=now()',[u.id,b.marketing_email,JSON.stringify([...new Set(b.event_interests)])]);
 // Only use the authenticated account's database email; browser cannot subscribe others.
 if(b.marketing_email)await q('INSERT INTO subscribers(email) SELECT lower(email) FROM users WHERE id=$1 AND email IS NOT NULL ON CONFLICT DO NOTHING',[u.id]);else await q('DELETE FROM subscribers WHERE lower(email)=(SELECT lower(email) FROM users WHERE id=$1)',[u.id]);}
 const rows=await q('SELECT marketing_email,event_interests FROM notification_preferences WHERE user_id=$1',[u.id]);
 return NextResponse.json({preferences:rows[0]||{marketing_email:false,event_interests:[]}},{headers:{'Cache-Control':'private, no-store'}})
 }catch{return NextResponse.json({error:'unavailable'},{status:503})}
}
export async function GET(req:Request){return handle(req)}
export async function PUT(req:Request){return handle(req,true)}
