'use client';

import {useEffect, useRef, useState} from 'react';
import {CalendarBlank, MagnifyingGlass, Rows, SquaresFour, X} from '@phosphor-icons/react';
import Link from './DocumentLink';
import {useUrlFilters} from './useUrlFilters';
import {EventPosterCard} from './EventPosterCard';
import {filterOwnedEvents, ownedEventPresentation, ownedEventSignature, publicEventCategories, publicOwnedEvents, type OwnedEvent} from '../lib/owned-event-presentation';
import styles from './EventDiscovery.module.css';

type Props = {events:OwnedEvent[]; initialNow?:number};

export function sortEventDirectory(events:OwnedEvent[], now:number) {
  return events.slice().sort((a,b) => {
    const av=ownedEventPresentation(a,now), bv=ownedEventPresentation(b,now);
    if(av.past!==bv.past) return Number(av.past)-Number(bv.past);
    const ad=av.dateTime ? Date.parse(av.dateTime+'T12:00:00+03:00') : null;
    const bd=bv.dateTime ? Date.parse(bv.dateTime+'T12:00:00+03:00') : null;
    if(ad===null || bd===null) return Number(ad===null)-Number(bd===null) || String(a.name).localeCompare(String(b.name));
    return (av.past ? bd-ad : ad-bd) || String(a.name).localeCompare(String(b.name));
  });
}

