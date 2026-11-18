'use client';
import {useEffect,useState} from 'react';
import {DEFAULT_NEWS_PREFERENCES,NEWS_MARKETS,newsMarketName,type NewsMarketCode} from '@/lib/shared/news-preferences';
import {rankPublicNews,type RankableNews} from '@/lib/shared/news-ranking';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {readingMessages} from '@/ui/i18n/catalogues/reading';
import styles from '@/ui/components/NewsPreferences.module.css';

export default function NewsMarketPreview(){
 const t=useMessages(readingMessages),[market,setMarket]=useState<NewsMarketCode>('KE'),[rows,setRows]=useState<RankableNews[]>([]),[now,setNow]=useState(0),[ready,setReady]=useState(false),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);void(async()=>{try{const response=await fetch('/api/site-data/posts',{cache:'no-store',signal:controller.signal}),data=await response.json();if(!response.ok||data.ok!==true||!Array.isArray(data.posts))throw Error();if(!active||controller.signal.aborted)return;setRows(data.posts.filter((p:unknown)=>p&&typeof p==='object'&&typeof(p as {id?:unknown}).id==='string'&&typeof(p as {headline?:unknown}).headline==='string').slice(0,200));const timestamp=Date.parse(response.headers.get('Date')||'');setNow(Number.isFinite(timestamp)?timestamp:Date.now());setReady(true)}catch{if(active)setFailed(true)}finally{clearTimeout(timer)}})();return()=>{active=false;clearTimeout(timer);controller.abort()}},[attempt]);
 const ranked=rankPublicNews(rows,{...DEFAULT_NEWS_PREFERENCES,homeMarket:market},now).slice(0,5);
 const matching=ranked.some(row=>row.item.newsCountry===market);
 return <section className={`${styles.panel} ${styles.preview}`} aria-labelledby="news-market-preview-heading"><h2 id="news-market-preview-heading">{t('preview')}</h2><p>{t('previewHelp')}</p><label>{t('preview')}<select aria-label={t('preview')} value={market} onChange={e=>setMarket(e.target.value as NewsMarketCode)}>{NEWS_MARKETS.map(m=><option key={m.code} value={m.code}>{newsMarketName(m.code)}</option>)}</select></label>
  {!ready?<div><p role="status">{failed?t('previewUnavailable'):t('busy')}</p>{failed&&<button type="button" onClick={()=>{setFailed(false);setAttempt(value=>value+1)}}>{t('previewRetry')}</button>}</div>:<>{!matching&&<p role="status">{t('emptyCoverage')}</p>}<ol>{ranked.map(({item})=><li key={item.slug||item.id}><a href={'/blog/'+encodeURIComponent(item.slug||item.id!)}>{item.headline}</a></li>)}</ol><a href={'/blog?country='+encodeURIComponent(market)}>{t('latest')} ↗</a></>}
 </section>;
}
