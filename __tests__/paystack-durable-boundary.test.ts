import crypto from 'node:crypto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';

const state=vi.hoisted(()=>({q:vi.fn(),settle:vi.fn(),effects:vi.fn(),reconcile:vi.fn(),work:[] as Array<()=>Promise<void>>,notify:vi.fn(),alert:vi.fn(),configured:true}));
vi.mock('next/server',async()=>({...await vi.importActual<typeof import('next/server')>('next/server'),after:(work:()=>Promise<void>)=>state.work.push(work)}));
vi.mock('@/lib/server/db',()=>({q:state.q,hasDb:()=>state.configured}));
vi.mock('@/lib/server/payment-effects',()=>({settlePaystackOrder:state.settle,processPaymentEffects:state.effects}));
vi.mock('@/lib/server/reconcile',()=>({reconcileStuckOrders:state.reconcile}));
vi.mock('@/lib/server/notify',()=>({notifyPaymentSuccess:state.notify}));
vi.mock('@/lib/server/alert',()=>({alertCritical:state.alert}));
import {POST as webhook} from '@/app/api/paystack/webhook/route';
import {POST as cron} from '@/app/api/internal/cron/payment-reconcile/route';

const order={id:'ORD-DURABLE123',total:1200,status:'paid',email:'fictional@example.test'};
function signed(changes:Record<string,unknown>={}){
 const body=JSON.stringify({event:'charge.success',data:{reference:order.id,amount:120000,currency:'KES',status:'success',channel:'card',...changes}});
 return new Request('https://urbangangtour.co.ke/api/paystack/webhook',{method:'POST',body,headers:{'x-paystack-signature':crypto.createHmac('sha512','fixture-signing-key').update(body).digest('hex')}});
}
const request=()=>new Request('https://urbangangtour.co.ke/api/internal/cron/payment-reconcile',{method:'POST',headers:{'x-ugt-cron':'fixture-cron-key'}});
beforeEach(()=>{
 vi.clearAllMocks();state.configured=true;state.work=[];
 vi.stubEnv('PAYSTACK_SECRET_KEY','fixture-signing-key');vi.stubEnv('UGT_CRON_SECRET','fixture-cron-key');vi.stubEnv('PAYSTACK_ENABLED','false');
 state.q.mockResolvedValue([]);state.settle.mockResolvedValue(order);state.effects.mockResolvedValue([]);state.notify.mockResolvedValue(undefined);state.alert.mockResolvedValue(undefined);
 state.reconcile.mockResolvedValue({checked:0,paid:[],failed:[],stillPending:[],skipped:[]});
});
afterEach(()=>vi.unstubAllEnvs());

it('records durable settlement before acknowledging and defers only acceleration',async()=>{
 const response=await webhook(signed());
 expect(response.status).toBe(200);
 expect(state.settle.mock.calls).toEqual([[{orderId:order.id,reference:order.id,amountKes:1200}]]);
 expect(state.effects).not.toHaveBeenCalled();expect(state.work).toHaveLength(1);
 expect(state.q.mock.calls.some(([sql])=>String(sql).includes("UPDATE orders SET status='paid'"))).toBe(false);
 await state.work[0]();expect(state.effects.mock.calls).toEqual([[4,order.id]]);
});

it('returns retryable503 if durable settlement and enqueue cannot commit',async()=>{
 state.settle.mockRejectedValue(Error('outbox insert failed'));
 expect((await webhook(signed())).status).toBe(503);
 expect(state.effects).not.toHaveBeenCalled();expect(state.notify).not.toHaveBeenCalled();
});

it('does not recreate effects or replay notices when another event already settled the order',async()=>{
 state.settle.mockResolvedValue(null);
 expect((await webhook(signed())).status).toBe(200);expect(state.work).toHaveLength(0);
 expect(state.effects).not.toHaveBeenCalled();expect(state.notify).not.toHaveBeenCalled();
});

it.each([{currency:'USD'},{amount:120001},{reference:'unsafe<script>'},{status:'failed'}])('rejects invalid evidence before durable settlement: %j',async changes=>{
 expect((await webhook(signed(changes))).status).toBe(200);
 expect(state.settle).not.toHaveBeenCalled();expect(state.effects).not.toHaveBeenCalled();
});

it('rejects an invalid raw-body signature before any durable work',async()=>{
 const req=signed();req.headers.set('x-paystack-signature','invalid');
 expect((await webhook(req)).status).toBe(400);expect(state.settle).not.toHaveBeenCalled();expect(state.effects).not.toHaveBeenCalled();
});

it('drains persisted effects with the provider disabled before pending-order verification',async()=>{
 state.effects.mockResolvedValue([{orderId:order.id,effect:'receipt',status:'complete'}]);
 const response=await cron(request());expect(response.status).toBe(200);
 expect(state.effects).toHaveBeenCalledOnce();expect(state.reconcile).toHaveBeenCalledOnce();
 expect(state.effects.mock.invocationCallOrder[0]).toBeLessThan(state.reconcile.mock.invocationCallOrder[0]);
 expect((await response.json()).effects).toEqual([{orderId:order.id,effect:'receipt',status:'complete'}]);
});

it('attempts durable recovery even when subsequent verification is unavailable',async()=>{
 state.reconcile.mockRejectedValue(Error('database_unavailable'));
 const response=await cron(request());expect(response.status).toBe(503);
 expect(state.effects).toHaveBeenCalledOnce();expect(state.reconcile).toHaveBeenCalledOnce();
});

it('keeps durable recovery behind the existing authenticated cron boundary',async()=>{
 const req=request();req.headers.set('x-ugt-cron','wrong');
 expect((await cron(req)).status).toBe(401);expect(state.effects).not.toHaveBeenCalled();expect(state.reconcile).not.toHaveBeenCalled();
});
