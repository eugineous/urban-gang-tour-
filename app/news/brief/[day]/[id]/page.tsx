import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {JsonLd} from '@/app/_components/JsonLd';
import {SITE} from '@/lib/site';
import {briefCountry,briefPhoto,getPublisherBrief,publisherBriefHref} from '@/lib/server/urban-news-briefs';
import {urbanNewsEnabled} from '@/lib/server/urban-news-mode';
import styles from '@/app/music/kenya-chart/report.module.css';

type Props={params:Promise<{day:string;id:string}>};
const timestamp=new Intl.DateTimeFormat('en-KE',{dateStyle:'long',timeStyle:'short',timeZone:'Africa/Nairobi'});

export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {day,id}=await params;
 const brief=urbanNewsEnabled()?await getPublisherBrief(day,id):null;
 if(!brief)return {title:'Story unavailable | Urban News',robots:{index:false,follow:true}};
 const path=publisherBriefHref(brief);
 const image=SITE.domain+(briefPhoto(brief)?.path||path+'/cover');
 return {title:brief.headline+' | Urban News',description:brief.body,alternates:{canonical:SITE.domain+path},
   robots:{index:true,follow:true,googleBot:{'max-image-preview':'large'}},
   openGraph:{type:'article',title:brief.headline,description:brief.body,url:SITE.domain+path,images:[image],publishedTime:brief.publishedAt},
   twitter:{card:'summary_large_image',title:brief.headline,description:brief.body,images:[image]}};
}

export default async function PublisherBriefPage({params}:Props){
 const {day,id}=await params;
 const brief=urbanNewsEnabled()?await getPublisherBrief(day,id):null;
 if(!brief)notFound();
 const country=briefCountry(brief),photo=briefPhoto(brief);
 const path=publisherBriefHref(brief),image=photo?.path||path+'/cover';
 const references=[{url:brief.url,label:brief.publisher},...(brief.references??[])];
 return <article className={styles.report} lang="en-KE">
   <JsonLd data={{'@context':'https://schema.org','@type':'NewsArticle',mainEntityOfPage:SITE.domain+path,
     headline:brief.headline,description:brief.body,articleSection:brief.topic,articleBody:[brief.body,...(brief.paragraphs??[])].join(' '),
     inLanguage:'en-KE',datePublished:brief.publishedAt,dateModified:brief.publishedAt,image:[SITE.domain+image],
     author:{'@type':'Organization',name:'Urban News',url:SITE.domain+'/blog'},
     publisher:{'@type':'Organization',name:'Urban News',url:SITE.domain+'/blog'},
     citation:references.map(source=>({'@type':'CreativeWork',name:source.label,url:source.url}))}}/>
   <Link href={'/blog?country='+brief.country} className={styles.back}>← Urban News</Link>
   <header><p className={styles.section}>{brief.topic} · {country}</p>
     <h1>{brief.headline}</h1>
     <p>Urban News · <time dateTime={brief.publishedAt}>{timestamp.format(new Date(brief.publishedAt))} EAT</time></p>
   </header>
   {photo?<figure className={styles.credit}>
     <img className={styles.cover} src={photo.path} srcSet={`${photo.small} 480w, ${photo.path} 960w`} sizes="(max-width:760px) 94vw, 720px" width={960} height={630} alt={photo.alt}/>
     <figcaption>{photo.alt}. <a href={photo.source} rel="noopener noreferrer">{photo.credit}</a> · <a href={photo.license} rel="license">{photo.licenseLabel}</a> · resized.</figcaption>
   </figure>:<img className={styles.cover} src={image} width="1200" height="630" alt="" />}
   <p className={styles.lede}>{brief.body}</p>
   {brief.paragraphs?.map(paragraph=><p key={paragraph}>{paragraph}</p>)}
   <p>{brief.publisher} published the source on <time dateTime={brief.sourceDate}>{timestamp.format(new Date(brief.sourceDate))} EAT</time>.</p>
   <footer><h2>Sources</h2><ul>{references.map(source=><li key={source.url}><a href={source.url} rel="external noopener noreferrer">{source.label} ↗</a></li>)}</ul></footer>
 </article>;
}
