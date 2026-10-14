import {beforeEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({q:vi.fn(),query:vi.fn(),ticket:vi.fn(async()=>{}),inventory:vi.fn(async()=>{}),email:vi.fn(async()=>{}),consume:vi.fn(async()=>{}),release:vi.fn(async()=>{})}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:m.q}));
vi.mock('@/lib/server/mpesa',()=>({stkPushQuery:m.query}));
vi.mock('@/lib/server/paystack',()=>({paystackConfigured:()=>false,paystackVerify:vi.fn()}));
vi.mock('@/lib/server/tickets',()=>({ensureTickets:m.ticket}));
vi.mock('@/lib/server/inventory',()=>({recordPaidMerchOrder:m.inventory}));
vi.mock('@/lib/server/receipt-email',()=>({sendReceiptEmail:m.email}));
vi.mock('@/lib/server/ticket-inventory',()=>({consumeReservation:m.consume,releaseReservation:m.release}));
import {reconcileStuckOrders} from '@/lib/server/reconcile';
const order={id:'ORD-RECOVER',total:900,status:'reconciling',mpesa_ref:'ws_CO_recover',email:'buyer@example.invalid'};
beforeEach(()=>{vi.clearAllMocks();m.query.mockResolvedValue({ok:true,resultCode:0});m.q.mockImplementation(async(sql:string)=>sql.startsWith('SELECT')||sql.includes("SET status='paid'")?[order]:[])});
describe('recovery completes purchases after provider verification',()=>{
  it('records inventory, issues tickets and sends the receipt for a recovered payment',async()=>{
    expect((await reconcileStuckOrders()).paid).toEqual([order.id]);
    expect(m.inventory).toHaveBeenCalledWith(order);expect(m.ticket).toHaveBeenCalledWith(order);expect(m.email).toHaveBeenCalledWith(order);
  });
  it('does not fulfil a concurrently settled payment twice',async()=>{
    m.q.mockImplementation(async(sql:string)=>sql.startsWith('SELECT')?[order]:[]);
    await reconcileStuckOrders();expect(m.inventory).not.toHaveBeenCalled();expect(m.email).not.toHaveBeenCalled();
  });
  it('does not fulfil an unavailable or uncertain result',async()=>{
    m.query.mockResolvedValue({ok:false,reason:'query_failed'});await reconcileStuckOrders();expect(m.inventory).not.toHaveBeenCalled();expect(m.ticket).not.toHaveBeenCalled();
  });
});
