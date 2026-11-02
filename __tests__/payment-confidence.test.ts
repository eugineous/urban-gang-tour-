import {beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('@/lib/server/db',()=>({q:vi.fn()}));
import {q} from '@/lib/server/db';
import {orderDeliveryStatus,paymentEffectStatus} from '@/lib/server/payment-confidence';

const order={id:'ORD-CONFIDENCE',status:'paid',email:'private@example.test',items:[{id:'ticket:test:0',qty:2}]};
beforeEach(()=>{vi.mocked(q).mockReset();});
function records({count=2,effect='complete',email='accepted'}={}){
 vi.mocked(q).mockImplementation(async(sql:string)=>sql.includes('FROM tickets')?[{count}]:sql.includes('FROM email_delivery_outbox')?[{status:email}]:[{effect:'tickets',status:effect}]);
}
describe('redacted read-only delivery confidence',()=>{
 it('requires actual ticket entitlement and distinguishes email acceptance',async()=>{
  records();expect(await orderDeliveryStatus(order)).toEqual({tickets:'ready',email:'accepted'});
  for(const [sql] of vi.mocked(q).mock.calls)expect(sql).not.toMatch(/\b(?:INSERT|UPDATE|CREATE|ALTER|DELETE)\b/i);
 });
 it('does not equate paid with ready documents',async()=>{
  records({count:0,effect:'queued',email:'queued'});
  expect(await orderDeliveryStatus(order)).toEqual({tickets:'preparing',email:'queued'});
 });
 it('does not trust completed job alone if ticket count is incomplete',async()=>{
  records({count:1});expect((await orderDeliveryStatus(order)).tickets).toBe('preparing');
 });
 it('reports review without leaking an operation error',async()=>{
  records({count:0,effect:'blocked',email:'failed'});
  expect(await orderDeliveryStatus(order)).toEqual({tickets:'review',email:'review'});
 });
 it('preserves unknown on unavailable schema, invalid items and missing delivery rows',async()=>{
  vi.mocked(q).mockRejectedValue(Error('PRIVATE_DATABASE_SECRET'));
  expect(await orderDeliveryStatus(order)).toEqual({tickets:'unknown',email:'unknown'});
  vi.mocked(q).mockResolvedValue([]);
  expect(await orderDeliveryStatus({...order,items:'broken'})).toEqual({tickets:'unknown',email:'preparing'});
 });
 it('merchandise does not require tickets and an absent email does not imply sent',async()=>{
  vi.mocked(q).mockResolvedValue([]);
  expect(await orderDeliveryStatus({...order,items:[{id:'merch',qty:1}],email:''})).toEqual({tickets:'not_required',email:'not_requested'});
 });
 it.each(['blocked','skipped'])('shows review if receipt preparation is %s before any email job exists',async status=>{
  vi.mocked(q).mockImplementation(async(sql:string)=>sql.includes('FROM payment_effect_outbox')?[{effect:'receipt',status}]:[]);
  expect(await orderDeliveryStatus({...order,items:[{id:'merch',qty:1}]})).toEqual({tickets:'not_required',email:'review'});
 });
 it.each(['pending','failed','refunded','partially_refunded'])('does not look up or expose delivery for %s',async status=>{
  expect(await orderDeliveryStatus({...order,status})).toEqual({tickets:'unknown',email:'unknown'});
  expect(q).not.toHaveBeenCalled();
 });
 it('sanitizes administrator job summaries with an explicit allowlist',async()=>{
  vi.mocked(q).mockResolvedValue([{order_id:order.id,gateway:'paystack',effect:'tickets',status:'blocked',attempts:8,last_error:'PRIVATE_SECRET',updated_at:'2026-11-02',email:order.email,request_body:'PRIVATE_BODY'}]);
  const rows=await paymentEffectStatus();expect(rows).toEqual([{order_id:order.id,gateway:'paystack',effect:'tickets',status:'blocked',attempts:8,updated_at:'2026-11-02'}]);
  expect(JSON.stringify(rows)).not.toMatch(/PRIVATE|email|last_error|request_body/);
 });
});
