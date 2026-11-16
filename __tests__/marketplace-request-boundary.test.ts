import {afterEach,expect,it,vi} from 'vitest';
vi.mock('@/lib/server/paystack',()=>({paystackConfigured:()=>true,paystackInit:vi.fn()}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'fixture',PURCHASE_NETWORK_LIMIT:1000}));
import {POST} from '@/app/api/marketplace/checkout/route';
const request=(body:BodyInit)=>new Request('https://urbangangtour.co.ke/api/marketplace/checkout',{method:'POST',headers:{origin:'https://urbangangtour.co.ke','content-type':'application/json'},body,...(body instanceof ReadableStream?{duplex:'half'}:{})} as RequestInit);
afterEach(()=>vi.useRealTimers());
it('rejects oversized marketplace payment input before a session, order or provider call',async()=>{const response=await POST(request(JSON.stringify({name:'x'.repeat(9000)})));expect(response.status).toBe(413);expect(await response.json()).toEqual({error:'body_too_large'})});
it('bounds a stalled marketplace request stream',async()=>{vi.useFakeTimers();const pending=POST(request(new ReadableStream({start(){}})));await vi.advanceTimersByTimeAsync(5001);const response=await pending;expect(response.status).toBe(408)});
