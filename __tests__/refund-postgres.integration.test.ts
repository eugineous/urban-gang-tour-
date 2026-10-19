import {afterAll,beforeAll,beforeEach,it,expect,vi} from 'vitest';
import {DisposablePostgres} from './helpers/disposable-postgres';
const adapter=vi.hoisted(()=>({q:vi.fn(),qSchema:vi.fn(),db:vi.fn(),hasDb:()=>true}));
vi.mock('@/lib/server/db',()=>adapter);
import {recordRefund,ensureRefundSchema,type RefundInput} from '@/lib/server/refunds';
import {ticketIsActive} from '@/lib/server/ticket-entitlement';
vi.mock('next/server',async original=>({...await original<object>(),after:vi.fn()}));
vi.mock('@/lib/server/session',()=>({verifyAdminSession:async()=>true,hasPerm:()=>true}));
vi.mock('@/lib/server/origin',()=>({requireOrigin:()=>true}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'fixture'}));
vi.mock('@/lib/server/notify',()=>({notifyTicketScan:vi.fn()}));
vi.mock('@/lib/server/tickets',()=>({codeAuthentic:()=>true,ensureTicketSchema:async()=>{},getEventName:async()=> 'Fixture event',getEventMeta:async()=>null,getTicket:async(code:string)=>(await fixture.query('SELECT t.*,o.status AS order_status FROM tickets t JOIN orders o ON o.id=t.order_id WHERE code=$1',[code]))[0]}));
import {POST as scan} from '@/app/api/tickets/verify/route';
const enabled=process.env.UGT_REFUND_PG_FIXTURE==='1',fixture=new DisposablePostgres(),test=it.skipIf(!enabled);
beforeAll(async()=>{if(!enabled)return;fixture.start();await vi.waitFor(()=>expect(fixture.ready()).toBe(true),{timeout:10000});await fixture.schema(`CREATE TABLE orders(id TEXT PRIMARY KEY,total INT,status TEXT,items JSONB);CREATE TABLE tickets(code TEXT PRIMARY KEY,order_id TEXT,event_id TEXT,position INT,used_at TIMESTAMPTZ,used_by TEXT);CREATE TABLE audit_log(actor TEXT,action TEXT,detail TEXT);`);adapter.q.mockImplementation((sql:string,args:unknown[])=>fixture.query(sql,args));adapter.qSchema.mockImplementation((sql:string)=>fixture.schema(sql));adapter.db.mockImplementation(()=>fixture.pool());await ensureRefundSchema()},20000);
beforeEach(async()=>{if(enabled){await fixture.query('TRUNCATE refunds,tickets,orders,audit_log RESTART IDENTITY');await fixture.query("INSERT INTO orders(id,total,status,items) VALUES('ORD-TEST',1000,'paid',$1::jsonb)",[JSON.stringify([{id:'tee',qty:2,unit:500}])])}});
afterAll(()=>{if(enabled)fixture.stop()},20000);
const input=(overrides:Partial<RefundInput>={}):RefundInput=>({orderId:'ORD-TEST',amountKes:500,reason:'External return confirmed by operator',actor:'fixture-owner',requestId:'a'.repeat(32),externalReference:'BANK-REF-001',externalConfirmed:true,ticketCodes:[],...overrides});
const total=async()=>Number((await fixture.query('SELECT COALESCE(SUM(amount),0)::text AS n FROM refunds'))[0].n);
async function ticketOrder(){await fixture.query("UPDATE orders SET items=$1::jsonb WHERE id='ORD-TEST'",[JSON.stringify([{id:'ticket:event:0',qty:2,unit:500}])]);await fixture.query("INSERT INTO tickets(code,order_id,event_id,position) VALUES('TKT-FIRST','ORD-TEST','event',1),('TKT-SECOND','ORD-TEST','event',2)")}
test('20 concurrent identical retries create one record and one audit',async()=>{
 const results=await Promise.all(Array.from({length:20},()=>recordRefund(input())));expect(new Set(results.map(r=>r.refundId)).size).toBe(1);expect(results.filter(r=>!r.deduped)).toHaveLength(1);expect(await total()).toBe(500);expect((await fixture.query('SELECT COUNT(*)::text AS n FROM audit_log'))[0].n).toBe('1');
},20000);
test('competing distinct records cannot exceed the order budget',async()=>{
 const results=await Promise.allSettled(Array.from({length:20},(_,i)=>recordRefund(input({amountKes:200,requestId:String(i).padStart(32,'0'),externalReference:'BANK-'+i}))));expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(5);expect(await total()).toBe(1000);expect((await fixture.query("SELECT status FROM orders WHERE id='ORD-TEST'"))[0].status).toBe('refunded');
},20000);
test('deduplicates an external reference independently of the browser request ID',async()=>{
 const first=await recordRefund(input());const retry=await recordRefund(input({requestId:'b'.repeat(32),externalReference:'bank-ref-001'}));expect(retry.refundId).toBe(first.refundId);expect(await total()).toBe(500);await expect(recordRefund(input({amountKes:300}))).rejects.toThrow('refund_request_conflict');
});
test('an audit failure rolls back ledger, status and revocation',async()=>{
 await ticketOrder();await fixture.schema("CREATE FUNCTION reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture_audit_failure'; END $$;CREATE TRIGGER reject_audit BEFORE INSERT ON audit_log FOR EACH ROW EXECUTE FUNCTION reject_audit();");
 try{await expect(recordRefund(input({ticketCodes:['TKT-FIRST']}))).rejects.toThrow();expect(await total()).toBe(0);expect((await fixture.query("SELECT status FROM orders WHERE id='ORD-TEST'"))[0].status).toBe('paid');expect((await fixture.query('SELECT voided_at FROM tickets')).every(t=>t.voided_at===null)).toBe(true)}finally{await fixture.query('DROP TRIGGER reject_audit ON audit_log;DROP FUNCTION reject_audit()')}
});
test('partial ticket refunds void only selected tickets and preserve the others',async()=>{
 await ticketOrder();await recordRefund(input({ticketCodes:['TKT-FIRST']}));const rows=await fixture.query('SELECT t.*,o.status AS order_status,o.ticket_refund_policy FROM tickets t JOIN orders o ON o.id=t.order_id ORDER BY position');expect(ticketIsActive(rows[0] as never)).toBe(false);expect(ticketIsActive(rows[1] as never)).toBe(true);
 await expect(recordRefund(input({requestId:'b'.repeat(32),externalReference:'BANK-2',ticketCodes:['TKT-FIRST']}))).rejects.toThrow('ticket_not_refundable');
});
test('rejects unspecified, foreign, used or incorrectly priced partial allocation',async()=>{
 await ticketOrder();for(const change of [{ticketCodes:[]},{ticketCodes:['TKT-FOREIGN']},{ticketCodes:['TKT-FIRST'],amountKes:250}])await expect(recordRefund(input(change))).rejects.toThrow();await fixture.query("UPDATE tickets SET used_at=now() WHERE code='TKT-FIRST'");await expect(recordRefund(input({ticketCodes:['TKT-FIRST']}))).rejects.toThrow('ticket_not_refundable');expect(await total()).toBe(0);
});
test('full cumulative refund voids the remaining ticket and replays safely',async()=>{
 await ticketOrder();await recordRefund(input({ticketCodes:['TKT-FIRST']}));const final=input({requestId:'b'.repeat(32),externalReference:'BANK-2',ticketCodes:['TKT-SECOND']});const result=await recordRefund(final);expect(result.status).toBe('refunded');expect((await recordRefund(final)).deduped).toBe(true);expect((await fixture.query('SELECT voided_at FROM tickets')).every(t=>!!t.voided_at)).toBe(true);
});
test('does not silently reactivate legacy partial refunds',async()=>{
 await ticketOrder();await fixture.query("INSERT INTO refunds(order_id,amount,reason,actor) VALUES('ORD-TEST',100,'Legacy','owner')");await fixture.query("UPDATE orders SET status='partially_refunded' WHERE id='ORD-TEST'");await expect(recordRefund(input({ticketCodes:['TKT-FIRST']}))).rejects.toThrow('legacy_refund_review_required');expect(ticketIsActive({order_status:'partially_refunded'})).toBe(false);
});
test('requires explicit confirmation before any database consequence',async()=>{
 await expect(recordRefund(input({externalConfirmed:false}))).rejects.toThrow('external_refund_confirmation_required');await expect(recordRefund(input({externalReference:''}))).rejects.toThrow('external_refund_reference_required');await expect(recordRefund(input({requestId:''}))).rejects.toThrow('refund_request_id_required');expect(await total()).toBe(0);
});
test('the actual gate route admits an unaffected ticket once but not a refunded ticket',async()=>{
 await ticketOrder();await recordRefund(input({ticketCodes:['TKT-FIRST']}));
 const request=(code:string)=>new Request('https://fixture.test/api/tickets/verify',{method:'POST',body:JSON.stringify({code})});
 expect((await(await scan(request('TKT-FIRST'))).json()).result).toBe('invalid');expect((await(await scan(request('TKT-SECOND'))).json()).result).toBe('valid');expect((await(await scan(request('TKT-SECOND'))).json()).result).toBe('used');
});
