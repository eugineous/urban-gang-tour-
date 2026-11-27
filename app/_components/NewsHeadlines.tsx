'use client';

import {useEffect, useId, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {defineCatalogue} from '@/lib/i18n/messages';
import {newestPublishedFirst} from '@/lib/shared/newsroom-chronology';
import {publicationDate} from '@/lib/shared/publication-date';
import DocumentLink from '@/ui/components/DocumentLink';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import type {NewsCard} from './NewsCards';
import {automaticPopupWasShown,markAutomaticPopupShown} from '@/lib/client/automatic-popup';
import styles from './UrbanNews.module.css';

const refreshInterval = 5 * 60_000;
const breakingWindow = 6 * 60 * 60_000;

const labels = defineCatalogue({
  en: {headlines: 'Headlines', breaking: 'Breaking news'},
  sw: {headlines: 'Vichwa vya habari', breaking: 'Habari zinazochipuka'},
  fr: {headlines: 'À la une', breaking: 'Dernière minute'},
  'zh-Hans': {headlines: '新闻头条', breaking: '突发新闻'},
  ru: {headlines: 'Главные новости', breaking: 'Срочные новости'},
  es: {headlines: 'Titulares', breaking: 'Última hora'},
});

/** A tab returning after a long absence needs one refresh, regardless of missed intervals. */
export function watchNewsRefresh(refresh: () => void) {
  let due = Date.now() + refreshInterval;
  let timer: number | undefined;
  function schedule() {
    window.clearTimeout(timer);
    if (document.visibilityState !== 'visible') return;
    const now = Date.now();
    if (now >= due) {
      due = now + refreshInterval;
      refresh();
    }
    timer = window.setTimeout(schedule, due - now);
  }
  document.addEventListener('visibilitychange', schedule);
  schedule();
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', schedule);
  };
}

export default function NewsHeadlines({posts, now, alerts=false}: {posts: (NewsCard & {href?:string})[]; now?: number;alerts?:boolean}) {
  const router = useRouter();
  const strip = useRef<HTMLUListElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [paused,setPaused]=useState(false);
  const heading = useId(), dialogTitle=useId();
  const t = useMessages(labels);
  const sorted = newestPublishedFirst(posts);
  const breaking = sorted.filter(post => {
    if (now === undefined || post.newsVerification!=='confirmed' || !/^breaking(?: news)?\s*:/i.test(post.headline)) return false;
    const timestamp = publicationDate(post.datePublished)?.dateTime;
    if (!timestamp || timestamp.length === 10) return false;
    const age = now - Date.parse(timestamp);
    return age >= 0 && age < breakingWindow;
  });
  const news = breaking[0];
  const breakingId=news?.slug;
  const href=(post:NewsCard&{href?:string})=>post.href||'/blog/'+encodeURIComponent(post.slug);
  useEffect(() => watchNewsRefresh(() => router.refresh()), [router]);
  useEffect(()=>{
    if(!breakingId||paused)return;
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    let rest=0;
    const timer=window.setInterval(()=>{
      const element=strip.current;
      if(!element||document.hidden||motion.matches||element.matches(':hover, :focus-within')||dialog.current?.open)return;
      const end=element.scrollWidth-element.clientWidth;
      if(end<4)return;
      if(element.scrollLeft>=end-2){
        if(++rest>24){element.scrollLeft=0;rest=0;}
      }else element.scrollLeft+=2;
    },60);
    return ()=>window.clearInterval(timer);
  },[breakingId,paused]);
  useEffect(()=>{
    if(!alerts||!breakingId)return;
    const timer=window.setTimeout(()=>{
      const popup=dialog.current;
      const consent=document.querySelector('[data-privacy-preferences]');
      if(!popup||popup.open||document.hidden||automaticPopupWasShown()||
        document.querySelector('dialog[open]')||consent?.getClientRects().length)return;
      popup.showModal();
      markAutomaticPopupShown();
    },7000);
    return ()=>window.clearTimeout(timer);
  },[alerts,breakingId]);
  if (!sorted.length) return null;
  const headlines=(breaking.length?breaking:sorted).slice(0,5);

  return <nav className={styles.headlines} data-breaking={!!news||undefined} aria-labelledby={heading}>
    <h2 id={heading}>{t(news?'breaking':'headlines')}</h2>
    <ul ref={strip} onPointerDown={()=>{if(news)setPaused(true);}}>{headlines.map(post=><li key={post.slug}>
      <DocumentLink href={href(post)} lang="en-KE">{post.headline}</DocumentLink>
    </li>)}</ul>
    {news&&<div className={styles.headlineControls}>
      <button type="button" aria-pressed={paused} onClick={()=>setPaused(value=>!value)}>{paused?'Resume':'Pause'}</button>
      {alerts&&<button type="button" ref={trigger} onClick={()=>{if(!dialog.current?.open)dialog.current?.showModal();}}>Alert</button>}
    </div>}
    {news&&alerts&&<dialog ref={dialog} className={styles.newsAlert} aria-labelledby={dialogTitle} onClose={()=>trigger.current?.focus()}>
      <p>{t('breaking')}</p><h2 id={dialogTitle}>{news.headline.replace(/^breaking(?: news)?\s*:\s*/i,'')}</h2>
      <p>{news.description}</p>
      <div><DocumentLink href={href(news)}>Read the story</DocumentLink>
        <form method="dialog"><button type="submit" autoFocus>Close</button></form></div>
    </dialog>}
  </nav>;
}
