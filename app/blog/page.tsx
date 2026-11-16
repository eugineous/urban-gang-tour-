import type {Metadata} from 'next';
import {metadataForPathDynamic} from '@/app/_lib/seo';
import {newsIndexJsonLd,structuredDataForPath} from '@/app/_lib/jsonld';
import {JsonLd} from '@/app/_components/JsonLd';
import {getBlogPosts} from '@/app/_lib/blog';
import {newestPublishedFirst} from '@/lib/shared/newsroom-chronology';
import HostedSite from '@/ui/components/HostedSite';
import {notFound} from 'next/navigation';
import {newsArchive,newsArchiveHref,newsArchiveQuery,type NewsArchiveParams} from '@/lib/shared/news-archive';
import {SITE} from '@/lib/site';
export const dynamic='force-dynamic';
type Props={searchParams?:Promise<NewsArchiveParams>};
export async function generateMetadata({searchParams}:Props={}):Promise<Metadata>{
 const query=newsArchiveQuery(await searchParams),base=await metadataForPathDynamic('/blog');
 const url=SITE.domain+newsArchiveHref(query);
 return {...base,alternates:{...base.alternates,canonical:url},openGraph:{...base.openGraph,url},...(query.q||query.category!=='all'?{robots:{index:false,follow:true}}:{})};
}
export default async function BlogIndex({searchParams}:Props={}){
  const query=newsArchiveQuery(await searchParams);
  const feed=await getBlogPosts(true).then(posts=>({posts,current:true}),()=>({posts:[],current:false}));
  const posts=newestPublishedFirst(feed.posts);
  const archive=newsArchive(posts,query);
  if(feed.current&&query.page>archive.pageCount)notFound();
  const url=SITE.domain+newsArchiveHref(query),schema={...newsIndexJsonLd(archive.visible),'@id':url+'#collection',url};
  return <><JsonLd data={[...structuredDataForPath('/blog'),schema]}/><HostedSite path="/blog" screens={[]} events={[]} products={[]} newsCurrent={feed.current} newsArchive={query} posts={posts.map(p=>({id:p.slug,headline:p.headline,date:p.datePublished,section:p.section,img:p.image,dek:p.description,imageAlt:p.imageAlt}))}/></>;
}