/** Only the public, administrator-published catalogue belongs in this directory. */
export function EventDiscovery({events, initialNow=0}:Props) {
  const [catalogue, setCatalogue] = useState(events);
  const [now, setNow] = useState(initialNow);
  const [refreshState, setRefreshState] = useState<'current'|'stale'>('current');
  const [notice, setNotice] = useState('');
  const [pagination, setPagination] = useState({key:'',limit:12});
  const signature = useRef(ownedEventSignature(events));
  const loaded = useRef(false);
  const [filters, updateFilters, filtersReady] = useUrlFilters(
    {q:'', period:'upcoming', kind:'all', eventCategory:'all', layout:'grid'},
    {period:['upcoming','past','all'], kind:['all','ticketed','partner','school','past'], layout:['grid','list']}
  );

  useEffect(() => {
    let stopped=false, controller:AbortController|undefined;
    async function refresh() {
      if (document.hidden) return;
      controller?.abort();
      const request=new AbortController();
      controller=request;
      const timeout=setTimeout(() => request.abort(), 10000);
      try {
        const response=await fetch('/api/site-data/events', {signal:request.signal, cache:'no-store'});
        if (!response.ok) throw new Error('events_unavailable');
        const data=await response.json();
        if (data.ok===false || !Array.isArray(data.events)) throw new Error('invalid_events');
        if (stopped || request.signal.aborted) return;
        const next:OwnedEvent[]=data.events.filter((event:unknown):event is OwnedEvent => !!event && typeof event==='object' && !Array.isArray(event));
        const nextSignature=ownedEventSignature(next);
        if (loaded.current && nextSignature!==signature.current) setNotice('Event details updated.');
        loaded.current=true;
        signature.current=nextSignature;
        setCatalogue(next);
        setRefreshState('current');
        setNow(Date.now());
      } catch {
        if (!stopped && controller===request) setRefreshState('stale');
      } finally {
        clearTimeout(timeout);
      }
    }
    const frame=requestAnimationFrame(() => setNow(Date.now()));
    void refresh();
    const poll=setInterval(() => void refresh(), 30000);
    const clock=setInterval(() => setNow(Date.now()), 60000);
    const onVisible=() => {if (!document.hidden) {setNow(Date.now());void refresh();}};
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped=true;
      controller?.abort();
      cancelAnimationFrame(frame);
      clearInterval(poll);
      clearInterval(clock);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const categories=publicEventCategories(catalogue, now);
  const visible=sortEventDirectory(filterOwnedEvents(catalogue, {kind:filters.kind, period:filters.period, q:filters.q, category:filters.eventCategory}, now), now);
  const featured=publicOwnedEvents(catalogue, now).filter(event => {
    const view=ownedEventPresentation(event,now);
    return !view.past && !!view.dateTime && ['published','ongoing','rescheduled'].includes(String(event.status));
  }).sort((a,b)=>Number(b.priority||0)-Number(a.priority||0)).slice(0,6);
  const modified=Boolean(filters.q || filters.kind!=='all' || filters.period!=='upcoming' || filters.eventCategory!=='all');
  const filterKey=[filters.q, filters.period, filters.kind, filters.eventCategory].join('|');
  const limit=pagination.key===filterKey ? pagination.limit : 12;
  const shown=visible.slice(0, limit);
  function reset() {updateFilters({q:'',period:'upcoming',kind:'all',eventCategory:'all'});}

  return <div className={styles.experience} data-event-directory="owned" data-filters-ready={filtersReady}>
    <div className={styles.page}>
      <section className={styles.intro} aria-labelledby="events-title">
        <h1 id="events-title">Discover your next best event experience.</h1>
        <div className={styles.search}>
          <MagnifyingGlass size={24} weight="regular" aria-hidden="true"/>
          <label className={styles.srOnly} htmlFor="event-search">Search events, schools or venues</label>
          <input id="event-search" type="search" disabled={!filtersReady} value={filters.q} onChange={event => updateFilters({q:event.target.value.slice(0,200)}, true)} placeholder="Search events, schools or venues" autoComplete="off"/>
          {filters.q && <button type="button" onClick={() => updateFilters({q:''}, true)} aria-label="Clear event search"><X size={20} aria-hidden="true"/></button>}
        </div>
      </section>

      {notice && <div className={styles.notice} role="status"><p>{notice}</p><button type="button" onClick={() => setNotice('')} aria-label="Dismiss event update"><X size={18} aria-hidden="true"/></button></div>}
      {refreshState==='stale' && <p className={styles.updateNote} role="status">Showing saved events. Open event details for current availability.</p>}

      {featured.length>0 && !filters.q && <section className={styles.featured} aria-labelledby="featured-events-title">
        <h2 id="featured-events-title">Featured events</h2>
        <div className={styles.featuredRail} data-featured-events="true" tabIndex={0} role="region" aria-label="Featured events, scroll to see more">
          {featured.map(event => <EventPosterCard key={String(event.id)} event={event} now={now} availabilityCurrent={refreshState==='current'} featured/>)}
        </div>
      </section>}

      <section className={styles.directory} aria-labelledby="explore-events-title">
        <div className={styles.sectionHeading}>
          <h2 id="explore-events-title">Explore events</h2>
          <div className={styles.layoutControls} role="group" aria-label="Event layout">
            <Link className={styles.calendarLink} href="/tour-stops" aria-label="Open event calendar" title="Event calendar"><CalendarBlank size={22} aria-hidden="true"/></Link>
            <button type="button" disabled={!filtersReady} aria-label="Grid view" aria-pressed={filters.layout==='grid'} onClick={() => updateFilters({layout:'grid'})}><SquaresFour size={22} weight="regular" aria-hidden="true"/></button>
            <button type="button" disabled={!filtersReady} aria-label="List view" aria-pressed={filters.layout==='list'} onClick={() => updateFilters({layout:'list'})}><Rows size={22} weight="regular" aria-hidden="true"/></button>
          </div>
        </div>
        <div className={styles.filters}>
          <div className={styles.periods} role="group" aria-label="Event dates">
            {([['upcoming','Upcoming'],['past','Past events'],['all','All events']] as const).map(([value,label]) => <button key={value} type="button" disabled={!filtersReady} aria-pressed={filters.period===value} onClick={() => updateFilters({period:value})}>{label}</button>)}
          </div>
          <div className={styles.selects}>
            <label><span>Event type</span><select disabled={!filtersReady} value={filters.kind} onChange={event => updateFilters({kind:event.target.value})}><option value="all">All event types</option><option value="ticketed">Ticketed events</option><option value="partner">Partner events</option><option value="school">School tour</option><option value="past">Previous clients</option></select></label>
            {(categories.length>0 || filters.eventCategory!=='all') && <label><span>Category</span><select disabled={!filtersReady} value={filters.eventCategory} onChange={event => updateFilters({eventCategory:event.target.value})}><option value="all">All categories</option>{filters.eventCategory!=='all' && !categories.some(category => category.id===filters.eventCategory) && <option value={filters.eventCategory}>Selected category</option>}{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}
          </div>
        </div>
        <div className={styles.resultSummary}><p role="status" aria-live="polite">{visible.length} {visible.length===1?'event':'events'}{filters.q.trim()?' matching “'+filters.q.trim()+'”':''}</p>{modified && <button type="button" onClick={reset}>Reset filters</button>}</div>
        {shown.length>0 ? <div className={styles.eventGrid} data-layout={filters.layout}>
          {shown.map(event => <EventPosterCard key={String(event.id)} event={event} now={now} availabilityCurrent={refreshState==='current'}/>)}
        </div> : <div className={styles.empty}>
          <h3>{refreshState==='stale' && catalogue.length===0 ? 'Events are temporarily unavailable.' : modified ? 'No events match your search.' : 'More events are on the way.'}</h3>
          <p>{refreshState==='stale' && catalogue.length===0 ? 'Please try again shortly. You can still contact our team.' : 'Explore the archive or change your filters.'}</p>
          <div><button type="button" onClick={() => updateFilters({q:'',period:'all',kind:'all',eventCategory:'all'})}>See all events</button><Link href="/contact-us">Contact the team</Link></div>
        </div>}
        {visible.length>limit && <div className={styles.more}><button type="button" onClick={() => setPagination({key:filterKey,limit:limit+12})}>Show more events <span>({visible.length-limit} more)</span></button></div>}
      </section>

      <aside className={styles.organizer} aria-label="Bring your event to Urban Gang Tour"><div><h2>Your event belongs here.</h2><p>Promote your event or sell tickets with Urban Gang Tour.</p></div><div><Link href="/organizer/signup">Sell tickets</Link><Link href="/contact-us?topic=event-listing">Advertise an event</Link></div></aside>
    </div>
  </div>;
}
