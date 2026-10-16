import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({q:vi.fn()}));
vi.mock('@/lib/server/db',()=>({q:state.q,hasDb:()=>true,qSchema:()=>{throw Error('no public migration')}}));
vi.mock('@/lib/server/event-truth',()=>({resolveManyEventTruths:async()=>[]}));
import {readPublicEvents} from '@/lib/server/public-events';
import {invalidate} from '@/lib/server/microcache';
import {filterOwnedEvents,publicEventCategories,ownedEventSignature} from '@/ui/lib/owned-event-presentation';
import {readUrlFilters} from '@/ui/components/useUrlFilters';
const category={id:'category-campus',name:'Campus events'};
const event={id:'school',slug:'school',kind:'school',name:'Fixture school',status:'announced',category,eventDate:null};
beforeEach(()=>{invalidate('site-events:all');state.q.mockReset()});
it('looks up only referenced public categories and whitelists their public fields',async()=>{
 state.q.mockImplementation(async(sql:string)=>sql.includes('FROM event_categories')?[{...category,active:false,version:9,privateNote:'never public'},{id:'category-secret',name:'Private-only category'}]:[{...event,event_date:null,category_id:category.id},{...event,id:'hidden',status:'draft',category_id:'category-secret'}]);
 const rows=await readPublicEvents();expect(rows).toHaveLength(1);expect(rows[0].category).toEqual(category);expect(JSON.stringify(rows)).not.toContain('Private-only');expect(JSON.stringify(rows)).not.toContain('never public');expect(state.q.mock.calls[1][1]).toEqual([[category.id]]);
});
it('keeps legacy public reads working before the optional category schema exists',async()=>{
 state.q.mockResolvedValue([{...event,event_date:null}]);expect((await readPublicEvents())[0].category).toBeNull();expect(state.q).toHaveBeenCalledTimes(1);expect(state.q.mock.calls[0][0]).toContain("to_jsonb(tour_events)->>'category_id'");
});
it('filters and searches category names without revealing categories on drafts',()=>{
 const events=[event,{...event,id:'other',category:{id:'category-live',name:'Live shows'}},{...event,id:'private',status:'draft',category:{id:'category-secret',name:'Private-only category'}}];
 expect(publicEventCategories(events,Date.now())).toEqual([category,{id:'category-live',name:'Live shows'}]);
 expect(filterOwnedEvents(events,{kind:'all',period:'all',q:'campus',category:category.id},Date.now()).map(row=>row.id)).toEqual(['school']);
 expect(filterOwnedEvents(events,{kind:'all',period:'all',q:'',category:'category-secret'},Date.now())).toEqual([]);
});
it('retains category deep links while live records are still loading',()=>{
 const filters=readUrlFilters(new URLSearchParams('eventCategory=category-campus&period=past'),{eventCategory:'all',period:'upcoming'},{period:['upcoming','past','all']});expect(filters).toEqual({eventCategory:'category-campus',period:'past'});
 expect(ownedEventSignature([event])).not.toBe(ownedEventSignature([{...event,category:{...category,name:'Renamed campus events'}}]));
});
