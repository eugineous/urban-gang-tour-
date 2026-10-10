import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
const state=vi.hoisted(()=>({job:null as any}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,qSchema:vi.fn(async()=>{}),q:vi.fn(async(sql:string,args:any[]=[])=>{
  const job=state.job;
  if(sql.startsWith('INSERT INTO email_delivery_outbox')){state.job ||= {id:args[0],order_id:args[1],delivery:args[2],status:'queued',attempts:0,request_body:null,first_send_at:null};return [];}
  if(sql.includes('RETURNING *')){if(!job||job.status==='accepted'||job.status==='failed')return [];job.status='processing';job.attempts++;job.lease_token=args[1];return [{...job}];}
  if(sql.startsWith('SELECT * FROM orders'))return [{id:job.order_id,status:'paid',email:'buyer@example.test'}];
  if(sql.includes('SET request_body=')){job.request_body=args[2];return [{id:job.id}];}
  if(sql.includes('SET first_send_at=')){job.first_send_at ||= new Date().toISOString();return [{id:job.id}];}
  if(sql.includes("status='accepted'")){job.status='accepted';return [];}
  if(sql.includes("status='blocked'")){job.status='blocked';job.last_error='email_not_configured';return [];}
  if(sql.includes('SET status=$3')){job.status=args[2];job.last_error=args[3];return [];}
  return [];
})}));
vi.mock('@/lib/server/receipt-email',()=>({renderReceiptEmailPayload:vi.fn(async()=>JSON.stringify({to:'buyer@example.test',html:'Original receipt',subject:'Receipt'}))}));
vi.mock('@/lib/server/session',()=>({verifyAdminSession:vi.fn(async()=>false),isSuperAdmin:vi.fn(()=>false)}));
vi.mock('@/lib/server/ratelimit',()=>({clientIp:()=> 'test',rateLimit:()=>true}));
import {enqueueReceiptEmail,deliverReceiptEmailJob,processEmailOutbox} from '@/lib/server/email-outbox';
import {q} from '@/lib/server/db';
import {POST as cron} from '@/app/api/internal/cron/email-delivery/route';
import {GET as adminStatus} from '@/app/api/admin/email-delivery/route';
describe('durable receipt delivery',()=>{
  beforeEach(()=>{vi.clearAllMocks();state.job=null;vi.stubEnv('RESEND_API_KEY','test-only-provider-key');vi.stubEnv('UGT_CRON_SECRET','test-only-cron-secret');vi.stubGlobal('fetch',vi.fn());});
  afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
  it('persists a payment job before any provider request',async()=>{const id=await enqueueReceiptEmail('order-1');expect(id).toMatch(/^receipt-[a-f0-9]{40}$/);expect(state.job.status).toBe('queued');expect(fetch).not.toHaveBeenCalled();});
  it('retains failed messages and retries the exact payload with the same provider idempotency key',async()=>{
    const id=await enqueueReceiptEmail('order-1');vi.mocked(fetch).mockResolvedValueOnce(new Response(null,{status:503})).mockResolvedValueOnce(new Response(JSON.stringify({id:'provider-1'}),{status:200}));
    expect(await deliverReceiptEmailJob(id)).toBe('queued');expect(state.job.request_body).toContain('Original receipt');
    expect(await deliverReceiptEmailJob(id)).toBe('accepted');
    const first=vi.mocked(fetch).mock.calls[0][1]!,second=vi.mocked(fetch).mock.calls[1][1]!;
    expect(second.body).toBe(first.body);expect(second.headers).toEqual(first.headers);
    expect((second.headers as Record<string,string>)['Idempotency-Key']).toBe(id);
  });
  it('never re-sends an already accepted job',async()=>{const id=await enqueueReceiptEmail('order-1');vi.mocked(fetch).mockResolvedValue(new Response('{}',{status:200}));await deliverReceiptEmailJob(id);expect(await deliverReceiptEmailJob(id)).toBe('not_due');expect(fetch).toHaveBeenCalledTimes(1);});
  it('keeps missing configuration visible without discarding the job',async()=>{const id=await enqueueReceiptEmail('order-1');vi.stubEnv('RESEND_API_KEY','');expect(await deliverReceiptEmailJob(id)).toBe('blocked');expect(state.job.last_error).toBe('email_not_configured');await expect(processEmailOutbox()).rejects.toThrow('email_not_configured');expect(fetch).not.toHaveBeenCalled();});
  it('denies unauthorized cron and administrator reads before touching private jobs',async()=>{expect((await cron(new Request('https://urbangangtour.co.ke/api/internal/cron/email-delivery',{method:'POST'}))).status).toBe(401);expect((await adminStatus(new Request('https://urbangangtour.co.ke/api/admin/email-delivery'))).status).toBe(403);expect(q).not.toHaveBeenCalled();});
});
