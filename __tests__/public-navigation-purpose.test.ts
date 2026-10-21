import {it,expect} from 'vitest';
import {PRIMARY_NAVIGATION,SITE_MENU_GROUPS,SITE_UTILITY_NAVIGATION,isNavigationCurrent} from '@/lib/site-navigation';
import {completedSchoolWork} from '@/ui/lib/portfolio-events';
const now=Date.parse('2026-10-18T12:00:00+03:00');
it('names public tasks and keeps services, event discovery, evidence and shopping distinct',()=>{
 expect(PRIMARY_NAVIGATION).toEqual([['Services','/experience'],['Events','/events'],['Our work','/portfolio'],['Shop','/shop'],['About','/about']]);
 const links=SITE_MENU_GROUPS.flatMap(group=>group.items);
 expect(links).toContainEqual(['Shop','/shop']);expect(links).toContainEqual(['Events','/events']);
 expect(links).toHaveLength(10);expect(new Set(links.map(([,href])=>href)).size).toBe(links.length);
 expect(links.filter(([,href])=>href.startsWith('/events'))).toHaveLength(1);
 expect(SITE_UTILITY_NAVIGATION).toContainEqual(['Orders & receipts','/account']);
 expect(new Set(PRIMARY_NAVIGATION.map(([,href])=>href)).size).toBe(PRIMARY_NAVIGATION.length);
});
it('keeps active section context without confusing similarly prefixed routes',()=>{
 expect(isNavigationCurrent('/events/satuk','/events')).toBe(true);
 expect(isNavigationCurrent('/shop/tshirt','/shop')).toBe(true);
 expect(isNavigationCurrent('/shopper','/shop')).toBe(false);
 expect(isNavigationCurrent('/','/shop')).toBe(false);
});
it('uses current completed school records, not an elapsed date or a separate static tour list',()=>{
 const base={kind:'school',name:'School',eventDate:'2026-06-01',slug:'school',status:'completed'};
 expect(completedSchoolWork([{...base,id:'done'}, {...base,id:'not-done',status:'published'}, {...base,id:'postponed',status:'postponed'}, {...base,id:'private',status:'draft'}, {...base,id:'no-link',slug:''}],now).map(row=>row.id)).toEqual(['done']);
 expect(completedSchoolWork([{...base,id:'updated',status:'postponed'}],now)).toEqual([]);
});
