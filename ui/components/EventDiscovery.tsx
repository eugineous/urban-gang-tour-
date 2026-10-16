'use client';
import {useEffect, useRef, useState} from 'react';
import {useUrlFilters} from './useUrlFilters';
import {ShareActions} from './ShareActions';
import {Newsletter} from './Newsletter';
import Link from './DocumentLink';
import seed from '../data/event-discovery.json';
import timeline from '../data/tour-timeline.json';
import {rankEvents, reportedSales} from '../lib/event-ranking.mjs';
import {ownedEventPresentation, ownedEventSignature, filterOwnedEvents, type OwnedEvent} from '../lib/owned-event-presentation';
import styles from './EventDiscovery.module.css';

const endpoint = 'https://urban-gang-tour-events.euginemicah.workers.dev/events';
type Listing = typeof seed.events[number];
type Source = typeof seed.sources[number];
type Feed = {generatedAt:string; refreshSeconds:number; events:Listing[]; sources:Source[]; stale?:boolean};
const initial = seed as Feed;
const dateFormat = new Intl.DateTimeFormat('en-KE', {hour:'numeric', minute:'2-digit', day:'numeric', month:'short', timeZone:'Africa/Nairobi'});
function checkedAt(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? dateFormat.format(date) : null;
}
function formatDate(event: Listing) {
  const date = new Date(event.dateOnly ? event.startsAt + 'T12:00:00+03:00' : event.startsAt);
  if (!Number.isFinite(date.getTime())) return 'Check the source for the date';
  return new Intl.DateTimeFormat('en-KE', {day:'numeric', month:'short', ...(event.dateOnly ? {} : {hour:'numeric', minute:'2-digit'}), timeZone:'Africa/Nairobi'}).format(date);
}
const price = (event:Listing) => event.price === null ? 'Price on seller’s page' : event.price === 0 ? 'Free · check registration' : (event.currency || 'KES') + ' ' + Number(event.price).toLocaleString('en-KE');
function active(event:Listing, now:number) {
  const start = Date.parse(event.dateOnly ? event.startsAt + 'T00:00:00+03:00' : event.startsAt);
  const end = event.endsAt ? Date.parse(event.endsAt.length === 10 ? event.endsAt + 'T23:59:59+03:00' : event.endsAt) : event.dateOnly ? start + 86400000 : start;
  return end > now;
}
function entertainment(event:Pick<Listing, 'category'>) { return ['Music & nightlife', 'Arts & culture'].includes(event.category); }
function Poster({e}:{e:{image:string; title:string; sourceName:string}}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [e.image]);
  return <div className="discovery-poster">{e.image && !failed
    ? <img src={e.image} alt={e.title + ' event poster'} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)}/>
    : <div className="poster-unavailable"><span>{e.sourceName}</span><strong>{e.title}</strong><small>View the event details</small></div>}</div>;
}
function Card({e, onInterest}:{e:Listing; onInterest?:(id:string, kind:string) => void}) {
  const check = checkedAt(e.checkedAt);
  return <a className="discovery-card" onClick={() => onInterest?.(e.id, 'click')} href={e.url} target="_blank" rel="noopener noreferrer" aria-label={e.title + ': view on ' + e.sourceName + ', opens in a new tab'}>
    <Poster e={e}/><div className="discovery-card-copy">
      <div className="discovery-card-meta"><span>{e.category}</span><span>{e.sourceName} · {e.sourceType === 'Event guide' ? 'Guide' : 'Seller'}</span></div>
      <time dateTime={e.startsAt}>{formatDate(e)}</time><h3>{e.title}</h3><p>{e.venue}</p>
      <div className="discovery-card-action"><strong>{price(e)}</strong><span>View on {e.sourceName}<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19L19 5M6 5h13v13" fill="none" stroke="currentColor" strokeWidth="1.8"/></svg></span></div>
      {check && <small className={styles.sourceCheck}>Source checked {check}</small>}
    </div>
  </a>;
}
function OwnedCard({event, now}:{event:OwnedEvent; now:number}) {
  const view = ownedEventPresentation(event, now);
  const name = String(event.name || '');
  return <article className={styles.ownedCard}>
    <Poster e={{image:typeof event.image === 'string' ? event.image : '', title:name, sourceName:'Urban Gang Tour'}}/>
    <div className={styles.ownedCopy}>
      <span className={styles.status} data-sellable={view.sellable}>{view.label}</span>
      <time dateTime={view.dateTime}>{view.dateLabel}{event.eventTime && view.dateTime ? ' · ' + String(event.eventTime) : ''}</time>
      <h3>{name}</h3><p>{[event.venue, event.city].filter(Boolean).join(', ') || 'Venue to be confirmed'}</p><p>{view.note}</p>
      <Link className={'button ' + (view.sellable ? '' : 'secondary')} href={view.href}>{view.action}<span aria-hidden="true">→</span></Link>
    </div>
  </article>;
}

