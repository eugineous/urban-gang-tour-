import type {Metadata} from 'next';
import {metadataForPathDynamic} from '@/app/_lib/seo';
import {newsIndexJsonLd,structuredDataForPath} from '@/app/_lib/jsonld';
import {JsonLd} from '@/app/_components/JsonLd';
import {getBlogPosts} from '@/app/_lib/blog';
import {newestPublishedFirst} from '@/lib/shared/newsroom-chronology';
import HostedSite from '@/ui/components/HostedSite';
export const dynamic='force-dynamic';
export async function generateMetadata():Promise<Metadata>{return metadataForPathDynamic('/blog')}
export default async function BlogIndex(){
  const feed=await getBlogPosts(true).then(posts=>({posts,current:true}),()=>({posts:[],current:false}));
  const posts=newestPublishedFirst(feed.posts);
  return <><JsonLd data={[...structuredDataForPath('/blog'),newsIndexJsonLd(posts)]}/><HostedSite path="/blog" screens={[]} events={[]} products={[]} newsCurrent={feed.current} posts={posts.map(p=>({id:p.slug,headline:p.headline,date:p.datePublished,section:p.section,img:p.image,dek:p.description,imageAlt:p.imageAlt}))}/></>;
}
