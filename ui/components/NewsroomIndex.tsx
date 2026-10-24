'use client';

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
        {lead&&<span className={styles.latest}>Latest story</span>}
        <p className={styles.meta}><span>{storyCategory(story)?.label||story.section||'News'}</span><span aria-hidden="true">·</span><PublicationDate value={story.date}/></p>
        <h2>{story.headline}</h2>
        {story.dek&&<p className={styles.dek}>{story.dek}</p>}
        <span className={styles.read}>Read story <InlineArrow/></span>
      </div>
      <div className={styles.image}><img src={story.img||'/assets/poster.png'} alt={story.imageAlt||''} loading={lead?'eager':'lazy'} decoding="async"/></div>
    </Link>
  </article>;
}

/** Only records from the existing public publication feed enter this index. */
export function NewsroomIndex({posts,current=true,content=null}:Props) {
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
      <div><p className={styles.eyebrow}>News &amp; guides</p><h1>{content?.title||'Urban News'}</h1></div>
      <div className={styles.introCopy}><p>{content?.summary??'Tour updates, event stories and practical guides for schools, campuses and brands.'}</p><Link href="/book">Book the team <InlineArrow/></Link></div>
    </header>

    <section className={`wrap ${styles.index}`} aria-label="Published stories">
      {current&&published.length>0&&<>
        <div className={styles.tools}>
          <div className={styles.categories} role="group" aria-label="News categories">{[{id:'all',label:'All stories'},...newsCategories.categories].map(category=><button key={category.id} type="button" aria-pressed={filters.category===category.id} onClick={()=>updateFilters({category:category.id})}>{category.label}</button>)}</div>
          <label className={styles.search}><span>Search stories</span><input type="search" placeholder="Search a name or topic" value={filters.q} onChange={event=>updateFilters({q:event.target.value},true)}/></label>
        </div>
        <div className={styles.indexHeading}><p>{modified?'Search results':'Latest stories'}</p><span>Newest first</span></div>
        {visible.length>0&&<div className={styles.stories}>{visible.map((story,index)=><StoryCard key={story.id} story={story} lead={index===0&&!modified}/>)}</div>}
        <div className={styles.results}><p role="status" aria-live="polite">{Math.min(limit,matches.length)} of {matches.length} stories</p>{matches.length>limit&&<button type="button" className="button" onClick={()=>setPagination({key:filterKey,limit:limit+12})}>Show more stories <InlineArrow/></button>}</div>
        {matches.length===0&&<div className={styles.empty}><h2>No matching stories.</h2><p>Try another name or topic, or browse all stories.</p><button type="button" className="button secondary" onClick={clear}>Clear search</button></div>}
      </>}
      {!current?<div className={styles.empty} role="status"><h2>Stories are temporarily unavailable.</h2><p>Try again to load the latest published stories.</p><Link className="button" href="/blog">Try again <InlineArrow/></Link></div>:published.length===0&&<div className={styles.empty}><h2>No published stories yet.</h2><p>New stories will appear here when they are published.</p><Link className="button" href="/events">Explore events <InlineArrow/></Link></div>}
    </section>

    <aside className={`wrap ${styles.tourLinks}`} aria-label="More from the tour"><p>See the tour in action.</p><div><Link href="/reels">Watch tour videos <InlineArrow/></Link><Link href="/events">Explore events <InlineArrow/></Link></div></aside>
  </div>;
}
