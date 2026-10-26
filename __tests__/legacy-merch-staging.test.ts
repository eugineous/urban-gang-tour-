import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({get:vi.fn(),put:vi.fn(),apply:vi.fn(),bump:vi.fn(),configured:true}));
vi.mock('@opennextjs/cloudflare',()=>({getCloudflareContext:()=>({env:state.configured?{UGT_MEDIA:{get:state.get,put:state.put}}:{}})}));
vi.mock('@/lib/server/legacy-merch-retirement',()=>({applyLegacyMerchRetirement:state.apply}));
vi.mock('@/lib/server/public-cache',()=>({bumpProductPublicTruth:state.bump}));
import {applyStagedLegacyMerchRetirement} from '@/lib/server/editorial-library';
beforeEach(()=>{state.configured=true;state.get.mockReset().mockResolvedValue(null);state.put.mockReset().mockResolvedValue(undefined);state.apply.mockReset();state.bump.mockReset()});
it('does nothing without an operator-private retirement decision',async()=>{
 expect(await applyStagedLegacyMerchRetirement()).toEqual({staged:false});expect(state.get).toHaveBeenCalledWith('catalogue-retirement/pending-v1');expect(state.apply).not.toHaveBeenCalled();expect(state.bump).not.toHaveBeenCalled();
 state.configured=false;expect(await applyStagedLegacyMerchRetirement()).toEqual({staged:false});
});
it.each(['retired','already'])('repairs public caches after %s exact products without exposing target records',async field=>{
 const value={targets:[{id:'p1'},{id:'p14'}]};state.get.mockResolvedValue(JSON.stringify(value));const result={request_id:'fixture',manifest_hash:'a'.repeat(64),retired:0,already:0,conflicts:0,expired:false,[field]:2};state.apply.mockResolvedValue(result);
 expect(await applyStagedLegacyMerchRetirement()).toEqual({staged:true,...result});expect(state.apply).toHaveBeenCalledWith(value);expect(state.bump).toHaveBeenCalledWith(['p1','p14']);
 const [key,raw]=state.put.mock.calls[0];expect(key).toBe('catalogue-retirement/status-v1');const saved=JSON.parse(raw);expect(saved).toMatchObject(result);expect(saved).not.toHaveProperty('targets');expect(saved).not.toHaveProperty('previous_record');
});
it('does not invalidate caches on a conflicted decision or hide an apply failure as success',async()=>{
 state.get.mockResolvedValue('{"targets":[]}');state.apply.mockResolvedValueOnce({retired:0,already:0,conflicts:14,expired:false});expect(await applyStagedLegacyMerchRetirement()).toMatchObject({conflicts:14});expect(state.bump).not.toHaveBeenCalled();
 state.put.mockClear();state.apply.mockRejectedValueOnce(Error('private fixture failure'));await expect(applyStagedLegacyMerchRetirement()).rejects.toThrow();expect(state.put).not.toHaveBeenCalled();
});
it('bounds input bytes before parsing or passing them to the retirement service',async()=>{
 state.get.mockResolvedValue(' '.repeat(50001));await expect(applyStagedLegacyMerchRetirement()).rejects.toThrow('legacy_merch_retirement_too_large');expect(state.apply).not.toHaveBeenCalled();expect(state.bump).not.toHaveBeenCalled();
});
