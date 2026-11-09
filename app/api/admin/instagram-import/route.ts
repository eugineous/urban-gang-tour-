import {NextResponse} from 'next/server';
import {verifyAdminSession,hasPerm,isSuperAdmin} from '@/lib/server/session';
import {requireOrigin} from '@/lib/server/origin';
import {clientIp,rateLimit} from '@/lib/server/ratelimit';
import {readJsonObject} from '@/lib/server/json-body';
import {readPublicInstagramArchive} from '@/lib/server/instagram-archive';
import {INSTAGRAM_ACCOUNT,INSTAGRAM_PROFILE,INSTAGRAM_REPOSITORY,INSTAGRAM_WORKFLOW,normalizeOwnedInstagramUrl} from '@/lib/instagram-public.mjs';
export const dynamic='force-dynamic';
const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
async function allowed(request:Request){if(!await verifyAdminSession(request))return reply({error:'unauthorized'},401);if(!hasPerm(request,'gallery'))return reply({error:'forbidden'},403);return null}
/** Gallery staff may inspect; only the owner can queue a job. Secrets never leave the server. */
export async function GET(request:Request){
 const denial=await allowed(request);if(denial)return denial;
 if(!rateLimit('instagram-admin:'+clientIp(request),30,60000,request))return reply({error:'too_many_requests'},429);
 let archive;try{archive=await readPublicInstagramArchive()}catch{archive=null}
 return reply({ok:true,account:INSTAGRAM_ACCOUNT,profile:INSTAGRAM_PROFILE,repository:INSTAGRAM_REPOSITORY,workflowUrl:INSTAGRAM_WORKFLOW,archiveUrl:'https://github.com/'+INSTAGRAM_REPOSITORY+'/releases/tag/instagram-media',canImport:isSuperAdmin(request),dispatchConfigured:!!process.env.GITHUB_INSTAGRAM_TOKEN,archiveAvailable:!!archive,published:archive?.posts.length??null,archived:archive?.summary.archived??null,failed:archive?.summary.failed??null,lastUpdate:archive?.lastChecked??null,automation:archive?.automation??{enabled:false,publishGeneral:false}});
}
export async function POST(request:Request){
 const denial=await allowed(request);if(denial)return denial;if(!isSuperAdmin(request))return reply({error:'owner_required'},403);if(!requireOrigin(request))return reply({error:'bad_origin'},403);
 if(!rateLimit('instagram-dispatch:'+clientIp(request),3,60000,request))return reply({error:'too_many_requests'},429);
 const parsed=await readJsonObject(request,2048);if(!parsed.ok)return reply({error:parsed.error},parsed.status);const body=parsed.value;
 if(Object.keys(body).some(key=>!['profile','rightsConfirmed','publishGeneral','autoSync'].includes(key))||typeof body.profile!=='string'||body.profile.length>250||body.rightsConfirmed!==true||typeof body.publishGeneral!=='boolean'||body.autoSync!==undefined&&typeof body.autoSync!=='boolean')return reply({error:'invalid_import_request'},400);
 const profile=normalizeOwnedInstagramUrl(body.profile);if(!profile)return reply({error:'only_owned_instagram_allowed'},400);
 const token=process.env.GITHUB_INSTAGRAM_TOKEN;if(!token)return reply({error:'github_dispatch_not_configured',workflowUrl:INSTAGRAM_WORKFLOW},503);
 try{const response=await fetch('https://api.github.com/repos/'+INSTAGRAM_REPOSITORY+'/actions/workflows/instagram-import.yml/dispatches',{method:'POST',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},body:JSON.stringify({ref:'main',inputs:{profile,confirm_rights:'true',publish_general:String(body.publishGeneral),auto_sync:String(body.autoSync!==false)}}),signal:AbortSignal.timeout(15000)});await response.body?.cancel();if(response.status!==204)return reply({error:'github_workflow_unavailable'},502);return reply({ok:true,state:'queued',workflowUrl:INSTAGRAM_WORKFLOW},202)}catch{return reply({error:'github_workflow_unavailable'},502)}
}
