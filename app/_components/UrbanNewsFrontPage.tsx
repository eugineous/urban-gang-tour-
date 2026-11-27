import type {ReactNode} from 'react';
import Link from 'next/link';
import {NEWS_MARKETS} from '@/lib/shared/news-preferences';
import {newsArchiveHref,type NewsArchiveQuery} from '@/lib/shared/news-archive';
import NewsHeadlines from './NewsHeadlines';
import type {NewsCard} from './NewsCards';
import styles from './UrbanNewsFrontPage.module.css';

export type NewsDeskStory = {
  href:string;
  headline:string;
  summary:string;
  section:string;
  image:string;
  imageAlt?:string;
  imageSmall?:string;
  country?:string;
  date:string;
};

const primaryMarkets=['KE','UG','TZ','SO'];
const calendar=new Intl.DateTimeFormat('en-KE',{month:'short',day:'numeric',timeZone:'Africa/Nairobi'});
const countryName=(code?:string)=>NEWS_MARKETS.find(market=>market.code===code)?.name;

function StoryCredit({story}:{story:NewsDeskStory}){
  return <p className={styles.credit}><span>{story.section}</span>{countryName(story.country)&&<> · {countryName(story.country)}</>}{Number.isFinite(Date.parse(story.date))&&<> · <time dateTime={story.date}>{calendar.format(new Date(story.date))}</time></>}</p>;
}

export default function UrbanNewsFrontPage({stories,latest,query,now,pages,trend,xLinks}:{stories:NewsDeskStory[];latest:(NewsCard&{href:string})[];query:NewsArchiveQuery;now:number;pages:number;trend?:ReactNode;xLinks:{url:string;user:string;date:string}[]}){
  const market=query.country||'KE';
  const filtered=!!query.q||query.category!=='all';
  const [lead,...remaining]=stories;
  const marketName=countryName(market)||market;
  const searchTerms={KE:'Kenya entertainment music',UG:'Uganda entertainment music',TZ:'Tanzania burudani muziki',SO:'Somalia fanka hees'}[market]||marketName+' entertainment';
  return <section className={`wrap ${styles.page}`}>
    <header className={styles.masthead}>
      <div><h1>Urban News<span>.</span></h1><p>Entertainment, music and culture across East Africa.</p></div>
      <Link href="/editorial-policy">Editorial policy ↗</Link>
    </header>
    <nav className={styles.markets} aria-label="Country editions">
      {['KE','UG','TZ','SO'].map(code=><Link key={code} href={newsArchiveHref({...query,country:code},1)} aria-current={market===code?'page':undefined}>{countryName(code)}</Link>)}
      <Link href={newsArchiveHref({...query,country:'Global'},1)} aria-current={market==='Global'?'page':undefined}>World</Link>
      <details><summary>More countries</summary><div>{NEWS_MARKETS.filter(edition=>edition.code!=='Global'&&!primaryMarkets.includes(edition.code)).map(edition=><Link key={edition.code} href={newsArchiveHref({...query,country:edition.code},1)}>{edition.name}</Link>)}</div></details>
    </nav>
    <form action="/blog" className={styles.search} role="search">
      <input type="hidden" name="country" value={market}/>
      <label htmlFor="desk-search">Search {marketName} news</label>
      <input id="desk-search" type="search" name="q" defaultValue={query.q} placeholder="Artist, story or event" maxLength={200}/>
      <button type="submit">Search</button>
      <label className={styles.topic}>Topic <select name="category" defaultValue={query.category}>
        <option value="all">All topics</option><option value="celebrity">Celebrity</option><option value="music">Music</option>
        <option value="screen">Screen</option><option value="culture">Culture</option><option value="style">Style</option>
        <option value="creators">Creators</option><option value="sport">Sport</option>
      </select></label>
    </form>
    <NewsHeadlines posts={latest} now={now}/>
    <div className={styles.layout}>
      <div>
        <h2 className={styles.sectionTitle}>{filtered?'Search and filters':marketName+' entertainment'}</h2>
        {lead?<article className={styles.lead} data-news-story={lead.href}>
          <Link href={lead.href}>
            <img src={lead.image} alt={lead.imageAlt||''} srcSet={lead.imageSmall?`${lead.imageSmall} 480w, ${lead.image} 960w`:undefined} sizes="(max-width:760px) 96vw, 820px" width={1200} height={630} fetchPriority="high"/>
            <div className={styles.leadCopy}><StoryCredit story={lead}/><h3>{lead.headline}</h3><p>{lead.summary}</p><span>Read the story ↗</span></div>
          </Link>
        </article>:<p className={styles.empty}>{filtered?'No stories matched this search.':`There are no published entertainment stories for ${marketName} yet.`}</p>}
        {remaining.length>0&&<section aria-labelledby="coverage-heading"><h2 className={styles.sectionTitle} id="coverage-heading">More stories</h2>
          <div className={styles.cards}>{remaining.map(story=><article key={story.href} data-news-story={story.href}><Link href={story.href}>
            <img src={story.image} alt={story.imageAlt||''} srcSet={story.imageSmall?`${story.imageSmall} 480w, ${story.image} 960w`:undefined} sizes="(max-width:760px) 46vw, 410px" width={640} height={360} loading="lazy"/>
            <StoryCredit story={story}/><h3>{story.headline}</h3>
          </Link></article>)}</div>
        </section>}
        {pages>1&&<nav aria-label="News archive pages" className={styles.pagination}>
          {query.page>1&&<Link href={newsArchiveHref(query,query.page-1)} rel="prev">← Previous</Link>}
          <span>{query.page} of {pages}</span>
          {query.page<pages&&<Link href={newsArchiveHref(query,query.page+1)} rel="next">Next →</Link>}
        </nav>}
      </div>
      <aside className={styles.rail}>
        <section aria-labelledby="latest-heading"><h2 id="latest-heading">Latest in {marketName}</h2>
          {stories.length?<ol>{stories.slice(0,10).map(story=><li key={story.href}><Link href={story.href}>{story.headline}</Link><StoryCredit story={story}/></li>)}</ol>:<p>No stories in this view.</p>}
        </section>
        {trend&&<section aria-labelledby="trending-heading"><h2 id="trending-heading">Trending in music</h2>{trend}</section>}
        <section aria-labelledby="x-heading"><h2 id="x-heading">On X</h2>
          {xLinks.length>0&&<ul>{xLinks.map(post=><li key={post.url}>
            <a href={post.url} rel="external noopener noreferrer">@{post.user} · <time dateTime={post.date}>{calendar.format(new Date(post.date))}</time> ↗</a>
          </li>)}</ul>}
          <a href={'https://x.com/search?'+new URLSearchParams({q:searchTerms,f:'live'})} rel="external noopener noreferrer">See the latest {marketName} entertainment posts on X ↗</a>
        </section>
      </aside>
    </div>
  </section>;
}
