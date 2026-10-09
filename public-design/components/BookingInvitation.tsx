"use client";
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {useCalmMotion} from './ExperienceRails';

const seenKey='ugt-booking-invitation-seen-v1';
export function BookingInvitation(){
  const path=usePathname(),dialog=useRef<HTMLDialogElement>(null),player=useRef<HTMLVideoElement>(null);
  const [open,setOpen]=useState(false),[paused,setPaused]=useState(false),[manual,setManual]=useState(false),[failed,setFailed]=useState(false);
  const motion=useCalmMotion();
  const eligible=!/^\/(admin|organizer|reels|account|book|cart|checkout|pay|receipt|tickets|verify|t|tour-stops|portfolio|proof|experience|author)(\/|$)/.test(path)&&!/^\/gallery\/.+/.test(path);
  useEffect(()=>{
    if(!eligible)return;
    try{if(localStorage.getItem(seenKey))return}catch{}
    let engaged=false,shown=false,lastActivity=Date.now();const started=Date.now();
    const consider=()=>{
      if(shown||!engaged||Date.now()-started<12000||Date.now()-lastActivity<2500||document.fullscreenElement||document.hidden||Math.min(screen.width,innerWidth)<300)return;
      if(document.querySelector('dialog[open],.menu-panel.is-open,.lightbox,.film-viewer,.modal-backdrop')||document.activeElement?.closest('form')||document.activeElement?.matches('input,textarea,select'))return;
      shown=true;try{localStorage.setItem(seenKey,'shown')}catch{}setOpen(true);
    };
    const activity=()=>{lastActivity=Date.now()};window.addEventListener('pointerdown',activity,{passive:true});window.addEventListener('pointermove',activity,{passive:true});window.addEventListener('keydown',activity);
    const formInteraction=(e:Event)=>{if((e.target as HTMLElement)?.closest('form'))engaged=false};
    document.addEventListener('focusin',formInteraction);document.addEventListener('input',formInteraction);
    const scroll=()=>{activity();if(scrollY>Math.min(400,innerHeight*.35))engaged=true;consider()};
    const timer=setInterval(consider,1000);window.addEventListener('scroll',scroll,{passive:true});
    return()=>{clearInterval(timer);window.removeEventListener('scroll',scroll);document.removeEventListener('focusin',formInteraction);document.removeEventListener('input',formInteraction);window.removeEventListener('pointerdown',activity);window.removeEventListener('pointermove',activity);window.removeEventListener('keydown',activity)};
  },[eligible,path]);
  useEffect(()=>{
    if(!open||!dialog.current)return;
    const previous=document.activeElement as HTMLElement|null,before=document.body.style.overflow;
    dialog.current.showModal();document.body.style.overflow='hidden';
    return()=>{dialog.current?.close();document.body.style.overflow=before;previous?.focus()};
  },[open]);
  useEffect(()=>{if(open&&(motion||manual)&&!paused)player.current?.play().catch(()=>{});else player.current?.pause()},[open,motion,manual,paused]);
  useEffect(()=>{const hide=()=>{if(document.hidden)player.current?.pause();else if(open&&(motion||manual)&&!paused)player.current?.play().catch(()=>{})};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide)},[open,motion,manual,paused]);
  if(!eligible)return null;
  return <dialog ref={dialog} className="booking-invitation" aria-labelledby="invitation-title" onCancel={()=>setOpen(false)} onClick={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
    {open&&<><button type="button" className="invitation-close" autoFocus aria-label="Close booking invitation" onClick={()=>setOpen(false)}>Close <span aria-hidden="true">×</span></button>
    <div className="invitation-film"><video ref={player} src="/media-library/hosts-booking-loop-v1.mp4" poster="/media-library/hosts-booking-poster-v1.webp" muted playsInline loop preload="metadata" onError={()=>setFailed(true)} aria-label="Eugine Micah and Lucy Ogunde together"/>{!failed&&<button type="button" onClick={()=>{setManual(true);setPaused(paused||!motion&&!manual?false:true)}}>{(motion||manual)&&!paused?'Pause video':'Play video'}</button>}</div>
    <div className="invitation-copy"><p className="eyebrow">Your audience. Our hosts.</p><h2 id="invitation-title">Bring Eugine & Lucy to your next event.</h2><p>School celebration, campus stage or live event. Tell us what you’re planning and we’ll discuss the programme, availability and quote.</p>
    <a className="button" href="/book?type=school">Plan a school event <span aria-hidden="true">↗</span></a><a className="invitation-secondary" href="/book?type=public">Planning a campus or another event?</a><small>Send a brief. Agree the quote. Then confirm your date.</small><button className="invitation-dismiss" type="button" onClick={()=>setOpen(false)}>Keep exploring</button></div></>}
  </dialog>;
}
