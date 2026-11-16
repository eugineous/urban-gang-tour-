import {POSTER_MAX_BYTES,readLimitedBody,readToolJson,uploadToolPoster,ToolError} from '@/lib/server/editor-tools';
import {downloadActionPoster} from '@/lib/server/editor-tool-attachments';
import {toolRequest,toolJson,toolFailure} from '@/lib/server/editor-tool-http';
export const runtime='nodejs';
// Bearer poster:upload only; local binary or an exact, short-lived Actions attachment.
export async function POST(req:Request){try{
 const token=await toolRequest(req,'poster:upload');
 const type=req.headers.get('content-type')?.split(';')[0].trim()||'';
 if(type==='application/json'){
  const attachment=await downloadActionPoster(await readToolJson(req,8192));
  return toolJson(await uploadToolPoster(token,attachment.bytes,attachment.type),201);
 }
 if(!['image/jpeg','image/png','image/webp'].includes(type))throw new ToolError('invalid_content_type',415);
 const bytes=await readLimitedBody(req,POSTER_MAX_BYTES);
 return toolJson(await uploadToolPoster(token,bytes,type),201);
}catch(error){return toolFailure(error)}}
