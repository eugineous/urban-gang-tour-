'use client';
import {useEffect,useRef,useState} from 'react';
import {Pause,Play,ArrowUpRight} from '@phosphor-icons/react';
import {useAmbientMotion} from '@/lib/client/use-ambient-motion';
import type {homepagePosterEvents} from '@/ui/lib/home-discovery';
import styles from './MobileAppHero.module.css';
export function MobileEventPoster({items,labels}:{items:ReturnType<typeof homepagePosterEvents>;labels:{title:string;recent:string;upcoming:string;available:string;explore:string;pause:string;resume:string}}){
 const root=useRef<HTMLDivElement>(null),allowed=useAmbientMotion(root),[paused,setPaused]=useState(false),[index,setIndex]=useState(0);
 const running=allowed&&!paused&&items.length>1;
 useEffect(()=>{if(!running)return;const timer=setInterval(()=>setIndex(value=>(value+1)%items.length),1000);return()=>clearInterval(timer)},[running,items.length]);
 const featured=items[index%items.length];
 return <div ref={root} className={styles.eventCard} data-mobile-event-card>
  <a href={featured?.past?'/events?period=all':'/events'}>
   <span className={styles.cardImage}><img src={featured?String(featured.event.image):'/assets/ugt-logo.png'} alt={featured?String(featured.event.name):''} loading="lazy"/></span>
   <div className={styles.cardCopy}><strong>{labels.title}</strong><span>{featured?featured.past?labels.recent:labels.upcoming:labels.available}</span></div>
   <span className={styles.cardAction}>{labels.explore}<ArrowUpRight size={21} aria-hidden="true"/></span>
  </a>
  {items.length>1&&<button type="button" className={styles.posterPause} onClick={()=>setPaused(value=>!value)} aria-label={paused?labels.resume:labels.pause} aria-pressed={paused}>{paused?<Play size={18} aria-hidden="true"/>:<Pause size={18} aria-hidden="true"/>}</button>}
 </div>;
}
