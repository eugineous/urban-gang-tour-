import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({fetch:vi.fn()}));
beforeEach(()=>{state.fetch.mockReset();vi.stubGlobal('fetch',state.fetch)});
const file=(url='https://files.oaiusercontent.com/file-AbCdEf1234567890?sig=fixture')=>({openaiFileIdRefs:[{id:'file-AbCdEf1234567890',name:'Owned poster.png',mime_type:'image/png',download_link:url}]});
async function api(){const path='../lib/server/editor-tool-attachments';const loaded=await import(path).catch(()=>null);expect(loaded,'bounded ChatGPT image attachment support must exist').not.toBeNull();return loaded!}
it.each(['http://files.oaiusercontent.com/file-AbCdEf1234567890','https://files.oaiusercontent.com.attacker.invalid/file-AbCdEf1234567890','https://127.0.0.1/file-AbCdEf1234567890','https://files.oaiusercontent.com@attacker.invalid/file-AbCdEf1234567890','https://files.oaiusercontent.com/other-file'])('rejects untrusted attachment destinations before fetching: %s',async url=>{await expect((await api()).downloadActionPoster(file(url))).rejects.toThrow();expect(state.fetch).not.toHaveBeenCalled()});
it('reads only a bounded image from the exact documented host without forwarding credentials or redirects',async()=>{
 state.fetch.mockResolvedValue(new Response(new Uint8Array([137,80,78,71,13,10,26,10]),{headers:{'content-type':'application/octet-stream'}}));
 const result=await(await api()).downloadActionPoster(file());expect(result.type).toBe('image/png');expect(result.bytes.byteLength).toBe(8);
 const options=state.fetch.mock.calls[0][1];expect(options.redirect).toBe('manual');expect(options.credentials).toBe('omit');expect(options.headers.Authorization).toBeUndefined();
});
it('rejects redirects and expired provider links without trying another destination',async()=>{state.fetch.mockResolvedValue(new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}}));await expect((await api()).downloadActionPoster(file())).rejects.toThrow('attachment_unavailable');expect(state.fetch).toHaveBeenCalledTimes(1)});
it('rejects multiple attachments and oversized bytes',async()=>{const input=file();input.openaiFileIdRefs.push(input.openaiFileIdRefs[0]);await expect((await api()).downloadActionPoster(input)).rejects.toThrow();expect(state.fetch).not.toHaveBeenCalled();state.fetch.mockResolvedValue(new Response(new Uint8Array(1),{headers:{'content-length':'99999999'}}));await expect((await api()).downloadActionPoster(file())).rejects.toThrow('body_too_large')});
