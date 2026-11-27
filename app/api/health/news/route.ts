import {briefPhoto,getPublisherBriefs} from '@/lib/server/urban-news-briefs';
import {urbanNewsEnabled} from '@/lib/server/urban-news-mode';

export const dynamic='force-dynamic';
export async function GET(){
  const enabled=urbanNewsEnabled();
  const stories=enabled?(await getPublisherBriefs()).filter(briefPhoto):[];
  const latest=stories.at(0)?.publishedAt??null;
  const sources=[...new Set(stories.map(story=>story.publisher))];
  const current=stories.some(story=>story.kind!=='feature'&&Date.now()-Date.parse(story.sourceDate)<48*3600_000);
  return Response.json({status:!enabled?'disabled':current?'current':'awaiting_sources',latest,stories:stories.length,sources},
    {status:!enabled||current?200:503,headers:{'Cache-Control':'no-store'}});
}
