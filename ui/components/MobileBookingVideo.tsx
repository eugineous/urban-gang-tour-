'use client';
import {useEffect,useRef,useState} from 'react';
import {Play,ArrowUpRight} from '@phosphor-icons/react';
import {useMediaCaptions,VideoCaptionTrack,VideoTranscript} from './MediaCaptions';
import styles from './MobileAppHero.module.css';
type Labels={title:string;play:string;failed:string;retry:string;videos:string;book:string;advertise:string};
export function MobileBookingVideo({labels}:{labels:Labels}){
 const root=useRef<HTMLElement>(null),video=useRef<HTMLVideoElement>(null);
 const [visible,setVisible]=useState(false),[started,setStarted]=useState(false),[failed,setFailed]=useState(false);
 const captions=useMediaCaptions('M034',started);
 useEffect(()=>{const element=root.current;if(!element||typeof IntersectionObserver==='undefined')return;const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){setVisible(true);observer.disconnect()}},{rootMargin:'100px'});observer.observe(element);return()=>observer.disconnect()},[]);
 useEffect(()=>{if(started)void video.current?.play().catch(()=>setFailed(true))},[started]);
 function play(){setFailed(false);if(started){video.current?.load();void video.current?.play().catch(()=>setFailed(true))}else setStarted(true)}
 return <section ref={root} className={styles.video} data-mobile-booking-video data-home-reveal aria-labelledby="mobile-booking-video-title">
  <div className={styles.videoHeading}><h2 id="mobile-booking-video-title">{labels.title}</h2><a href="/book">{labels.book}<ArrowUpRight size={18} aria-hidden="true"/></a></div>
  <div className={styles.videoFrame}>
   <video ref={video} src={started?'/media-library/9097bd98571de3de.mp4':undefined} poster={visible?'/media-library/9097bd98571de3de-poster.webp':undefined} controls={started} muted playsInline preload="none" aria-label="KIPS campus moments — Urban Gang Tour" onError={()=>setFailed(true)} onPlay={()=>dispatchEvent(new CustomEvent('ugt-media-play',{detail:'mobile-booking-film'}))}><VideoCaptionTrack captions={captions}/></video>
   {(!started||failed)&&<button type="button" className={styles.videoPlay} onClick={play}><Play size={22} weight="fill" aria-hidden="true"/>{failed?labels.retry:labels.play}</button>}
  </div>
  {failed&&<p role="status">{labels.failed}</p>}<VideoTranscript captions={captions}/>
  <nav className={styles.videoLinks}><a href="/gallery">{labels.videos}<ArrowUpRight size={16} aria-hidden="true"/></a><a href="/ticketing">{labels.advertise}<ArrowUpRight size={16} aria-hidden="true"/></a></nav>
 </section>;
}
