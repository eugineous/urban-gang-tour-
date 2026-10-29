import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({get:vi.fn(),put:vi.fn(),apply:vi.fn(),queue:vi.fn(),activation:vi.fn(),bump:vi.fn(),configured:true}));
vi.mock('@opennextjs/cloudflare',()=>({getCloudflareContext:()=>({env:state.configured?{UGT_MEDIA:{get:state.get,put:state.put}}:{}})}));
vi.mock('@/lib/server/story-artwork',()=>({applyStoryArtwork:state.apply,applyStoryArtworkQueue:state.queue}));
vi.mock('@/lib/server/color-blast-activation',()=>({applyColorBlastActivation:state.activation}));
vi.mock('@/lib/server/public-cache',()=>({bumpProductPublicTruth:state.bump}));
import {applyStagedStoryArtwork,applyStagedColorBlastActivation} from '@/lib/server/editorial-library';
beforeEach(()=>{state.configured=true;state.get.mockReset().mockResolvedValue(null);state.put.mockReset().mockResolvedValue(undefined);state.apply.mockReset();state.queue.mockReset();state.activation.mockReset();state.bump.mockReset()});
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
 state.get.mockResolvedValue(' '.repeat(500001));await expect(applyStagedStoryArtwork()).rejects.toThrow('story_artwork_too_large');expect(state.apply).not.toHaveBeenCalled();
});
it('stores queued inspection metadata only in private KV and strips every batch target from the cron result',async()=>{
 state.get.mockResolvedValue('{"mode":"scheduled_story_artwork_queue"}');const result={request_id:'fictional-queue',queued:true,inspection:true,preview:false,expired:false,updated:0,already:0,conflicts:0,batches:[{request_id:'fictional-batch',inspection:true,expired:false,updated:0,already:0,conflicts:0,targets:[{slug:'private-story',version:'b'.repeat(64),headline:'Private scheduled headline',matched:true}]}]};state.queue.mockResolvedValue(result);
 const response=await applyStagedStoryArtwork();expect(JSON.stringify(response)).not.toContain('private-story');expect(JSON.stringify(response)).not.toContain('Private scheduled headline');expect(response).toMatchObject({staged:true,queued:true,batches:[{request_id:'fictional-batch',inspection:true,conflicts:0}]});
 expect(JSON.parse(state.put.mock.calls[0][1])).toMatchObject(result);
});
it('routes only the separately scoped collection activation key and invalidates product truth after activation',async()=>{
 expect(await applyStagedColorBlastActivation()).toEqual({staged:false});expect(state.get).toHaveBeenCalledWith('catalogue-activation/pending-v1');
 state.get.mockResolvedValue('{"fixture":true}');state.activation.mockResolvedValue({request_id:'fictional',manifest_hash:'a'.repeat(64),eligible:24,activated:24,already:0,conflicts:0,expired:false});
 expect(await applyStagedColorBlastActivation()).toMatchObject({staged:true,activated:24});expect(state.put.mock.calls[0][0]).toBe('catalogue-activation/status-v1');expect(state.bump).toHaveBeenCalledOnce();
 state.bump.mockReset();state.activation.mockResolvedValue({activated:0,already:0,conflicts:24,expired:false});await applyStagedColorBlastActivation();expect(state.bump).not.toHaveBeenCalled();
 state.get.mockResolvedValue(' '.repeat(100001));await expect(applyStagedColorBlastActivation()).rejects.toThrow('colour_blast_activation_too_large');
});
