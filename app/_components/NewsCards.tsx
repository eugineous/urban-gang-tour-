'use client';
import type {BlogPostSummary} from '@/app/_lib/blog';
import type {NewsVerification} from '@/lib/shared/urban-news';
import {NEWS_CATEGORIES} from '@/lib/shared/urban-news';
import {PublicationDate} from '@/ui/components/PublicationDate';
import DocumentLink from '@/ui/components/DocumentLink';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {newsMessages} from '@/ui/i18n/catalogues/news';
import {readingMessages} from '@/ui/i18n/catalogues/reading';
import styles from './UrbanNews.module.css';
export type NewsCard=BlogPostSummary&{newsCountry?:string;newsVerification?:NewsVerification};
export function NewsCards({posts,lead=false,why}:{posts:NewsCard[];lead?:boolean;why?:Record<string,readonly string[]>}){const t=useMessages(newsMessages),reading=useMessages(readingMessages);return <div className={styles.cards} data-lead={lead||undefined}>{posts.map((post,i)=><article key={post.slug} className={styles.card} data-news-story={post.slug}><DocumentLink href={'/blog/'+encodeURIComponent(post.slug)}>{post.image&&<div className={styles.art}><img src={post.image} alt={post.imageAlt||''} loading={lead&&i===0?'eager':'lazy'}/></div>}<div className={styles.copy}><p className={styles.meta}><span>{NEWS_CATEGORIES.includes(post.section.toLowerCase() as typeof NEWS_CATEGORIES[number])?t(post.section.toLowerCase() as typeof NEWS_CATEGORIES[number]):post.section}</span>{post.newsCountry&&<span>{post.newsCountry}</span>}</p><h2 lang="en-KE">{post.headline}</h2><p className={styles.dek} lang="en-KE">{post.description}</p><div className={styles.meta}><PublicationDate value={post.datePublished}/>{post.newsVerification&&<span>{t(post.newsVerification)}</span>}</div></div></DocumentLink>{why?.[post.slug]?.length?<details className={styles.reason}><summary>{reading('why')}</summary><ul>{why[post.slug].map(reason=><li key={reason}>{reason}</li>)}</ul></details>:null}</article>)}</div>}
export function NewsEmpty({current=true,filtered=false}:{current?:boolean;filtered?:boolean}){const t=useMessages(newsMessages);return <div className={styles.empty} role="status"><h2>{!current?t('unavailable'):filtered?t('noMatches'):t('noStories')}</h2><p>{!current?t('retry'):filtered?t('changeFilters'):t('emptyDetail')}</p><DocumentLink href="/blog">{t('all')}</DocumentLink><DocumentLink href="/editorial-policy">{t('policy')}</DocumentLink></div>}
