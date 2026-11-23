'use client';
import {useEffect,useRef,useState} from 'react';
import {useNewsPreferences} from '@/lib/client/use-news-preferences';
import {DEFAULT_NEWS_PREFERENCES,NEWS_MARKETS,newsMarketName,parseNewsPreferences,type NewsPreferences as Preferences,type NewsMarketCode} from '@/lib/shared/news-preferences';
import {NEWS_CATEGORIES,type NewsCategory} from '@/lib/shared/urban-news';
import {INTERFACE_LOCALES,NATIVE_NAMES,type InterfaceLocale} from '@/lib/i18n/locale';
import {useInterfaceLanguage,useMessages} from '@/ui/i18n/LanguageProvider';
import {readingMessages} from '@/ui/i18n/catalogues/reading';
import {newsMessages} from '@/ui/i18n/catalogues/news';
import styles from './NewsPreferences.module.css';

export default function NewsPreferences(){
 const store=useNewsPreferences(),{preferredLocale,locale,setLocale}=useInterfaceLanguage(),t=useMessages(readingMessages),news=useMessages(newsMessages);
 const [draft,setDraft]=useState<Preferences>({...store.preferences,language:preferredLocale}),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[version,setVersion]=useState<number|null>(null),[accountContext,setAccountContext]=useState<string|null>(null),[message,setMessage]=useState<keyof typeof readingMessages.en|null>(null),[error,setError]=useState<keyof typeof readingMessages.en|null>(null),[signedOut,setSignedOut]=useState(false);
 const request=useRef<AbortController|null>(null),lock=useRef(false),mounted=useRef(false);
 useEffect(()=>{if(!dirty)setDraft({...store.preferences,language:preferredLocale})},[store.preferences,preferredLocale,dirty]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;request.current?.abort()}},[]);
 function change<K extends keyof Preferences>(key:K,value:Preferences[K]){setDraft(old=>({...old,[key]:value}));setDirty(true);setMessage(null);setError(null)}
 function device(value=draft){const result=store.save(value);setLocale(value.language);setDirty(false);setError(null);setMessage(result.persistence==='available'?'deviceSaved':'sessionOnly');return result}
 function reset(){const value={...DEFAULT_NEWS_PREFERENCES,language:preferredLocale};setDraft(value);device(value)}
 async function sync(save=false){
  if(lock.current||save&&(version===null||!accountContext))return;lock.current=true;setBusy(true);setError(null);setMessage(null);
  request.current?.abort();const controller=new AbortController();request.current=controller;const timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch('/api/account/news-preferences',{method:save?'PUT':'GET',credentials:'same-origin',cache:'no-store',signal:controller.signal,...(save?{headers:{'Content-Type':'application/json','If-Match':accountContext!},body:JSON.stringify({expectedVersion:version,preferences:draft})}:{})});
   const body=await response.json();
   if(controller.signal.aborted||!mounted.current)return;
   if(response.status===401){setVersion(null);setAccountContext(null);setSignedOut(true);setError('signIn');return}
   if(response.status===409){setVersion(null);setAccountContext(null);setError(body.error==='news_preferences_account_changed'?'accountChanged':'changed');return}
   const preferences=parseNewsPreferences(body.preferences),context=response.headers.get('ETag');
   if(!response.ok||!preferences||!Number.isSafeInteger(body.version)||body.version<0||!context||context.length>128)throw Error('unavailable');
   setVersion(body.version);setAccountContext(context);setSignedOut(false);
   if(save){const saved=device(preferences);setMessage(saved.persistence==='available'?'accountSaved':'accountSessionSaved')}
   else{setDraft(preferences);setDirty(true);setMessage('accountLoaded')}
  }catch{if(mounted.current&&request.current===controller)setError('unavailable')}
  finally{clearTimeout(timer);if(request.current===controller){request.current=null;lock.current=false;if(mounted.current)setBusy(false)}}
 }
 return <section className={styles.panel} aria-labelledby="reading-choice-heading">
  <h2 id="reading-choice-heading">{t('title')}</h2><p>{t('description')}</p>
  <fieldset disabled={busy}><legend>{t('edition')}</legend><label>{t('homeMarket')}<select aria-label={t('homeMarket')} value={draft.homeMarket} onChange={e=>change('homeMarket',e.target.value as NewsMarketCode)}>{NEWS_MARKETS.map(m=><option key={m.code} value={m.code}>{newsMarketName(m.code,locale)}</option>)}</select></label>
  <label>{t('interfaceLanguage')}<select aria-label={t('interfaceLanguage')} value={draft.language} onChange={e=>change('language',e.target.value as InterfaceLocale)}>{INTERFACE_LOCALES.map(code=><option key={code} value={code}>{NATIVE_NAMES[code]}</option>)}</select></label><small>{t('languageHelp')}</small></fieldset>
  <fieldset disabled={busy}><legend>{t('followMarkets')}</legend><div className={styles.choices}>{NEWS_MARKETS.map(m=><label className={styles.check} key={m.code}><input type="checkbox" aria-label={t('follow',{country:newsMarketName(m.code,locale)})} checked={draft.followedMarkets.includes(m.code)} disabled={!draft.followedMarkets.includes(m.code)&&draft.followedMarkets.length>=5} onChange={e=>change('followedMarkets',e.target.checked?[...draft.followedMarkets,m.code]:draft.followedMarkets.filter(code=>code!==m.code))}/>{newsMarketName(m.code,locale)}</label>)}</div><small>{t('preferenceHelp')}</small></fieldset>
  <fieldset disabled={busy}><legend>{t('topics')}</legend><div className={styles.choices}>{NEWS_CATEGORIES.map(topic=><label className={styles.check} key={topic}><input type="checkbox" checked={draft.topics.includes(topic)} onChange={e=>change('topics',e.target.checked?[...draft.topics,topic]:draft.topics.filter(value=>value!==topic) as NewsCategory[])}/>{news(topic)}</label>)}</div></fieldset>
  <div className={styles.actions}><button type="button" disabled={busy} onClick={()=>device()}>{t('saveDevice')}</button><button type="button" className={styles.secondary} disabled={busy} onClick={reset}>{t('reset')}</button></div>
  <p className={styles.status} role="status">{message?t(message):null}</p>{error&&<p className={styles.error} role="alert">{t(error)}</p>}
  <details><summary>{t('accountSync')}</summary><p>{t('accountHelp')}</p><div className={styles.actions}><button type="button" className={styles.secondary} disabled={busy} onClick={()=>void sync()}>{busy?t('busy'):t('loadAccount')}</button><button type="button" disabled={busy||version===null||!accountContext} onClick={()=>void sync(true)}>{t('saveAccount')}</button></div>{signedOut&&<a href="/account">{t('signIn')}</a>}</details>
 </section>;
}
