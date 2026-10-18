import {beforeEach,it,expect,vi} from 'vitest';
const f=vi.hoisted(()=>({q:vi.fn(),ticket:vi.fn(),renderTicket:vi.fn(),renderReceipt:vi.fn(),mint:vi.fn(),logo:vi.fn()}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:f.q}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'fixture'}));
vi.mock('@/lib/server/tickets',()=>({codeAuthentic:()=>true,getTicket:f.ticket,ensureTickets:f.mint}));
vi.mock('@/lib/server/receipt-email',()=>({maskPhone:()=> 'masked'}));
vi.mock('@/lib/tickets/pdf',()=>({renderTicketPdf:f.renderTicket,renderReceiptPdf:f.renderReceipt}));
vi.mock('@/lib/ops/pdf',()=>({getLogoDataUri:f.logo}));
import {GET as ticketPdf} from '@/app/api/tickets/[code]/pdf/route';
import {GET as receiptPdf} from '@/app/api/receipts/[id]/pdf/route';
beforeEach(()=>{Object.values(f).forEach(mock=>mock.mockReset());f.logo.mockResolvedValue('logo');f.renderTicket.mockResolvedValue(Buffer.from('%PDF-fixture'));f.renderReceipt.mockResolvedValue(Buffer.from('%PDF-fixture'));f.mint.mockResolvedValue([])});
it('rejects voided or unconfirmed tickets before expensive PDF work',async()=>{
 for(const row of [{order_status:'paid',voided_at:'2026-01-01'},{order_status:'pending'}]){
  f.ticket.mockResolvedValue(row);const res=await ticketPdf(new Request('https://example.test'),{params:Promise.resolve({code:'TKT-FIXTURE'})});
  expect(res.status).toBe(409);expect(res.headers.get('cache-control')).toBe('no-store');
 }
 expect(f.renderTicket).not.toHaveBeenCalled();expect(f.logo).not.toHaveBeenCalled();
});
it('does not issue purchase receipts for unknown payment outcomes',async()=>{
 for(const status of ['pending','unknown','failed']){
  f.q.mockResolvedValue([{id:'ORD-ABCD',status}]);expect((await receiptPdf(new Request('https://example.test'),{params:Promise.resolve({id:'ORD-ABCD'})})).status).toBe(409);
 }
 expect(f.renderReceipt).not.toHaveBeenCalled();expect(f.mint).not.toHaveBeenCalled();
});
it('confirmed receipts are private and not cached',async()=>{
 f.q.mockResolvedValue([{id:'ORD-ABCD',status:'paid',phone:'254700000000'}]);const res=await receiptPdf(new Request('https://example.test'),{params:Promise.resolve({id:'ORD-ABCD'})});
 expect(res.status).toBe(200);expect(res.headers.get('cache-control')).toBe('private, no-store');expect(res.headers.get('content-type')).toBe('application/pdf');
});
