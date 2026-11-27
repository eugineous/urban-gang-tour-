import {realNewsImage} from '@/lib/shared/urban-news-editing';
import {getBlogPosts} from './blog';
import {briefPhoto,getBriefArchive,publisherBriefHref} from '@/lib/server/urban-news-briefs';
import {newsArchive,type NewsArchiveQuery} from '@/lib/shared/news-archive';

function sourceCount(urls:readonly string[]){
  return new Set(urls.flatMap(url=>URL.canParse(url)?[new URL(url).hostname.replace(/^www\./,'')]:[])).size;
}

export async function readNewsDesk(query:NewsArchiveQuery) {
  const [feed,briefs]=await Promise.all([getBlogPosts(true).then(posts=>({posts,current:true}),()=>({posts:[],current:false})),getBriefArchive()]);
  const {posts,current}=feed;
  const sources=[
    ...posts.map(post=>({
      slug:post.slug,href:'/blog/'+encodeURIComponent(post.slug),headline:post.headline,summary:post.description,description:post.description,
      image:realNewsImage(post.image),imageAlt:post.imageAlt,imageSrcSet:undefined,
      section:post.section,datePublished:post.datePublished,newsCountry:post.newsCountry,
      newsVerification:post.newsVerification,sourceCount:sourceCount(post.newsSources?.map(source=>source.url)??[]),sourceDate:post.datePublished,
    })),
    ...briefs.map(brief=>{
      const href=publisherBriefHref(brief),photo=briefPhoto(brief);
      return {
        slug:brief.id,href,headline:brief.headline,summary:brief.body,description:brief.body,image:photo?.path||'',
        imageAlt:photo?.alt,imageSrcSet:photo?.srcSet,section:brief.topic,categories:brief.categories,kind:brief.kind,
        datePublished:brief.publishedAt,newsCountry:brief.country,sourceDate:brief.sourceDate,
        newsVerification:'attributed' as const,sourceCount:sourceCount([brief.url,...(brief.references??[]).map(source=>source.url)]),
      };
    }),
  ];
  return {...newsArchive(query.q?sources:sources.filter(story=>story.image),{...query,country:query.country==='Global'?'':query.country||'KE'},{newsMode:true}),current};
}
