import {getBlogPosts} from './blog';
import {briefPhoto,getBriefArchive,publisherBriefHref} from '@/lib/server/urban-news-briefs';
import {urbanNewsEnabled} from '@/lib/server/urban-news-mode';
import {publicationInstant} from '@/lib/editorial-time';

export async function getPublicNewsList(){
  const [posts,briefs]=await Promise.all([getBlogPosts().catch(()=>[]),urbanNewsEnabled()?getBriefArchive():[]]);
  return [
    ...posts.map(post=>({...post,path:'/blog/'+encodeURIComponent(post.slug)})),
    ...briefs.map(brief=>{
      const path=publisherBriefHref(brief);
      return {path,headline:brief.headline,description:brief.body,section:brief.topic,
        image:briefPhoto(brief)?.path||path+'/cover',schemaType:'NewsArticle',datePublished:new Date(brief.publishedAt).toISOString(),dateModified:new Date(brief.publishedAt).toISOString()};
    }),
  ].sort((a,b)=>publicationInstant(b.datePublished).getTime()-publicationInstant(a.datePublished).getTime());
}
