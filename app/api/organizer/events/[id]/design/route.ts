// Approved organizers may edit only their own event's print branding, never price or status.
import {NextResponse} from 'next/server';
import {currentApprovedOrganizer} from '@/lib/server/organizer-session';
import {sameOrigin} from '@/lib/server/origin';
import {rateLimit,clientIp} from '@/lib/server/ratelimit';
import {ensureOpsSchema} from '@/lib/server/ops';
import {q} from '@/lib/server/db';
import {parseTicketDesign} from '@/lib/tickets/design-validation';
export async function PUT(req:Request,{params}:{params:Promise<{id:string}>}){
 const access=await currentApprovedOrganizer(req);
 if(!access.organizer)return NextResponse.json({error:access.error},{status:access.status});
 if(!sameOrigin(req))return NextResponse.json({error:'bad_origin'},{status:403});
 if(!rateLimit('ticket-design:'+clientIp(req),20,60000,req))return NextResponse.json({error:'too_many_requests'},{status:429});
 if(Number(req.headers.get('content-length'))>750000)return NextResponse.json({error:'too_large'},{status:413});
 let raw;try{raw=await req.text();if(raw.length>750000)return NextResponse.json({error:'too_large'},{status:413});raw=JSON.parse(raw)}catch{return NextResponse.json({error:'invalid_json'},{status:400})}
 const design=parseTicketDesign(raw);if(!design)return NextResponse.json({error:'invalid_design'},{status:400});
 const {id}=await params;
 try{
 await ensureOpsSchema();
 const rows=await q('UPDATE marketplace_events SET ticket_design=$1,updated_at=now() WHERE id=$2 AND organizer_id=$3 RETURNING id',[JSON.stringify(design),id,access.organizer.id]);
 if(!rows[0])return NextResponse.json({error:'not_found'},{status:404});
 await q("INSERT INTO audit_log (actor,action,detail) VALUES ($1,'ticket.design.update',$2)",[access.organizer.id,JSON.stringify({id,design:design.design})]);
 return NextResponse.json({ok:true},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'save_failed'},{status:503})}
}
