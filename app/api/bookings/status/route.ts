import {NextResponse} from 'next/server';
import {verifyToken} from '@/lib/server/session';
import {q,hasDb} from '@/lib/server/db';
import {rateLimit,clientIp} from '@/lib/server/ratelimit';
// A signed, expiring enquiry capability; no access by predictable booking id.
export async function GET(req:Request){if(!rateLimit('booking-status:'+clientIp(req),30,60000,req))return NextResponse.json({error:'too_many_requests'},{status:429});const token=new URL(req.url).searchParams.get('token');const claim=verifyToken<{scope?:string;bookingId?:string}>(token);if(claim?.scope!=='booking_status'||typeof claim.bookingId!=='string')return NextResponse.json({error:'invalid_or_expired_link'},{status:401});if(!hasDb())return NextResponse.json({error:'booking_unavailable'},{status:503});try{const rows=await q(`SELECT id,type,status,preferred_date,created_at FROM bookings WHERE id=$1`,[claim.bookingId]);return rows.length?NextResponse.json({booking:rows[0]},{headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}}):NextResponse.json({error:'not_found'},{status:404});}catch{return NextResponse.json({error:'booking_unavailable'},{status:503});}}
