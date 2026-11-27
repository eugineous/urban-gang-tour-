import {getBlogPosts} from './blog';
import {briefPhoto,getBriefArchive,publisherBriefHref} from '@/lib/server/urban-news-briefs';
import {newsArchive,type NewsArchiveQuery} from '@/lib/shared/news-archive';

export async function readNewsDesk(query:NewsArchiveQuery) {
  const [feed,briefs]=await Promise.all([getBlogPosts(true).then(posts=>({posts,current:true}),()=>({posts:[],current:false})),getBriefArchive()]);
  const {posts,current}=feed;
  const sources=[
    ...posts.map(post=>({
      slug:post.slug,href:'/blog/'+encodeURIComponent(post.slug),headline:post.headline,summary:post.description,description:post.description,
      image:post.image||'/news/chart-edition.svg',imageAlt:post.imageAlt,imageSmall:undefined,
      section:post.section,datePublished:post.datePublished,newsCountry:post.newsCountry,
    })),
    ...briefs.map(brief=>{
      const href=publisherBriefHref(brief),photo=briefPhoto(brief);
      return {
        slug:brief.id,href,headline:brief.headline,summary:brief.body,description:brief.body,image:photo?.path||href+'/cover',
        imageAlt:photo?.alt,imageSmall:photo?.small,section:brief.topic,
        datePublished:brief.publishedAt,newsCountry:brief.country,
      };
    }),
  ];
  return {...newsArchive(sources,{...query,country:query.country==='Global'?'':query.country||'KE'},{newsMode:true}),current};
}
