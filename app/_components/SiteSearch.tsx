'use client';
import type {SiteSearchResult,SiteSearchGroup} from '@/lib/shared/site-search';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {discoveryMessages} from '@/ui/i18n/catalogues/urban-discovery';
import Link from '@/ui/components/DocumentLink';
import styles from './SiteSearch.module.css';
export default function SiteSearch({query,results,unavailable}:{query:string;results:SiteSearchResult[];unavailable:boolean}){
 const t=useMessages(discoveryMessages),groupKey:Record<SiteSearchGroup,'newsGroup'|'eventsGroup'|'shopGroup'|'videoGroup'|'peopleGroup'>={news:'newsGroup',events:'eventsGroup',shop:'shopGroup',films:'videoGroup',people:'peopleGroup'};
 return <section className={`wrap ${styles.page}`}><h1>{t('searchTitle')}</h1><p>{t('searchIntro')}</p><form action="/search" method="get" role="search" className={styles.form}><label>{t('search')}<input type="search" name="q" defaultValue={query} maxLength={200} placeholder={t('searchPlaceholder')}/></label><button type="submit">{t('search')}</button></form>
 {unavailable&&<p role="status">{t('unavailable')}</p>}{!results.length&&<p role="status">{t(query?'noResults':'emptyQuery')}</p>}
 <div className={styles.groups}>{results.map(group=><section key={group.group} aria-labelledby={'search-'+group.group}><h2 id={'search-'+group.group}>{t(groupKey[group.group])}</h2><ul>{group.items.map(item=><li key={item.href}><Link href={item.href}><h3 lang="en-KE">{item.title}</h3>{item.description&&<p lang="en-KE">{item.description}</p>}<span aria-hidden="true">↗</span></Link></li>)}</ul></section>)}</div></section>;
}
