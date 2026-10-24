'use client';
import {useEffect,useRef,useState} from 'react';

export function HeroMotion(){
 const video=useRef<HTMLVideoElement>(null);
 const [src,setSrc]=useState<string>();
 const [playing,setPlaying]=useState(false),[visible,setVisible]=useState(false);
 const [failed,setFailed]=useState(false),[manual,setManual]=useState(false);
 const wanted=useRef(false),inView=useRef(true);
 const variant=useRef('/media-library/hero-mobile-v2.mp4');
 useEffect(()=>{
  const connection=(navigator as Navigator&{connection?:{saveData?:boolean;effectiveType?:string;downlink?:number}}).connection;
  const slow=connection?.saveData||['slow-2g','2g','3g'].includes(connection?.effectiveType||'')||(connection?.downlink!==undefined&&connection.downlink<1.5);
  variant.current=`/media-library/hero-${slow?'lite':innerWidth<900?'mobile':'desktop'}-v2.mp4`;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let focus=false;try{focus=JSON.parse(localStorage.getItem('ugt-new-preview-v1focusView')||'false')}catch{}
  if(!focus&&!reduced.matches&&!connection?.saveData){wanted.current=true;setSrc(variant.current)}
  const stop=()=>{wanted.current=false;video.current?.pause();setPlaying(false);setManual(false)};
  const resume=()=>{if(wanted.current&&inView.current&&!document.hidden)video.current?.play().catch(()=>setPlaying(false))};
  const focusChanged=(event:Event)=>{if((event as CustomEvent).detail)stop()};
  const motionChanged=()=>{if(reduced.matches)stop()};
  const visibility=()=>{if(document.hidden){video.current?.pause();setPlaying(false)}else resume()};
  const observer=new IntersectionObserver(([entry])=>{inView.current=entry.isIntersecting;if(!entry.isIntersecting){video.current?.pause();setPlaying(false)}else resume()},{threshold:.05});
  if(video.current)observer.observe(video.current);
  window.addEventListener('ugt-media-play',stop);
  window.addEventListener('ugt-focus-view',focusChanged);
  document.addEventListener('visibilitychange',visibility);
  reduced.addEventListener('change',motionChanged);
  return()=>{observer.disconnect();window.removeEventListener('ugt-media-play',stop);window.removeEventListener('ugt-focus-view',focusChanged);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',motionChanged)};
 },[]);
 const toggle=()=>{
  if(playing){wanted.current=false;video.current?.pause();return}
  wanted.current=true;setManual(true);setFailed(false);
  if(!src){setSrc(variant.current);return}
  if(failed)video.current?.load();
  video.current?.play().catch(()=>{setFailed(true);setPlaying(false)});
 };
 return <><video ref={video} className={`hero-video ${visible?'is-playing':''}`} style={manual?{visibility:'visible'}:undefined} src={src} muted playsInline loop autoPlay preload="auto" onPlaying={()=>{if(!wanted.current){video.current?.pause();return}setVisible(true);setPlaying(true);setFailed(false)}} onPause={()=>setPlaying(false)} onError={()=>{setFailed(true);setVisible(false);setPlaying(false)}}/><button className="video-control" onClick={toggle} aria-label={playing?'Pause background video':'Play background video'}>{playing?'Pause video':failed?'Retry video':'Play video'}</button>{failed&&<p className="hero-video-error" role="status">Video unavailable. You can still explore and book below.</p>}</>;
}
