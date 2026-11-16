'use client';
import {useState} from 'react';
import type {PublicGalleryPhoto} from '@/lib/server/published-gallery';
import {youtubeVideoId} from '@/lib/managed-video';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {managedMediaMessages} from '@/ui/i18n/catalogues/managed-media';
import styles from './ManagedFilms.module.css';
export default function ManagedFilms({films}:{films:PublicGalleryPhoto[]}){
 const t=useMessages(managedMediaMessages),[active,setActive]=useState<string|null>(null),[limit,setLimit]=useState(12);
 return <section className="wrap section" aria-labelledby="published-films-title"><h2 id="published-films-title">{t('title')}</h2><div className={styles.grid}>{films.slice(0,limit).map(film=>{
  const id=film.mediaType==='youtube'?youtubeVideoId(film.url):null;
  return <figure key={film.id} className={styles.film}>{id?active===id?<iframe src={'https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1'} title={film.caption||t('play')} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<button type="button" className={styles.load} onClick={()=>setActive(id)}><span aria-hidden="true">▷</span>{t('play')}<small>{t('youtube')}</small></button>:<video src={film.url} controls preload="none" playsInline aria-label={film.altText||film.caption||t('play')}/>}<figcaption lang="en-KE">{film.caption||film.category}</figcaption><a href={film.url} target="_blank" rel="noopener noreferrer">{t('open')}</a></figure>;
 })}</div>{limit<films.length&&<button className="button secondary" type="button" onClick={()=>setLimit(value=>value+12)}>{t('more')}</button>}</section>;
}
