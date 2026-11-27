import {readNewsDesk} from '@/app/_lib/news-desk';
import {newsArchiveQuery} from '@/lib/shared/news-archive';
import {urbanNewsEnabled} from '@/lib/server/urban-news-mode';

export const dynamic='force-dynamic';

export async function GET(req:Request) {
  if(!urbanNewsEnabled())return new Response(null,{status:404});
  const params=new URL(req.url).searchParams;
  const query=newsArchiveQuery(Object.fromEntries([...new Set(params.keys())].map(key=>{const values=params.getAll(key);return [key,values.length===1?values[0]:values]})),{newsMode:true});
  const archive=await readNewsDesk(query);
  return Response.json({pageCount:archive.pageCount},{status:!archive.current&&query.page>archive.pageCount?503:200,headers:{'Cache-Control':'no-store'}});
}
