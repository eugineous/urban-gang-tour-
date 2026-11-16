import {verifyAdminSession,isSuperAdmin,adminActor} from '@/lib/server/session';
import {requireOrigin} from '@/lib/server/origin';
import {rateLimit,clientIp} from '@/lib/server/ratelimit';
import {listToolKeys,issueToolKey,revokeToolKey,parseToolGrant,readToolJson,ToolError} from '@/lib/server/editor-tools';
import {toolJson,toolFailure} from '@/lib/server/editor-tool-http';
export const runtime='nodejs';
// Super admin only. Machine credentials and scoped crew cookies are never accepted.
async function guard(req:Request,write=false){
 if(!await verifyAdminSession(req)||!isSuperAdmin(req))throw new ToolError('unauthorized',401);
 if(write&&!requireOrigin(req))throw new ToolError('bad_origin',403);
 if(!rateLimit('connected-tools:'+clientIp(req),20,60000))throw new ToolError('too_many_requests',429);
}
export async function GET(req:Request){try{await guard(req);return toolJson({keys:await listToolKeys()})}catch(error){return toolFailure(error)}}
export async function POST(req:Request){try{await guard(req,true);const input=parseToolGrant(await readToolJson(req,2048));return toolJson(await issueToolKey(input,adminActor(req)),201)}catch(error){return toolFailure(error)}}
export async function DELETE(req:Request){try{
 await guard(req,true);const value=await readToolJson(req,512);
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>k!=='id'))throw new ToolError('invalid_body');
 return toolJson(await revokeToolKey((value as {id?:unknown}).id,adminActor(req)));
}catch(error){return toolFailure(error)}}
