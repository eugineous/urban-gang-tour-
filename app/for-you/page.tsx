import {getBlogPostSummaries} from '@/app/_lib/blog';
import {urbanNewsEnabled} from '@/lib/server/urban-news-mode';
import {requestTime} from '@/lib/server/request-time';
import {redirect} from 'next/navigation';
import NewsEdition from '@/app/_components/NewsEdition';
export const dynamic='force-dynamic';
export const metadata={title:'Your edition — Urban News',robots:{index:false,follow:true}};
export default async function Page(){
 if(!await urbanNewsEnabled())redirect('/blog');
 const feed=await getBlogPostSummaries(true).then(posts=>({posts:posts.slice(0,200),current:true}),()=>({posts:[],current:false}));
 return <section className="modern-page wrap"><NewsEdition {...feed} now={requestTime()}/><a href="/blog">Latest Urban News →</a></section>;
}
