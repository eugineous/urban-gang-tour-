'use client';
import {MessageText} from '@/ui/i18n/MessageText';
import {discoveryMessages} from '@/ui/i18n/catalogues/discovery';
import {useInterfaceLanguage,useMessages} from '@/ui/i18n/LanguageProvider';
import {useEffect,useRef,useState,type KeyboardEvent} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight,CalendarBlank,MagnifyingGlass} from '@phosphor-icons/react';
import Link from './DocumentLink';
import {useUrlFilters} from './useUrlFilters';
import {posterUrl} from '@/lib/partner-events';
import type {OwnedEvent} from '../lib/owned-event-presentation';
import {calendarMonthCells,calendarViewEntries,filterCalendarEntries,initialCalendarMonth,isCalendarDate,isCalendarMonth,nairobiCalendarDate,shiftCalendarDate,shiftCalendarMonth,type CalendarViewEntry} from '../lib/calendar-view';
import {formatInterfaceNumber} from '@/lib/i18n/format';
import {EventDay} from './PublicationDate';
import {EventStatus} from './EventPosterCard';
import {ownedEventPresentation} from '../lib/owned-event-presentation';
import type {InterfaceLocale} from '@/lib/i18n/locale';
import styles from './TourCalendar.module.css';

const monthName=(month:string,locale:InterfaceLocale)=>new Intl.DateTimeFormat(locale==='en'?'en-KE':locale,{month:'long',year:'numeric',timeZone:'Africa/Nairobi'}).format(new Date(month+'-01T12:00:00+03:00'));
const fullDate=(date:string,locale:InterfaceLocale)=>new Intl.DateTimeFormat(locale==='en'?'en-KE':locale,{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Africa/Nairobi'}).format(new Date(date+'T12:00:00+03:00'));
function CalendarRecord({event,source,now}:{event:CalendarViewEntry;source?:OwnedEvent;now:number}){
 const t=useMessages(discoveryMessages);
 const [failedImage,setFailedImage]=useState('');
 return <article className={styles.record} data-calendar-event={event.id}>
  {event.image&&event.image!==failedImage&&posterUrl(event.image)&&<img src={event.image} alt={t('card.image',{name:event.name})} width="80" height="100" loading="lazy" decoding="async" onError={()=>setFailedImage(event.image)}/>}
  <div><p className={styles.status}>{source?(ownedEventPresentation(source,now).sellable?<MessageText catalogue={discoveryMessages} message="card.ticketOptions"/>:<EventStatus event={source} now={now}/>):null}</p><h3>{event.href?<Link href={event.href}><span lang="en-KE">{event.name}</span></Link>:<span lang="en-KE">{event.name}</span>}</h3>
   <p><EventDay day={event.date} postponed={event.status==='postponed'} fallback={!event.date&&typeof source?.dateLabel==='string'?source.dateLabel:undefined}/>{event.time&&<span lang="en-KE">{' · '+event.time}</span>}</p>
   <p className={styles.venue}>{event.venue?<span lang="en-KE">{event.venue}</span>:t('card.venue')}</p>
   {event.href&&<Link className={styles.recordLink} href={event.href}><MessageText catalogue={discoveryMessages} message="calendar.view"/> <ArrowUpRight size={16} aria-hidden="true"/></Link>}
  </div>
 </article>;
}

/** One current public calendar, not a second static list of tour dates. */
export function TourTimeline({events:initialEvents=[],initialNow=0,initialUnavailable=false}:{events?:OwnedEvent[];initialNow?:number;initialUnavailable?:boolean}){const t=useMessages(discoveryMessages),{locale}=useInterfaceLanguage();
 const [events,setEvents]=useState(initialEvents),[now,setNow]=useState(initialNow),[stale,setStale]=useState(initialUnavailable);
 const [startingMonth]=useState(()=>initialCalendarMonth(calendarViewEntries(initialEvents,initialNow),nairobiCalendarDate(initialNow)));
 const [filters,updateFilters]=useUrlFilters({q:'',kind:'all',month:startingMonth,day:''},{kind:['all','school','partner','ticketed','past']});
 const pendingFocus=useRef('');
 const entries=filterCalendarEntries(calendarViewEntries(events,now),filters.q,filters.kind);
 const month=isCalendarMonth(filters.month)?filters.month:startingMonth;
 const selected=isCalendarDate(filters.day)&&filters.day.startsWith(month)?filters.day:'';
 const today=nairobiCalendarDate(now),cells=calendarMonthCells(month);
 const inMonth=entries.filter(event=>event.date?.startsWith(month));
 const shown=selected?inMonth.filter(event=>event.date===selected):inMonth;
 const shownIds=new Set(shown.map(event=>event.id));
 const focusDay=selected||(today.startsWith(month)?today:inMonth[0]?.date)||month+'-01';
 const unconfirmed=entries.filter(event=>!event.date);
 const completedSchools=entries.filter(event=>event.date&&event.kind==='school'&&event.status==='completed'&&!shownIds.has(event.id)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 const nextDates=entries.filter(event=>event.date&&event.date>=today&&!event.past&&!shownIds.has(event.id)).slice(0,3);
 const counts=new Map<string,number>();for(const event of entries)if(event.date)counts.set(event.date,(counts.get(event.date)||0)+1);
 useEffect(()=>{
  let stopped=false,controller:AbortController|undefined;
  async function refresh(){
   if(document.hidden)return;
   controller?.abort();const request=new AbortController();controller=request;const timeout=setTimeout(()=>request.abort(),10000);
   try{
    const response=await fetch('/api/site-data/events',{signal:request.signal,cache:'no-store'});
    if(!response.ok)throw Error('events_unavailable');
    const data=await response.json();if(data.ok===false||!Array.isArray(data.events))throw Error('invalid_events');
    if(stopped||request.signal.aborted)return;
    setEvents(data.events.filter((event:unknown):event is OwnedEvent=>!!event&&typeof event==='object'&&!Array.isArray(event)));setNow(Date.now());setStale(false);
   }catch{if(!stopped&&controller===request)setStale(true)}finally{clearTimeout(timeout)}
  }
  const frame=requestAnimationFrame(()=>setNow(Date.now()));void refresh();
  const timer=setInterval(()=>void refresh(),60000);
  const visible=()=>{if(!document.hidden)void refresh()};document.addEventListener('visibilitychange',visible);
  return()=>{stopped=true;controller?.abort();cancelAnimationFrame(frame);clearInterval(timer);document.removeEventListener('visibilitychange',visible)};
 },[]);
 useEffect(()=>{if(pendingFocus.current){document.getElementById('calendar-day-'+pendingFocus.current)?.focus();pendingFocus.current=''}},[month,selected]);
 function chooseDay(date:string,focus=false){if(focus)pendingFocus.current=date;updateFilters({day:date,month:date.slice(0,7)})}
 function keyboard(event:KeyboardEvent<HTMLButtonElement>,date:string){
  let next='';
  if(event.key==='ArrowLeft')next=shiftCalendarDate(date,-1);
  if(event.key==='ArrowRight')next=shiftCalendarDate(date,1);
  if(event.key==='ArrowUp')next=shiftCalendarDate(date,-7);
  if(event.key==='ArrowDown')next=shiftCalendarDate(date,7);
  const weekday=(new Date(date+'T12:00:00Z').getUTCDay()+6)%7;
  if(event.key==='Home')next=shiftCalendarDate(date,-weekday);
  if(event.key==='End')next=shiftCalendarDate(date,6-weekday);
  if(event.key==='PageUp'||event.key==='PageDown'){
   const target=shiftCalendarMonth(date.slice(0,7),event.key==='PageUp'?-1:1);
   next=target+'-'+date.slice(-2);while(!isCalendarDate(next))next=target+'-'+String(Number(next.slice(-2))-1).padStart(2,'0');
  }
  if(next){event.preventDefault();chooseDay(next,true)}
 }
 return <div className={styles.page} data-tour-calendar>
  <header className={styles.intro}><p className={styles.eyebrow}>Urban Gang Tour</p><h1><MessageText catalogue={discoveryMessages} message="calendar.title"/></h1><p><MessageText catalogue={discoveryMessages} message="calendar.summary"/></p></header>
  <div className={styles.tools}><label className={styles.search}><MagnifyingGlass size={20} aria-hidden="true"/><span className={styles.srOnly}><MessageText catalogue={discoveryMessages} message="calendar.search"/></span><input type="search" maxLength={200} value={filters.q} placeholder={t("events.search")} onChange={event=>updateFilters({q:event.target.value},true)}/></label>
   <label className={styles.kind}><MessageText catalogue={discoveryMessages} message="events.type"/><select value={filters.kind} onChange={event=>updateFilters({kind:event.target.value})}><option value="all">{t('events.all')}</option><option value="school">{t('events.school')}</option><option value="partner">{t('events.partner')}</option><option value="ticketed">{t('events.ticketed')}</option><option value="past">{t('events.previousClients')}</option></select></label>
  </div>
  {stale&&<p role="status" className={styles.notice}><MessageText catalogue={discoveryMessages} message="calendar.stale"/></p>}
  <div className={styles.layout}>
   <section className={styles.calendar} aria-labelledby="calendar-month-heading">
    <div className={styles.monthControls}><h2 id="calendar-month-heading" aria-live="polite">{monthName(month,locale)}</h2><div>
     <button type="button" aria-label={t("calendar.previous")} onClick={()=>updateFilters({month:shiftCalendarMonth(month,-1),day:''})}><ArrowLeft size={20} aria-hidden="true"/></button>
     <button type="button" onClick={()=>{if(today)updateFilters({month:today.slice(0,7),day:today})}}><MessageText catalogue={discoveryMessages} message="calendar.today"/></button>
     <button type="button" aria-label={t("calendar.next")} onClick={()=>updateFilters({month:shiftCalendarMonth(month,1),day:''})}><ArrowRight size={20} aria-hidden="true"/></button>
    </div></div>
    <div className={styles.monthGrid} role="grid" aria-labelledby="calendar-month-heading" aria-describedby="calendar-keyboard-help">
     <div role="row" className={styles.weekdays}>{Array.from({length:7},(_,index)=><span role="columnheader" key={index}>{new Intl.DateTimeFormat(locale==='en'?'en-KE':locale,{weekday:'short',timeZone:'Africa/Nairobi'}).format(new Date(`2026-10-${19+index}T12:00:00+03:00`))}</span>)}</div>
     {Array.from({length:6},(_,week)=><div role="row" className={styles.week} key={week}>{cells.slice(week*7,week*7+7).map(cell=>{
      const count=counts.get(cell.date)||0;
      return <div role="gridcell" aria-selected={selected===cell.date} data-outside={cell.outside} key={cell.date}><button id={'calendar-day-'+cell.date} type="button" disabled={cell.disabled} tabIndex={focusDay===cell.date?0:-1} aria-current={today===cell.date?'date':undefined} aria-label={fullDate(cell.date,locale)+(count?', '+t('events.count',{count}):'')} onClick={()=>chooseDay(cell.date)} onKeyDown={event=>keyboard(event,cell.date)}>
       <span>{formatInterfaceNumber(cell.day,locale)}</span>{count>0&&<small className={styles.count}>{t('events.count',{count})}</small>}
      </button></div>;
     })}</div>)}
    </div>
    <p id="calendar-keyboard-help" className={styles.help}><MessageText catalogue={discoveryMessages} message="calendar.keyboard"/></p>
   </section>
   <section className={styles.agenda} aria-labelledby="calendar-agenda-heading"><div className={styles.agendaHeading}><h2 id="calendar-agenda-heading">{selected?fullDate(selected,locale):t('calendar.thisMonth')}</h2>{selected&&<button type="button" onClick={()=>updateFilters({day:''})}><MessageText catalogue={discoveryMessages} message="calendar.wholeMonth"/></button>}</div>
    <p className={styles.result} role="status">{t('events.count',{count:shown.length})}</p>
    {shown.length?shown.map(event=><CalendarRecord event={event} source={events.find(source=>String(source.id||source.slug||source.name)===event.id)} now={now} key={event.id}/>):<div className={styles.empty}><CalendarBlank size={32} aria-hidden="true"/><h3>{t(selected?'calendar.emptyDay':'calendar.emptyMonth')}</h3><p><MessageText catalogue={discoveryMessages} message="calendar.tryDate"/></p><Link href="/events"><MessageText catalogue={discoveryMessages} message="calendar.browse"/> <ArrowUpRight size={16} aria-hidden="true"/></Link></div>}
   </section>
  </div>
  {nextDates.length>0&&<section className={styles.section} aria-labelledby="calendar-upcoming-heading"><h2 id="calendar-upcoming-heading"><MessageText catalogue={discoveryMessages} message="calendar.nextDates"/></h2><div className={styles.related}>{nextDates.map(event=><CalendarRecord event={event} source={events.find(source=>String(source.id||source.slug||source.name)===event.id)} now={now} key={event.id}/>)}</div></section>}
  {unconfirmed.length>0&&<section className={styles.section} aria-labelledby="calendar-unconfirmed-heading"><h2 id="calendar-unconfirmed-heading"><MessageText catalogue={discoveryMessages} message="calendar.unconfirmed"/></h2><div className={styles.related}>{unconfirmed.map(event=><CalendarRecord event={event} source={events.find(source=>String(source.id||source.slug||source.name)===event.id)} now={now} key={event.id}/>)}</div></section>}
  {completedSchools.length>0&&<section className={styles.section} aria-labelledby="calendar-history-heading"><h2 id="calendar-history-heading"><MessageText catalogue={discoveryMessages} message="calendar.completed"/></h2><div className={styles.related}>{completedSchools.map(event=><CalendarRecord event={event} source={events.find(source=>String(source.id||source.slug||source.name)===event.id)} now={now} key={event.id}/>)}</div></section>}
  <div className={styles.callout}><div><h2><MessageText catalogue={discoveryMessages} message="calendar.bring"/></h2><p><MessageText catalogue={discoveryMessages} message="calendar.tell"/></p></div><Link href="/book?type=school"><MessageText catalogue={discoveryMessages} message="calendar.plan"/> <ArrowUpRight size={18} aria-hidden="true"/></Link></div>
 </div>;
}
