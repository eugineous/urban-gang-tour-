import {briefPhoto,getPublisherBriefs,publisherBriefHref} from '@/lib/server/urban-news-briefs';
import {urbanNewsEnabled} from '@/lib/server/urban-news-mode';
import {clientIp,deviceId,PUBLIC_READ_NETWORK_LIMIT,rateLimit} from '@/lib/server/ratelimit';

export const dynamic='force-dynamic';
export async function GET(req:Request){
  const readBudget=deviceId(req)?60:PUBLIC_READ_NETWORK_LIMIT;
  if(!rateLimit('site-news-preview:'+clientIp(req),readBudget,60_000,req,PUBLIC_READ_NETWORK_LIMIT)){
    return Response.json({error:'too_many_requests'},{status:429,headers:{'Cache-Control':'no-store'}});
  }
  const story=urbanNewsEnabled()?(await getPublisherBriefs('KE')).find(brief=>briefPhoto(brief)):undefined;
  return Response.json(story?{headline:story.headline,path:publisherBriefHref(story)}:null,
    {headers:{'Cache-Control':'public,max-age=120'}});
}
