import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ChartPlayer, reportHeadline} from '@/app/_components/UrbanMusicChart';
import {requestTime} from '@/lib/server/request-time';
import {getKenyaMusicChart} from '@/lib/server/urban-music-chart';
import {urbanNewsEnabled} from '@/lib/server/urban-news-mode';
import {KENYA_CHART_URL} from '@/lib/server/urban-news-providers';
import styles from './report.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Kenya’s most-played songs on Apple Music | Urban News',
  description: 'Read the Kenya songs chart report and listen to the tracks leading Apple Music’s rankings.',
  alternates: {canonical: '/music/kenya-chart'},
};

export default async function KenyaChartReport() {
  if (!urbanNewsEnabled()) notFound();
  const chart = await getKenyaMusicChart(requestTime());
  const leader = chart?.tracks.find(track => track.rank === 1);
  const second = chart?.tracks.find(track => track.rank === 2);
  const third = chart?.tracks.find(track => track.rank === 3);
  const date = chart && new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'long', timeStyle: 'short', timeZone: 'Africa/Nairobi',
  }).format(new Date(chart.updated));

  return <article className={styles.report} lang="en-KE">
    <Link href="/blog?category=music" className={styles.back}>← Urban News music</Link>
    <header>
      <p className={styles.section}>Kenya music report</p>
      <h1>{reportHeadline(leader)}</h1>
      {chart && <p>Apple Music chart updated <time dateTime={chart.updated}>{date} EAT</time></p>}
    </header>
    {chart ? <>
      <img className={styles.cover} src="/news/chart-edition.svg" width="800" height="450" alt="Urban News chart edition, illustrated with a vinyl record"/>
      {leader && <p className={styles.lede}>Kenya’s most-played song on Apple Music is “{leader.title}”. {second
        ? <>The track by {leader.artist} sits one place ahead of “{second.title}” by {second.artist}.</>
        : <>Apple lists {leader.artist} as the artist on the No. 1 track.</>}</p>}
      {!leader && second && <p className={styles.lede}>Apple Music lists “{second.title}” by {second.artist} at No. 2 in Kenya.</p>}
      {third && <p>{leader && third.artist === leader.artist
        ? <>{leader.artist} also holds third place with “{third.title}”, giving the artist two of the top three tracks.</>
        : <>“{third.title}” by {third.artist} takes third place in the Kenya ranking.</>}</p>}
      {leader && <figure>
        <ChartPlayer track={leader} />
        <figcaption><a href={leader.url}>Listen to “{leader.title}” on Apple Music ↗</a></figcaption>
      </figure>}
      <p>This chart ranks songs played on Apple Music in Kenya. The feed gives each song’s position and artist credit. Apple publishes no play counts in this feed.</p>
      <h2>On the chart</h2>
      <ol className={styles.tracks}>
        {chart.tracks.map(track => <li key={track.id} value={track.rank}>
          <a href={track.url}>{track.title}</a> <span>— {track.artist}</span>
        </li>)}
      </ol>
    </> : <p className={styles.lede}>A current Kenya chart is unavailable. This report will update when Apple Music supplies a chart dated within the past 48 hours.</p>}
    <footer><a href={KENYA_CHART_URL}>View Apple Music’s Kenya chart feed ↗</a></footer>
  </article>;
}
