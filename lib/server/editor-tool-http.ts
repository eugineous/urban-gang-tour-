import {NextResponse} from 'next/server';
import {sameOrigin} from './origin';
import {rateLimit,clientIp} from './ratelimit';
import {ToolError,bearerToken,checkToolCredential,type ToolScope} from './editor-tools';
export function toolJson(value:unknown,status=200){return NextResponse.json(value,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}})}
export function toolFailure(error:unknown){return error instanceof ToolError?toolJson({error:error.message},error.status):toolJson({error:'tools_unavailable'},503)}
export async function toolRequest(req:Request,scope:ToolScope){
 if(!sameOrigin(req))throw new ToolError('bad_origin',403);
 // Worker sharedRateGuard supplies the distributed network budget. The SQL
 // credential budget is authoritative across isolates; this is a local backstop.
 if(!rateLimit('editor-tools:'+clientIp(req),30,60000))throw new ToolError('too_many_requests',429);
 const token=bearerToken(req);await checkToolCredential(token,scope);return token;
}
