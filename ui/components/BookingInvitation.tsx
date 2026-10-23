"use client";
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {hasConsentChoice} from '@/lib/client/consent';
import {automaticPopupWasShown,markAutomaticPopupShown} from '@/lib/client/automatic-popup';
import {openCampaignDialog} from '@/lib/client/campaign-dialog';
import {INVITATION_DISMISSED_KEY,invitationAllowedOn,invitationCanOpen,invitationWasDismissed} from '@/lib/client/booking-invitation';
import styles from './BookingInvitation.module.css';

export function BookingInvitation({paused=false}:{paused?:boolean}){
 const path=usePathname(),dialog=useRef<HTMLDialogElement>(null),player=useRef<HTMLVideoElement>(null),ownedAuto=useRef(false);
 const [open,setOpen]=useState(false),[videoPaused,setVideoPaused]=useState(false),[manualVideo,setManualVideo]=useState(false),[failed,setFailed]=useState(false),[autoplay,setAutoplay]=useState(false);
 const eligible=invitationAllowedOn(path);
 function dismiss(){
  try{localStorage.setItem(INVITATION_DISMISSED_KEY,String(Date.now()))}catch{}
  setOpen(false);
 }
 useEffect(()=>{
  if(!eligible||paused)return;
  let engaged=false,lastActivity=Date.now(),requested=false;
  const started=Date.now();
  const consider=()=>{
   if(requested||!engaged||Date.now()-started<12000||Date.now()-lastActivity<2500||automaticPopupWasShown())return;
   const safe=invitationCanOpen({eligible,privacyReady:hasConsentChoice()&&!document.querySelector('aside[aria-label="Privacy preferences"]'),hidden:document.hidden,editing:!!document.activeElement?.closest('form,input,textarea,select,[contenteditable=true]'),otherOverlay:!!document.querySelector('dialog[open],.lightbox,.film-viewer,.modal-backdrop'),fullscreen:!!document.fullscreenElement,focusView:document.documentElement.dataset.focusView==='true',width:innerWidth});
   if(!safe)return;
   try{if(invitationWasDismissed(localStorage.getItem(INVITATION_DISMISSED_KEY),Date.now()))return}catch{}
   requested=true;setOpen(true);
  };
  const activity=()=>{lastActivity=Date.now()};
  const scroll=()=>{activity();if(scrollY>Math.min(400,innerHeight*.35))engaged=true};
  const timer=setInterval(consider,500);
  window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('pointerdown',activity,{passive:true});window.addEventListener('keydown',activity);
  return()=>{clearInterval(timer);window.removeEventListener('scroll',scroll);window.removeEventListener('pointerdown',activity);window.removeEventListener('keydown',activity)};
 },[eligible,path,paused]);
 useEffect(()=>{
  if(!open||paused||!dialog.current)return;
  if(!ownedAuto.current&&automaticPopupWasShown()){setOpen(false);return}
  const close=openCampaignDialog(dialog.current);
  if(!close){setOpen(false);return}
  ownedAuto.current=true;markAutomaticPopupShown();
  return close;
 },[open,paused]);
 useEffect(()=>{if(paused)setOpen(false)},[paused]);
 useEffect(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const sync=()=>setAutoplay(!reduced.matches&&document.documentElement.dataset.focusView!=='true'&&!(navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData);
  sync();reduced.addEventListener('change',sync);window.addEventListener('ugt-focus-view',sync);
  return()=>{reduced.removeEventListener('change',sync);window.removeEventListener('ugt-focus-view',sync)};
 },[]);
 useEffect(()=>{
  const sync=()=>{if(open&&!paused&&!document.hidden&&!videoPaused&&!failed&&(autoplay||manualVideo))player.current?.play().catch(()=>{});else player.current?.pause()};
  sync();document.addEventListener('visibilitychange',sync);return()=>document.removeEventListener('visibilitychange',sync);
 },[open,paused,autoplay,manualVideo,videoPaused,failed]);
 if(!eligible)return null;
 return <dialog ref={dialog} className={styles.dialog} data-host-invitation aria-labelledby="invitation-title" onCancel={event=>{event.preventDefault();dismiss()}} onClick={event=>{if(event.target!==event.currentTarget)return;const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dismiss()}}>
  {open&&!paused&&<><header className={styles.heading}><span>Meet the hosts</span><button type="button" autoFocus aria-label="Close booking invitation" onClick={dismiss}>Close <span aria-hidden="true">×</span></button></header>
  <div className={styles.film}><video ref={player} width={768} height={216} src="/media-library/hosts-booking-loop-v1.mp4" poster="/media-library/hosts-booking-poster-v1.webp" muted playsInline loop preload="metadata" onError={()=>setFailed(true)} aria-label="Eugine Micah and Lucy Ogunde together"/>{!failed&&<button type="button" onClick={()=>{setManualVideo(true);setVideoPaused(videoPaused||!autoplay&&!manualVideo?false:true)}}>{(autoplay||manualVideo)&&!videoPaused?'Pause video':'Play video'}</button>}</div>
  <div className={styles.copy}><p className={styles.eyebrow}>Live event hosting</p><h2 id="invitation-title">Book Eugine<br/>& Lucy.</h2><p>Book live hosting for a school, campus or public event.</p>
  <a className={styles.primary} href="/book">Book Urban Gang Tour <span aria-hidden="true">↗</span></a><a className={styles.secondary} href="/about">Meet Eugine & Lucy</a><small>Your programme, quote and date are agreed before confirmation.</small><button className={styles.dismiss} type="button" onClick={dismiss}>Not now</button></div></>}
 </dialog>;
}
