import {NextResponse} from 'next/server';
import {q,hasDb} from '@/lib/server/db';
import {adminActor,hasPerm,isSuperAdmin,verifyAdminSession} from '@/lib/server/session';
import {requireOrigin} from '@/lib/server/origin';
import {ensureContentWorkflowSchema} from '@/lib/server/content-workflow';
import {ensureStoryWorkspaceSchema,saveStoryDraft,restoreStory} from '@/lib/server/story-workspace';
import {exactKeys,isDraftId,storyDraftContent} from '@/lib/story-draft';

export const dynamic='force-dynamic';
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
async function guard(req:Request,write=false){
  if(!await verifyAdminSession(req))return reply({error:'unauthorized'},401);
  if(!hasPerm(req,'content'))return reply({error:'forbidden'},403);
  if(write&&!requireOrigin(req))return reply({error:'bad_origin'},403);
  if(!hasDb())return reply({error:'db_not_configured'},503);
}

/** Content-permitted admins: own private drafts only. Trash: owner or the administrator who removed the story. */
export async function GET(req:Request){
  const blocked=await guard(req);if(blocked)return blocked;
  const params=new URL(req.url).searchParams;
  const id=params.get('id');const revision=params.get('revision');
  if([...params.keys()].some(key=>!['id','revision'].includes(key))||id&&!isDraftId(id)||revision&&(!id||!/^\d{1,9}$/.test(revision)||Number(revision)<1))return reply({error:'invalid_request'},400);
  try{
    await ensureStoryWorkspaceSchema();const actor=adminActor(req);
    if(id){
      const drafts=await q(`SELECT id,content,revision,updated_at FROM admin_story_drafts WHERE id=$1 AND actor=$2`,[id,actor]);
      if(!drafts.length)return reply({error:'not_found'},404);
      if(revision){
        const previous=await q(`SELECT content,revision,saved_at FROM admin_story_revisions WHERE draft_id=$1 AND revision=$2`,[id,Number(revision)]);
        if(!previous.length)return reply({error:'not_found'},404);
        return reply({ok:true,draft:{...drafts[0],content:previous[0].content},restoredRevision:previous[0].revision});
      }
      const revisions=await q(`SELECT revision,saved_at FROM admin_story_revisions WHERE draft_id=$1 ORDER BY revision DESC LIMIT 100`,[id]);
      return reply({ok:true,draft:drafts[0],revisions});
    }
    const [drafts,trash]=await Promise.all([
      q(`SELECT id,content->>'headline' AS headline,revision,updated_at FROM admin_story_drafts WHERE actor=$1 ORDER BY updated_at DESC LIMIT 100`,[actor]),
      q(`SELECT slug,snapshot->>'headline' AS headline,removed_at FROM admin_story_trash WHERE $2::boolean OR removed_by=$1 ORDER BY removed_at DESC LIMIT 100`,[actor,isSuperAdmin(req)])
    ]);
    return reply({ok:true,drafts,trash});
  }catch{return reply({error:'workspace_unavailable'},503)}
}

export async function POST(req:Request){
  const blocked=await guard(req,true);if(blocked)return blocked;
  // Bound bytes before parsing. A private draft is not an arbitrary JSON storage service.
  const reader=req.body?.getReader();if(!reader)return reply({error:'invalid_request'},400);
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>170000){await reader.cancel();return reply({error:'draft_too_large'},413)}chunks.push(part.value)}}catch{return reply({error:'invalid_request'},400)}
  let body:Record<string,unknown>;
  try{const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}body=JSON.parse(new TextDecoder().decode(bytes));if(!body||typeof body!=='object'||Array.isArray(body))throw Error()}catch{return reply({error:'invalid_request'},400)}
  const actor=adminActor(req);
  if(body.action==='saveDraft'){
    if(!exactKeys(body,['action','id','revision','content'])||!isDraftId(body.id)||!Number.isSafeInteger(body.revision)||Number(body.revision)<0||Number(body.revision)>1000000000)return reply({error:'invalid_request'},400);
    let content;try{
      if(!body.content||typeof body.content!=='object'||Array.isArray(body.content)||!exactKeys(body.content as Record<string,unknown>,['slug','headline','section','image','dek','body','date','published','submitForReview','expectedVersion']))throw Error();
      content=storyDraftContent(body.content);
    }catch{return reply({error:'invalid_story'},400)}
    try{const draft=await saveStoryDraft(body.id,actor,Number(body.revision),content);return draft?reply({ok:true,draft}):reply({error:'draft_conflict'},409)}catch{return reply({error:'workspace_unavailable'},503)}
  }
  if(body.action==='restoreStory'){
    if(!exactKeys(body,['action','slug'])||typeof body.slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug)||body.slug.length>70)return reply({error:'invalid_request'},400);
    try{await ensureContentWorkflowSchema();const rows=await restoreStory(body.slug,actor,isSuperAdmin(req));return rows.length?reply({ok:true,published:false}):reply({error:'restore_conflict'},409)}catch{return reply({error:'workspace_unavailable'},503)}
  }
  return reply({error:'invalid_action'},400);
}
