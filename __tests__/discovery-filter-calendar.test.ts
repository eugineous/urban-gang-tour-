import {describe,it,expect} from 'vitest';
import {readUrlFilters} from '@/ui/components/useUrlFilters';
import {buildEventCalendar,calendarEndDate} from '@/lib/event-calendar';
describe('shareable discovery filters',()=>{
 it('reads deep links, defaults unknown categories and bounds pasted search terms',()=>{const values=readUrlFilters(new URLSearchParams({category:'invented',q:'x'.repeat(500)}),{q:'',category:'all'},{category:['all','schools']});expect(values.category).toBe('all');expect(values.q).toHaveLength(200);expect(readUrlFilters(new URLSearchParams('category=schools&q=Lucy'),{q:'',category:'all'},{category:['all','schools']})).toEqual({q:'Lucy',category:'schools'})});
});
describe('truthful RFC 5545 calendar downloads',()=>{
 const event={name:'Lucy, Eugine; live\nNairobi',date:'2026-10-10',start:'2026-10-10T20:00:00+03:00',venue:'Nairobi',url:'https://urbangangtour.co.ke/events/demo'};
 it('preserves Nairobi start time as UTC without inventing an end time',()=>{const text=buildEventCalendar(event)!;expect(text).toContain('DTSTART:20261010T170000Z\r\n');expect(text).not.toMatch(/DTEND|DURATION/);expect(text).toContain('SUMMARY:Lucy\\, Eugine\\; live\\nNairobi');expect(text.endsWith('\r\n')).toBe(true)});
 it('uses an exclusive next-day end for date-only events across year boundaries',()=>{const text=buildEventCalendar({...event,date:'2026-12-31',start:null})!;expect(text).toContain('DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101');expect(calendarEndDate('2026-02-30')).toBeNull()});
 it('folds long unicode values without splitting code points',()=>{const text=buildEventCalendar({...event,name:'🪩'.repeat(50)})!;for(const line of text.split('\r\n'))expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);expect(text.replace(/\r\n /g,'')).toContain('SUMMARY:'+'🪩'.repeat(50))});
});
