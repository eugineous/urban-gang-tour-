import Link from 'next/link';
import {requestTime} from '@/lib/server/request-time';
import {getKenyaMusicChart} from '@/lib/server/urban-music-chart';
import {KENYA_CHART_URL} from '@/lib/server/urban-news-providers';
import styles from './UrbanMusicChart.module.css';

type Chart = NonNullable<Awaited<ReturnType<typeof getKenyaMusicChart>>>;
type Track = Chart['tracks'][number];

export function ChartPlayer({track}: {track: Track}) {
  const player = new URL(track.url);
  player.hostname = 'embed.music.apple.com';
  return <iframe className={styles.player} src={player.href}
    title={`Apple Music player for ${track.title} by ${track.artist}`}
    loading="lazy" allow="encrypted-media" referrerPolicy="no-referrer" height="175" />;
}

export function reportHeadline(track?: Track) {
  return track ? `“${track.title}” by ${track.artist} leads Apple Music’s Kenya chart` : 'Kenya’s most-played songs on Apple Music';
}

export default async function UrbanMusicChart() {
  const chart = await getKenyaMusicChart(requestTime());
  if (!chart) return null;
  const date = new Intl.DateTimeFormat('en-KE', {dateStyle: 'long', timeZone: 'Africa/Nairobi'}).format(new Date(chart.updated));
  const leader = chart.tracks.find(track => track.rank === 1);

  return <section className={styles.chart} aria-label="Apple Music Kenya songs chart" lang="en-KE">
    <header>
      <p>Apple Music · <time dateTime={chart.updated}>{date}</time></p>
      <h2><Link href="/music/kenya-chart">{reportHeadline(leader)}</Link></h2>
    </header>
    {leader && <ChartPlayer track={leader} />}
    <ol className={styles.songs}>
      {chart.tracks.map(track => <li key={track.id} value={track.rank}>
        <a href={track.url} rel="noopener noreferrer">
          <span className={styles.rank} aria-hidden="true">{track.rank}</span>
          <span><strong>{track.title}</strong><small>{track.artist}</small></span>
        </a>
      </li>)}
    </ol>
    <a className={styles.source} href={KENYA_CHART_URL} rel="noopener noreferrer">Source: Apple Music Kenya chart</a>
  </section>;
}
