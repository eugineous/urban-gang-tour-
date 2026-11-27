import {fetchBriefPhoto,getPublisherBrief} from '@/lib/server/urban-news-briefs';
import {urbanNewsEnabled} from '@/lib/server/urban-news-mode';

export async function GET(_req:Request,{params}:{params:Promise<{day:string;id:string;width:string}>}){
  const {day,id,width}=await params;
  if(!urbanNewsEnabled()||!['480','960'].includes(width))return new Response(null,{status:404});
  const brief=await getPublisherBrief(day,id);
  if(!brief?.sourcePhoto)return new Response(null,{status:404});
  return fetchBriefPhoto(brief,width).catch(()=>new Response(null,{status:503}));
}
