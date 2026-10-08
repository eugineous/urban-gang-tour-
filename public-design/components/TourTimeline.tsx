'use client';
import Link from './DocumentLink';
import {useState} from 'react';
import timeline from '@/data/tour-timeline.json';

export function TourTimeline(){
  const [filter,setFilter]=useState('All');
  const entries=timeline.entries.filter(e=>filter==='All'||(filter==='Completed events'?e.status==='completed':e.status==='reconnaissance'));
  const dated=entries.filter(e=>e.date).sort((a,b)=>a.date!.localeCompare(b.date!));
  const undated=entries.filter(e=>!e.date);
  function entry(e:typeof timeline.entries[number]){return <li className="tour-timeline-item" key={e.id} data-status={e.status}>
    <div className="tour-timeline-date">{e.date?<><time dateTime={e.date}>{new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Africa/Nairobi'}).format(new Date(e.date+'T12:00:00+03:00'))}</time><small>Recorded date · time unconfirmed</small></>:<><span>Date to be confirmed</span><small>Visit confirmed by the team</small></>}</div>
    <article className="tour-timeline-card">
      {e.image&&<img src={e.image} alt={`Urban Gang Tour at ${e.name}`} loading="lazy" decoding="async"/>}
      <div><span className="tour-status">{e.status==='completed'?'Completed event':'Reconnaissance visit'}</span><h2>{e.name}</h2><p>{e.venue}</p><p>{e.status==='completed'?'A school tour stop with Urban Gang Tour.':'A planning visit to the school. This was not a completed school event.'}</p>
      {e.status==='completed'&&<Link href={`/events/${e.id}`}>Explore this stop <span aria-hidden="true">→</span></Link>}</div>
    </article>
  </li>}
  return <><section className="page-intro wrap"><div><p className="eyebrow">The school tour</p><h1>Our journey,<br/>school by school.</h1></div><p>See where we’ve hosted events and where we’ve visited to plan what comes next.</p></section>
  <section className="wrap tour-history" aria-label="School tour timeline"><div className="filter-bar">{['All','Completed events','Reconnaissance visits'].map(f=><button key={f} onClick={()=>setFilter(f)} className={filter===f?'selected':''} aria-pressed={filter===f}>{f}</button>)}</div>
  {dated.length>0&&<><h2 className="tour-period">2026 · Recorded tour stops</h2><ol className="tour-timeline">{dated.map(entry)}</ol></>}
  {undated.length>0&&<><h2 className="tour-period">Visits awaiting dates</h2><p className="tour-date-note">These visits happened. We’ll place them in chronological order when their dates are confirmed.</p><ol className="tour-timeline undated">{undated.map(entry)}</ol></>}
  <p className="tour-date-note">Dates shown come from existing tour records. Exact times are not recorded. A reconnaissance visit does not confirm an event booking.</p>
  <div className="banner-cta"><h2>Bring the tour to your school.</h2><Link className="button" href="/book?type=school">Plan a school event</Link></div></section></>;
}
