'use client';
import {useNewsPreferences} from '@/lib/client/use-news-preferences';
import {rankPublicNews,type NewsRankReason} from '@/lib/shared/news-ranking';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {readingMessages} from '@/ui/i18n/catalogues/reading';
import {NewsCards,NewsEmpty,type NewsCard} from './NewsCards';
import styles from '@/ui/components/NewsPreferences.module.css';

export default function NewsEdition({posts,current,now,lead=false,limit=12}:{posts:NewsCard[];current:boolean;now:number;lead?:boolean;limit?:number}){
 const {preferences}=useNewsPreferences(),t=useMessages(readingMessages);
 const ranked=rankPublicNews(posts.slice(0,200),preferences,now).slice(0,limit);
 const reasonKey:Record<NewsRankReason,keyof typeof readingMessages.en>={home_market:'homeReason',followed_market:'followedReason',topic:'topicReason',global:'globalReason',confirmed:'confirmedReason',recent:'recentReason',latest:'latestReason',diversity:'diversityReason'};
 const why=Object.fromEntries(ranked.map(row=>[row.item.slug,row.reasons.map(reason=>t(reasonKey[reason]))]));
 const matches=ranked.some(row=>row.reasons.some(reason=>['home_market','followed_market','topic'].includes(reason)));
 return <section className={styles.edition} aria-labelledby="your-edition-heading">
  <div className={styles.editionHeading}><div><h2 id="your-edition-heading">{t('edition')}</h2><p>{posts.length&&!matches?t('emptyCoverage'):t('editionHelp')}</p></div><a href="/news-preferences">{t('manage')} ↗</a></div>
  {ranked.length?<NewsCards posts={ranked.map(row=>row.item)} lead={lead} why={why}/>:<NewsEmpty current={current}/>}
 </section>;
}
