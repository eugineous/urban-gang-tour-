import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({order:{id:'ORD-REVIEW1234567890123456789',status:'paid',items:[{id:'ticket:event:0',name:'Fixture - General',unit:500,qty:1}],total:500,pay_method:'card',paystack_ref:'ORD-REVIEW1234567890123456789',ticket_fulfillment_status:'refund_review'}}));
vi.mock('next/headers',()=>({cookies:async()=>({toString:()=>''})}));
vi.mock('@/lib/server/receipt-access',()=>({accessibleReceiptOrder:async()=>state.order}));
vi.mock('@/lib/server/db',()=>({q:async()=>[],hasDb:()=>false,db:()=>null}));
vi.mock('@/lib/tickets/compact-document-pdf',()=>({compactDocumentPdf:async(record:unknown)=>({output:()=>Buffer.from(JSON.stringify(record))})}));
import ReceiptPage from '@/app/receipt/[id]/page';
import {renderReceiptPdf} from '@/lib/tickets/pdf';
it('the private receipt page retains paid money and explains that tickets need manual refund review',async()=>{
 const html=renderToStaticMarkup(await ReceiptPage({params:Promise.resolve({id:state.order.id})}));expect(html).toContain('manual refund review');expect(html).not.toContain('/t/');expect(html).toContain('KES 500');
});
it('the receipt PDF status cannot imply fulfilled tickets while their paid order needs refund review',async()=>{
 const record=JSON.parse((await renderReceiptPdf(state.order,null,'')).toString());expect(record.status).toBe('Payment received - manual refund review; tickets not issued');expect(record.amount).toBe(500);
});
