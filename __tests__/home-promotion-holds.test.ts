import {expect,it} from 'vitest';
import holds from '@/ui/data/home-promotion-holds.json';
import {homepageUpcomingEvents} from '@/ui/lib/home-discovery';
const now=Date.parse('2026-10-22T12:00:00+03:00');
it('withholds a known contradictory promotion without hiding or mutating its public event',()=>{
 const event={id:'satuk',kind:'ticketed',status:'published',eventDate:'2026-11-08',name:'SATUK',slug:holds[0].slug,image:holds[0].image};
 expect(homepageUpcomingEvents([event],now)).toEqual([]);
 expect(event.status).toBe('published');
 expect(homepageUpcomingEvents([{...event,image:'/posters/reconciled-satuk.jpg'}],now)).toHaveLength(1);
 expect(homepageUpcomingEvents([{...event,slug:'another-event'}],now)).toHaveLength(1);
});
