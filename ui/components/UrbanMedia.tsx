'use client';
import {useState} from 'react';
import {MediaFilm,MediaImage,MediaCatalogProvider,useMediaCatalog,type Asset} from './MediaLibrary';
import Link from './DocumentLink';
import {PRESENTER_BIOGRAPHIES} from '@/ui/lib/presenter-biography';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {discoveryMessages} from '@/ui/i18n/catalogues/urban-discovery';
import styles from './UrbanMedia.module.css';

export function watchableFilms(items:readonly Asset[]):Asset[]{
 const seen=new Set<string>();return items.filter(item=>{
  if(item.kind!=='video'||item.adult||!item.src||!item.poster||seen.has(item.src))return false;
  seen.add(item.src);return true;
 });
}
export function HostIdentity(){const t=useMessages(discoveryMessages);return <aside className={styles.identity} aria-label={t('hosts')}>{Object.values(PRESENTER_BIOGRAPHIES).map(person=><Link href={person.path} key={person.path}><MediaImage id={person.portrait} alt={person.name}/><span>{person.name}</span></Link>)}<Link href="/book" className={styles.book}>{t('book')} ↗</Link></aside>}
export function UrbanMediaFeature(){const t=useMessages(discoveryMessages);return <section className={`wrap ${styles.section}`} aria-labelledby="home-film-heading"><header className={styles.heading}><div><p>{t('archive')}</p><h2 id="home-film-heading">{t('watchTitle')}</h2></div><Link href="/watch">{t('watchArchive')} ↗</Link></header><div className={styles.feature}><MediaFilm id="M034"/><div className={styles.hosts}><h2>{t('hosts')}</h2><HostIdentity/><Link href="/book" className={styles.action}>{t('book')} ↗</Link></div></div></section>}
export function WatchLibrary({initialClip=''}:{initialClip?:string}){return <MediaCatalogProvider><WatchCatalogue initialClip={initialClip}/></MediaCatalogProvider>}
function WatchCatalogue({initialClip}:{initialClip:string}){
 const t=useMessages(discoveryMessages),catalogue=useMediaCatalog();
 const [query,setQuery]=useState(''),[collection,setCollection]=useState(''),[limit,setLimit]=useState(12);
 const all=watchableFilms(catalogue.media);
 const films=all.filter(item=>(!collection||item.collection===collection)&&`${item.title} ${item.originalCaption||''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim())).sort((a,b)=>Number(b.id===initialClip)-Number(a.id===initialClip));
 const groups=catalogue.collections.filter(group=>all.some(item=>item.collection===group.slug));
 return <section className={`wrap ${styles.section}`}><header className={styles.heading}><div><p>{t('archive')}</p><h1>{t('watchTitle')}</h1><p>{t('watchIntro')}</p></div><Link href="/gallery">{t('watchArchive')} ↗</Link></header>
  <div className={styles.filters}><label>{t('filterFilms')}<input type="search" value={query} maxLength={200} onChange={e=>{setQuery(e.target.value);setLimit(12)}}/></label><label>{t('collection')}<select value={collection} onChange={e=>{setCollection(e.target.value);setLimit(12)}}><option value="">{t('allCollections')}</option>{groups.map(group=><option key={group.slug} value={group.slug}>{group.title}</option>)}</select></label></div>
  {catalogue.catalogError&&<p role="status">{t('archiveUnavailable')}</p>}
  <div className={styles.grid}>{films.slice(0,limit).map(item=><div id={'film-'+item.id} key={item.id} className={styles.film}><MediaFilm id={item.id}/><Link href={'/gallery/'+encodeURIComponent(item.collection)} lang="en-KE">{groups.find(group=>group.slug===item.collection)?.title||item.title} ↗</Link>{item.originalCaption&&<details><summary>{t('archive')}</summary><p lang="en-KE">{item.originalCaption}</p>{item.sourceUrl&&<a href={item.sourceUrl} rel="noopener noreferrer">Instagram ↗</a>}</details>}</div>)}</div>
  {!films.length&&<p role="status">{t('noFilms')}</p>}{films.length>limit&&<button type="button" className={styles.action} onClick={()=>setLimit(value=>value+12)}>{t('moreFilms')}</button>}
 </section>;
}
