'use client';
import {useEffect,useRef,useState} from 'react';
import {Play,Pause,ArrowUpRight} from '@phosphor-icons/react';
import {useMutedAutoplay} from '@/lib/client/use-muted-autoplay';
import {useAmbientMotion} from '@/lib/client/use-ambient-motion';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {ambientMessages} from '@/ui/i18n/catalogues/ambient';
import {useMediaCaptions,VideoCaptionTrack,VideoTranscript} from './MediaCaptions';
import styles from './MobileAppHero.module.css';
type Labels={title:string;play:string;failed:string;retry:string;videos:string;book:string;advertise:string};
const clips=[{id:'M034',file:'9097bd98571de3de',title:'KIPS campus moments'},{id:'M065',file:'23a3033b91312989',title:'Machakos campus live'},{id:'M035',file:'1850c29991176a4e',title:'KIPS live hosting'}];
function Film({clip,copy,running,paused,onManualPlay,labels}:{clip:typeof clips[number];copy:number;running:boolean;paused:boolean;onManualPlay:()=>void;labels:Labels}){
 const video=useRef<HTMLVideoElement>(null),[warm,setWarm]=useState(false),[manual,setManual]=useState(false),[failed,setFailed]=useState(false);
 const {visible,blocked,retry}=useMutedAutoplay(video,'mobile-reel-'+clip.id+'-'+copy,running);
 const captions=useMediaCaptions(clip.id,warm);
 useEffect(()=>{if(!visible||!running)return;const frame=requestAnimationFrame(()=>setWarm(true));return()=>cancelAnimationFrame(frame)},[visible,running]);
 useEffect(()=>{if(warm&&running)retry()},[warm,running,retry]);
 useEffect(()=>{if(paused)video.current?.pause();else if(manual)void video.current?.play().catch(()=>setFailed(true))},[manual,paused]);
 function play(){setFailed(false);onManualPlay();setWarm(true);setManual(true);if(warm){video.current?.load();void video.current?.play().catch(()=>setFailed(true))}}
 return <div className={styles.reelFilm} data-reel-film>
  <video ref={video} src={warm?'/media-library/'+clip.file+'.mp4':undefined} poster={visible?'/media-library/'+clip.file+'-poster.webp':undefined} muted loop playsInline controls={manual&&!copy} preload="none" aria-label={copy?undefined:clip.title+' — Urban Gang Tour'} onError={()=>setFailed(true)}><VideoCaptionTrack captions={captions}/></video>
  {!copy&&((!running&&!manual)||blocked||failed)&&<button type="button" className={styles.videoPlay} onClick={play}><Play size={20} weight="fill" aria-hidden="true"/>{failed?labels.retry:labels.play}</button>}
  {!copy&&failed&&<p role="status" className={styles.filmError}>{labels.failed}</p>}
  {!copy&&<VideoTranscript captions={captions}/>}
 </div>;
}
export function MobileBookingVideo({labels}:{labels:Labels}){
 const root=useRef<HTMLElement>(null),allowed=useAmbientMotion(root),[paused,setPaused]=useState(false),motion=useMessages(ambientMessages),running=allowed&&!paused;
 return <section ref={root} className={styles.video} data-mobile-booking-video data-home-reveal aria-labelledby="mobile-booking-video-title">
  <div className={styles.videoHeading}><h2 id="mobile-booking-video-title">{labels.title}</h2><button type="button" onClick={()=>setPaused(value=>!value)} aria-label={motion(paused?'resumeVideos':'pauseVideos')} aria-pressed={paused}>{paused?<Play size={20} aria-hidden="true"/>:<Pause size={20} aria-hidden="true"/>}</button></div>
  <div className={styles.reelWindow} data-reel-window data-running={running}><div className={styles.reelTrack} data-reel-track data-running={running}>
   {[0,1].map(copy=><div key={copy} className={styles.reelGroup} data-reel-group aria-hidden={copy?true:undefined} inert={copy?true:undefined}>{clips.map(clip=><Film key={clip.id} clip={clip} copy={copy} running={running} paused={paused} onManualPlay={()=>setPaused(false)} labels={labels}/>)}</div>)}
  </div></div>
  <nav className={styles.videoLinks}><a href="/gallery">{labels.videos}<ArrowUpRight size={16} aria-hidden="true"/></a><a href="/ticketing">{labels.advertise}<ArrowUpRight size={16} aria-hidden="true"/></a></nav>
 </section>;
}
