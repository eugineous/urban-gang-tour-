import kenyaSnapshot from '../../data/urban-news-kenya-chart.json';
import {cached} from './microcache';
import {fetchKenyaMusicChartFeed, KENYA_CHART_URL} from './urban-news-providers';

type Track = {id: string; rank: number; title: string; artist: string; url: string};
type Chart = {updated: string; tracks: Track[]};
const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const isText = (value: unknown, limit: number): value is string =>
  typeof value === 'string' && !!value.trim() && value.length <= limit && !/[<>\u0000-\u001f\u007f]/u.test(value);

function isCurrent(updated: string, now: number) {
  const age = now - Date.parse(updated);
  return age >= -60_000 && age <= 48 * 3_600_000;
}

export function parseKenyaMusicChart(payload: unknown, now: number): Chart | null {
  if (!isObject(payload) || !isObject(payload.feed)) return null;
  const {id, country, updated, results} = payload.feed;
  if (id !== KENYA_CHART_URL || country !== 'ke' || typeof updated !== 'string' ||
      !isCurrent(updated, now) || !Array.isArray(results) || results.length > 10) return null;

  const tracks: Track[] = [];
  const seen = new Set<string>();
  for (const [index, track] of results.entries()) {
    if (!isObject(track) || track.kind !== 'songs' || !isText(track.artistName, 120) ||
        !isText(track.name, 160) || typeof track.id !== 'string' || !/^\d{1,24}$/.test(track.id) ||
        seen.has(track.id) || typeof track.url !== 'string' || !URL.canParse(track.url)) continue;
    const url = new URL(track.url);
    if (url.origin !== 'https://music.apple.com' || url.username || url.password || url.hash ||
        !/^\/ke\/album\/[^/]+\/\d+\/?$/.test(url.pathname) || url.searchParams.size !== 1 ||
        url.searchParams.get('i') !== track.id) continue;
    seen.add(track.id);
    tracks.push({id: track.id, rank: index + 1, artist: track.artistName.trim(), title: track.name.trim(), url: url.href});
  }
  return tracks.length ? {updated: new Date(updated).toISOString(), tracks} : null;
}

export async function getKenyaMusicChart(now: number) {
  const chart = await cached('urban-news:kenya-ranked-songs', 15 * 60_000, async () => {
    const payload = await fetchKenyaMusicChartFeed();
    const parsed = parseKenyaMusicChart(payload, Date.now());
    if (!parsed) throw Error('provider_output_invalid');
    return parsed;
  }).catch(() => null);
  return chart && isCurrent(chart.updated, now) ? chart : parseKenyaMusicChart(kenyaSnapshot, now);
}
