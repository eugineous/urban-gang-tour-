import {readToolJson,parseToolDraft,createToolDraft} from '@/lib/server/editor-tools';
import {toolRequest,toolJson,toolFailure} from '@/lib/server/editor-tool-http';
export const runtime='nodejs';
// Bearer event:draft only. Always INSERT draft; no updates/publication/tickets.
export async function POST(req:Request){try{
 const token=await toolRequest(req,'event:draft');
 const input=parseToolDraft(await readToolJson(req));
 return toolJson(await createToolDraft(token,input),201);
}catch(error){return toolFailure(error)}}
