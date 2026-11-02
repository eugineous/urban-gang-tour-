import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('@/lib/server/session',()=>({verifyAdminSession:vi.fn(async()=>true),isSuperAdmin:vi.fn(()=>true)}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'test-ip'}));
vi.mock('@/lib/server/email-outbox',()=>({emailOutboxStatus:vi.fn(),processEmailOutbox:vi.fn(),retryEmailOutbox:vi.fn()}));
vi.mock('@/lib/server/contact-email-outbox',()=>({contactEmailOutboxStatus:vi.fn(),processContactEmailOutbox:vi.fn(),retryContactEmailJob:vi.fn()}));
vi.mock('@/lib/server/payment-confidence',()=>({paymentEffectStatus:vi.fn(async()=>[])}));
import {GET} from '@/app/api/admin/email-delivery/route';
import {POST} from '@/app/api/internal/cron/email-delivery/route';
import {emailOutboxStatus,processEmailOutbox} from '@/lib/server/email-outbox';
import {contactEmailOutboxStatus,processContactEmailOutbox} from '@/lib/server/contact-email-outbox';
import {paymentEffectStatus} from '@/lib/server/payment-confidence';
import {verifyAdminSession,isSuperAdmin} from '@/lib/server/session';
const admin=()=>new Request('https://urbangangtour.co.ke/api/admin/email-delivery');
const cron=()=>new Request('https://urbangangtour.co.ke/api/internal/cron/email-delivery',{method:'POST',headers:{'x-ugt-cron':'test-only-cron-key'}});
describe('independent receipt and contact queues',()=>{
 beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('RESEND_API_KEY','test-only-provider-key');vi.stubEnv('UGT_CRON_SECRET','test-only-cron-key');vi.mocked(emailOutboxStatus).mockResolvedValue({configured:true,jobs:[{id:'receipt-test'}]});vi.mocked(contactEmailOutboxStatus).mockResolvedValue([{id:'contact-test'}]);vi.mocked(processEmailOutbox).mockResolvedValue([{id:'receipt-test',status:'accepted'}]);vi.mocked(processContactEmailOutbox).mockResolvedValue([{id:'contact-test',status:'accepted'}]);});
 afterEach(()=>vi.unstubAllEnvs());
 it('preserves normal successful admin and cron responses',async()=>{const a=await GET(admin());expect(a.status).toBe(200);expect(await a.json()).toMatchObject({jobs:[{id:'receipt-test'}],contact_jobs:[{id:'contact-test'}],module_errors:{}});const c=await POST(cron());expect(c.status).toBe(200);expect(await c.json()).toMatchObject({ok:true,module_errors:{}});});
 it('shows receipt records when contact status fails without leaking the underlying error',async()=>{vi.mocked(contactEmailOutboxStatus).mockRejectedValue(Error('private database information'));const response=await GET(admin());expect(response.status).toBe(503);expect(await response.json()).toEqual({configured:true,jobs:[{id:'receipt-test'}],contact_jobs:[],payment_jobs:[],module_errors:{contact:'contact_delivery_unavailable'}});});
 it('includes read-only fulfillment progress for concurrent authorized staff',async()=>{
  vi.mocked(paymentEffectStatus).mockResolvedValue([{order_id:'ORD-STAFF123',gateway:'paystack',effect:'tickets',status:'queued',attempts:0,updated_at:'2026-11-02'}]);
  const response=await GET(admin());expect(response.status).toBe(200);expect(response.headers.get('Cache-Control')).toBe('private, no-store');expect((await response.json()).payment_jobs).toHaveLength(1);
 });
 it('retains email records when fulfillment lookup is unavailable',async()=>{
  vi.mocked(paymentEffectStatus).mockRejectedValueOnce(Error('PRIVATE_SECRET'));const response=await GET(admin());expect(response.status).toBe(503);const data=await response.json();expect(data).toMatchObject({jobs:[{id:'receipt-test'}],payment_jobs:[],module_errors:{payments:'payment_delivery_unavailable'}});expect(JSON.stringify(data)).not.toContain('PRIVATE');
 });
 it('rejects unauthorized fulfillment reads before querying anything',async()=>{
  vi.mocked(verifyAdminSession).mockResolvedValueOnce(false);expect((await GET(admin())).status).toBe(403);expect(paymentEffectStatus).not.toHaveBeenCalled();
  vi.mocked(isSuperAdmin).mockReturnValueOnce(false);expect((await GET(admin())).status).toBe(403);expect(paymentEffectStatus).not.toHaveBeenCalled();
 });
 it('shows contact records when receipt status fails',async()=>{vi.mocked(emailOutboxStatus).mockRejectedValue(Error('receipt failure'));const response=await GET(admin());expect(response.status).toBe(503);expect(await response.json()).toMatchObject({jobs:[],contact_jobs:[{id:'contact-test'}],module_errors:{receipts:'receipt_delivery_unavailable'}});});
 it('runs contact retry work even when receipt processing rejects',async()=>{vi.mocked(processEmailOutbox).mockRejectedValue(Error('receipt failure'));const response=await POST(cron());expect(response.status).toBe(503);expect(processContactEmailOutbox).toHaveBeenCalledWith(3);expect(await response.json()).toEqual({ok:false,outcomes:[],contactOutcomes:[{id:'contact-test',status:'accepted'}],module_errors:{receipts:'receipt_delivery_unavailable'}});});
 it('retains successful receipt outcomes when contact processing rejects',async()=>{vi.mocked(processContactEmailOutbox).mockRejectedValue(Error('contact failure'));const response=await POST(cron());expect(response.status).toBe(503);expect(await response.json()).toEqual({ok:false,outcomes:[{id:'receipt-test',status:'accepted'}],contactOutcomes:[],module_errors:{contact:'contact_delivery_unavailable'}});});
});
