import Link from 'next/link';
import {getPublisherBriefs,publisherBriefHref} from '@/lib/server/urban-news-briefs';
import styles from './UrbanMusicChart.module.css';

export default async function PublisherHeadlines({country}:{country?:string}) {
  const stories=await getPublisherBriefs(country);
  if(!stories.length)return null;
  const date=new Intl.DateTimeFormat('en-KE',{month:'short',day:'numeric',timeZone:'Africa/Nairobi'});
  return <section className={styles.chart} aria-label="From the entertainment press">
    <h2>Entertainment briefing</h2>
    <ul className={styles.press}>{stories.slice(0,10).map(story=>{
      const href=publisherBriefHref(story);
      return <li key={story.id}>
        <Link href={href} className={styles.briefLink}>
          <div className={styles.briefArt}><img src={href+'/cover'} alt="" width="1200" height="630" loading="lazy"/></div>
          <span>{story.headline}</span>
        </Link>
        <small>{story.topic} · {story.publisher} · <time dateTime={story.sourceDate}>{date.format(new Date(story.sourceDate))}</time></small>
      </li>;
    })}</ul>
  </section>;
}
