import {beforeEach,describe,expect,it,vi} from 'vitest';
const f=vi.hoisted(()=>({q:vi.fn(),buyer:vi.fn(),admin:vi.fn(),perm:vi.fn(),render:vi.fn(),mint:vi.fn(),row:{} as Record<string,unknown>}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,db:()=>({}),q:f.q}));
vi.mock('@/lib/server/customer-account',()=>({validatedCurrentBuyer:f.buyer,ensureCustomerAccountSchema:vi.fn()}));
vi.mock('@/lib/server/session',()=>({verifyAdminSession:f.admin,hasPerm:f.perm}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'fixture'}));
vi.mock('@/lib/server/receipt-email',()=>({maskPhone:()=> 'masked'}));
vi.mock('@/lib/server/receipt-lines',()=>({receiptLines:async()=>[]}));
vi.mock('@/lib/server/tickets',()=>({ensureTickets:f.mint}));
vi.mock('@/lib/tickets/pdf',()=>({renderReceiptPdf:f.render}));
vi.mock('@/lib/ops/pdf',()=>({getLogoDataUri:async()=>null}));
vi.mock('next/headers',()=>({cookies:async()=>({toString:()=> 'fixture-session'})}));
vi.mock('next/navigation',()=>({notFound:()=>{throw Error('not_found')}}));
import {GET} from '@/app/api/receipts/[id]/pdf/route';
import ReceiptPage from '@/app/receipt/[id]/page';
import OrderTicketsPage from '@/app/tickets/[orderId]/page';
const weak='ORD-ABCD',strong='ORD-M1234567890ABCDEF123456789';
const pdf=(id=weak)=>GET(new Request('https://example.test/api/receipts/'+id+'/pdf'),{params:Promise.resolve({id})});
const page=(id=weak)=>ReceiptPage({params:Promise.resolve({id})});
beforeEach(()=>{
 vi.clearAllMocks();f.row={id:weak,status:'paid',user_id:7,phone:'254700000000',created_at:'2026-10-28T00:00:00Z'};
 f.q.mockImplementation(async(sql:string,args:unknown[])=>args[0]===f.row.id&&(!sql.includes('user_id=$2')||args[1]===f.row.user_id)?[f.row]:[]);
 f.buyer.mockResolvedValue(null);f.admin.mockResolvedValue(false);f.perm.mockReturnValue(false);f.render.mockResolvedValue(Buffer.from('%PDF-fixture'));f.mint.mockResolvedValue([]);
});
describe('private legacy receipts',()=>{
 it('does not mint or expose ticket capabilities to an anonymous legacy lookup',async()=>{
  let result='exposed';try{await OrderTicketsPage({params:Promise.resolve({orderId:weak})})}catch(error){if((error as Error).message==='not_found')result='not_found';else throw error}
  expect(result).toBe('not_found');expect(f.mint).not.toHaveBeenCalled();
 });
 it('keeps an authorized unpaid ticket order out of the mint path',async()=>{
  f.admin.mockResolvedValue(true);f.perm.mockReturnValue(true);f.row.status='pending';
  await OrderTicketsPage({params:Promise.resolve({orderId:weak})});expect(f.mint).not.toHaveBeenCalled();
 });
 it('returns the same 404 for an anonymous legacy reference and a missing order',async()=>{
  expect((await pdf()).status).toBe(404);expect((await pdf('ORD-MISSING')).status).toBe(404);
  await expect(page()).rejects.toThrow('not_found');expect(f.render).not.toHaveBeenCalled();expect(f.mint).not.toHaveBeenCalled();expect(f.q).not.toHaveBeenCalled();
 });
 it('requires the current persisted buyer to own the legacy order',async()=>{
  f.buyer.mockResolvedValue({id:8});expect((await pdf()).status).toBe(404);await expect(page()).rejects.toThrow('not_found');
  f.buyer.mockResolvedValue({id:7});expect((await pdf()).status).toBe(200);expect(await page()).toBeTruthy();
  expect(await OrderTicketsPage({params:Promise.resolve({orderId:weak})})).toBeTruthy();
  expect(f.q.mock.calls.some(([sql,args])=>sql.includes('user_id=$2')&&args[1]===7)).toBe(true);
 });
 it('requires an active admin session and the orders permission',async()=>{
  f.admin.mockResolvedValue(true);expect((await pdf()).status).toBe(404);
  f.perm.mockReturnValue(true);expect((await pdf()).status).toBe(200);expect(await page()).toBeTruthy();
  f.admin.mockResolvedValue(false);expect((await pdf()).status).toBe(404);
 });
 it('retains guest access for a new strong random reference',async()=>{
  f.row={...f.row,id:strong};expect((await pdf(strong)).status).toBe(200);expect(await page(strong)).toBeTruthy();expect(f.buyer).not.toHaveBeenCalled();
  expect(await OrderTicketsPage({params:Promise.resolve({orderId:strong})})).toBeTruthy();
 });
 it('does not create a paid PDF for an authorized pending order',async()=>{
  f.admin.mockResolvedValue(true);f.perm.mockReturnValue(true);f.row.status='pending';
  const response=await pdf();expect(response.status).toBe(409);expect(f.render).not.toHaveBeenCalled();expect(f.mint).not.toHaveBeenCalled();
 });
 it('keeps success and denial responses out of shared caches and referrers',async()=>{
  const denied=await pdf();f.admin.mockResolvedValue(true);f.perm.mockReturnValue(true);const allowed=await pdf();
  for(const response of [denied,allowed]){expect(response.headers.get('cache-control')).toContain('no-store');expect(response.headers.get('referrer-policy')).toBe('no-referrer')}
 });
});
