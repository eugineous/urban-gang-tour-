'use client';
import Link from './DocumentLink';
import {useState} from 'react';
import timeline from '../data/tour-timeline.json';

export function TourTimeline(){
  const [filter,setFilter]=useState('All');
  const entries=timeline.entries.filter(e=>filter==='All'||(filter==='Completed events'?e.status==='completed':e.status==='reconnaissance'));
  const dated=entries.filter(e=>e.date).sort((a,b)=>a.date!.localeCompare(b.date!));
  const undated=entries.filter(e=>!e.date);
  function entry(e:typeof timeline.entries[number]){return <li className="tour-timeline-item" key={e.id} data-status={e.status}>
    <div className="tour-timeline-date">{e.date?<><time dateTime={e.date}>{new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Africa/Nairobi'}).format(new Date(e.date+'T12:00:00+03:00'))}</time></>:<><span>Date pending</span></>}</div>
    <article className="tour-timeline-card">
      {e.image&&<img src={e.image} alt={`Urban Gang Tour at ${e.name}`} loading="lazy" decoding="async"/>}
      <div><span className="tour-status">{e.status==='completed'?'Completed event':'Planning visit'}</span><h2>{e.name}</h2><p>{e.venue}</p>
      {e.status==='completed'&&<Link href={`/gallery/school-${e.id}`}>View photos <span aria-hidden="true">→</span></Link>}</div>
    </article>
  </li>}
  return <><section className="page-intro wrap"><div><p className="eyebrow">The school tour</p><h1>Tour stops.</h1></div><p>School memories. Next stops in the making.</p></section>
  <section className="wrap tour-history" aria-label="School tour timeline"><div className="filter-bar">{['All','Completed events','Planning visits'].map(f=><button key={f} onClick={()=>setFilter(f)} className={filter===f?'selected':''} aria-pressed={filter===f}>{f}</button>)}</div>
  {dated.length>0&&<><h2 className="tour-period">2026 · School tour</h2><ol className="tour-timeline">{dated.map(entry)}</ol></>}
  {undated.length>0&&<><h2 className="tour-period">In planning</h2><p className="tour-date-note">Planning visits · dates pending.</p><ol className="tour-timeline undated">{undated.map(entry)}</ol></>}
  <p className="tour-date-note">Planning visits are not confirmed events.</p>
  <div className="banner-cta"><h2>Bring the tour to your school.</h2><Link className="button" href="/book?type=school">Plan a school event</Link></div></section></>;
}
