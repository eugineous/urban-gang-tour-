import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {DisposablePostgres} from './helpers/disposable-postgres';

const adapter=vi.hoisted(()=>({q:vi.fn(),buyer:vi.fn()}));
vi.mock('@/lib/server/db',()=>({q:adapter.q,hasDb:()=>true}));
vi.mock('@/lib/server/customer-account',async original=>({...await original<typeof import('@/lib/server/customer-account')>(),ensureCustomerAccountSchema:async()=>{},validatedCurrentBuyer:adapter.buyer}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'isolated-account-history'}));
import {GET} from '@/app/api/account/route';

const enabled=process.env.UGT_ACCOUNT_HISTORY_PG_FIXTURE==='1';
const fixture=new DisposablePostgres();
const test=it.skipIf(!enabled);
const read=(query='')=>GET(new Request('https://local.invalid/api/account'+query));
beforeAll(async()=>{
 if(!enabled)return;
 fixture.start();await vi.waitFor(()=>expect(fixture.ready()).toBe(true),{timeout:10000});
 adapter.q.mockImplementation((sql:string,args:unknown[]=[])=>fixture.query(sql,args));
 await fixture.schema(`CREATE TABLE users(id INTEGER PRIMARY KEY,name TEXT,email TEXT,phone TEXT,created_at TIMESTAMPTZ DEFAULT now());
 CREATE TABLE orders(id TEXT PRIMARY KEY,user_id INTEGER,items JSONB DEFAULT '[]',total INTEGER DEFAULT 500,status TEXT DEFAULT 'paid',ticket_refund_policy TEXT,created_at TIMESTAMPTZ);
 CREATE TABLE tickets(code TEXT PRIMARY KEY,order_id TEXT,event_id TEXT DEFAULT 'fixture',tier_name TEXT DEFAULT 'General',holder TEXT DEFAULT '',used_at TIMESTAMPTZ,voided_at TIMESTAMPTZ,created_at TIMESTAMPTZ);
 CREATE TABLE customer_privacy_requests(id TEXT PRIMARY KEY,user_id INTEGER,kind TEXT DEFAULT 'deletion',status TEXT DEFAULT 'received',created_at TIMESTAMPTZ);
 INSERT INTO users(id,name,email) VALUES(1,'Fixture one','one@example.invalid'),(2,'Fixture two','two@example.invalid');
 INSERT INTO orders(id,user_id,created_at) SELECT 'ORDER-'||lpad(i::text,3,'0'),1,'2026-11-10 12:00:00.123456+00'::timestamptz FROM generate_series(1,35) i;
 INSERT INTO orders(id,user_id,created_at) VALUES('OTHER-USER',2,'2026-11-10 12:00:00.123456+00'),('MICRO-OLDER',1,'2026-11-10 12:00:00.123455+00');
 INSERT INTO tickets(code,order_id,created_at) SELECT 'TICKET-'||lpad(i::text,3,'0'),'ORDER-001','2026-11-10 12:00:00.123456+00'::timestamptz FROM generate_series(1,205) i;
 INSERT INTO tickets(code,order_id,created_at) VALUES('OTHER-TICKET','OTHER-USER',now());
 INSERT INTO orders(id,user_id,status,ticket_refund_policy,created_at) VALUES('REFUND',1,'refunded',NULL,'2025-01-01'),('LEGACY-PARTIAL',1,'partially_refunded',NULL,'2025-01-01'),('ALLOCATED-PARTIAL',1,'partially_refunded','allocated','2025-01-01');
 INSERT INTO tickets(code,order_id,voided_at,created_at) VALUES('REFUNDED-TICKET','REFUND',NULL,now()),('LEGACY-TICKET','LEGACY-PARTIAL',NULL,now()),('VOID-TICKET','ORDER-001',now(),now()),('ALLOCATED-TICKET','ALLOCATED-PARTIAL',NULL,'2025-01-01');
 INSERT INTO customer_privacy_requests(id,user_id,created_at) SELECT 'REQUEST-'||lpad(i::text,3,'0'),1,'2026-11-10 12:00:00.123456+00'::timestamptz FROM generate_series(1,25) i;
 INSERT INTO customer_privacy_requests(id,user_id,created_at) VALUES('OTHER-REQUEST',2,now());`);
},20000);
beforeEach(()=>{adapter.buyer.mockResolvedValue({id:1,email:'one@example.invalid'});});
afterAll(()=>fixture.stop(),20000);

