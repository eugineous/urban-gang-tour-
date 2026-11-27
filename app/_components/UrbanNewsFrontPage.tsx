import type {ReactNode} from 'react';
import Link from 'next/link';
import {NEWS_MARKETS} from '@/lib/shared/news-preferences';
import {NEWS_CATEGORIES,type NewsVerification} from '@/lib/shared/urban-news';
import {newsArchiveHref,type NewsArchiveQuery} from '@/lib/shared/news-archive';
import * as Icons from '@phosphor-icons/react/dist/ssr';
import {FeedAd} from './Ads';
import NewsDisclosure from './NewsDisclosure';
import NewsHeadlines from './NewsHeadlines';
import styles from './UrbanNewsFrontPage.module.css';

export type NewsDeskStory={
  href:string;slug:string;headline:string;summary:string;description:string;section:string;
  image:string;imageAlt?:string;imageSrcSet?:string;newsCountry?:string;datePublished:string;
  sourceCount:number;sourceDate?:string;newsVerification?:NewsVerification;
};
const calendar=new Intl.DateTimeFormat('en-KE',{month:'short',day:'numeric',timeZone:'Africa/Nairobi'});
const countryName=(code?:string)=>NEWS_MARKETS.find(market=>market.code===code)?.name;
const topicName=(topic:string)=>topic.toLowerCase()==='sport'?'Sports':topic[0]?.toUpperCase()+topic.slice(1);

function StoryCredit({story}:{story:NewsDeskStory}){
  return <p className={styles.credit}><span>{topicName(story.section)}</span>{countryName(story.newsCountry)&&<> · {countryName(story.newsCountry)}</>}{Number.isFinite(Date.parse(story.datePublished))&&<> · <time dateTime={story.datePublished}>{calendar.format(new Date(story.datePublished))}</time></>}</p>;
}

export function storyCategoryLinks(query:NewsArchiveQuery){
  return <nav className={styles.categories} aria-label="News categories">
    {['all',...NEWS_CATEGORIES].map(category=><Link key={category} href={newsArchiveHref({...query,category},1)} aria-current={query.category===category?'page':undefined}>{category==='all'?'All stories':topicName(category)}</Link>)}
  </nav>;
}

function StoryImage({story,lead=false}:{story:NewsDeskStory;lead?:boolean}){
  if(!story.image)return null;
  return <img src={story.image} srcSet={story.imageSrcSet}
    sizes={lead?'(max-width:760px) 94vw, 720px':'(max-width:760px) 45vw, 400px'}
    alt={story.imageAlt||''} width={1200} height={675} loading={lead?'eager':'lazy'} fetchPriority={lead?'high':'auto'} decoding="async"/>;
}
export function StoryTile({story}:{story:NewsDeskStory}){
  return <article className={styles.card} data-news-story={story.href}><Link href={story.href}>
    {story.image&&<div className={styles.cardImage}><StoryImage story={story}/></div>}
    <StoryCredit story={story}/><h3>{story.headline}</h3>
  </Link></article>;
}

