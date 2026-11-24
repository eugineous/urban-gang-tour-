import {readPublisherHeadlines} from '@/lib/server/urban-news-market-sources';
import styles from './UrbanMusicChart.module.css';

export default async function PublisherHeadlines({country}:{country?:string}) {
  const stories=await readPublisherHeadlines(country);
  if(!stories.length)return null;
  const date=new Intl.DateTimeFormat('en-KE',{month:'short',day:'numeric',timeZone:'Africa/Nairobi'});
  return <section className={styles.chart} aria-label="From the entertainment press">
    <h2>From the entertainment press</h2>
    <ul className={styles.press}>{stories.map(story=><li key={story.url}>
      {story.artwork&&<figure><img src={story.artwork.url} alt="" width="480" height="270" loading="lazy" referrerPolicy="no-referrer"/><figcaption><a href={story.artwork.license}>Public-domain image · {story.publisher}</a></figcaption></figure>}
      <a href={story.url} rel="external noopener noreferrer">{story.title}</a>
      <small>{story.publisher} · <time dateTime={story.publishedAt}>{date.format(new Date(story.publishedAt!))}</time></small>
    </li>)}</ul>
  </section>;
}
