'use client';
import Link from '@/ui/components/ReaderLink';
import {newsMarketName} from '@/lib/shared/news-preferences';
import {discoveryMessages} from '@/ui/i18n/catalogues/urban-discovery';
import {useNewsPreferences} from '@/lib/client/use-news-preferences';
import {selectNewsEdition,type NewsRankReason} from '@/lib/shared/news-ranking';
import {useMessages,useInterfaceLanguage} from '@/ui/i18n/LanguageProvider';
import {readingMessages} from '@/ui/i18n/catalogues/reading';
import {NewsCards,NewsEmpty,type NewsCard} from './NewsCards';
import styles from '@/ui/components/NewsPreferences.module.css';

export default function NewsEdition({posts,current,now,lead=false,limit=12,showEditionLink=false}:{posts:NewsCard[];current:boolean;now:number;lead?:boolean;limit?:number;showEditionLink?:boolean}){
 const {preferences}=useNewsPreferences(),t=useMessages(readingMessages),discovery=useMessages(discoveryMessages),{locale}=useInterfaceLanguage();
 const selection=selectNewsEdition(posts.slice(0,200),preferences,now),ranked=selection.ranked.slice(0,limit);
 const reasonKey:Record<NewsRankReason,keyof typeof readingMessages.en>={home_market:'homeReason',followed_market:'followedReason',topic:'topicReason',global:'globalReason',confirmed:'confirmedReason',recent:'recentReason',latest:'latestReason',diversity:'diversityReason'};
 const why=Object.fromEntries(ranked.map(row=>[row.item.slug,row.reasons.map(reason=>t(reasonKey[reason]))]));
 const matches=selection.matchingCoverage;
 return <section className={styles.edition} aria-labelledby="your-edition-heading">
  <div className={styles.editionHeading}><div><h2 id="your-edition-heading">{t('edition')}</h2><p data-edition-market>{newsMarketName(preferences.homeMarket,locale)}</p><p>{posts.length&&!matches?t('emptyCoverage'):t('editionHelp')}</p></div><nav aria-label={t('edition')}>{showEditionLink&&<Link href="/for-you">{discovery('forYou')} ↗</Link>}<Link href="/news-preferences">{t('manage')} ↗</Link></nav></div>
  {ranked.length?<NewsCards posts={ranked.map(row=>row.item)} lead={lead} why={why}/>:<NewsEmpty current={current}/>}
 </section>;
}
