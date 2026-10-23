import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
type TestJob={id:string;booking_id:string;payload_hash:string;source_payload:string;status:string;attempts:number;request_body:string|null;lease_token?:string;last_error?:string};
const state=vi.hoisted(()=>({job:null as TestJob|null,owner:'owner@example.test',gmail:'',failSave:false}));
vi.mock('@/lib/server/bookings-schema',()=>({ensureBookingsSchema:vi.fn(async()=>{})}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,qSchema:vi.fn(async()=>{}),q:vi.fn(async(sql:string,args:unknown[]=[])=>{
 if(sql.includes('WITH saved AS')){if(state.failSave)throw Error('storage_failed');state.job||={id:String(args[5]),booking_id:String(args[0]),payload_hash:String(args[6]),source_payload:String(args[7]),status:'queued',attempts:0,request_body:null};return [{id:state.job.id,payload_hash:state.job.payload_hash,status:state.job.status}];}
 if(sql.includes("key='notify_email'"))return state.owner?[{value:state.owner}]:[];
 if(sql.includes("id='gmail'"))return state.gmail?[{meta:{email:state.gmail}}]:[];
 const job=state.job;
 if(sql.includes('RETURNING *')){if(!job||['accepted','failed'].includes(job.status)||job.attempts>=8)return [];job.status='processing';job.attempts++;job.lease_token=String(args[1]);return [{...job}];}
 if(sql.includes('SET request_body=')){if(!job)return [];job.request_body=String(args[2]);return [{id:job.id}];}
 if(sql.includes('SET first_send_at='))return job?[{id:job.id}]:[];
 if(sql.includes("SET status='accepted'")){if(job)job.status='accepted';return [];}
 if(sql.includes("SET status='blocked'")){if(job){job.status='blocked';job.last_error='email_not_configured';}return [];}
 if(sql.includes('SET status=$3')){if(job){job.status=String(args[2]);job.last_error=String(args[3]);job.attempts-=Number(args[5]);}return [];}
 return [];
})}));
import {q} from '@/lib/server/db';
import {contactPayloadHash,contactReference} from '@/lib/server/contact-enquiries';
import {contactEmailRecipients,renderContactEmailPayload} from '@/lib/server/contact-email';
import {deliverContactEmailJob,saveContactEnquiry} from '@/lib/server/contact-email-outbox';
const enquiry={name:'Test Visitor',email:'visitor@example.test',subject:'An event enquiry',message:'Please contact us about a campus event.'};
const requestId='random-request-reference-123456';
describe('private durable contact email delivery',()=>{
 beforeEach(()=>{vi.clearAllMocks();state.job=null;state.owner='owner@example.test';state.gmail='';state.failSave=false;vi.stubEnv('RESEND_API_KEY','test-only-key');vi.stubEnv('BOOKINGS_TO','admin@urbangangtour.co.ke');vi.stubEnv('BOOKINGS_FROM','Urban Gang Tour <admin@urbangangtour.co.ke>');vi.stubGlobal('fetch',vi.fn());});
 afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
 it('saves desk record and outbox atomically with an immutable source and no provider call',async()=>{
  const saved=await saveContactEnquiry(enquiry,requestId);expect(saved.reference).toBe(contactReference(requestId));expect(state.job?.payload_hash).toBe(contactPayloadHash(enquiry));expect(JSON.parse(state.job!.source_payload)).toEqual(enquiry);
  const sql=vi.mocked(q).mock.calls.find(([sql])=>sql.includes('WITH saved AS'))![0];expect(sql).toContain('INSERT INTO bookings');expect(sql).toContain("'Contact enquiry'");expect(sql).toContain("'contact'");expect(sql).toContain('INSERT INTO contact_email_outbox');expect(fetch).not.toHaveBeenCalled();
 });
 it('deduplicates exact retries and refuses changed content using the same reference',async()=>{
  const first=await saveContactEnquiry(enquiry,requestId);expect(await saveContactEnquiry(enquiry,requestId)).toEqual(first);await expect(saveContactEnquiry({...enquiry,message:'Changed message with the same attempt.'},requestId)).rejects.toThrow('request_details_changed');expect(JSON.parse(state.job!.source_payload)).toEqual(enquiry);
 });
 it('uses explicitly configured recipients, a safe Reply-To, escaped HTML and plain text',async()=>{
  const body=JSON.parse(await renderContactEmailPayload({...enquiry,name:'<img src=x onerror=alert(1)>',message:'A message with <script>alert(1)</script>'},'C-test'));
  expect(body.to).toBe('owner@example.test');expect(body.cc).toBe('admin@urbangangtour.co.ke');expect(body.reply_to).toBe(enquiry.email);expect(body.from).toBe('Urban Gang Tour <admin@urbangangtour.co.ke>');expect(body.html).not.toContain('<script>');expect(body.html).toContain('&lt;script&gt;');expect(body.html).toContain('role="presentation"');expect(body.html).toContain('/assets/ugt-logo.png');expect(body.text).toContain('Reference: C-test');expect(body.text).toContain(enquiry.email);
 });
 it('falls back only to the connected Gmail metadata, not a personal address in code',async()=>{
  state.owner='';state.gmail='connected@example.test';expect(await contactEmailRecipients()).toMatchObject({to:'connected@example.test'});state.gmail='';await expect(contactEmailRecipients()).rejects.toThrow('contact_recipient_not_configured');
 });
 it('does not duplicate a CC recipient and rejects configured sender-header injection',async()=>{
  state.owner='admin@urbangangtour.co.ke';expect((await contactEmailRecipients()).cc).toBeUndefined();vi.stubEnv('BOOKINGS_FROM','admin@urbangangtour.co.ke\r\nBcc:attacker@example.test');await expect(renderContactEmailPayload(enquiry,'C-test')).rejects.toThrow('contact_sender_not_configured');
 });
 it('reuses the exact frozen payload and idempotency key after a retryable provider error',async()=>{
  const saved=await saveContactEnquiry(enquiry,requestId);vi.mocked(fetch).mockResolvedValueOnce(new Response(null,{status:503})).mockResolvedValueOnce(new Response(JSON.stringify({id:'provider-1'}),{status:200}));
  expect(await deliverContactEmailJob(saved.jobId)).toBe('queued');state.owner='changed@example.test';expect(await deliverContactEmailJob(saved.jobId)).toBe('accepted');
  const first=vi.mocked(fetch).mock.calls[0][1]!,second=vi.mocked(fetch).mock.calls[1][1]!;expect(second.body).toBe(first.body);expect(second.headers).toEqual(first.headers);expect((second.headers as Record<string,string>)['Idempotency-Key']).toBe(saved.jobId);expect(JSON.parse(String(second.body)).to).toBe('owner@example.test');
 });
 it('does not resend accepted jobs and bounds lease/retry windows',async()=>{
  const saved=await saveContactEnquiry(enquiry,requestId);vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({id:'provider-1'}),{status:200}));expect(await deliverContactEmailJob(saved.jobId)).toBe('accepted');expect(await deliverContactEmailJob(saved.jobId)).toBe('not_due');expect(fetch).toHaveBeenCalledTimes(1);
  const claim=vi.mocked(q).mock.calls.find(([sql])=>sql.includes('RETURNING *'))![0];expect(claim).toContain('attempts<8');expect(claim).toContain("interval '20 hours'");expect(claim).toContain("interval '5 minutes'");
 });
 it('does not call malformed 2xx responses accepted and retries the same provider operation',async()=>{
  const saved=await saveContactEnquiry(enquiry,requestId);vi.mocked(fetch).mockResolvedValueOnce(new Response('{}',{status:200})).mockResolvedValueOnce(new Response(JSON.stringify({id:'provider-confirmed'}),{status:200}));
  expect(await deliverContactEmailJob(saved.jobId)).toBe('queued');expect(state.job?.status).toBe('queued');expect(state.job?.last_error).toBe('provider_acceptance_unconfirmed');
  expect(await deliverContactEmailJob(saved.jobId)).toBe('accepted');const first=vi.mocked(fetch).mock.calls[0][1]!,second=vi.mocked(fetch).mock.calls[1][1]!;expect(second.body).toBe(first.body);expect(second.headers).toEqual(first.headers);
 });
 it('retains blocked configuration and permanent provider failures for staff review',async()=>{
  const saved=await saveContactEnquiry(enquiry,requestId);vi.stubEnv('RESEND_API_KEY','');expect(await deliverContactEmailJob(saved.jobId)).toBe('blocked');expect(state.job?.last_error).toBe('email_not_configured');expect(fetch).not.toHaveBeenCalled();
  vi.stubEnv('RESEND_API_KEY','test-only-key');state.owner='';expect(await deliverContactEmailJob(saved.jobId)).toBe('blocked');expect(state.job?.last_error).toBe('contact_recipient_not_configured');expect(state.job?.attempts).toBe(0);
  state.owner='owner@example.test';vi.mocked(fetch).mockResolvedValue(new Response(null,{status:400}));expect(await deliverContactEmailJob(saved.jobId)).toBe('failed');expect(state.job?.last_error).toBe('provider_http_400');
 });
});
