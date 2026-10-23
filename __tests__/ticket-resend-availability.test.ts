import {beforeEach,describe,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({available:true,q:vi.fn(async()=>[]),send:vi.fn(async()=>{}),pool:vi.fn()}));
vi.mock('@/lib/server/db',()=>({q:state.q,hasDb:()=>state.available,db:state.pool}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'fixture'}));
vi.mock('@/lib/server/receipt-email',()=>({sendReceiptEmail:state.send}));
import {POST} from '@/app/api/tickets/resend/route';
function request(){return new Request('https://urbangangtour.co.ke/api/tickets/resend',{method:'POST',headers:{origin:'https://urbangangtour.co.ke','content-type':'application/json'},body:JSON.stringify({orderId:'ORD-LOCAL-UNKNOWN',contact:'fixture@example.invalid'})});}
beforeEach(()=>{state.available=true;vi.clearAllMocks();});
describe('ticket resend availability',()=>{
 it('checks configuration without constructing an unused database pool',async()=>{
  expect((await POST(request())).status).toBe(200);
  expect(state.pool).not.toHaveBeenCalled();expect(state.q).toHaveBeenCalledTimes(1);expect(state.send).not.toHaveBeenCalled();
 });
 it('fails unavailable storage before a lookup or message attempt',async()=>{
  state.available=false;expect((await POST(request())).status).toBe(503);
  expect(state.pool).not.toHaveBeenCalled();expect(state.q).not.toHaveBeenCalled();expect(state.send).not.toHaveBeenCalled();
 });
});