describe('bounded authenticated account history on real PostgreSQL',()=>{
 test('bounds every stream and independently follows tied timestamps without losing microseconds',async()=>{
  const response=await read();expect(response.status).toBe(200);
  const first=await response.json();
  expect(first.orders).toHaveLength(30);expect(first.tickets).toHaveLength(200);expect(first.requests).toHaveLength(20);
  expect(first.orders[0].id).toBe('ORDER-035');expect(first.orders[29].id).toBe('ORDER-006');
  expect(first.pagination.orders.nextCursor).toBeTruthy();
  const nextUrl=new URL(first.pagination.orders.next,'https://local.invalid');
  expect(nextUrl.pathname).toBe('/account');
  const second=await (await read(nextUrl.search)).json();
  expect(second.orders.map((o:{id:string})=>o.id)).toEqual(['ORDER-005','ORDER-004','ORDER-003','ORDER-002','ORDER-001','MICRO-OLDER','REFUND','LEGACY-PARTIAL','ALLOCATED-PARTIAL']);
  expect(second.tickets[0].code).toBe('TICKET-205');
  expect(second.requests[0].id).toBe('REQUEST-025');
  expect(second.pagination.orders.next).toBeNull();
  const tickets=await (await read(new URL(first.pagination.tickets.next,'https://local.invalid').search)).json();
  expect(tickets.tickets.map((t:{code:string})=>t.code)).toEqual(['TICKET-005','TICKET-004','TICKET-003','TICKET-002','TICKET-001','ALLOCATED-TICKET']);
  expect(tickets.orders[0].id).toBe('ORDER-035');
  const requests=await (await read(new URL(first.pagination.requests.next,'https://local.invalid').search)).json();
  expect(requests.requests.map((r:{id:string})=>r.id)).toEqual(['REQUEST-005','REQUEST-004','REQUEST-003','REQUEST-002','REQUEST-001']);
 });
 test('exports only this bounded page with truthful continuation links',async()=>{
  const response=await read('?download=1');const body=await response.json();
  expect(body.orders).toHaveLength(30);expect(body.tickets).toHaveLength(200);expect(body.requests).toHaveLength(20);
  expect(body.pagination.exportScope).toBe('page');expect(body.pagination.download).toBe('/api/account?download=1');
  expect(response.headers.get('content-disposition')).toContain('account-page.json');
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  const order=body.pagination.orders.nextCursor,ticket=body.pagination.tickets.nextCursor,request=body.pagination.requests.nextCursor;
  const next=await (await read('?'+new URLSearchParams({orderCursor:order,ticketCursor:ticket,requestCursor:request,download:'1'}))).json();
  expect(next.orders).toHaveLength(9);expect(next.tickets).toHaveLength(6);expect(next.requests).toHaveLength(5);
  expect(next.pagination.download).toContain('orderCursor='+order);expect(next.pagination.download).toContain('ticketCursor='+ticket);expect(next.pagination.download).toContain('requestCursor='+request);
 });
 test('isolates another persisted buyer even when they borrow a first buyer cursor',async()=>{
  const first=await (await read()).json();
  adapter.buyer.mockResolvedValue({id:2,email:'two@example.invalid'});
  const other=await (await read()).json();
  expect(other.profile.email).toBe('two@example.invalid');
  expect(other.orders.map((row:{id:string})=>row.id)).toEqual(['OTHER-USER']);
  expect(other.tickets.map((row:{code:string})=>row.code)).toEqual(['OTHER-TICKET']);
  expect(other.requests.map((row:{id:string})=>row.id)).toEqual(['OTHER-REQUEST']);
  const borrowed=await (await read('?orderCursor='+first.pagination.orders.nextCursor)).json();
  expect(borrowed.orders).toEqual([]);expect(borrowed.tickets.map((row:{code:string})=>row.code)).toEqual(['OTHER-TICKET']);
 });
 test('rejects malformed, oversized, duplicate and unexpected queries before history work',async()=>{
  for(const query of ['?orderCursor=bad','?ticketCursor='+('a'.repeat(513)),'?requestCursor=a&requestCursor=b','?limit=99999','?download=all']){
   expect((await read(query)).status).toBe(400);
  }
 });
 test('rejects an unauthenticated or missing persisted account',async()=>{
  adapter.buyer.mockResolvedValueOnce(null);expect((await read()).status).toBe(401);
  adapter.buyer.mockResolvedValueOnce({id:999});expect((await read()).status).toBe(401);
 });
});
