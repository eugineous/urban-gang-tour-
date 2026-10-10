import {beforeEach,it,expect,vi} from 'vitest';
const state=vi.hoisted(()=>({q:vi.fn(),render:vi.fn()}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:state.q}));
vi.mock('@/lib/server/tickets',()=>({getEventMeta:vi.fn(),getEventName:vi.fn(),signedTicketBlob:vi.fn()}));
vi.mock('@/lib/tickets/compact-document-pdf',()=>({compactDocumentPdf:state.render}));
import {receiptLines} from '@/lib/server/receipt-lines';
import {renderReceiptPdf} from '@/lib/tickets/pdf';
const order={id:'ORD-DELIVERY-FIXTURE',items:[{id:'shirt',name:'Shirt',qty:2,unit:700}],total:1700,status:'paid',pay_method:'card',created_at:'2026-10-10T00:00:00Z'};
beforeEach(()=>{vi.clearAllMocks();state.q.mockResolvedValue([{method:'delivery',fee:300}]);state.render.mockResolvedValue({output:()=>new ArrayBuffer(1)});});
it('reconciles stored discounted merchandise plus the recorded delivery fee',async()=>{
 // Original price 800 × 2, discount 100 × 2, recorded delivery 300 = 1700.
 vi.stubEnv('MERCH_DELIVERY_FEE_KES','999');
 try{const lines=await receiptLines(order);expect(lines.reduce((sum,line)=>sum+line.total,0)).toBe(order.total);expect(800*2-100*2+300).toBe(order.total);expect(lines.at(-1)).toEqual({name:'Merchandise delivery',qty:1,unit:300,total:300});expect(state.q).toHaveBeenCalledWith('SELECT method,fee FROM order_delivery_preferences WHERE order_id=$1',[order.id]);}finally{vi.unstubAllEnvs()}
});
it('includes the same fee in the downloadable PDF without exposing an address',async()=>{
 await renderReceiptPdf(order,null,'');const record=state.render.mock.calls[0][0];expect(record.items.reduce((sum:number,line:any)=>sum+line.price*line.qty,0)).toBe(record.amount);expect(record.items.at(-1)).toEqual({name:'Merchandise delivery',qty:1,price:300});expect(JSON.stringify(record)).not.toContain('address');
});
it('preserves historical pickup receipts and complimentary documents',async()=>{
 state.q.mockResolvedValueOnce([]);expect(await receiptLines(order)).toHaveLength(1);vi.clearAllMocks();expect(await receiptLines({...order,pay_method:'comp'})).toHaveLength(1);expect(state.q).not.toHaveBeenCalled();
});
it('does not silently drop a charged fee during a database read failure',async()=>{
 state.q.mockRejectedValueOnce(Error('Transient database failure'));
 await expect(receiptLines(order)).rejects.toThrow('Transient database failure');
});
