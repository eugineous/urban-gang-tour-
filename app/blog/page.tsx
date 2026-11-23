import {Suspense} from 'react';
import UrbanMusicChart from '@/app/_components/UrbanMusicChart';
import type {Metadata} from 'next';
import {metadataForPathDynamic} from '@/app/_lib/seo';
import {newsIndexJsonLd,structuredDataForPath} from '@/app/_lib/jsonld';
import {JsonLd} from '@/app/_components/JsonLd';
import {getBlogPosts} from '@/app/_lib/blog';
import {newestPublishedFirst} from '@/lib/shared/newsroom-chronology';
import HostedSite from '@/ui/components/HostedSite';
import {notFound} from 'next/navigation';
import {newsArchive,newsArchiveHref,newsArchiveQuery,type NewsArchiveParams} from '@/lib/shared/news-archive';
import {urbanNewsEnabled} from '@/lib/server/urban-news-mode';
import {UrbanNewsIndex} from '@/app/_components/UrbanNews';
import {SITE} from '@/lib/site';
export const dynamic='force-dynamic';
type Props={searchParams?:Promise<NewsArchiveParams>};
export async function generateMetadata({searchParams}:Props={}):Promise<Metadata>{
 const newsMode=urbanNewsEnabled();
 const query=newsArchiveQuery(await searchParams,{newsMode});
 const base=await metadataForPathDynamic('/blog');
 if(newsMode){const title='Urban News — Entertainment & Culture',description='Reviewed entertainment and culture reporting with sources, alongside Urban Gang Tour events and merchandise.';Object.assign(base,{title,description,openGraph:{...base.openGraph,title,description},twitter:{...base.twitter,title,description}});}
 const url=SITE.domain+newsArchiveHref(query);
 return {...base,alternates:{...base.alternates,canonical:url},openGraph:{...base.openGraph,url},...(query.q||query.category!=='all'||query.country?{robots:{index:false,follow:true}}:{})};
}
export default async function BlogIndex({searchParams}:Props={}){
  const newsMode=urbanNewsEnabled();
  const query=newsArchiveQuery(await searchParams,{newsMode});
  const feed=await getBlogPosts(true).then(posts=>({posts,current:true}),()=>({posts:[],current:false}));
  const posts=newestPublishedFirst(feed.posts);
  const archive=newsArchive(posts,query,{newsMode});
  if(feed.current&&query.page>archive.pageCount)notFound();
  const url=SITE.domain+newsArchiveHref(query),schema={...newsIndexJsonLd(archive.visible),'@id':url+'#collection',url};
  if(newsMode)return <><JsonLd data={[...structuredDataForPath('/blog'),schema]}/><UrbanNewsIndex chart={query.page===1&&!query.q&&(!query.country||query.country==='KE')&&['all','music'].includes(query.category)?<Suspense fallback={null}><UrbanMusicChart/></Suspense>:undefined} posts={archive.visible} query={query} pageCount={archive.pageCount} current={feed.current} countries={[...new Set(posts.map(p=>p.newsCountry).filter((country):country is string=>!!country))].sort()}/></>;
  return <><JsonLd data={[...structuredDataForPath('/blog'),schema]}/><HostedSite path="/blog" screens={[]} events={[]} products={[]} newsCurrent={feed.current} newsArchive={query} posts={posts.map(p=>({id:p.slug,headline:p.headline,date:p.datePublished,section:p.section,img:p.image,dek:p.description,imageAlt:p.imageAlt}))}/></>;
}
