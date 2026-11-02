import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';

const state=vi.hoisted(()=>({q:vi.fn(),qSchema:vi.fn(async()=>{}),effects:vi.fn(async()=>[]),notify:vi.fn(async()=>{}),failure:vi.fn(async()=>{}),release:vi.fn(async()=>{}),alert:vi.fn(async()=>{}),work:[] as Array<()=>Promise<void>>}));
vi.mock('next/server',async()=>({...await vi.importActual<typeof import('next/server')>('next/server'),after:(work:()=>Promise<void>)=>state.work.push(work)}));
vi.mock('@/lib/server/db',()=>({q:state.q,qSchema:state.qSchema,hasDb:()=>true,db:()=>({})}));
vi.mock('@/lib/server/stripe',()=>({stripe:()=>({webhooks:{constructEvent:(body:string,signature:string)=>{if(signature!=='fixture-valid')throw Error('invalid fixture signature');return JSON.parse(body)}}})}));
vi.mock('@/lib/server/payment-effects',async()=>({...await vi.importActual<typeof import('@/lib/server/payment-effects')>('@/lib/server/payment-effects'),processPaymentEffects:state.effects}));
vi.mock('@/lib/server/notify',()=>({notifyPaymentSuccess:state.notify,notifyPaymentFailure:state.failure}));
vi.mock('@/lib/server/ticket-inventory',async()=>({...await vi.importActual<typeof import('@/lib/server/ticket-inventory')>('@/lib/server/ticket-inventory'),releaseReservation:state.release}));
vi.mock('@/lib/server/alert',()=>({alertCritical:state.alert}));
import {POST} from '@/app/api/stripe/webhook/route';

const paid={id:'ORD-STRIPE123',total:1200,status:'paid',email:'fixture@example.invalid'};
function request(changes:Record<string,unknown>={},signature='fixture-valid'){
  return new Request('https://urbangangtour.co.ke/api/stripe/webhook',{method:'POST',headers:{'stripe-signature':signature},body:JSON.stringify({type:'checkout.session.completed',data:{object:{id:'cs_fixture',payment_intent:'pi_fixture',metadata:{order_id:paid.id},payment_status:'paid',currency:'kes',amount_total:120000,...changes}}})});
}
function failedIntent(){
  return new Request('https://urbangangtour.co.ke/api/stripe/webhook',{method:'POST',headers:{'stripe-signature':'fixture-valid'},body:JSON.stringify({type:'payment_intent.payment_failed',data:{object:{id:'pi_fixture',metadata:{order_id:paid.id},amount:120000,currency:'kes',last_payment_error:{message:'Fixture card attempt declined'}}}})});
}
beforeEach(()=>{
  vi.clearAllMocks();state.work=[];vi.stubEnv('STRIPE_WEBHOOK_SECRET','fixture-signing-key');
  vi.stubGlobal('fetch',vi.fn(()=>{throw Error('network forbidden')}));
  state.q.mockImplementation(async(sql:string)=>sql.includes("status='paid'")?[paid]:[]);
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()});

describe('Stripe durable fulfillment boundary',()=>{
  it('commits an exact session/card/amount settlement with fulfillment before acknowledgment',async()=>{
    expect((await POST(request())).status).toBe(200);
    const [sql,params]=state.q.mock.calls.find(([sql])=>sql.includes("status='paid'"))!;
    expect(sql).toContain('INSERT INTO payment_effect_outbox');expect(sql).toContain('stripe_session=$2');expect(sql).toContain("pay_method='card'");expect(sql).toContain('total=$4');
    expect(params).toEqual([paid.id,'cs_fixture','pi_fixture',1200,['pending','unknown','reconciling']]);
    expect(state.effects).not.toHaveBeenCalled();expect(state.work).toHaveLength(1);
    await state.work[0]();expect(state.effects).toHaveBeenCalledWith(4,paid.id);
  });
  it('returns a retryable storage failure instead of acknowledging lost settlement work',async()=>{
    state.q.mockImplementation(async(sql:string)=>{if(sql.includes("status='paid'"))throw Error('private database detail');return []});
    const response=await POST(request());expect(response.status).toBe(503);expect(JSON.stringify(await response.json())).not.toContain('private');
    expect(state.effects).not.toHaveBeenCalled();expect(state.notify).not.toHaveBeenCalled();
  });
  it('an optional audit outage cannot prevent durable fulfillment or owner notification',async()=>{
    state.q.mockImplementation(async(sql:string)=>{if(sql.includes('audit_log'))throw Error('fixture audit outage');return sql.includes("status='paid'")?[paid]:[]});
    expect((await POST(request())).status).toBe(200);expect(state.work).toHaveLength(1);
    await state.work[0]();expect(state.effects).toHaveBeenCalledWith(4,paid.id);expect(state.notify).toHaveBeenCalledOnce();
  });
  it('does not recreate consequences or alert for an already settled event',async()=>{
    state.q.mockResolvedValue([]);expect((await POST(request())).status).toBe(200);
    expect(state.work).toHaveLength(0);expect(state.effects).not.toHaveBeenCalled();expect(state.notify).not.toHaveBeenCalled();expect(state.alert).not.toHaveBeenCalled();
  });
  it.each([{payment_status:'unpaid'},{currency:'usd'},{amount_total:120001},{amount_total:0},{id:'cs_unsafe<script>'}])('does not settle invalid payment evidence: %j',async changes=>{
    expect((await POST(request(changes))).status).toBe(200);
    expect(state.q.mock.calls.some(([sql])=>sql.includes("status='paid'"))).toBe(false);
  });
  it('rejects unsigned input before touching the ledger',async()=>{
    expect((await POST(request({},'invalid'))).status).toBe(400);expect(state.q).not.toHaveBeenCalled();
  });
  it('retains hosted capacity after a failed attempt and can settle its later paid session',async()=>{
    let status='pending';
    state.q.mockImplementation(async(sql:string,params:unknown[]=[])=>{
      if(sql.includes('UPDATE orders SET status=')){
        if(sql.includes("status='reconciling'")&&params.includes('pi_fixture')){status='reconciling';return [{id:paid.id,total:1200}]}
        if(sql.includes("status='failed'")){status='failed';return [{id:paid.id,total:1200}]}
        if(sql.includes("status='paid'")&&['pending','unknown','reconciling'].includes(status)){status='paid';return [paid]}
      }
      return [];
    });
    expect((await POST(failedIntent())).status).toBe(200);
    expect(status).toBe('reconciling');
    const [sql,params]=state.q.mock.calls.find(([sql])=>sql.includes('UPDATE orders SET status='))!;
    expect(sql).toContain('stripe_payment_intent=$3');expect(sql).toContain("pay_method='card'");expect(sql).toContain('total=$4');
    expect(params).toEqual([paid.id,['pending','unknown','reconciling'],'pi_fixture',1200]);
    await Promise.all(state.work.map(work=>work()));expect(state.release).not.toHaveBeenCalled();
    expect((await POST(request())).status).toBe(200);expect(status).toBe('paid');
  });
  it('ignores an unbound failed intent rather than trusting its order metadata',async()=>{
    state.q.mockImplementation(async(sql:string,params:unknown[]=[])=>
      sql.includes('UPDATE orders SET status=')&&!params.includes('pi_fixture')?[{id:paid.id,total:1200}]:[]);
    expect((await POST(failedIntent())).status).toBe(200);
    await Promise.all(state.work.map(work=>work()));
    expect(state.release).not.toHaveBeenCalled();expect(state.failure).not.toHaveBeenCalled();
  });
});
