import Link from 'next/link';
import {readNewsDesk} from '@/app/_lib/news-desk';
import {requestTime} from '@/lib/server/request-time';
import NewsHeadlines from './NewsHeadlines';
import {storyCategoryLinks,StoryTile} from './UrbanNewsFrontPage';
import styles from './UrbanNewsFrontPage.module.css';

export default async function HomeNews(){
  const {visible}=await readNewsDesk({q:'',category:'all',country:'KE',page:1});
  const cards=visible.slice(0,3);
  return <section className={`wrap ${styles.homeDesk}`} data-home-news aria-labelledby="home-news-title">
    <header className={styles.sectionBar}>
      <h2 id="home-news-title">Urban News<span>.</span></h2>
      <Link href="/blog">All stories <span aria-hidden="true">↗</span></Link>
    </header>
    <NewsHeadlines now={requestTime()} posts={cards}/>
    {storyCategoryLinks({q:'',category:'all',country:'',page:1})}
    {cards.length?<div className={`${styles.cards} ${styles.homeCards}`}>{cards.map(story=><StoryTile key={story.href} story={story}/>)}</div>
      :<p className={styles.empty}>Read the latest stories in the newsroom.</p>}
  </section>;
}
