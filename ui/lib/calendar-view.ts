import {calendarEndDate} from '@/lib/event-calendar';
import {ownedEventPresentation,publicOwnedEvents,type OwnedEvent} from './owned-event-presentation';

const text=(value:unknown)=>typeof value==='string'?value.trim():'';
export function isCalendarDate(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&value>='0001-01-01'&&calendarEndDate(value)!==null;}
export function isCalendarMonth(value:string){return /^\d{4}-\d{2}$/.test(value)&&isCalendarDate(value+'-01');}
export function nairobiCalendarDate(now:number){
 if(!Number.isFinite(now)||now<=0||!Number.isFinite(new Date(now).getTime()))return '';
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Nairobi',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));
 return ['year','month','day'].map(key=>parts.find(part=>part.type===key)?.value||'').join('-');
}
export function shiftCalendarMonth(month:string,delta:number){
 if(!isCalendarMonth(month)||!Number.isInteger(delta))return month;
 const [year,number]=month.split('-').map(Number);
 const index=Math.max(12,Math.min(9999*12+11,year*12+number-1+delta));
 return String(Math.floor(index/12)).padStart(4,'0')+'-'+String(index%12+1).padStart(2,'0');
}
export function shiftCalendarDate(value:string,days:number){
 if(!isCalendarDate(value)||!Number.isInteger(days))return value;
 const date=new Date(value+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+days);
 if(!Number.isFinite(date.getTime()))return value;
 const next=date.toISOString().slice(0,10);return isCalendarDate(next)?next:value;
}
export function calendarMonthCells(month:string){
 if(!isCalendarMonth(month))return [];
 const first=month+'-01',weekday=(new Date(first+'T12:00:00Z').getUTCDay()+6)%7;
 const start=new Date(first+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-weekday);
 return Array.from({length:42},(_,index)=>{const value=new Date(start);value.setUTCDate(start.getUTCDate()+index);const date=value.toISOString().split('T')[0];return {date,day:value.getUTCDate(),outside:date.slice(0,7)!==month,disabled:!isCalendarDate(date)};});
}
export type CalendarViewEntry={id:string;name:string;kind:string;status:string;date:string|null;dateLabel:string;time:string;venue:string;image:string;href:string|null;label:string;past:boolean};
/** Scheduling and completion are different facts; postponed old dates are never scheduled. */
export function calendarViewEntries(events:OwnedEvent[],now:number):CalendarViewEntry[]{
 return publicOwnedEvents(events,now).map(event=>{
  const view=ownedEventPresentation(event,now),date=view.dateTime&&isCalendarDate(view.dateTime)?view.dateTime:null;
  return {id:text(event.id)||text(event.slug)||text(event.name),name:text(event.name),kind:text(event.kind),status:text(event.status),date,
   dateLabel:view.dateLabel,time:date?text(event.eventTime):'',venue:[text(event.venue),text(event.city)].filter(Boolean).join(', '),image:text(event.image),
   href:view.href.startsWith('/events/')?view.href:null,label:view.sellable?'View ticket options':view.label,past:view.past};
 }).sort((a,b)=>{
  if(!a.date||!b.date)return Number(!a.date)-Number(!b.date)||a.name.localeCompare(b.name);
  return a.date.localeCompare(b.date)||a.name.localeCompare(b.name);
 });
}
export function initialCalendarMonth(entries:CalendarViewEntry[],today:string){
 const current=isCalendarDate(today)?today.slice(0,7):'';
 if(current&&entries.some(entry=>entry.date?.startsWith(current)))return current;
 const next=entries.find(entry=>entry.date&&(!today||entry.date>=today));
 return next?.date?.slice(0,7)||current||entries.find(entry=>entry.date)?.date?.slice(0,7)||'1970-01';
}
export function filterCalendarEntries(entries:CalendarViewEntry[],query:string,kind:string){
 const term=query.trim().toLocaleLowerCase().slice(0,200);
 return entries.filter(entry=>(kind==='all'||entry.kind===kind)&&`${entry.name} ${entry.venue}`.toLocaleLowerCase().includes(term));
}
