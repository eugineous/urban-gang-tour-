import {POSTER_MAX_BYTES,readLimitedBody,ToolError,validatePoster} from './editor-tools';

// ChatGPT Actions expands openaiFileIdRefs into these short-lived signed links.
// No general URL import: never forward the editor credential or follow redirects.
export async function downloadActionPoster(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new ToolError('invalid_attachment');
 const body=value as Record<string,unknown>;
 if(Object.keys(body).some(key=>key!=='openaiFileIdRefs')||!Array.isArray(body.openaiFileIdRefs)||body.openaiFileIdRefs.length!==1)throw new ToolError('one_poster_required');
 const file=body.openaiFileIdRefs[0];
 if(!file||typeof file!=='object'||Array.isArray(file))throw new ToolError('invalid_attachment');
 const ref=file as Record<string,unknown>;
 if(Object.keys(ref).some(key=>!['id','name','mime_type','download_link'].includes(key))||typeof ref.id!=='string'||!/^file-[A-Za-z0-9_-]{8,200}$/.test(ref.id)||typeof ref.name!=='string'||ref.name.length>300||typeof ref.download_link!=='string'||ref.download_link.length>8192||!['image/png','image/jpeg','image/webp'].includes(String(ref.mime_type)))throw new ToolError('invalid_attachment');
 let url:URL;try{url=new URL(ref.download_link)}catch{throw new ToolError('invalid_attachment_url')}
 if(url.protocol!=='https:'||url.hostname!=='files.oaiusercontent.com'||url.port||url.username||url.password||url.hash||url.pathname!=='/'+ref.id)throw new ToolError('invalid_attachment_url');
 let response:Response;
 try{response=await fetch(url.toString(),{redirect:'manual',credentials:'omit',headers:{Accept:String(ref.mime_type)},signal:AbortSignal.timeout(10000)})}catch{throw new ToolError('attachment_unavailable',503)}
 if(response.status!==200){void response.body?.cancel().catch(()=>{});throw new ToolError('attachment_unavailable',400)}
 const bytes=await readLimitedBody(response,POSTER_MAX_BYTES),type=String(ref.mime_type);
 validatePoster(bytes,type);
 return {bytes,type};
}
