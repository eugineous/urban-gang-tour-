import {beforeEach,describe,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({
  q:vi.fn(), query:vi.fn(), work:[] as (()=>Promise<void>)[],
  tickets:vi.fn(async()=>[]),inventory:vi.fn(async()=>{}),consume:vi.fn(async()=>{}),release:vi.fn(async()=>{}),
  success:vi.fn(async()=>{}),failure:vi.fn(async()=>{}),receipt:vi.fn(async()=>{}),alert:vi.fn(async()=>{}),
}));
vi.mock('next/server',async()=>({...await vi.importActual<typeof import('next/server')>('next/server'),after:(task:()=>Promise<void>)=>state.work.push(task)}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:state.q}));
vi.mock('@/lib/server/mpesa',()=>({stkPushQuery:state.query}));
vi.mock('@/lib/server/alert',()=>({alertCritical:state.alert}));
vi.mock('@/lib/server/receipt-email',()=>({sendReceiptEmail:state.receipt}));
vi.mock('@/lib/server/tickets',()=>({ensureTickets:state.tickets}));
vi.mock('@/lib/server/inventory',()=>({recordPaidMerchOrder:state.inventory}));
vi.mock('@/lib/server/notify',()=>({notifyPaymentSuccess:state.success,notifyPaymentFailure:state.failure}));
vi.mock('@/lib/server/ticket-inventory',()=>({consumeReservation:state.consume,releaseReservation:state.release}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'fixture'}));
import {POST} from '@/app/api/mpesa/callback/route';
const order={id:'ORD-FIXTURE',total:1200,email:'fixture@example.invalid'};
const metadata=[{Name:'MpesaReceiptNumber',Value:'RCP123'},{Name:'Amount',Value:1200}];
function callback(resultCode=0,items:unknown=metadata){return new Request('https://urbangangtour.co.ke/api/mpesa/callback',{method:'POST',body:JSON.stringify({Body:{stkCallback:{CheckoutRequestID:'ws_CO_123',ResultCode:resultCode,CallbackMetadata:{Item:items}}}})});}
async function run(resultCode=0,items:unknown=metadata){const ack=await POST(callback(resultCode,items));expect(ack.status).toBe(200);await Promise.all(state.work.map(work=>work()));return ack;}
beforeEach(()=>{
  vi.clearAllMocks();state.work=[];
  state.query.mockResolvedValue({ok:true,resultCode:0,resultDesc:'Confirmed'});
  state.q.mockImplementation(async(sql:string)=>sql.startsWith('SELECT')?[order]:sql.includes("status='paid'")?[order]:[]);
});
describe('M-Pesa callback verification boundary',()=>{
  it('acknowledges before provider work, then confirms amount/state before fulfilment',async()=>{
    const ack=await POST(callback());expect(ack.status).toBe(200);expect(state.q).not.toHaveBeenCalled();
    await state.work[0]();
    expect(state.query).toHaveBeenCalledWith('ws_CO_123');
    const [sql,params]=state.q.mock.calls.find(([sql])=>sql.includes("status='paid'"))!;
    expect(sql).toContain('status = ANY($3)');expect(sql).toContain('total=$4');
    expect(params).toEqual(['ws_CO_123','RCP123',['pending','unknown','reconciling'],1200]);
    expect(state.tickets).toHaveBeenCalledTimes(1);expect(state.inventory).toHaveBeenCalledTimes(1);
  });
  it('does not query unknown or already settled orders',async()=>{
    state.q.mockResolvedValue([]);await run();expect(state.query).not.toHaveBeenCalled();expect(state.tickets).not.toHaveBeenCalled();
  });
  it.each([{ok:false,reason:'query_failed'},{ok:false,reason:'not_configured'},{ok:true,resultCode:999,resultDesc:'Uncertain'}])('keeps uncertain provider outcomes reconciling without fulfilment',async result=>{
    state.query.mockResolvedValue(result);await run();expect(state.q.mock.calls[1][0]).toContain("status='reconciling'");expect(state.tickets).not.toHaveBeenCalled();expect(state.release).not.toHaveBeenCalled();
  });
  it('ignores a forged success when the provider reports cancellation',async()=>{
    state.query.mockResolvedValue({ok:true,resultCode:1032,resultDesc:'Cancelled'});await run();
    expect(state.q.mock.calls[1][1]).toEqual(['ws_CO_123','declined',['pending','unknown','reconciling']]);expect(state.tickets).not.toHaveBeenCalled();
  });
  it('does not accept an unsigned failure over provider-confirmed success',async()=>{
    await run(1032,[]);expect(state.q.mock.calls[1][0]).toContain("status='reconciling'");expect(state.release).not.toHaveBeenCalled();
  });
  it.each([{items:[]},{items:[{Name:'MpesaReceiptNumber',Value:'<img onerror=alert(1)>'},{Name:'Amount',Value:1200}]},{items:[{Name:'MpesaReceiptNumber',Value:'RCP123'},{Name:'Amount',Value:1}]}])('rejects incomplete, unsafe or mismatched success details',async ({items})=>{
    await run(0,items);expect(state.tickets).not.toHaveBeenCalled();expect(state.q.mock.calls[1][0]).toContain("status='reconciling'");
  });
  it('does not fulfil a duplicated or concurrently settled callback',async()=>{
    state.q.mockImplementation(async(sql:string)=>sql.startsWith('SELECT')?[order]:[]);await run();expect(state.tickets).not.toHaveBeenCalled();expect(state.inventory).not.toHaveBeenCalled();
  });
  it('records timeouts only from a verified provider result',async()=>{
    state.query.mockResolvedValue({ok:true,resultCode:1037,resultDesc:'Timeout'});await run();expect(state.q.mock.calls[1][1][1]).toBe('timed_out');
  });
});
