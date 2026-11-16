import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({tickets:vi.fn()}));
vi.mock('@/lib/server/tickets',()=>({ticketsForOrder:state.tickets}));
vi.mock('@/lib/server/marketplace',()=>({getMarketplaceEventById:async()=>null}));
vi.mock('@/lib/tickets/pdf',()=>({renderReceiptPdf:async()=>Buffer.from('receipt'),renderTicketPdf:async()=>Buffer.from('ticket')}));
vi.mock('@/lib/ops/pdf',()=>({getLogoDataUri:async()=>null}));
vi.mock('@/lib/server/email-outbox',()=>({enqueueReceiptEmail:vi.fn(),deliverReceiptEmailJob:vi.fn()}));
vi.mock('@/lib/server/checkout-fulfillment',()=>({}));
vi.mock('@/lib/server/db',()=>({q:async()=>[],hasDb:()=>false}));
import {renderReceiptEmailPayload} from '@/lib/server/receipt-email';
const order={id:'ORD-TICKETRECEIPT',items:[{id:'ticket:event:0',qty:1,unit:500,name:'Fixture - General'}],total:500,email:'fixture@example.test',status:'paid',paystack_ref:'ORD-TICKETRECEIPT',paystack_ticket:{eventId:'event',tier:0,qty:1,tierName:'General',unit:500,name:'Fixture - General'}};
beforeEach(()=>{state.tickets.mockReset().mockResolvedValue([])});
it('does not freeze an owned-ticket receipt missing its issued tickets',async()=>{
 await expect(renderReceiptEmailPayload(order)).rejects.toThrow('receipt_tickets_unavailable');
 state.tickets.mockRejectedValueOnce(Error('database_unavailable'));await expect(renderReceiptEmailPayload(order)).rejects.toThrow('receipt_tickets_unavailable');
});
it('truthfully records received money needing manual refund review without admission or a refund promise',async()=>{
 const payload=JSON.parse(await renderReceiptEmailPayload({...order,ticket_fulfillment_status:'refund_review'}));
 expect(payload.html).toContain('Payment received');expect(payload.html).toContain('manual refund review');expect(payload.html).not.toContain('Your E-Tickets');expect(payload.html).not.toContain('/t/');expect(payload.html).not.toContain('has been refunded');
});
