import {after,NextResponse} from 'next/server';
import {sameOrigin} from '@/lib/server/origin';
import {clientIp,rateLimit} from '@/lib/server/ratelimit';
import {readJsonObject} from '@/lib/server/json-body';
import {hasDb} from '@/lib/server/db';
import {parseContactEnquiry} from '@/lib/server/contact-enquiries';
import {saveContactEnquiry,deliverContactEmailJob} from '@/lib/server/contact-email-outbox';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
// Public role: create an enquiry only. No listing, recipient or payload reads.
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'bad_origin'},{status:403,headers});
 if(!rateLimit('contact:'+clientIp(req),5,600000,req,300))return NextResponse.json({error:'too_many_requests'},{status:429,headers:{...headers,'Retry-After':'600'}});
 const body=await readJsonObject(req,16384);if(!body.ok)return NextResponse.json({error:body.error},{status:body.status,headers});
 let parsed:ReturnType<typeof parseContactEnquiry>;
 try{parsed=parseContactEnquiry(body.value);}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'invalid_request'},{status:400,headers});}
 if(!hasDb())return NextResponse.json({error:'contact_unavailable'},{status:503,headers});
 try{
  const result=await saveContactEnquiry(parsed.enquiry,parsed.requestId);
  after(async()=>{try{await deliverContactEmailJob(result.jobId);}catch{/* The durable job remains available to authenticated cron. */}});
  return NextResponse.json({ok:true,id:result.reference,delivery:result.status==='accepted'?'accepted':['blocked','failed'].includes(result.status)?'attention':'queued'},{status:202,headers});
 }catch(error){return NextResponse.json({error:error instanceof Error&&error.message==='request_details_changed'?'request_details_changed':'contact_unavailable'},{status:error instanceof Error&&error.message==='request_details_changed'?409:503,headers});}
}
