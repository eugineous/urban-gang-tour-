import {afterEach,describe,it,expect,vi} from 'vitest';
vi.mock('@/lib/server/catalog',()=>({orderLines:()=>[]}));
vi.mock('@/lib/server/tickets',()=>({ticketsForOrder:async()=>[]}));
vi.mock('@/lib/server/marketplace',()=>({getMarketplaceEventById:async()=>null}));
vi.mock('@/lib/tickets/pdf',()=>({renderReceiptPdf:async()=>Buffer.from('sample-pdf'),renderTicketPdf:async()=>Buffer.from('sample-ticket')}));
vi.mock('@/lib/ops/pdf',()=>({getLogoDataUri:async()=>null}));
import {sendReceiptEmail} from '@/lib/server/receipt-email';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()});
describe('payment receipt delivery',()=>{
 it('sends attachments with a stable payment idempotency key; never sends pending orders',async()=>{vi.stubEnv('RESEND_API_KEY','test-only-provider-key');const request=vi.fn(async(_url:unknown,_options?:unknown)=>new Response('{}'));vi.stubGlobal('fetch',request);const base={id:'ORD-EXAMPLE',items:[],total:500,email:'sample@example.com'};await sendReceiptEmail({...base,status:'pending'});expect(request).not.toHaveBeenCalled();await sendReceiptEmail({...base,status:'paid'});const options=request.mock.calls[0][1] as any;expect(options.headers['Idempotency-Key']).toBe('order-ORD-EXAMPLE-payment');expect(JSON.parse(options.body).attachments[0].filename).toContain('Receipt');await sendReceiptEmail({...base,status:'paid'},'resend-123');expect((request.mock.calls[1][1] as any).headers['Idempotency-Key']).toBe('order-ORD-EXAMPLE-resend-123')});
});
