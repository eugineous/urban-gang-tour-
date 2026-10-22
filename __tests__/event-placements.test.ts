import {describe,it,expect} from 'vitest';
import {recentEventPlacements} from '@/lib/event-placements';
const now=Date.parse('2026-10-22T12:00:00+03:00');
const event=(slug:string,extra:Record<string,unknown>={})=>({id:slug,slug,name:slug,kind:'school',status:'published',eventDate:'2026-11-06',image:'/assets/gal/loreto.jpg',...extra});
describe('public recent-event placements',()=>{
 it('prioritises upcoming real events and then the most recent completed work',()=>{
  const rows=[event('old',{status:'completed',eventDate:'2026-06-01'}),event('future-later',{eventDate:'2026-12-01'}),event('latest-work',{status:'completed',eventDate:'2026-09-25'}),event('future-soon')];
  expect(recentEventPlacements(rows,now).map(e=>e.id)).toEqual(['future-soon','future-later','latest-work']);
 });
 it('never promotes hidden, cancelled, postponed, elapsed-but-unconfirmed or invalid records',()=>{
  const rows=['draft','pending_review','cancelled','archived','postponed'].map(status=>event(status,{status}));
  rows.push(event('elapsed',{eventDate:'2026-01-01'}),event('bad/slug'),event(''));
  expect(recentEventPlacements(rows,now)).toEqual([]);
 });
 it('preserves announcements without invented dates or ticket-sale assertions',()=>{
  const [item]=recentEventPlacements([event('announcement',{status:'announced',eventDate:null})],now);
  expect(item.date).toBe('Date to be confirmed');expect(item.dateTime).toBeUndefined();expect(item.label).toBe('Just announced');expect(item.href).toBe('/events/announcement');
 });
 it('does not link an event detail page back to itself',()=>{
  expect(recentEventPlacements([event('current'),event('next')],now,'/events/current/').map(e=>e.id)).toEqual(['next']);
 });
 it('uses only safe artwork and the owned logo when an image is absent',()=>{
  const items=recentEventPlacements([event('missing',{image:''}),event('unsafe',{image:'javascript:alert(1)'})],now);
  expect(items.every(e=>e.image==='/assets/ugt-logo.png')).toBe(true);
 });
});
