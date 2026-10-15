import {beforeEach,afterEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({q:vi.fn(),configured:true}));
vi.mock('@/lib/server/db',()=>({q:state.q,hasDb:()=>state.configured}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'fixture',PUBLIC_READ_NETWORK_LIMIT:60000}));
vi.mock('@/lib/server/event-truth',()=>({resolveManyEventTruths:async()=>[]}));
import {GET} from '@/app/api/site-data/events/route';
import {invalidate} from '@/lib/server/microcache';
import {EMPTY_PARTNER} from '@/lib/partner-events';
const request=()=>new Request('https://urbangangtour.co.ke/api/site-data/events');
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-15T10:00:00Z'));invalidate('site-events:all');state.configured=true;state.q.mockReset().mockResolvedValue([{id:'fixture',slug:'fixture',kind:'school',name:'Fixture school',status:'ongoing',tiers:[]}])});
afterEach(()=>vi.useRealTimers());
it('returns a no-store public snapshot while coalescing reads',async()=>{const response=await GET(request());expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');expect((await response.json()).events[0]).toMatchObject({status:'ongoing',sellable:false});await GET(request());expect(state.q).toHaveBeenCalledTimes(1)});
it('never advertises an indefinitely stale lifecycle during a DB outage',async()=>{expect((await GET(request())).status).toBe(200);state.q.mockRejectedValue(new Error('database unavailable'));vi.setSystemTime(new Date('2026-10-15T10:00:06Z'));expect((await GET(request())).status).toBe(200);vi.setSystemTime(new Date('2026-10-15T10:00:16Z'));const response=await GET(request());expect(response.status).toBe(503);expect(await response.json()).toMatchObject({events:[],error:'events_unavailable'});expect(response.headers.get('cache-control')).toBe('no-store')});
it('does not disguise missing database configuration as an empty successful feed',async()=>{state.configured=false;expect((await GET(request())).status).toBe(503)});
it('exposes partner metadata without letting forged tiers become checkout inventory',async()=>{
 state.q.mockResolvedValue([{id:'partner',slug:'partner',kind:'partner',name:'Partner',status:'published',tiers:[{price:100}],partner_details:{...EMPTY_PARTNER,organizer:'Real organiser',client:'Real client',role:'Hosting'}}]);
 const response=await GET(request());expect(response.status).toBe(200);expect((await response.json()).events[0]).toMatchObject({kind:'partner',sellable:false,tiers:[],partnerDetails:{organizer:'Real organiser'}});
});
