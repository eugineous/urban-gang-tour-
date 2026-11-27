import {afterEach, expect, it, vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import NewsHeadlines, {watchNewsRefresh} from '@/app/_components/NewsHeadlines';
import type {NewsCard} from '@/app/_components/NewsCards';

vi.mock('next/navigation', () => ({useRouter: () => ({refresh: vi.fn()})}));
const now = Date.parse('2026-11-24T12:00:00Z');
function story(slug: string, headline: string, hoursAgo: number): NewsCard {
  return {slug, headline, datePublished: new Date(now - hoursAgo * 3_600_000).toISOString(),
    section: 'music', description: '', image: '', newsVerification: 'confirmed'};
}
function markup(posts: NewsCard[]) {
  return renderToStaticMarkup(createElement(NewsHeadlines, {posts, now}));
}

it('links recent editorial breaking headlines, only for confirmed coverage', () => {
  const html = markup([story('fresh', 'Studio release', 0), story('explicit title', 'Breaking: Venue closes', 1)]);
  expect(html).toContain('Breaking news</h2>');
  expect(html).toContain('href="/blog/explicit%20title"');
  expect(html).not.toContain('Studio release');
});

it('uses a chronological headline rail for ordinary coverage and expired breaking labels', () => {
  const html = markup([story('old', 'Breaking: Older report', 6), story('recent', 'Recent report', 1)]);
  expect(html).toContain('Headlines</h2>');
  expect(html.indexOf('href="/blog/recent"')).toBeLessThan(html.indexOf('href="/blog/old"'));
  expect(markup([])).toBe('');
});

afterEach(() => {vi.useRealTimers(); vi.unstubAllGlobals()});
it('refreshes visible readers every five minutes and catches up once after a hidden interval', () => {
  vi.useFakeTimers();
  const tab = Object.assign(new EventTarget(), {visibilityState: 'visible'});
  vi.stubGlobal('document', tab);
  vi.stubGlobal('window', {setTimeout, clearTimeout});
  const refresh = vi.fn();
  const stop = watchNewsRefresh(refresh);
  vi.advanceTimersByTime(4 * 60_000);
  expect(refresh).not.toHaveBeenCalled();
  vi.advanceTimersByTime(60_000);
  expect(refresh).toHaveBeenCalledTimes(1);
  tab.visibilityState = 'hidden';
  tab.dispatchEvent(new Event('visibilitychange'));
  vi.advanceTimersByTime(4 * 3_600_000);
  expect(refresh).toHaveBeenCalledTimes(1);
  tab.visibilityState = 'visible';
  tab.dispatchEvent(new Event('visibilitychange'));
  tab.dispatchEvent(new Event('visibilitychange'));
  expect(refresh).toHaveBeenCalledTimes(2);
  vi.advanceTimersByTime(5 * 60_000);
  expect(refresh).toHaveBeenCalledTimes(3);
  stop();
  vi.advanceTimersByTime(3_600_000);
  tab.dispatchEvent(new Event('visibilitychange'));
  expect(refresh).toHaveBeenCalledTimes(3);
});

it('leaves developing stories in the normal rail even when the headline says breaking',()=>{
  const html=markup([{...story('developing','Breaking: Unconfirmed report',1),newsVerification:'developing'}]);
  expect(html).toContain('Headlines</h2>');
  expect(html).not.toContain('Breaking news</h2>');
  expect(html).not.toContain('<dialog');
});
