'use client';
import {MessageText} from '@/ui/i18n/MessageText';
import {discoveryMessages} from '@/ui/i18n/catalogues/discovery';
import {useMessages} from '@/ui/i18n/LanguageProvider';

import {useState} from 'react';
import type {WebsiteContent} from '@/lib/website-content';
import {newestPublishedFirst} from '@/lib/shared/newsroom-chronology';
import newsCategories from '../data/news-categories.json';
import Link from './DocumentLink';
import {InlineArrow} from './InlineArrow';
import {PublicationDate} from './PublicationDate';
import {useUrlFilters} from './useUrlFilters';
import styles from './NewsroomIndex.module.css';

type Story = {id:string; headline:string; date:string; section?:string; img?:string; dek?:string; imageAlt?:string};
type Props = {posts:Record<string,unknown>[]; current?:boolean; content?:WebsiteContent|null};

function storyCategory(story:Story) {
  const mapped=(newsCategories.byPost as Record<string,string>)[story.id];
  const section=(story.section||'').toLowerCase().trim();
  const fallback=/school|campus/.test(section)?'schools':/event|recap|concert|festival/.test(section)?'events':/talent|culture/.test(section)?'culture':/eugine|lucy|people|hosts/.test(section)?'people':/partner|sponsor/.test(section)?'partners':/update|tour/.test(section)?'updates':undefined;
  return newsCategories.categories.find(category=>category.id===(mapped||fallback)||category.label.toLowerCase()===section);
}

function StoryCard({story,lead=false}:{story:Story; lead?:boolean}) {
  return <article className={lead?styles.lead:styles.story} data-news-story={story.id}>
    <Link className={styles.storyLink} href={`/blog/${encodeURIComponent(story.id)}`}>
      <div className={styles.storyCopy}>
        {lead&&<span className={styles.latest}><MessageText catalogue={discoveryMessages} message="news.latest"/></span>}
        <p className={styles.meta}><span>{storyCategory(story)?<MessageText catalogue={discoveryMessages} message={newsCategoryMessage[storyCategory(story)!.id as keyof typeof newsCategoryMessage]}/>:story.section?<span lang="en-KE">{story.section}</span>:<MessageText catalogue={discoveryMessages} message="news.news"/>}</span><span aria-hidden="true">·</span><PublicationDate value={story.date}/></p>
        <h2 lang="en-KE">{story.headline}</h2>
        {story.dek&&<p className={styles.dek} lang="en-KE">{story.dek}</p>}
        <span className={styles.read}><MessageText catalogue={discoveryMessages} message="news.read"/> <InlineArrow/></span>
      </div>
      <div className={styles.image}><img lang="en-KE" src={story.img||'/assets/poster.png'} alt={story.imageAlt||''} loading={lead?'eager':'lazy'} decoding="async"/></div>
    </Link>
  </article>;
}

