import {describe,expect,it} from 'vitest';
import {publicationInstant,nairobiScheduleInstant,editorialCalendarDates} from '@/lib/editorial-time';
describe('Issue81 temporal foundation, not an enabled publisher',()=>{
 it('converts the exact EAT example without relying on the process timezone',()=>{
  expect(nairobiScheduleInstant('2026-10-20T06:07')).toBe('2026-10-20T03:07:00.000Z');
  expect(nairobiScheduleInstant('2026-10-20T00:07:00')).toBe('2026-10-19T21:07:00.000Z');
 });
 it('does not invent 06:00 UTC for known date-only legacy articles',()=>{
  expect(publicationInstant('2026-10-20').toISOString()).toBe('2026-10-19T21:00:00.000Z');
  expect(publicationInstant('2026-10-20T06:07:00+03:00').toISOString()).toBe('2026-10-20T03:07:00.000Z');
 });
 it.each(['2026-02-30T06:07','2026-10-20T24:00','2026-13-01T06:07','2026-10-20T06:07Z','invalid'])('rejects invalid or ambiguous Nairobi wall time %s',value=>expect(()=>nairobiScheduleInstant(value)).toThrow());
 it.each(['2026-02-30','2026-10-20T06:07:00','invalid'])('rejects invalid/zone-less publication time %s',value=>expect(()=>publicationInstant(value)).toThrow());
 it('enumerates 73 unique days without fabricating exact timestamps or article bodies',()=>{
  const dates=editorialCalendarDates();expect(dates).toHaveLength(73);expect(new Set(dates).size).toBe(73);expect(dates[0]).toBe('2026-10-20');expect(dates.at(-1)).toBe('2026-12-31');expect(dates.every(d=>/^\d{4}-\d{2}-\d{2}$/.test(d))).toBe(true);
 });
});
