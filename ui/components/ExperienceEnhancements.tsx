'use client';
import {marketingMessages} from '@/ui/i18n/catalogues/marketing';
import {useMessages} from '@/ui/i18n/LanguageProvider';

import {useEffect,useRef,useState} from 'react';
import {MediaImage} from './MediaLibrary';
import {CONSENT_EVENT,hasOptionalConsent} from '@/lib/client/consent';
export {HeroMotion} from './HeroMotion';
export function YouTubeFeature(){const t=useMessages(marketingMessages);
 const [play,setPlay]=useState(false),frame=useRef<HTMLDivElement>(null),player=useRef<HTMLIFrameElement>(null);
 useEffect(()=>{
  let visible=false;const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const pause=()=>player.current?.contentWindow?.postMessage(JSON.stringify({event:'command',func:'pauseVideo',args:[]}),'https://www.youtube-nocookie.com');
  const sync=()=>{let focus=false;try{focus=JSON.parse(localStorage.getItem('ugt-new-preview-v1focusView')||'false')}catch{}
   if(visible&&!document.hidden&&!reduced.matches&&!focus&&!(navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData&&!document.querySelector('dialog[open]')&&hasOptionalConsent())setPlay(true);
   else pause();
  };
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync()},{threshold:.2});if(frame.current)observer.observe(frame.current);
  const events=[CONSENT_EVENT,'ugt-focus-view','ugt-overlay-change'];for(const name of events)window.addEventListener(name,sync);document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
  return()=>{observer.disconnect();pause();for(const name of events)window.removeEventListener(name,sync);document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync)};
 },[]);
 return <div className="youtube-feature"><div ref={frame} className="youtube-panel">{play?<iframe ref={player} src="https://www.youtube-nocookie.com/embed/P7a9iFNE33g?autoplay=1&mute=1&playsinline=1&rel=0&enablejsapi=1" title={t('youtube.title')} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen/>:<button onClick={()=>{window.dispatchEvent(new CustomEvent('ugt-media-play',{detail:'youtube'}));setPlay(true)}} aria-label={t('youtube.load')}><MediaImage id="M083"/><span>{t('youtube.play')}<span aria-hidden="true">▶</span></span></button>}</div><p>{t('youtube.disclosure')}</p><a className="text-link" href="https://www.youtube.com/watch?v=P7a9iFNE33g" target="_blank" rel="noopener noreferrer">{t('youtube.watch')}</a></div>;
}
export {default as AffiliatePreview} from './AffiliateProgramme';
