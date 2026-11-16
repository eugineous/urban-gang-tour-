import {describe,it,expect} from 'vitest';
import {parseToolDraft,parseToolGrant,tokenHash,readLimitedBody,ToolError} from '@/lib/server/editor-tools';

describe('narrow editor payload boundary',()=>{
 it('accepts incomplete reviewable drafts using canonical field validation',()=>{
  expect(parseToolDraft({requestId:'66320821-83a0-4ca7-a72c-825698117305',name:'Campus poster',kind:'school',eventDate:'2027-02-28'})).toMatchObject({name:'Campus poster',kind:'school',eventDate:'2027-02-28'});
 });
 it.each([{status:'published'},{tiers:[]},{image:'http://127.0.0.1/secret'},{id:'existing'},{eventDate:'2027-02-30'},{description:'<script>alert(1)</script>'},{kind:'partner'}])('rejects authority and untrusted text: %j',extra=>{
  expect(()=>parseToolDraft({requestId:'66320821-83a0-4ca7-a72c-825698117305',name:'Poster',kind:'school',...extra})).toThrow(ToolError);
 });
 it('requires explicit narrow scopes and a bounded expiry',()=>{
  expect(parseToolGrant({label:'Local Codex',expiresInDays:7,scopes:['event:draft']})).toEqual({label:'Local Codex',expiresInDays:7,scopes:['event:draft']});
  for(const extra of [{expiresInDays:31},{scopes:['admin']},{scopes:[]},{label:'<b>key</b>'}])expect(()=>parseToolGrant({label:'Key',expiresInDays:7,scopes:['event:draft'],...extra})).toThrow(ToolError);
 });
 it('hashes bearer values and bounds body bytes even without Content-Length',async()=>{
  expect(tokenHash('ugt_edit_'+ 'a'.repeat(43))).toMatch(/^[a-f0-9]{64}$/);
  await expect(readLimitedBody(new Request('https://example.test',{method:'POST',body:'12345'}),4)).rejects.toMatchObject({status:413});
  await expect(readLimitedBody(new Request('https://example.test',{method:'POST',body:'1234'}),4)).resolves.toEqual(Buffer.from('1234'));
 });
});
