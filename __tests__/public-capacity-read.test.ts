import {beforeEach,expect,it,vi} from 'vitest';

const state=vi.hoisted(()=>({q:vi.fn(),schema:vi.fn(),missing:false,status:'published'}));
vi.mock('@/lib/server/db',()=>({q:state.q,qSchema:state.schema,hasDb:()=>true,db:()=>{throw Error('public_read_opened_transaction')}}));
import {ticketCapacity,CAPACITY_COUNTS_SQL} from '@/lib/server/ticket-inventory';
import {resolveEventTruth} from '@/lib/server/event-truth';

beforeEach(()=>{
 state.missing=false;state.status='published';state.schema.mockReset().mockRejectedValue(Error('public_read_attempted_schema_write'));
 state.q.mockReset().mockImplementation(async(sql:string)=>{
  if(sql.includes('FROM tour_events'))return [{id:'fixture',slug:'public-fixture',name:'Public fixture',status:state.status,event_date:'2099-11-06',venue:'Fixture venue',sales_start_at:null,sales_end_at:null,tiers:[{name:'General',price:800,capacity:12,per_order_min:1,per_order_max:5}]}];
  if(sql===CAPACITY_COUNTS_SQL){if(state.missing)throw Error('relation_does_not_exist');return [{sold:'3',reserved:'4'}]}
  throw Error('unexpected_public_query');
 });
});

it('reads existing capacity in one snapshot without attempting a schema transaction',async()=>{
 await expect(ticketCapacity('fixture',0,'General')).resolves.toEqual({sold:3,reserved:4});
 expect(state.schema).not.toHaveBeenCalled();
 expect(state.q.mock.calls).toEqual([[CAPACITY_COUNTS_SQL,['fixture',0,'General','','ticket:fixture:0']]]);
});

it('resolves real remaining seats when public reads have no schema-write permission',async()=>{
 const truth=await resolveEventTruth('public-fixture');
 expect(truth).toMatchObject({isPublic:true,isSellable:true,totalRemaining:5,tiers:[{name:'General',price:800,remaining:5,sellable:true}]});
 expect(state.schema).not.toHaveBeenCalled();
});

it('keeps sales paused even when existing capacity is available',async()=>{
 state.status='sales_paused';
 expect(await resolveEventTruth('public-fixture')).toMatchObject({isSellable:false,totalRemaining:5,tiers:[{sellable:false}]});
 expect(state.schema).not.toHaveBeenCalled();
});

it('fails closed rather than migrating or inventing seats when inventory schema is unavailable',async()=>{
 state.missing=true;
 expect(await resolveEventTruth('public-fixture')).toBeNull();
 expect(state.schema).not.toHaveBeenCalled();
});
