import {expect,it} from 'vitest';
import {homepageFeaturedEvent,homepagePosterEvents} from '@/ui/lib/home-discovery';
const now=Date.parse('2026-11-09T12:00:00+03:00');
const row=(slug:string,date:string,status='published')=>({id:slug,slug,name:slug,kind:'ticketed',eventDate:date,status,image:'/uploads/'+slug+'.jpg'});
it('prefers a public upcoming poster to a newer past record without claiming a sale',()=>{
 const future=row('next','2026-11-15'),past=row('past','2026-11-08','completed');
 expect(homepageFeaturedEvent([past,future],now)).toEqual({event:future,past:false});
});
it('uses the most recent eligible archive poster when no future poster exists',()=>{
 const recent=row('recent','2026-11-06'),older=row('older','2026-09-20','completed');
 expect(homepageFeaturedEvent([older,recent],now)).toEqual({event:recent,past:true});
});
it('preserves the exact contradictory-artwork hold even for an archive preview',()=>{
 const held={...row('satuk-award-gala-2026-technical-university-of-kenya','2026-11-08'),image:'/media/admin-events/147ea5a88a60581abe39d5a5d17d5357a9e94a5ad5871c28ee699646c1e2ebc9/287b48a7-9505-48a3-ae50-a229c5d9fd06.jpg'};
 const safe=row('safe','2026-11-06');
 expect(homepageFeaturedEvent([held,safe],now)?.event.slug).toBe('safe');
});
it('does not advertise private, cancelled, postponed, unsafe or undated artwork',()=>{
 expect(homepageFeaturedEvent(['draft','cancelled','archived','postponed'].map(status=>row(status,'2026-11-06',status)),now)).toBeNull();
 expect(homepageFeaturedEvent([{...row('bad','2026-11-06'),image:'javascript:bad'},{...row('none','2026-11-06'),eventDate:null}],now)).toBeNull();
});
it('uses no record while feed freshness or clock validity is unknown',()=>{
 expect(homepageFeaturedEvent([row('next','2026-11-15')],now,false)).toBeNull();
 expect(homepageFeaturedEvent([row('next','2026-11-15')],0)).toBeNull();
});
it('rotates only eligible upcoming posters in date order, never mixing in archives or duplicates',()=>{
 const early=row('early','2026-11-12'),late=row('late','2026-11-20');
 expect(homepagePosterEvents([late,row('past','2026-11-06'),early,early,row('cancelled','2026-11-14','cancelled')],now).map(item=>item.event.slug)).toEqual(['early','late']);
 expect(homepagePosterEvents([early],now)).toEqual([{event:early,past:false}]);
 expect(homepagePosterEvents([early],now,false)).toEqual([]);
 expect(homepagePosterEvents([],now)).toEqual([]);
 expect(homepagePosterEvents([row('old','2026-11-04'),row('recent','2026-11-06')],now).map(item=>[item.event.slug,item.past])).toEqual([['recent',true]]);
});
