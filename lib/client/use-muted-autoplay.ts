'use client';
import {useEffect,useRef,useState,type RefObject} from 'react';
/** Only visible media autoplays. Explicit pause, reduced motion, focus mode,
 * data saving, hidden tabs and modal overlays take priority. Never forces sound.
 */
export function useMutedAutoplay(ref:RefObject<HTMLVideoElement|null>,id:string,enabled=true){
 const [visible,setVisible]=useState(false),[blocked,setBlocked]=useState(false);
 const eligible=useRef(false),userPaused=useRef(false),retry=useRef(()=>{});
 useEffect(()=>{
  const video=ref.current;if(!video)return;
  let inView=false;const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const sync=()=>{
   let focus=false;try{focus=JSON.parse(localStorage.getItem('ugt-new-preview-v1focusView')||'false')}catch{}
   eligible.current=enabled&&inView&&!document.hidden&&!document.documentElement.dataset.pageLeaving&&!document.querySelector('dialog[open],.film-viewer,.lightbox')&&!reduced.matches&&!focus&&!(navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData;
   if(eligible.current&&!userPaused.current&&video.getAttribute('src'))video.play().then(()=>setBlocked(false)).catch(()=>setBlocked(true));else if(!eligible.current)video.pause();
  };
  retry.current=sync;
  const observer=new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;setVisible(inView);sync()},{threshold:.2});observer.observe(video);
  const stopOthers=(event:Event)=>{if((event as CustomEvent).detail!==id){userPaused.current=true;video.pause()}};
  const onPause=()=>{if(eligible.current&&!video.ended)userPaused.current=true};
  const onPlay=()=>{userPaused.current=false;setBlocked(false)};
  const sound=()=>{if(!video.muted&&video.volume>0)dispatchEvent(new CustomEvent('ugt-media-play',{detail:id}))};
  video.addEventListener('pause',onPause);video.addEventListener('play',onPlay);video.addEventListener('volumechange',sound);
  const events=['ugt-focus-view','ugt-page-leaving','ugt-motion-resume','ugt-overlay-change'];
  for(const name of events)window.addEventListener(name,sync);
  window.addEventListener('ugt-media-play',stopOthers);document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
  return()=>{eligible.current=false;observer.disconnect();video.pause();retry.current=()=>{};video.removeEventListener('pause',onPause);video.removeEventListener('play',onPlay);video.removeEventListener('volumechange',sound);for(const name of events)window.removeEventListener(name,sync);window.removeEventListener('ugt-media-play',stopOthers);document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync)};
 },[ref,id,enabled]);
 return {visible,blocked,retry:()=>retry.current()};
}
