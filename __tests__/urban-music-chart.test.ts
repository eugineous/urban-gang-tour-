import {afterEach, expect, it, vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import snapshot from '../data/urban-news-kenya-chart.json';
import archived from '../data/urban-news-feeds.json';
import {invalidate} from '../lib/server/microcache';
import {parseKenyaMusicChart} from '../lib/server/urban-music-chart';
import UrbanMusicChart from '../app/_components/UrbanMusicChart';

const asOf = Date.parse(snapshot.feed.updated);
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  invalidate('urban-news:kenya-ranked-songs');
});

it('preserves source positions across invalid rows and duplicate songs', () => {
  const payload = structuredClone(snapshot);
  payload.feed.results[0].url = payload.feed.results[0].url.replace('music.apple.com', 'music.apple.com.example.org');
  payload.feed.results[2] = payload.feed.results[1];
  const chart = parseKenyaMusicChart(payload, asOf);
  expect(chart?.tracks.slice(0, 2).map(row => row.rank)).toEqual([2, 4]);
  expect(parseKenyaMusicChart({...payload, feed: {...payload.feed, country: 'ug'}}, asOf)).toBeNull();
  expect(parseKenyaMusicChart(payload, asOf - 61_000)).toBeNull();
});

it('renders the exact first-party lead player, source date and accessible song links when the live feed fails', async () => {
  vi.useFakeTimers().setSystemTime(asOf + 3600_000);
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(Error('offline')));
  const html = renderToStaticMarkup(await UrbanMusicChart());
  expect(html).toContain(snapshot.feed.results[0].url.replace('music.apple.com', 'embed.music.apple.com'));
  for (const track of snapshot.feed.results) expect(html).toContain(track.url);
  expect(html).toContain(new Date(asOf).toISOString());
  vi.setSystemTime(Math.max(asOf,Date.parse(archived.charts.KE.feed.updated)) + 49 * 3600_000);
  expect(await UrbanMusicChart()).toBeNull();
});

it('uses only the fresh upstream snapshot when its leader changes', async () => {
  vi.useFakeTimers().setSystemTime(asOf);
  const live = structuredClone(snapshot);
  live.feed.results.reverse();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(live)));
  const html = renderToStaticMarkup(await UrbanMusicChart());
  expect(html).toContain(live.feed.results[0].url.replace('music.apple.com', 'embed.music.apple.com'));
  expect(html).not.toContain(snapshot.feed.results[0].url.replace('music.apple.com', 'embed.music.apple.com'));
});
