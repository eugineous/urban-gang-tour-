import {afterEach,it,expect,vi} from 'vitest';
import {mkdtemp,writeFile,chmod,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {run,readCredential} from '../scripts/editor-tools.mjs';
const token='ugt_edit_'+'x'.repeat(43);const dirs:string[]=[];
async function file(name:string,content:string|Buffer){const dir=await mkdtemp(join(tmpdir(),'ugt-tool-fixture-'));dirs.push(dir);const path=join(dir,name);await writeFile(path,content,{mode:0o600});return path}
afterEach(async()=>{await Promise.all(dirs.splice(0).map(path=>rm(path,{recursive:true,force:true})))});
it('reads private credential files and refuses world-readable files',async()=>{
 const path=await file('token',token);expect(await readCredential({UGT_EDITOR_TOKEN_FILE:path})).toBe(token);
 await chmod(path,0o644);await expect(readCredential({UGT_EDITOR_TOKEN_FILE:path})).rejects.toThrow('private file');
});
it('rejects credential arguments and offsite base URLs before network access',async()=>{
 const fetcher=vi.fn();await expect(run(['draft','event.json',token],{UGT_EDITOR_TOKEN:token},fetcher)).rejects.toThrow('Usage');
 await expect(run(['draft','event.json'],{UGT_EDITOR_TOKEN:token,UGT_EDITOR_BASE_URL:'https://attacker.test'},fetcher)).rejects.toThrow('owned HTTPS');expect(fetcher).not.toHaveBeenCalled();
});
it('uploads detected image bytes with Bearer authorization and redirect refusal',async()=>{
 const path=await file('poster.bin',Buffer.from([255,216,255]));const fetcher=vi.fn(async()=>Response.json({posterId:'fixture'}));
 expect(await run(['upload',path],{UGT_EDITOR_TOKEN:token},fetcher)).toEqual({posterId:'fixture'});
 const [url,options]=fetcher.mock.calls[0] as unknown as [URL,RequestInit];expect(url.href).toBe('https://urbangangtour.co.ke/api/editor-tools/posters');expect(options.redirect).toBe('error');expect(options.headers).toMatchObject({Authorization:'Bearer '+token,'Content-Type':'image/jpeg'});
});
it('preserves saved request IDs and sends draft JSON without inventing details',async()=>{
 const event={requestId:'66320821-83a0-4ca7-a72c-825698117305',kind:'school',name:'Local fixture'};
 const path=await file('event.json',JSON.stringify(event));const fetcher=vi.fn(async()=>Response.json({id:'event-fixture',status:'draft'}));
 await run(['draft',path],{UGT_EDITOR_TOKEN:token},fetcher);
 expect((fetcher.mock.calls[0] as unknown as [URL,RequestInit])[1].body).toBe(JSON.stringify(event));
});
it('does not echo arbitrary server responses containing a credential',async()=>{
 const path=await file('poster.png',Buffer.from([255,216,255]));
 await expect(run(['upload',path],{UGT_EDITOR_TOKEN:token},async()=>Response.json({error:token},{status:401}))).rejects.toThrow('UGT request rejected (401): request_failed');
});
