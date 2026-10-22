'use client';
import {useEffect,useState} from 'react';
import {ArrowUpRight} from '@phosphor-icons/react';
import {recentEventPlacements} from '@/lib/event-placements';
import type {OwnedEvent} from '../lib/owned-event-presentation';
import Link from './DocumentLink';
import styles from './EventPlacements.module.css';

/** Non-blocking site-wide event placements, with the CMS as the sole source. */
export function EventPlacements({events:initialEvents,initialNow,path}:{events:OwnedEvent[];initialNow:number;path:string}){
 const [events,setEvents]=useState(initialEvents),[now,setNow]=useState(initialNow);
 useEffect(()=>{
  let stopped=false,controller:AbortController|undefined;
  async function refresh(){
   if(document.hidden)return;
   controller?.abort();const request=new AbortController();controller=request;
   const timeout=setTimeout(()=>request.abort(),10000);
   try{
    const response=await fetch('/api/site-data/events',{signal:request.signal,cache:'no-store'});
    if(!response.ok)throw Error('events_unavailable');
    const data=await response.json();if(!Array.isArray(data.events))throw Error('invalid_events');
    if(!stopped&&controller===request){setEvents(data.events.filter((event:unknown)=>event&&typeof event==='object'&&!Array.isArray(event)));setNow(Date.now())}
   }catch{if(!stopped&&controller===request)setEvents([])}finally{clearTimeout(timeout)}
  }
  setNow(Date.now());void refresh();
  const timer=setInterval(()=>void refresh(),60000);
  const visible=()=>{if(!document.hidden)void refresh()};document.addEventListener('visibilitychange',visible);
  return()=>{stopped=true;controller?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible)};
 },[]);
 const placements=recentEventPlacements(events,now,path);
 if(!placements.length)return null;
 return <aside className={styles.placements} data-event-placements aria-labelledby="recent-events-heading">
  <div className={styles.heading}><h2 id="recent-events-heading">On our calendar</h2><Link href="/events">All events <ArrowUpRight size={18} aria-hidden="true"/></Link></div>
  <div className={styles.cards}>{placements.map(event=><Link className={styles.card} href={event.href} key={event.id}>
   <img src={event.image} alt={event.name+' event artwork'} width="80" height="100" loading="lazy" decoding="async"/>
   <span className={styles.copy}><small>{event.label}</small><strong>{event.name}</strong><time dateTime={event.dateTime}>{event.date}</time></span>
   <ArrowUpRight className={styles.arrow} size={18} aria-hidden="true"/>
  </Link>)}</div>
 </aside>;
}