export default function UrbanNewsFrontPage({stories,trending,query,now,pages,trend,xLinks}:{stories:NewsDeskStory[];trending:NewsDeskStory[];query:NewsArchiveQuery;now:number;pages:number;trend?:ReactNode;xLinks:{url:string;user:string;date:string}[]}){
  const market=query.country||'KE', marketName=market==='Global'?'World':countryName(market)||market;
  const [lead,...latest]=stories;
  const filtered=!!query.q||query.category!=='all';
  const searchTerms={KE:'Kenya entertainment music',UG:'Uganda entertainment music',TZ:'Tanzania burudani muziki',SO:'Somalia fanka hees'}[market]||marketName+' entertainment';
  return <section className={`wrap ${styles.page}`}>
    <header className={styles.masthead}>
      <div><h1>Urban News<span>.</span></h1><p>Entertainment, sport and culture</p></div>
      <div className={styles.tools}>
        <NewsDisclosure className={styles.disclosure} label={<><Icons.Globe size={17} aria-hidden="true"/><span>{marketName}</span><Icons.CaretDown size={13} aria-hidden="true"/></>}>
          <nav aria-label="Country editions" className={styles.dropdown}>
            {NEWS_MARKETS.map(edition=><Link key={edition.code} href={newsArchiveHref({...query,country:edition.code},1)} aria-current={market===edition.code?'page':undefined}>{edition.code==='Global'?'World':edition.name}</Link>)}
          </nav>
        </NewsDisclosure>
        <NewsDisclosure className={styles.disclosure} label={<><Icons.MagnifyingGlass size={19} aria-hidden="true"/><span className={styles.searchLabel}>Search</span></>} open={!!query.q}>
          <form action="/blog" className={`${styles.dropdown} ${styles.search}`} role="search">
            <input type="hidden" name="country" value={market}/><input type="hidden" name="category" value={query.category}/>
            <label htmlFor="desk-search">Search {marketName} news</label>
            <input id="desk-search" type="search" name="q" defaultValue={query.q} placeholder="Artist, story or event" maxLength={200}/>
            <button type="submit">Search</button>
          </form>
        </NewsDisclosure>
      </div>
    </header>
    <NewsHeadlines posts={stories} now={now} alerts/>
    {lead?<article className={styles.lead} data-news-story={lead.href} data-has-photo={!!lead.image}>
      <Link href={lead.href}>
        {lead.image&&<div className={styles.leadImage}><StoryImage story={lead} lead/></div>}
        <div className={styles.leadCopy}><StoryCredit story={lead}/><h2>{lead.headline}</h2><p>{lead.summary}</p><span>Read story <Icons.ArrowUpRight size={17} aria-hidden="true"/></span></div>
      </Link>
    </article>:<p className={styles.empty}>{filtered?'No stories matched this search.':`There are no published stories for ${marketName} yet.`}</p>}
    {storyCategoryLinks({...query,country:market})}
    <div className={styles.layout}>
      <section aria-labelledby="latest-heading">
        <div className={styles.sectionBar}><h2 id="latest-heading">{filtered?'More results':`Latest in ${marketName}`}</h2><Link href="/editorial-policy">Editorial policy</Link></div>
        {latest.length?<div className={styles.cards}>{latest.slice(0,4).map(story=><StoryTile key={story.href} story={story}/>)}</div>:<p className={styles.empty}>You’re caught up in this edition.</p>}
        {latest.length>=4&&<FeedAd/>}
        {latest.length>4&&<div className={styles.cards}>{latest.slice(4).map(story=><StoryTile key={story.href} story={story}/>)}</div>}
        {pages>1&&<nav aria-label="News archive pages" className={styles.pagination}>
          {query.page>1&&<Link href={newsArchiveHref(query,query.page-1)} rel="prev">← Previous</Link>}
          <span>{query.page} of {pages}</span>
          {query.page<pages&&<Link href={newsArchiveHref(query,query.page+1)} rel="next">Next →</Link>}
        </nav>}
      </section>
      <aside className={styles.rail} aria-label="News side panels">
        <section aria-labelledby="trending-heading">
          <h2 id="trending-heading"><Icons.TrendUp size={21} aria-hidden="true"/> Trending</h2>
          {trending.length?<ol>{trending.map(story=><li key={story.href}><Link href={story.href}>{story.headline}</Link><StoryCredit story={story}/></li>)}</ol>:<p>No recent stories meet the trending threshold in this edition.</p>}
          <details className={styles.method}><summary>How stories are ranked</summary><p>Recent published stories with checked sources qualify. Newer updates and reports corroborated by independent sources rank higher.</p></details>
        </section>
        {trend&&<section aria-labelledby="music-trends-heading"><h2 id="music-trends-heading">Music charts</h2>{trend}</section>}
        <section aria-labelledby="x-heading"><h2 id="x-heading">On X</h2>
          {xLinks.length>0&&<ul>{xLinks.map(post=><li key={post.url}>
            <a href={post.url} rel="external noopener noreferrer">@{post.user} · <time dateTime={post.date}>{calendar.format(new Date(post.date))}</time> ↗</a>
          </li>)}</ul>}
          <a href={'https://x.com/search?'+new URLSearchParams({q:searchTerms,f:'live'})} rel="external noopener noreferrer">{marketName} entertainment on X <Icons.ArrowUpRight size={16} aria-hidden="true"/></a>
        </section>
      </aside>
    </div>
  </section>;
}
