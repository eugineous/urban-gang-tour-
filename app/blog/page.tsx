import {Suspense} from 'react';
import UrbanNewsFrontPage from '@/app/_components/UrbanNewsFrontPage';
import {getKenyaXLinks} from '@/lib/server/urban-news-briefs';
import {readNewsDesk} from '@/app/_lib/news-desk';
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
import {requestTime} from '@/lib/server/request-time';
import {SITE} from '@/lib/site';
export const dynamic='force-dynamic';
type Props={searchParams?:Promise<NewsArchiveParams>};
export async function generateMetadata({searchParams}:Props={}):Promise<Metadata>{
 const newsMode=urbanNewsEnabled();
 const query=newsArchiveQuery(await searchParams,{newsMode});
 const base=await metadataForPathDynamic('/blog');
 if(newsMode){const countryName=query.country&&query.country!=='Global'?new Intl.DisplayNames(['en'],{type:'region'}).of(query.country):'Kenya and East Africa'; const title='Urban News | '+countryName+' entertainment and music',description='Read Urban News entertainment stories, music releases and culture coverage from '+countryName+'.';Object.assign(base,{title,description,openGraph:{...base.openGraph,title,description},twitter:{...base.twitter,title,description}});}
 const url=SITE.domain+newsArchiveHref(query);
 return {...base,alternates:{...base.alternates,canonical:url},openGraph:{...base.openGraph,url},...(query.q||query.category!=='all'?{robots:{index:false,follow:true}}:{})};
}
export default async function BlogIndex({searchParams}:Props={}){
  const newsMode=urbanNewsEnabled();
  const query=newsArchiveQuery(await searchParams,{newsMode});
  if(newsMode){
    const [{visible,pageCount,current},xLinks]=await Promise.all([readNewsDesk(query),(!query.country||query.country==='KE')?getKenyaXLinks():[]]);
    if(query.page>pageCount){
      if(current)notFound();
      return <section className="wrap"><h1>Urban News</h1><p role="status">Stories are temporarily unavailable.</p></section>;
    }
    const items=visible.map(story=>({...story,date:story.datePublished,country:story.newsCountry}));
    const headlines=visible.map(story=>({...story,description:story.summary}));
    return <><JsonLd data={structuredDataForPath('/blog')}/><UrbanNewsFrontPage stories={items} latest={headlines} query={query} now={requestTime()} pages={pageCount} xLinks={xLinks}
      trend={(!query.country||query.country==='KE')&&!query.q&&query.page===1?<Suspense fallback={null}><UrbanMusicChart/></Suspense>:undefined}/></>;
  }
  const feed=await getBlogPosts(true).then(posts=>({posts,current:true}),()=>({posts:[],current:false}));
  const posts=newestPublishedFirst(feed.posts);
  const archive=newsArchive(posts,query,{newsMode});
  if(feed.current&&query.page>archive.pageCount)notFound();
  const url=SITE.domain+newsArchiveHref(query),schema={...newsIndexJsonLd(archive.visible),'@id':url+'#collection',url};
  return <><JsonLd data={[...structuredDataForPath('/blog'),schema]}/><HostedSite path="/blog" screens={[]} events={[]} products={[]} newsCurrent={feed.current} newsArchive={query} posts={posts.map(p=>({id:p.slug,headline:p.headline,date:p.datePublished,section:p.section,img:p.image,dek:p.description,imageAlt:p.imageAlt}))}/></>;
}
