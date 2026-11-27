import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {briefCountry,getPublisherBrief,publisherBriefHref} from '@/lib/server/urban-news-briefs';
import {urbanNewsEnabled} from '@/lib/server/urban-news-mode';
import styles from '@/app/music/kenya-chart/report.module.css';

type Props={params:Promise<{day:string;id:string}>};
const timestamp=new Intl.DateTimeFormat('en-KE',{dateStyle:'long',timeStyle:'short',timeZone:'Africa/Nairobi'});

export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {day,id}=await params;
 const brief=urbanNewsEnabled()?await getPublisherBrief(day,id):null;
 if(!brief)return {title:'Story unavailable | Urban News',robots:{index:false,follow:true}};
 const path=publisherBriefHref(brief);
 return {title:brief.headline+' | Urban News',alternates:{canonical:path},
   openGraph:{type:'article',title:brief.headline,images:[path+'/cover'],publishedTime:brief.publishedAt}};
}

export default async function PublisherBriefPage({params}:Props){
 const {day,id}=await params;
 const brief=urbanNewsEnabled()?await getPublisherBrief(day,id):null;
 if(!brief)notFound();
 const country=briefCountry(brief);
 return <article className={styles.report} lang="en-KE">
   <Link href="/blog" className={styles.back}>← Urban News</Link>
   <header><p className={styles.section}>{brief.topic} · {country}</p>
     <h1>{brief.headline}</h1>
     <p>Urban News · <time dateTime={brief.publishedAt}>{timestamp.format(new Date(brief.publishedAt))} EAT</time></p>
   </header>
   <img className={styles.cover} src={publisherBriefHref(brief)+'/cover'} width="1200" height="630" alt="" />
   <p className={styles.lede}>{brief.body}</p>
   <p>{brief.publisher} reported this update on <time dateTime={brief.sourceDate}>{timestamp.format(new Date(brief.sourceDate))} EAT</time>.</p>
   <footer><a href={brief.url} rel="external noopener noreferrer">Source report from {brief.publisher} ↗</a></footer>
 </article>;
}
