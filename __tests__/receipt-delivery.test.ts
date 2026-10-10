import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
const outbox=vi.hoisted(()=>({enqueue:vi.fn(async()=> 'receipt-stable-id'),deliver:vi.fn(async()=> 'accepted')}));
vi.mock('@/lib/server/email-outbox',()=>({enqueueReceiptEmail:outbox.enqueue,deliverReceiptEmailJob:outbox.deliver}));
vi.mock('@/lib/server/catalog',()=>({orderLines:()=>[]}));
vi.mock('@/lib/server/tickets',()=>({ticketsForOrder:async()=>[]}));
vi.mock('@/lib/server/marketplace',()=>({getMarketplaceEventById:async()=>null}));
vi.mock('@/lib/tickets/pdf',()=>({renderReceiptPdf:async()=>Buffer.from('sample-pdf'),renderTicketPdf:async()=>Buffer.from('sample-ticket')}));
vi.mock('@/lib/ops/pdf',()=>({getLogoDataUri:async()=>null}));
import {sendReceiptEmail,renderReceiptEmailPayload} from '@/lib/server/receipt-email';
beforeEach(()=>vi.clearAllMocks());
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()});
describe('payment receipt delivery',()=>{
 it('persists paid delivery jobs before processing; never enqueues pending orders',async()=>{const base={id:'ORD-EXAMPLE',items:[],total:500,email:'sample@example.com'};await sendReceiptEmail({...base,status:'pending'});expect(outbox.enqueue).not.toHaveBeenCalled();await sendReceiptEmail({...base,status:'paid'});expect(outbox.enqueue).toHaveBeenCalledWith(base.id,'payment');expect(outbox.deliver).toHaveBeenCalledWith('receipt-stable-id');expect(outbox.enqueue.mock.invocationCallOrder[0]).toBeLessThan(outbox.deliver.mock.invocationCallOrder[0]);await sendReceiptEmail({...base,status:'paid'},'resend-123');expect(outbox.enqueue).toHaveBeenLastCalledWith(base.id,'resend-123')});
 it('renders the original receipt attachment and refuses an unpaid payload',async()=>{const base={id:'ORD-EXAMPLE',items:[],total:500,email:'sample@example.com'};await expect(renderReceiptEmailPayload({...base,status:'pending'})).rejects.toThrow('receipt_order_not_paid');const payload=JSON.parse(await renderReceiptEmailPayload({...base,status:'paid'}));expect(payload.to).toBe(base.email);expect(payload.attachments[0].filename).toContain('Receipt');expect(Buffer.from(payload.attachments[0].content,'base64').toString()).toBe('sample-pdf')});
});
