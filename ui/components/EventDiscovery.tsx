'use client';
import {MessageText} from '@/ui/i18n/MessageText';
import {discoveryMessages} from '@/ui/i18n/catalogues/discovery';
import {useMessages} from '@/ui/i18n/LanguageProvider';

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
export function EventDiscovery({events, initialNow=0}:Props) {const t=useMessages(discoveryMessages);
  const [catalogue, setCatalogue] = useState(events);
  const [now, setNow] = useState(initialNow);
  const [refreshState, setRefreshState] = useState<'current'|'stale'>('current');
  const [notice, setNotice] = useState<''|'events.updated'>('');
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
        if (loaded.current && nextSignature!==signature.current) setNotice('events.updated');
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
        <h1 id="events-title"><MessageText catalogue={discoveryMessages} message="events.title"/></h1>
        <div className={styles.search}>
          <MagnifyingGlass size={24} weight="regular" aria-hidden="true"/>
          <label className={styles.srOnly} htmlFor="event-search"><MessageText catalogue={discoveryMessages} message="events.search"/></label>
          <input id="event-search" type="search" disabled={!filtersReady} value={filters.q} onChange={event => updateFilters({q:event.target.value.slice(0,200)}, true)} placeholder={t("events.search")} autoComplete="off"/>
          {filters.q && <button type="button" onClick={() => updateFilters({q:''}, true)} aria-label={t("events.clearSearch")}><X size={20} aria-hidden="true"/></button>}
        </div>
      </section>

      {notice && <div className={styles.notice} role="status"><p>{t(notice)}</p><button type="button" onClick={() => setNotice('')} aria-label={t("events.dismissUpdate")}><X size={18} aria-hidden="true"/></button></div>}
      {refreshState==='stale' && <p className={styles.updateNote} role="status"><MessageText catalogue={discoveryMessages} message="events.stale"/></p>}

      {featured.length>0 && !filters.q && <section className={styles.featured} aria-labelledby="featured-events-title">
        <h2 id="featured-events-title"><MessageText catalogue={discoveryMessages} message="events.featured"/></h2>
        <div className={styles.featuredRail} data-featured-events="true" tabIndex={0} role="region" aria-label={t("events.featuredScroll")}>
          {featured.map(event => <EventPosterCard key={String(event.id)} event={event} now={now} availabilityCurrent={refreshState==='current'} featured/>)}
        </div>
      </section>}

      <section className={styles.directory} aria-labelledby="explore-events-title">
        <div className={styles.sectionHeading}>
          <h2 id="explore-events-title"><MessageText catalogue={discoveryMessages} message="events.explore"/></h2>
          <div className={styles.layoutControls} role="group" aria-label={t("events.layout")}>
            <Link className={styles.calendarLink} href="/tour-stops" aria-label={t("events.openCalendar")} title={t("events.calendar")}><CalendarBlank size={22} aria-hidden="true"/></Link>
            <button type="button" disabled={!filtersReady} aria-label={t("events.grid")} aria-pressed={filters.layout==='grid'} onClick={() => updateFilters({layout:'grid'})}><SquaresFour size={22} weight="regular" aria-hidden="true"/></button>
            <button type="button" disabled={!filtersReady} aria-label={t("events.list")} aria-pressed={filters.layout==='list'} onClick={() => updateFilters({layout:'list'})}><Rows size={22} weight="regular" aria-hidden="true"/></button>
          </div>
        </div>
        <div className={styles.filters}>
          <div className={styles.periods} role="group" aria-label={t("events.dates")}>
            {([['upcoming','events.upcoming'],['past','events.past'],['all','events.all']] as const).map(([value,label]) => <button key={value} type="button" disabled={!filtersReady} aria-pressed={filters.period===value} onClick={() => updateFilters({period:value})}>{t(label)}</button>)}
          </div>
          <div className={styles.selects}>
            <label><span><MessageText catalogue={discoveryMessages} message="events.type"/></span><select disabled={!filtersReady} value={filters.kind} onChange={event => updateFilters({kind:event.target.value})}><option value="all">{t('events.allTypes')}</option><option value="ticketed">{t('events.ticketed')}</option><option value="partner">{t('events.partner')}</option><option value="school">{t('events.school')}</option><option value="past">{t('events.previousClients')}</option></select></label>
            {(categories.length>0 || filters.eventCategory!=='all') && <label><span><MessageText catalogue={discoveryMessages} message="events.category"/></span><select disabled={!filtersReady} value={filters.eventCategory} onChange={event => updateFilters({eventCategory:event.target.value})}><option value="all">{t('events.allCategories')}</option>{filters.eventCategory!=='all' && !categories.some(category => category.id===filters.eventCategory) && <option value={filters.eventCategory}>{t('events.selectedCategory')}</option>}{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}
          </div>
        </div>
        <div className={styles.resultSummary}><p role="status" aria-live="polite">{t(filters.q.trim()?'events.matching':'events.count',{count:visible.length,query:filters.q.trim()})}</p>{modified && <button type="button" onClick={reset}><MessageText catalogue={discoveryMessages} message="events.reset"/></button>}</div>
        {shown.length>0 ? <div className={styles.eventGrid} data-layout={filters.layout}>
          {shown.map(event => <EventPosterCard key={String(event.id)} event={event} now={now} availabilityCurrent={refreshState==='current'}/>)}
        </div> : <div className={styles.empty}>
          <h3>{t(refreshState==='stale'&&catalogue.length===0?'events.unavailable':modified?'events.noMatch':'events.noUpcoming')}</h3>
          <p>{t(refreshState==='stale'&&catalogue.length===0?'events.retryContact':'events.archiveFilters')}</p>
          <div><button type="button" onClick={() => updateFilters({q:'',period:'all',kind:'all',eventCategory:'all'})}><MessageText catalogue={discoveryMessages} message="events.seeAll"/></button><Link href="/contact-us"><MessageText catalogue={discoveryMessages} message="events.contact"/></Link></div>
        </div>}
        {visible.length>limit && <div className={styles.more}><button type="button" onClick={() => setPagination({key:filterKey,limit:limit+12})}><MessageText catalogue={discoveryMessages} message="events.more"/> <span>{t('events.moreCount',{count:visible.length-limit})}</span></button></div>}
      </section>

      <aside className={styles.organizer} aria-label={t("events.bring")}><div><h2><MessageText catalogue={discoveryMessages} message="events.listYours"/></h2><p><MessageText catalogue={discoveryMessages} message="events.advertiseSummary"/></p></div><div><Link href="/organizer/signup"><MessageText catalogue={discoveryMessages} message="events.sell"/></Link><Link href="/contact-us?topic=event-listing"><MessageText catalogue={discoveryMessages} message="events.advertise"/></Link></div></aside>
    </div>
  </div>;
}
