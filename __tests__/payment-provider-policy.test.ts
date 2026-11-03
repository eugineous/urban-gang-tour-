import {afterEach,beforeEach,expect,it,vi} from 'vitest';

const effects=vi.hoisted(()=>({q:vi.fn(),qSchema:vi.fn(),stk:vi.fn(),stripeSession:vi.fn(),fetch:vi.fn()}));
vi.mock('@/lib/server/db',()=>({q:effects.q,qSchema:effects.qSchema,hasDb:()=>true,db:()=>{throw Error('No ledger access allowed')}}));
vi.mock('@/lib/server/checkout-session',()=>({checkoutPrincipal:()=> 'checkout:authorized-fixture'}));
vi.mock('@/lib/server/mpesa',async original=>({...await original<typeof import('@/lib/server/mpesa')>(),mpesaConfigured:()=>true,stkPush:effects.stk}));
vi.mock('@/lib/server/stripe',()=>({stripeConfigured:()=>true,stripe:()=>({checkout:{sessions:{create:effects.stripeSession}}})}));
import {POST as directMpesa} from '@/app/api/orders/route';
import {POST as stripe} from '@/app/api/stripe/checkout/route';

beforeEach(()=>{
 vi.clearAllMocks();vi.stubGlobal('fetch',effects.fetch);
 vi.stubEnv('MPESA_CONSUMER_KEY','legacy-fixture');vi.stubEnv('MPESA_CONSUMER_SECRET','legacy-fixture');
 vi.stubEnv('MPESA_SHORTCODE','legacy-fixture');vi.stubEnv('MPESA_PASSKEY','legacy-fixture');
 vi.stubEnv('STRIPE_SECRET_KEY','legacy-fixture');
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()});

it.each([
 ['direct M-Pesa merchandise',directMpesa,'/api/orders',{items:[{id:'tee',qty:1}],idempotencyKey:'k'.repeat(64)}],
 ['direct M-Pesa tickets',directMpesa,'/api/orders',{ticket:{eventId:'event',tier:0,qty:1},idempotencyKey:'k'.repeat(64)}],
 ['Stripe',stripe,'/api/stripe/checkout',{items:[{id:'tee',qty:1}]}],
] as const)('rejects new %s payments before ledger or provider work despite configured legacy credentials',async(_provider,post,path,purchase)=>{
 const request=new Request('https://urbangangtour.co.ke'+path,{method:'POST',headers:{origin:'https://urbangangtour.co.ke','content-type':'application/json'},body:JSON.stringify({...purchase,name:'Fixture Buyer',phone:'0700000000'})});
 const response=await post(request);
 expect(response.status).toBe(503);expect(await response.json()).toEqual({error:'paystack_only'});
 expect(response.headers.get('cache-control')).toBe('no-store');
 expect(effects.q).not.toHaveBeenCalled();expect(effects.qSchema).not.toHaveBeenCalled();
 expect(effects.stk).not.toHaveBeenCalled();expect(effects.stripeSession).not.toHaveBeenCalled();expect(effects.fetch).not.toHaveBeenCalled();
});
