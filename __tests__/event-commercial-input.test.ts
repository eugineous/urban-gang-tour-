import {beforeEach, describe, expect, it, vi} from 'vitest';
import {validateEventTiers} from '@/lib/server/event-tier-input';
const fixture=vi.hoisted(()=>({q:vi.fn(),hasDb:vi.fn(()=>true),sold:vi.fn(),reserved:vi.fn()}));
vi.mock('@/lib/server/db',()=>({q:fixture.q,hasDb:fixture.hasDb}));
vi.mock('@/lib/server/ticket-inventory',async importOriginal=>({...await importOriginal<typeof import('@/lib/server/ticket-inventory')>(),soldCount:fixture.sold,reservedCount:fixture.reserved}));
import {resolveEventTruth} from '@/lib/server/event-truth';

describe('event tier editing',()=>{
  it('preserves capacity and order limits rather than erasing inventory controls',()=>{
    expect(validateEventTiers([{name:'General',price:500,capacity:90,per_order_min:2,per_order_max:6}])).toEqual({ok:true,tiers:[{name:'General',price:500,capacity:90,per_order_min:2,per_order_max:6}]});
  });
  it('rejects invalid capacity, prices, limits and duplicate tier identities',()=>{
    for(const tier of [{name:'General',price:500,capacity:-1},{name:'General',price:'invalid'},{name:'General',price:500,per_order_min:5,per_order_max:2},{name:'General',price:500,per_order_max:21}]) expect(validateEventTiers([tier]).ok).toBe(false);
    expect(validateEventTiers([{name:'General',price:500},{name:'general',price:500}]).ok).toBe(false);
  });
});
describe('event availability',()=>{
  const row={id:'operational-id',slug:'public-slug',name:'Fixture event',status:'published',sales_start_at:null,sales_end_at:null,tiers:[{name:'General',price:500,capacity:10}]};
  beforeEach(()=>{vi.clearAllMocks();fixture.q.mockResolvedValue([row]);fixture.sold.mockResolvedValue(8);fixture.reserved.mockResolvedValue(2)});
  it('counts purchases and holds against the operational event id, not its URL slug',async()=>{
    const truth=await resolveEventTruth('public-slug');
    expect(fixture.sold).toHaveBeenCalledWith('operational-id','General');
    expect(fixture.reserved).toHaveBeenCalledWith('operational-id',0);
    expect(truth).toMatchObject({isSoldOut:true,isSellable:false,totalRemaining:0});
  });
  it('permits checkout only when a tier has confirmed remaining stock',async()=>{
    fixture.reserved.mockResolvedValue(1);
    expect(await resolveEventTruth('public-slug')).toMatchObject({isSellable:true,totalRemaining:1});
    fixture.q.mockResolvedValue([{...row,tiers:[{name:'General',price:500}]}]);
    expect(await resolveEventTruth('public-slug')).toMatchObject({isSellable:false,totalRemaining:null});
  });
  it('does not sell during a closed sales window or paused lifecycle',async()=>{
    fixture.reserved.mockResolvedValue(0);
    fixture.q.mockResolvedValue([{...row,sales_end_at:'2020-01-01T00:00:00Z'}]);
    expect((await resolveEventTruth('public-slug'))?.isSellable).toBe(false);
    fixture.q.mockResolvedValue([{...row,status:'sales_paused'}]);
    expect((await resolveEventTruth('public-slug'))?.isSellable).toBe(false);
  });
  it('does not advertise a tier when its remaining stock cannot meet the minimum order',async()=>{
    fixture.reserved.mockResolvedValue(1);
    fixture.q.mockResolvedValue([{...row,tiers:[{name:'Group',price:500,capacity:10,per_order_min:2,per_order_max:6}]}]);
    expect(await resolveEventTruth('public-slug')).toMatchObject({isSellable:false,totalRemaining:1});
  });
});
