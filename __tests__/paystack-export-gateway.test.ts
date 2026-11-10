import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({q:vi.fn(),session:vi.fn(),permission:vi.fn()}));
vi.mock('@/lib/server/db',()=>({q:state.q,db:()=>true}));
vi.mock('@/lib/server/session',()=>({verifyAdminSession:state.session,hasPerm:state.permission}));
vi.mock('@/lib/server/ops',()=>({ensureOpsSchema:async()=>{}}));
vi.mock('@/lib/server/bookings-schema',()=>({ensureBookingsSchema:async()=>{}}));
import {GET} from '@/app/api/admin/export/route';
beforeEach(()=>{vi.clearAllMocks();state.session.mockResolvedValue(true);state.permission.mockReturnValue(true);state.q.mockImplementation(async(sql:string)=>sql.startsWith('SELECT COUNT')?[{n:'1'}]:sql.startsWith('SELECT id,')?[{id:'ORD-EXPORT123',total:500,status:'paid',name:'Buyer',email:'sample@example.invalid',phone:'',mpesa_receipt:null,pay_method:'card',refunded:0,created_at:'2026-11-10',paystack_ref:'ORD-EXPORT123'}]:[])});
afterEach(()=>vi.clearAllMocks());
it('selects the hosted reference alongside the raw family tag so staff can distinguish Paystack from direct M-Pesa',async()=>{
 const response=await GET(new Request('https://urbangangtour.co.ke/api/admin/export?kind=orders'));
 expect(response.status).toBe(200);
 const [query]=state.q.mock.calls.find(([sql])=>sql.startsWith('SELECT id,'))!;
 expect(query).toContain("to_jsonb(orders)->>'paystack_ref' AS paystack_ref");
 expect((await response.text()).split('\n')[0]).toContain('pay_method,refunded,created_at,paystack_ref');
});
it('never queries exported records before authenticated module authorization',async()=>{
 state.session.mockResolvedValue(false);expect((await GET(new Request('https://urbangangtour.co.ke/api/admin/export?kind=orders'))).status).toBe(401);expect(state.q).not.toHaveBeenCalled();
 state.session.mockResolvedValue(true);state.permission.mockReturnValue(false);expect((await GET(new Request('https://urbangangtour.co.ke/api/admin/export?kind=orders'))).status).toBe(403);expect(state.q).not.toHaveBeenCalled();
});
