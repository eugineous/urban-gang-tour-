'use client';

import {useEffect, useId} from 'react';
import {useRouter} from 'next/navigation';
import {defineCatalogue} from '@/lib/i18n/messages';
import {newestPublishedFirst} from '@/lib/shared/newsroom-chronology';
import {publicationDate} from '@/lib/shared/publication-date';
import DocumentLink from '@/ui/components/DocumentLink';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import type {NewsCard} from './NewsCards';
import styles from './UrbanNews.module.css';

const refreshInterval = 30 * 60_000;
const breakingWindow = 6 * 60 * 60_000;

const labels = defineCatalogue({
  en: {headlines: 'Headlines', breaking: 'Breaking news'},
  sw: {headlines: 'Vichwa vya habari', breaking: 'Habari zinazochipuka'},
  fr: {headlines: 'À la une', breaking: 'Dernière minute'},
  'zh-Hans': {headlines: '新闻头条', breaking: '突发新闻'},
  ru: {headlines: 'Главные новости', breaking: 'Срочные новости'},
  es: {headlines: 'Titulares', breaking: 'Última hora'},
});

/** A tab returning after a long absence needs one refresh, regardless of missed intervals. */
export function watchNewsRefresh(refresh: () => void) {
  let due = Date.now() + refreshInterval;
  let timer: number | undefined;
  function schedule() {
    window.clearTimeout(timer);
    if (document.visibilityState !== 'visible') return;
    const now = Date.now();
    if (now >= due) {
      due = now + refreshInterval;
      refresh();
    }
    timer = window.setTimeout(schedule, due - now);
  }
  document.addEventListener('visibilitychange', schedule);
  schedule();
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', schedule);
  };
}

export default function NewsHeadlines({posts, now}: {posts: (NewsCard & {href?:string})[]; now?: number}) {
  const router = useRouter();
  useEffect(() => watchNewsRefresh(() => router.refresh()), [router]);
  const heading = useId();
  const t = useMessages(labels);
  if (!posts.length) return null;

  const sorted = newestPublishedFirst(posts);
  const breaking = sorted.filter(post => {
    if (now === undefined || !/^breaking(?: news)?\s*:/i.test(post.headline)) return false;
    const timestamp = publicationDate(post.datePublished)?.dateTime;
    if (!timestamp || timestamp.length === 10) return false;
    const age = now - Date.parse(timestamp);
    return age >= 0 && age < breakingWindow;
  });
  const headlines = (breaking.length ? breaking : sorted).slice(0, 5);

  return <nav className={styles.headlines} aria-labelledby={heading}>
    <h2 id={heading}>{t(breaking.length ? 'breaking' : 'headlines')}</h2>
    <ul>{headlines.map(post => <li key={post.slug}>
      <DocumentLink href={post.href||'/blog/' + encodeURIComponent(post.slug)} lang="en-KE">{post.headline}</DocumentLink>
    </li>)}</ul>
  </nav>;
}
