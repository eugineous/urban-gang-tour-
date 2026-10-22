import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {TourTimeline} from '@/ui/components/TourTimeline';
import {calendarMonthCells,calendarViewEntries,filterCalendarEntries,initialCalendarMonth,isCalendarDate,isCalendarMonth,nairobiCalendarDate,shiftCalendarDate,shiftCalendarMonth} from '@/ui/lib/calendar-view';
const now=Date.parse('2026-10-22T12:00:00+03:00');
const event=(id:string,extra:Record<string,unknown>={})=>({id,slug:id,name:id,kind:'school',status:'published',eventDate:'2026-11-06',image:'/uploads/poster.jpg',city:'Nairobi',venue:'Campus',...extra});

describe('published event calendar',()=>{
 it('uses Nairobi dates, not the machine timezone, across midnight',()=>{
  expect(nairobiCalendarDate(Date.parse('2026-10-21T21:30:00Z'))).toBe('2026-10-22');
  expect(nairobiCalendarDate(0)).toBe('');expect(nairobiCalendarDate(NaN)).toBe('');expect(nairobiCalendarDate(Number.MAX_VALUE)).toBe('');
 });
 it('rejects rolled-over or malformed dates and accepts leap days only in a leap year',()=>{
  expect(isCalendarDate('2026-02-30')).toBe(false);expect(isCalendarDate('2026-02-29')).toBe(false);expect(isCalendarDate('2028-02-29')).toBe(true);
  expect(isCalendarMonth('2026-13')).toBe(false);expect(isCalendarMonth('2026-11<script>')).toBe(false);expect(calendarMonthCells('bad')).toEqual([]);
 });
 it('moves months and dates over year boundaries and clamps month navigation',()=>{
  expect(shiftCalendarMonth('2026-12',1)).toBe('2027-01');expect(shiftCalendarMonth('2026-01',-1)).toBe('2025-12');
  expect(shiftCalendarDate('2026-12-31',1)).toBe('2027-01-01');expect(shiftCalendarDate('2028-03-01',-1)).toBe('2028-02-29');
  expect(shiftCalendarMonth('bad',1)).toBe('bad');expect(shiftCalendarDate('bad',1)).toBe('bad');
 });
 it('builds six complete Monday-first calendar weeks with real adjacent-month days',()=>{
  const cells=calendarMonthCells('2026-11');expect(cells).toHaveLength(42);expect(new Set(cells.map(cell=>cell.date)).size).toBe(42);
  expect(cells[0]).toMatchObject({date:'2026-10-26',day:26,outside:true});
  expect(cells.find(cell=>cell.date==='2026-11-01')).toMatchObject({day:1,outside:false});expect(cells[41].date).toBe('2026-12-06');
  const boundary=calendarMonthCells('9999-12');expect(new Set(boundary.map(cell=>cell.date)).size).toBe(42);expect(boundary.some(cell=>cell.disabled)).toBe(true);
 });
 it('never schedules old postponed dates, hidden records or invalid dates',()=>{
  const entries=calendarViewEntries([event('postponed',{status:'postponed',eventDate:'2026-07-28',eventTime:'2PM'}),event('announcement',{status:'announced',eventDate:null}),event('invalid',{eventDate:'2026-02-30'}),event('private',{status:'draft'}),event('cancelled',{status:'cancelled'})],now);
  expect(entries).toHaveLength(3);expect(entries.every(entry=>entry.date===null)).toBe(true);expect(entries.find(entry=>entry.id==='postponed')).toMatchObject({dateLabel:'New date to be confirmed',time:''});
  expect(entries.map(entry=>entry.id)).not.toContain('private');expect(entries.map(entry=>entry.id)).not.toContain('cancelled');
 });
 it('retains every supported public event kind and distinguishes elapsed dates from completion',()=>{
  const entries=calendarViewEntries([event('school'),event('partner',{kind:'partner',partnerDetails:null}),event('ticketed',{kind:'ticketed'}),event('archive',{kind:'past',status:'completed',eventDate:'2026-09-25'}),event('elapsed',{eventDate:'2026-01-01'})],now);
  expect(entries).toHaveLength(5);expect(entries.find(entry=>entry.id==='elapsed')).toMatchObject({past:true,status:'published',label:'Date passed'});expect(entries.find(entry=>entry.id==='archive')?.status).toBe('completed');
 });
 it('opens the next actual scheduled month when the current month has no records',()=>{
  const entries=calendarViewEntries([event('past',{status:'completed',eventDate:'2026-06-01'}),event('next')],now);
  expect(initialCalendarMonth(entries,'2026-10-22')).toBe('2026-11');
  expect(initialCalendarMonth(entries,'2026-06-05')).toBe('2026-06');
  expect(initialCalendarMonth([],'2026-10-22')).toBe('2026-10');
 });
 it('filters actual event names and venues without manufacturing new records',()=>{
  const entries=calendarViewEntries([event('one',{name:'UNI FEST',kind:'partner',partnerDetails:null,venue:'Graduation Square'}),event('two',{name:'School visit'})],now);
  expect(filterCalendarEntries(entries,'graduation','partner').map(entry=>entry.id)).toEqual(['one']);expect(filterCalendarEntries(entries,'not found','all')).toEqual([]);
 });
 it('renders a labelled keyboard calendar, canonical event links and honest completion history',()=>{
  const html=renderToStaticMarkup(createElement(TourTimeline,{initialNow:now,events:[event('future'),event('complete',{status:'completed',eventDate:'2026-06-01'}),event('not-completed',{eventDate:'2026-01-01'}),event('pending',{status:'postponed',eventDate:'2026-07-01'}),event('hidden',{status:'draft'})]}));
  expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);expect(html).toContain('Calendar &amp; tour stops.');expect(html).toContain('November 2026');
  expect(html).toContain('role="grid"');expect(html.match(/role="gridcell"/g)).toHaveLength(42);expect(html.match(/tabindex="0"/g)).toHaveLength(1);
  expect(html).toContain('aria-label="Previous month"');expect(html).toContain('aria-label="Next month"');expect(html).toContain('href="/events/future"');expect(html).not.toContain('data-calendar-event="hidden"');
  expect(html.match(/data-calendar-event="future"/g)).toHaveLength(1);
  const history=html.slice(html.indexOf('id="calendar-history-heading"'));expect(history).toContain('complete');expect(history).not.toContain('not-completed');expect(html).toContain('New date to be confirmed');
 });
 it('keeps a useful empty state and scoped narrow-screen layout',()=>{
  const html=renderToStaticMarkup(createElement(TourTimeline,{initialNow:now,events:[],initialUnavailable:true}));
  expect(html).toContain('Live updates are unavailable');expect(html).toContain('No dated events');expect(html).toContain('href="/events"');expect(html).not.toContain('InStock');
  const css=readFileSync('ui/components/TourCalendar.module.css','utf8');expect(css).toContain('@container tour-calendar (max-width:600px)');expect(css).toContain('html[data-phone-viewport=wide]');
 });
});
