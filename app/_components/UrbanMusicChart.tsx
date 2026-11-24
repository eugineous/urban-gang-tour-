import {requestTime} from '@/lib/server/request-time';
import {getKenyaMusicChart} from '@/lib/server/urban-music-chart';
import {KENYA_CHART_URL} from '@/lib/server/urban-news-providers';
import styles from './UrbanMusicChart.module.css';

export default async function UrbanMusicChart() {
  const chart = await getKenyaMusicChart(requestTime());
  if (!chart) return null;
  const date = new Intl.DateTimeFormat('en-KE', {dateStyle: 'long', timeZone: 'Africa/Nairobi'}).format(new Date(chart.updated));
  const leader = chart.tracks.find(track => track.rank === 1);
  const player = leader ? new URL(leader.url) : null;
  if (player) player.hostname = 'embed.music.apple.com';

  return <section className={styles.chart} aria-label="Apple Music Kenya songs chart" lang="en-KE">
    <header>
      <p>Apple Music · <time dateTime={chart.updated}>{date}</time></p>
      <h2>Kenya’s most-played songs</h2>
    </header>
    {leader && player && <iframe className={styles.player} src={player.href}
      title={`Apple Music player for ${leader.title} by ${leader.artist}`}
      loading="lazy" allow="encrypted-media" referrerPolicy="no-referrer" height="175" />}
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
