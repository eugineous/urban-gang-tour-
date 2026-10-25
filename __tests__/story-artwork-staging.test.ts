import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({get:vi.fn(),put:vi.fn(),apply:vi.fn(),configured:true}));
vi.mock('@opennextjs/cloudflare',()=>({getCloudflareContext:()=>({env:state.configured?{UGT_MEDIA:{get:state.get,put:state.put}}:{}})}));
vi.mock('@/lib/server/story-artwork',()=>({applyStoryArtwork:state.apply}));
import {applyStagedStoryArtwork} from '@/lib/server/editorial-library';
beforeEach(()=>{state.configured=true;state.get.mockReset().mockResolvedValue(null);state.put.mockReset().mockResolvedValue(undefined);state.apply.mockReset()});
it('does not grant image or story publication when no operator manifest exists',async()=>{
 expect(await applyStagedStoryArtwork()).toEqual({staged:false});expect(state.get).toHaveBeenCalledWith('editorial-library/story-artwork-v1');expect(state.apply).not.toHaveBeenCalled();
 state.configured=false;expect(await applyStagedStoryArtwork()).toEqual({staged:false});
});
it('records opaque preview versions only in private KV, keeping the cron count-only',async()=>{
 state.get.mockResolvedValue('{"fixture":true}');const result={request_id:'fictional',manifest_hash:'a'.repeat(64),preview:true,expired:false,updated:0,already:0,conflicts:0,targets:[{slug:'fictional',version:'b'.repeat(64),matched:true}]};state.apply.mockResolvedValue(result);
 expect(await applyStagedStoryArtwork()).toEqual({staged:true,request_id:result.request_id,manifest_hash:result.manifest_hash,preview:true,expired:false,updated:0,already:0,conflicts:0});
 expect(state.apply).toHaveBeenCalledWith({fixture:true});const [key,value]=state.put.mock.calls[0];expect(key).toBe('editorial-library/story-artwork-status-v1');expect(JSON.parse(value)).toMatchObject(result);
});
it('bounds private operator data before parsing or passing it to the image publisher',async()=>{
 state.get.mockResolvedValue(' '.repeat(100001));await expect(applyStagedStoryArtwork()).rejects.toThrow('story_artwork_too_large');expect(state.apply).not.toHaveBeenCalled();
});