export function EventDiscovery({events:ownEvents}:{events:Record<string,any>[]}) {
  const [liveOwn, setLiveOwn] = useState<OwnedEvent[]>(ownEvents);
  const [ownState, setOwnState] = useState('Checking Urban Gang Tour updates…');
  const [notice, setNotice] = useState('');
  const lastOwn = useRef(ownedEventSignature(ownEvents));
  const ownLoaded = useRef(false);
  const [interest, setInterest] = useState<Record<string,{value:number; capturedAt:string}>>({});
  const counted = useRef(new Set<string>());
  function consented() { try { return localStorage.getItem('ugt-consent') === 'yes'; } catch { return false; } }
  function recordInterest(eventId:string, kind:string) {
    const key = eventId + ':' + kind;
    if (!consented() || counted.current.has(key)) return;
    counted.current.add(key);
    fetch('/api/event-interest', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({eventId, kind, consent:true}), keepalive:true}).catch(() => {});
  }
  async function updateInterest(signal:AbortSignal) {
    try {
      const response = await fetch('/api/event-interest', {signal});
      if (!response.ok) return;
      const data = await response.json();
      if (!Array.isArray(data.signals) || !data.capturedAt) return;
      const map:Record<string,{value:number; capturedAt:string}> = {};
      for (const row of data.signals) {
        if (typeof row.key !== 'string' || !Number.isFinite(row.value) || row.value < 0) continue;
        const previous = map[row.key]?.value || 0;
        map[row.key] = {value:previous + row.value * (row.kind === 'inquiry' ? 3 : row.kind === 'click' ? 2 : 1), capturedAt:data.capturedAt};
      }
      if (!signal.aborted) setInterest(map);
    } catch {}
  }

  const [feed, setFeed] = useState(initial);
  const [state, setState] = useState('Checking latest listings');
  const [now, setNow] = useState(Date.now());
  const [advanced, setAdvanced] = useState(false);
  const [limit, setLimit] = useState(9);
  const [filters, updateFilters] = useUrlFilters(
    {q:'', when:'72', region:'Nairobi & nearby', category:'All categories', source:'All sources', sort:'recommended', view:'ugt',period:'upcoming',kind:'all'},
    {when:['72','168','720','all'], region:['Nairobi & nearby','All Kenya'], category:['All categories','Entertainment',...feed.events.map(e => e.category)], source:['All sources',...feed.sources.map(s => s.id)], sort:['recommended','soonest','booked'],view:['ugt','kenya'],period:['upcoming','past','all'],kind:['all','school','partner','ticketed','past']}
  );
  const search = filters.q;
  const period = ['72','168','720','all'].includes(filters.when) ? filters.when : '72';
  const region = ['Nairobi & nearby','All Kenya'].includes(filters.region) ? filters.region : 'Nairobi & nearby';
  const category = filters.category, source = filters.source;
  const sort = ['recommended','soonest','booked'].includes(filters.sort) ? filters.sort : 'recommended';
  useEffect(() => setLimit(9), [filters.q,filters.when,filters.region,filters.category,filters.source,filters.sort]);
  const setSearch = (q:string) => updateFilters({q:q.slice(0,200)}, true);
  const setPeriod = (when:string) => updateFilters({when});
  const setRegion = (region:string) => updateFilters({region});
  const setCategory = (category:string) => updateFilters({category});
  const setSource = (source:string) => updateFilters({source});
  const setSort = (sort:string) => updateFilters({sort});
  useEffect(() => {
    let stopped = false, controller:AbortController | undefined, ownController:AbortController | undefined, retry:ReturnType<typeof setTimeout> | undefined;
    async function refreshOwn() {
      if(document.hidden)return;
      ownController?.abort();
      const request=new AbortController();ownController=request;
      const timeout=setTimeout(()=>request.abort(),10000);
      try{
        const response=await fetch('/api/site-data/events',{signal:request.signal,cache:'no-store'});
        if(!response.ok)throw new Error('Unavailable');
        const data=await response.json();
        if(!Array.isArray(data.events))throw new Error('Invalid event data');
        if(stopped||request.signal.aborted)return;
        const events=data.events.filter((event:unknown):event is OwnedEvent=>Boolean(event)&&typeof event==='object');
        const key=ownedEventSignature(events);
        if(ownLoaded.current&&key!==lastOwn.current)setNotice('Event details updated. Check the latest status below.');
        ownLoaded.current=true;lastOwn.current=key;setLiveOwn(events);setOwnState('');
      }catch{if(!stopped&&ownController===request){setLiveOwn([]);setOwnState('Updates are unavailable. Check the event details before booking.');}}
      finally{clearTimeout(timeout)}
    }
    async function refresh() {
      if (document.hidden) return;
      controller?.abort();
      const request = new AbortController();
      controller = request;
      void updateInterest(request.signal);
      const timeout = setTimeout(() => request.abort(), 12000);
      try {
        const response = await fetch(endpoint, {signal:request.signal});
        if (!response.ok) throw new Error('Unavailable');
        const data = await response.json();
        if (!Array.isArray(data.events) || !Array.isArray(data.sources)) throw new Error('Invalid feed');
        if (stopped || request.signal.aborted) return;
        setFeed(data);
        setState(data.stale ? 'Showing cached listings · updating' : 'Latest source check complete');
        if (data.stale) retry = setTimeout(refresh, 15000);
      } catch { if (!stopped) setState('Showing saved listings · live update unavailable'); }
      finally { clearTimeout(timeout); }
    }
    void refreshOwn();refresh();
    const poll = setInterval(refresh, 180000), clock = setInterval(() => setNow(Date.now()), 60000);
    const ownPoll=setInterval(()=>void refreshOwn(),20000);
    const onVisible = () => { if (!document.hidden) {void refreshOwn();refresh();} };
    document.addEventListener('visibilitychange', onVisible);
    return () => { stopped = true; controller?.abort();ownController?.abort();clearInterval(ownPoll); clearInterval(poll); clearInterval(clock); clearTimeout(retry); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  useEffect(() => {
    if (!search.trim()) return;
    const timer = setTimeout(() => {
      const matches = feed.events.filter(e => active(e, Date.now()) && (e.title + ' ' + e.venue).toLowerCase().includes(search.trim().toLowerCase()));
      if (matches.length === 1) recordInterest(matches[0].id, 'search');
    }, 700);
    return () => clearTimeout(timer);
  }, [search, feed.events]);
  const [demandKeys, setDemandKeys] = useState<Record<string,string>>({});
  useEffect(() => {
    let stopped = false;
    Promise.all(feed.events.map(async event => {
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(event.id));
      return [event.id, Array.from(new Uint8Array(bytes)).map(x => x.toString(16).padStart(2,'0')).join('').slice(0,24)];
    })).then(pairs => { if (!stopped) setDemandKeys(Object.fromEntries(pairs)); }).catch(() => {});
    return () => { stopped = true; };
  }, [feed.events]);

  const all = feed.events.filter(e => active(e,now)).map(e => ({...e, localInterest:interest[demandKeys[e.id]]}));
  const sorted = all.slice().sort((a,b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.priority - b.priority);
  const cutoff = now + Number(period) * 3600000;
  const filtered = rankEvents(sorted.filter(e => (period === 'all' || Date.parse(e.startsAt) < cutoff)
    && (region === 'All Kenya' || e.region === region)
    && (category === 'All categories' || category === 'Entertainment' && entertainment(e) || e.category === category)
    && (source === 'All sources' || e.sourceId === source)
    && (e.title + ' ' + e.venue + ' ' + e.sourceName).toLowerCase().includes(search.toLowerCase())), {now, region, query:search, mode:sort});
  const visibleOwn=filterOwnedEvents(liveOwn,{kind:filters.kind,period:filters.period,q:search},now);
  const heroCandidates = rankEvents(sorted.filter(e => entertainment(e) && e.sourceType === 'Ticket seller' && e.region === 'Nairobi & nearby' && e.venue !== 'Venue on seller’s page' && Date.parse(e.startsAt) < now + 72 * 3600000), {now, region:'Nairobi & nearby'});
  const heroChoices = heroCandidates.filter((e,i,a) => a.findIndex(x => x.sourceId === e.sourceId) === i).slice(0,4);
  const festivals = rankEvents(sorted.filter(e => /festival|solfest|fest\b/i.test(e.title)), {now, region}).slice(0,3);
  const categories = [...new Set(all.map(e => e.category))].sort();
  const visibleSources = feed.sources.filter(s => all.some(e => e.sourceId === s.id));
  const extraFilterCount = Number(region !== 'Nairobi & nearby') + Number(category !== 'All categories') + Number(source !== 'All sources');
  const modifiedFilters = Boolean(search || period !== '72' || extraFilterCount || sort !== 'recommended');
  const feedCheck = checkedAt(feed.generatedAt);
  function clear() { updateFilters({q:'', when:'72', region:'Nairobi & nearby', category:'All categories', source:'All sources', sort:'recommended'}); }
  function broaden() { updateFilters({q:'', when:'all', region:'All Kenya', category:'All categories', source:'All sources', sort:'recommended'}); }
  function switchTab(event:React.KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const next=event.key==='Home'?'ugt':event.key==='End'?'kenya':filters.view==='ugt'?'kenya':'ugt';
    updateFilters({view:next});
    document.getElementById(next+'-tab')?.focus();
  }

  return <div className={'event-discovery ' + styles.experience}>
    {notice && <div className="event-update-notice" role="status"><p>{notice}</p><button type="button" aria-label="Dismiss event update" onClick={() => setNotice('')}>Close</button></div>}
    <section className="discovery-intro wrap"><div><p className="eyebrow">Urban Gang Tour · Events</p><h1>Find your next{' '}<br/>live experience.</h1><p>Our stages. Your next night out.</p></div><div className="event-intro-actions"><div className={styles.introLinks}><Link href="/book" className="button">Plan your event <span aria-hidden="true">→</span></Link><Link href="/organizer/signup" className="text-link">Sell tickets</Link></div></div></section>
    <div className={'wrap '+styles.viewTabs} role="tablist" aria-label="Choose event listings" onKeyDown={switchTab}><button id="ugt-tab" type="button" role="tab" tabIndex={filters.view==='ugt'?0:-1} aria-selected={filters.view==='ugt'} aria-controls="ugt-panel" onClick={()=>updateFilters({view:'ugt'})}>Urban Gang Tour</button><button id="kenya-tab" type="button" role="tab" tabIndex={filters.view==='kenya'?0:-1} aria-selected={filters.view==='kenya'} aria-controls="kenya-panel" onClick={()=>updateFilters({view:'kenya'})}>Kenya picks</button></div>
    <div id="ugt-panel" role="tabpanel" aria-labelledby="ugt-tab" hidden={filters.view!=='ugt'}>

    <section className={'wrap ' + styles.owned} aria-labelledby="ugt-events-heading">
      <div className={styles.ownedHeading}><div><p className="eyebrow">From Urban Gang Tour</p><h2 id="ugt-events-heading">Our events.</h2></div><Link className="text-link" href="/tour-stops">Follow the school tour <span aria-hidden="true">→</span></Link></div>
      <div className={styles.ownedFilters}><label>Search our events<input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="School, campus, event or venue"/></label>
      <label>Event type<select aria-label="Event type" value={filters.kind} onChange={event=>updateFilters({kind:event.target.value})}>{[['all','All types'],['school','School tour'],['partner','Partner events'],['ticketed','Ticketed events'],['past','Previous clients']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>
      <div className="filter-bar" role="group" aria-label="Event history">{[['upcoming','Upcoming'],['past','Past events'],['all','All events']].map(([value,label])=><button key={value} type="button" aria-pressed={filters.period===value} onClick={()=>updateFilters({period:value})}>{label}</button>)}</div>
      <p role="status">{visibleOwn.length} {visibleOwn.length===1?'event':'events'}</p>
      {visibleOwn.length>0?<div className={styles.ownedGrid}>{visibleOwn.map(event=><OwnedCard key={String(event.id)} event={event} now={now}/>)}</div>:<div className={styles.ownedEmpty}><h3>{ownState.includes('unavailable')?'Event updates are unavailable.':'No events match this view.'}</h3><button className="button secondary" type="button" onClick={()=>updateFilters({q:'',kind:'all',period:'all'})}>See all our events</button><Link className="text-link" href="/book">Plan an event with us →</Link></div>}
      {ownState&&<p className={styles.ownedCheck} role="status">{ownState}</p>}
    </section>
    </div><div id="kenya-panel" role="tabpanel" aria-labelledby="kenya-tab" hidden={filters.view!=='kenya'}>
    <div className="wrap event-search-first"><div className={styles.searchHeading} id="discover-events"><div><h2>Discover events around Kenya.</h2><p>Concerts, festivals and nights out from independent sellers and event guides. Links open the source’s website.</p></div><Link href="#event-sources" className="text-link">Browse sources <span aria-hidden="true">↓</span></Link></div>
      <div className={styles.searchBox}><label className={'discovery-search ' + styles.searchField}><span>Search independent listings</span><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search artist, event or venue" autoComplete="off"/></label>{search && <button className={styles.clearSearch} type="button" onClick={() => setSearch('')} aria-label="Clear event search">×</button>}</div>
      <div className="event-quick-filters" aria-label="Event categories">{['All categories','Entertainment',...categories.filter(c => !entertainment({category:c}))].map(c => <button type="button" key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>{c === 'All categories' ? 'All events' : c}</button>)}</div>
    </div>
    {heroChoices.length > 0 && <section className="wrap event-top-picks" aria-labelledby="event-picks-heading"><div className="event-section-heading"><h2 id="event-picks-heading">Your next night out</h2><span>Independent entertainment picks</span></div><div className="event-picks-rail">{heroChoices.map(e => <Card e={e} key={e.id} onInterest={recordInterest}/>)}</div></section>}

    <section className="wrap discovery-layout"><div className="discovery-main">
      <div className="discovery-controls"><div className="event-filter-summary"><label><span className={styles.filterLabel}>When are you going out?</span><select aria-label="When" value={period} onChange={e => setPeriod(e.target.value)}><option value="72">Next 72 hours</option><option value="168">Next 7 days</option><option value="720">Next 30 days</option><option value="all">All upcoming</option></select></label><div className={styles.filterActions}><button className="button secondary" type="button" aria-expanded={advanced} aria-controls="event-more-filters" onClick={() => setAdvanced(!advanced)}>Filters{extraFilterCount ? ' (' + extraFilterCount + ')' : ''}<span aria-hidden="true">{advanced ? '−' : '+'}</span></button>{modifiedFilters && <button className="text-link" type="button" onClick={clear}>Reset</button>}</div></div>
        <div className="discovery-selects" id="event-more-filters" hidden={!advanced}><label><span>Where</span><select aria-label="Where" value={region} onChange={e => setRegion(e.target.value)}><option>Nairobi & nearby</option><option>All Kenya</option></select></label><label><span>Category</span><select aria-label="Category" value={category} onChange={e => setCategory(e.target.value)}><option>All categories</option><option>Entertainment</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label><span>Source</span><select aria-label="Source" value={source} onChange={e => setSource(e.target.value)}><option>All sources</option>{visibleSources.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label></div>
      </div>
      <div className={styles.filterContext} aria-label="Current event filters"><span>{region}</span>{category !== 'All categories' && <span>{category}</span>}{source !== 'All sources' && <span>{feed.sources.find(s => s.id === source)?.name || source}</span>}</div>
      <div className="discovery-results-heading"><h2>{period === '72' ? 'Going out in the next 72 hours' : 'Upcoming independent events'}</h2><label className="discovery-sort"><span className="sr-only">Sort events</span><select aria-label="Sort events" value={sort} onChange={e => setSort(e.target.value)}><option value="recommended">Recommended</option><option value="soonest">Soonest</option>{(sort === 'booked' || all.some(e => reportedSales(e,now) !== null)) && <option value="booked">Most booked · reported</option>}</select></label><span role="status" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'event' : 'events'}</span></div>
      <div className="discovery-sync"><span className={state.includes('unavailable') || state.includes('cached') ? 'sync-dot unavailable' : 'sync-dot'}/><p>{state}.{feedCheck && <> Feed updated <time dateTime={feed.generatedAt}>{feedCheck}</time>.</>}</p></div>
      <div className="discovery-grid">{filtered.slice(0,limit).map(e => <Card e={e} key={e.id} onInterest={recordInterest}/>)}</div>
      {filtered.length>limit&&<div className="center-action"><button className="button secondary" type="button" onClick={()=>setLimit(value=>value+9)}>Show more events ({filtered.length-limit})</button></div>}
      {!filtered.length && <div className={'discovery-empty ' + styles.emptyState}><h3>{all.length ? 'No events match these filters.' : 'No current listings are available.'}</h3><p>{all.length ? 'Try a wider date range, a different search or another location.' : 'Sources may have no upcoming events or may be delayed. Browse their websites for the latest listings.'}</p>{search.trim() && <a className="text-link" href={'https://www.google.com/search?q=' + encodeURIComponent(search + ' events Nairobi Kenya tickets')} target="_blank" rel="noopener noreferrer">Search Google for “{search}” <span aria-hidden="true">↗</span></a>}<div className={styles.emptyActions}>{all.length > 0 && <button className="button" type="button" onClick={broaden}>See all upcoming in Kenya</button>}{modifiedFilters && <button className="button secondary" type="button" onClick={clear}>Reset filters</button>}<Link className="text-link" href="#event-sources">Browse event sources <span aria-hidden="true">↓</span></Link></div></div>}
      <p className="discovery-disclaimer">Listings come from public event pages. Prices, times and availability may change. Confirm them with the seller before paying.</p>
    </div>
    <aside className="discovery-aside"><section className="festival-rail"><p className="eyebrow">Plan ahead</p><h2>Festival watch.</h2>{festivals.length ? festivals.map(e => <a href={e.url} target="_blank" rel="noopener noreferrer" key={e.id} onClick={() => recordInterest(e.id,'click')}><img src={e.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" style={{objectFit:'contain'}}/><div><small>{formatDate(e)} · {e.sourceName}</small><h3>{e.title}</h3><span>View source <span aria-hidden="true">↗</span></span></div></a>) : <p className={styles.noFestivals}>No upcoming festival listings in the current feed. Check back for source updates.</p>}</section><section className="discovery-booking"><p className="eyebrow">Your event. Our energy.</p><h2>Planning a school or campus event?</h2><p>Talk to Eugine Micah and Lucy Ogunde about hosting and the full tour experience.</p><Link href="/book" className="button">Plan your event</Link></section><section className="discovery-tour"><p className="eyebrow">On the road</p><h2>The school tour.</h2><ol>{timeline.entries.filter(e => e.status === 'completed').slice(-3).map(e => <li key={e.id}><span className="tour-mini-dot"/><div><strong>{e.name}</strong><small>Completed event</small></div></li>)}</ol><Link href="/tour-stops">See the full timeline <span aria-hidden="true">→</span></Link></section></aside></section>
    <div className="wrap"><ShareActions title="Find entertainment events in Nairobi with Urban Gang Tour" path="/events" label="Share events with a friend"/></div><Newsletter/>
    <section className="wrap events-secondary-actions"><Link href="/contact-us?topic=referrals">Ask about referrals</Link><Link href="/tour-stops">Explore our school tour timeline</Link><Link href="/book">Book Urban Gang Tour</Link></section>
    <details className="wrap discovery-sources" id="event-sources"><summary>Ticket sellers & event guides</summary><div className="source-directory">{feed.sources.map(s => <a href={s.url} target="_blank" rel="noopener noreferrer" key={s.id}><strong>{s.name}<span aria-hidden="true">↗</span></strong><small>{s.type} · {s.scope === 'Guide' ? 'Kenya listings' : s.scope}</small><span className={'source-state ' + (s.count > 0 ? 'connected' : '')}>{s.count > 0 ? s.status : 'Directory link'}</span></a>)}</div><p className="discovery-disclaimer">Independent sources are not sponsors or partners unless explicitly stated. Confirm prices and availability with the seller.</p></details>
    </div>
  </div>;
}