/** Only records from the existing public publication feed enter this index. */
export function NewsroomIndex({posts,current=true,content=null}:Props) {const t=useMessages(discoveryMessages);
  const [filters,updateFilters]=useUrlFilters({q:'',category:'all'},{category:['all',...newsCategories.categories.map(category=>category.id)]});
  const [pagination,setPagination]=useState({key:'',limit:12});
  const filterKey=JSON.stringify([filters.q,filters.category]);
  const limit=pagination.key===filterKey ? pagination.limit : 12;
  const search=filters.q.toLowerCase().trim();
  const modified=Boolean(search||filters.category!=='all');
  const published=current ? newestPublishedFirst(posts as Story[]) : [];
  const matches=published.filter(story=>(filters.category==='all'||storyCategory(story)?.id===filters.category)&&`${story.headline} ${story.dek||''} ${story.section||''} ${story.id.replaceAll('-',' ')}`.toLowerCase().includes(search));
  const visible=matches.slice(0,limit);
  const clear=()=>{updateFilters({q:'',category:'all'});setPagination({key:'',limit:12});};

  return <div className={styles.newsroom}>
    <header className={`wrap ${styles.intro}`}>
      <div><p className={styles.eyebrow}><MessageText catalogue={discoveryMessages} message="news.guides"/></p><h1>{content?.title?<span lang="en-KE">{content.title}</span>:<MessageText catalogue={discoveryMessages} message="news.title"/>}</h1></div>
      <div className={styles.introCopy}><p>{content?.summary!==undefined&&content?.summary!==null?<span lang="en-KE">{content.summary}</span>:<MessageText catalogue={discoveryMessages} message="news.summary"/>}</p><Link href="/book"><MessageText catalogue={discoveryMessages} message="news.book"/> <InlineArrow/></Link></div>
    </header>

    <section className={`wrap ${styles.index}`} aria-label={t("news.published")}>
      {current&&published.length>0&&<>
        <div className={styles.tools}>
          <div className={styles.categories} role="group" aria-label={t("news.categories")}>{[{id:'all',label:'All stories'},...newsCategories.categories].map(category=><button key={category.id} type="button" aria-pressed={filters.category===category.id} onClick={()=>updateFilters({category:category.id})}>{category.id==='all'?t('news.all'):t(newsCategoryMessage[category.id as keyof typeof newsCategoryMessage])}</button>)}</div>
          <label className={styles.search}><span><MessageText catalogue={discoveryMessages} message="news.search"/></span><input type="search" placeholder={t("news.searchHint")} value={filters.q} onChange={event=>updateFilters({q:event.target.value},true)}/></label>
        </div>
        <div className={styles.indexHeading}><p>{t(modified?'news.results':'news.latestStories')}</p><span><MessageText catalogue={discoveryMessages} message="news.newest"/></span></div>
        {visible.length>0&&<div className={styles.stories}>{visible.map((story,index)=><StoryCard key={story.id} story={story} lead={index===0&&!modified}/>)}</div>}
        <div className={styles.results}><p role="status" aria-live="polite">{t('news.count',{shown:Math.min(limit,matches.length),total:matches.length})}</p>{matches.length>limit&&<button type="button" className="button" onClick={()=>setPagination({key:filterKey,limit:limit+12})}><MessageText catalogue={discoveryMessages} message="news.more"/> <InlineArrow/></button>}</div>
        {matches.length===0&&<div className={styles.empty}><h2><MessageText catalogue={discoveryMessages} message="news.noMatch"/></h2><p><MessageText catalogue={discoveryMessages} message="news.tryTopic"/></p><button type="button" className="button secondary" onClick={clear}><MessageText catalogue={discoveryMessages} message="news.clear"/></button></div>}
      </>}
      {!current?<div className={styles.empty} role="status"><h2><MessageText catalogue={discoveryMessages} message="news.unavailable"/></h2><p><MessageText catalogue={discoveryMessages} message="news.retrySummary"/></p><Link className="button" href="/blog"><MessageText catalogue={discoveryMessages} message="news.retry"/> <InlineArrow/></Link></div>:published.length===0&&<div className={styles.empty}><h2><MessageText catalogue={discoveryMessages} message="news.empty"/></h2><p><MessageText catalogue={discoveryMessages} message="news.emptySummary"/></p><Link className="button" href="/events"><MessageText catalogue={discoveryMessages} message="events.explore"/> <InlineArrow/></Link></div>}
    </section>

    <aside className={`wrap ${styles.tourLinks}`} aria-label={t("news.moreTour")}><p><MessageText catalogue={discoveryMessages} message="news.tourAction"/></p><div><Link href="/reels"><MessageText catalogue={discoveryMessages} message="news.videos"/> <InlineArrow/></Link><Link href="/events"><MessageText catalogue={discoveryMessages} message="events.explore"/> <InlineArrow/></Link></div></aside>
  </div>;
}

const newsCategoryMessage={schools:'news.category.schools',events:'news.category.events',culture:'news.category.culture',people:'news.category.people',partners:'news.category.partners',updates:'news.category.updates'} as const;
