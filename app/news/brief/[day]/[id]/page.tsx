import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ShareBar} from '@/app/_components/ShareBar';
import ArticleText,{ArticleInline} from '@/app/_components/ArticleText';
import {JsonLd} from '@/app/_components/JsonLd';
import {SITE} from '@/lib/site';
import {briefCountry,briefPhoto,getPublisherBrief,getPublisherBriefs,publisherBriefHref} from '@/lib/server/urban-news-briefs';
import {urbanNewsEnabled} from '@/lib/server/urban-news-mode';
import styles from '@/app/music/kenya-chart/report.module.css';

type Props={params:Promise<{day:string;id:string}>};
const timestamp=new Intl.DateTimeFormat('en-KE',{dateStyle:'long',timeStyle:'short',timeZone:'Africa/Nairobi'});

export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {day,id}=await params;
 const brief=urbanNewsEnabled()?await getPublisherBrief(day,id):null;
 if(!brief)return {title:'Story unavailable | Urban News',robots:{index:false,follow:true}};
 const path=publisherBriefHref(brief);
 const photo=briefPhoto(brief);
 const images=photo?[SITE.domain+photo.path]:undefined;
 return {title:brief.headline+' | Urban News',description:brief.body,alternates:{canonical:SITE.domain+path},
   robots:{index:true,follow:true,googleBot:{'max-image-preview':'large'}},
   openGraph:{type:'article',title:brief.headline,description:brief.body,url:SITE.domain+path,images,publishedTime:brief.publishedAt},
   twitter:{card:'summary_large_image',title:brief.headline,description:brief.body,images}};
}

export default async function PublisherBriefPage({params}:Props){
 const {day,id}=await params;
 const brief=urbanNewsEnabled()?await getPublisherBrief(day,id):null;
 if(!brief)notFound();
 const country=briefCountry(brief),photo=briefPhoto(brief);
 const path=publisherBriefHref(brief);
 const references=[{url:brief.url,label:brief.publisher},...(brief.references??[])];
 const paragraphs=(brief.paragraphs??[]).flatMap(block=>block.split(/\n\s*\n/)).filter(Boolean);
 const readNext=(await getPublisherBriefs(brief.country)).filter(story=>story.id!==brief.id&&briefPhoto(story)).slice(0,3);
 return <article className={styles.report} lang="en-KE">
   <JsonLd data={{'@context':'https://schema.org','@type':'NewsArticle',mainEntityOfPage:SITE.domain+path,
     headline:brief.headline,description:brief.body,articleSection:brief.topic,articleBody:[brief.body,...(brief.paragraphs??[])].join(' '),
     inLanguage:'en-KE',datePublished:brief.publishedAt,dateModified:brief.publishedAt,...(photo?{image:[SITE.domain+photo.path]}:{}),
     author:{'@type':'Organization',name:'Urban News',url:SITE.domain+'/blog'},
     publisher:{'@type':'Organization',name:'Urban News',url:SITE.domain+'/blog'},
     citation:references.map(source=>({'@type':'CreativeWork',name:source.label,url:source.url}))}}/>
   <Link href={'/blog?country='+brief.country} className={styles.back}>← Urban News</Link>
   <header><p className={styles.section}>{brief.topic} · {country}</p>
     <h1>{brief.headline}</h1>
     <p>Urban News · <time dateTime={brief.publishedAt}>{timestamp.format(new Date(brief.publishedAt))} EAT</time></p>
   </header>
   {photo?<figure className={styles.credit}>
     <img className={styles.cover} src={photo.path} srcSet={photo.srcSet} sizes="(max-width:760px) 94vw, 720px" width={960} height={630} alt={photo.alt}/>
     <figcaption>{photo.alt}. <a href={photo.source} rel="noopener noreferrer">{photo.credit}</a> · <a href={photo.license} rel="license">{photo.licenseLabel}</a> · resized.</figcaption>
   </figure>:null}
   <div className={styles.articleCopy}>
     <p className={styles.lede}><ArticleInline text={brief.body}/></p>
     {paragraphs.map((paragraph,index)=><ArticleText key={index} paragraph={paragraph}/>)}
   </div>
   <p>{brief.publisher} published the source on <time dateTime={brief.sourceDate}>{timestamp.format(new Date(brief.sourceDate))} EAT</time>.</p>
   <ShareBar url={SITE.domain+path} title={brief.headline}/>
   <footer><h2>Sources</h2><ul>{references.map(source=><li key={source.url}><a href={source.url} rel="external noopener noreferrer">{source.label} ↗</a></li>)}</ul><Link href="/contact-us">Report a correction ↗</Link></footer>
   {readNext.length>0&&<aside className={styles.readNext}><h2>Read next</h2><ul>{readNext.map(story=><li key={story.id}><Link href={publisherBriefHref(story)}>{story.headline}</Link></li>)}</ul></aside>}
 </article>;
}
