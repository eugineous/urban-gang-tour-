import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,expect,it,vi} from 'vitest';
vi.mock('next/headers',()=>({cookies:async()=>({toString:()=>''})}));
vi.mock('next/navigation',()=>({usePathname:()=>'/tickets',notFound:()=>{throw Error('not_found')}}));
vi.mock('@/lib/server/receipt-access',()=>({accessibleReceiptOrder:vi.fn()}));
vi.mock('@/lib/server/receipt-lines',()=>({receiptLines:async()=>[]}));
vi.mock('@/lib/server/receipt-email',()=>({maskPhone:()=>''}));
vi.mock('@/lib/server/tickets',()=>({ensureTickets:vi.fn(async()=>[]),ticketsForOrder:vi.fn(async()=>[]),getEventMeta:async()=>undefined,getEventName:async()=>''}));
vi.mock('@/app/_components/LanguageChooser',()=>({default:()=>null}));
import {accessibleReceiptOrder} from '@/lib/server/receipt-access';
import {ensureTickets} from '@/lib/server/tickets';
import TicketPage from '@/app/tickets/[orderId]/page';
import ReceiptPage from '@/app/receipt/[id]/page';
import {LanguageProvider} from '@/ui/i18n/LanguageProvider';
const id='ORD-DOCUMENT-FEEDBACK';
beforeEach(()=>{vi.clearAllMocks();});
function setOrder(status:string){vi.mocked(accessibleReceiptOrder).mockResolvedValue({id,status,total:1000,created_at:'2026-11-02T00:00:00Z',items:[{id:'ticket:event:0',qty:1}]} as never);}
const html=(node:React.ReactNode)=>renderToStaticMarkup(React.createElement(LanguageProvider,null,node));
it.each(['declined','timed_out','cancelled','failed','refunded','partially_refunded'])('never describes an inactive %s entitlement as payment pending',async status=>{
 setOrder(status);const markup=html(await TicketPage({params:Promise.resolve({orderId:id})}));
 expect(markup).not.toContain('Payment pending');expect(markup).toContain('Check payment again');expect(markup).not.toContain('/api/tickets/');expect(ensureTickets).not.toHaveBeenCalled();
});
it('does not claim a paid ticket order contains no tickets when preparation fails',async()=>{
 setOrder('paid');vi.mocked(ensureTickets).mockRejectedValueOnce(Error('fixture interruption'));
 const markup=html(await TicketPage({params:Promise.resolve({orderId:id})}));
 expect(markup).not.toContain('This order has no event tickets');expect(markup).toContain('could not check ticket preparation');expect(markup).toContain('Check payment again');
});
it.each(['declined','timed_out','cancelled'])('does not print a PENDING banner for a %s receipt',async status=>{
 setOrder(status);const markup=html(await ReceiptPage({params:Promise.resolve({id})}));expect(markup).toContain('NOT COMPLETED');expect(markup).not.toContain('>PENDING<');
});
