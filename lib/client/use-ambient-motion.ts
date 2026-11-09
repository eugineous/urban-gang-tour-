'use client';
import {useEffect,useState,type RefObject} from 'react';
/** Ambient motion never outranks accessibility, visibility or data preferences. */
export function useAmbientMotion(ref:RefObject<HTMLElement|null>){
 const [allowed,setAllowed]=useState(false);
 useEffect(()=>{
  const element=ref.current;if(!element||typeof IntersectionObserver==='undefined')return;
  let visible=false;const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const sync=()=>{let focus=false;try{focus=JSON.parse(localStorage.getItem('ugt-new-preview-v1focusView')||'false')}catch{}
   setAllowed(visible&&!document.hidden&&!reduced.matches&&!focus&&!document.documentElement.dataset.pageLeaving&&!document.querySelector('dialog[open],.film-viewer,.lightbox')&&!(navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData);
  };
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync()},{threshold:.15});observer.observe(element);
  const events=['ugt-focus-view','ugt-page-leaving','ugt-motion-resume','ugt-overlay-change'];
  events.forEach(name=>window.addEventListener(name,sync));document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
  return()=>{observer.disconnect();events.forEach(name=>window.removeEventListener(name,sync));document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync)};
 },[ref]);return allowed;
}
