import {beforeEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({q:vi.fn(),query:vi.fn(),ticket:vi.fn(async()=>{}),inventory:vi.fn(async()=>{}),email:vi.fn(async()=>{}),consume:vi.fn(async()=>{}),release:vi.fn(async()=>{}),effects:vi.fn(async()=>[]),notify:vi.fn(async()=>{})}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:m.q,qSchema:vi.fn(async()=>{})}));
vi.mock('@/lib/server/payment-effects',async()=>({...await vi.importActual<typeof import('@/lib/server/payment-effects')>('@/lib/server/payment-effects'),processPaymentEffects:m.effects}));
vi.mock('@/lib/server/notify',()=>({notifyPaymentSuccess:m.notify}));
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
  it('durably queues fulfillment for a freshly recovered authenticated payment',async()=>{
    expect((await reconcileStuckOrders()).paid).toEqual([order.id]);
    const [sql,params]=m.q.mock.calls.find(([sql])=>sql.includes("status='paid'"))!;
    expect(sql).toContain('INSERT INTO payment_effect_outbox');
    expect(params).toEqual([order.id,'ws_CO_recover',900,null,['pending','unknown','reconciling']]);
    expect(m.effects).toHaveBeenCalledWith(4,order.id);
    expect(m.inventory).not.toHaveBeenCalled();expect(m.ticket).not.toHaveBeenCalled();expect(m.email).not.toHaveBeenCalled();
    expect(m.notify).toHaveBeenCalledWith({gateway:'mpesa',orderId:order.id,amount:900});
  });
  it('does not fulfil a concurrently settled payment twice',async()=>{
    m.q.mockImplementation(async(sql:string)=>sql.startsWith('SELECT')?[order]:[]);
    await reconcileStuckOrders();expect(m.inventory).not.toHaveBeenCalled();expect(m.email).not.toHaveBeenCalled();
  });
  it('does not fulfil an unavailable or uncertain result',async()=>{
    m.query.mockResolvedValue({ok:false,reason:'query_failed'});await reconcileStuckOrders();expect(m.inventory).not.toHaveBeenCalled();expect(m.ticket).not.toHaveBeenCalled();
  });
  it('never reopens a concurrent terminal order while flagging a verified amount mismatch',async()=>{
    m.query.mockResolvedValue({ok:true,resultCode:0,amount:1});await reconcileStuckOrders();
    const [sql,params]=m.q.mock.calls.find(([sql])=>sql.includes("status='reconciling'"))!;
    expect(sql).toContain('status = ANY($2)');expect(sql).toContain('mpesa_ref=$3');expect(sql).toContain('total=$4');
    expect(params).toEqual([order.id,['pending','unknown','reconciling'],'ws_CO_recover',900]);
    expect(m.effects).not.toHaveBeenCalled();
  });
});
