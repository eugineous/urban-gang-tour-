import {expect,it} from 'vitest';
import {normalizeOwnedInstagramUrl,extractPublicInstagramPosts,validInstagramCdnUrl,validateInstagramArchive} from '@/lib/instagram-public.mjs';
const cdn='https://scontent.cdninstagram.com/public.jpg';
const post=(id='17800000000000001')=>({id,code:'PUBLIC123',user:{username:'urban_newsgang'},caption:{text:'Original caption\n#UrbanGang 🎤'},taken_at:1760000000,media_type:1,image_versions2:{candidates:[{url:cdn,width:1080,height:1350}]}});
it('accepts only the exact owned profile and its HTTPS public post paths',()=>{
 expect(normalizeOwnedInstagramUrl('https://www.instagram.com/urban_newsgang/')).toBe('https://www.instagram.com/urban_newsgang/');
 expect(normalizeOwnedInstagramUrl('https://instagram.com/urban_newsgang/reel/PUBLIC123/?igsh=ignored')).toBe('https://www.instagram.com/urban_newsgang/reel/PUBLIC123/');
 for(const url of ['https://www.instagram.com/other/','https://www.instagram.com/p/PUBLIC123/','http://instagram.com/urban_newsgang/','https://instagram.com.evil.test/urban_newsgang/','https://u:p@instagram.com/urban_newsgang/'])expect(normalizeOwnedInstagramUrl(url)).toBeNull();
});
it('retains exact captions and stable IDs while rejecting other accounts, including collaborations',()=>{
 const own=post();const rows=extractPublicInstagramPosts({data:{edges:[{node:own},{node:own},{node:{...post('17800000000000002'),user:{username:'hypeola'}}}]}});
 expect(rows).toHaveLength(1);expect(rows[0].id).toBe('17800000000000001');expect(rows[0].caption).toBe('Original caption\n#UrbanGang 🎤');expect(rows[0].assets[0].kind).toBe('photograph');
});
it('expands every carousel child and retains video posters without inventing dates or captions',()=>{
 const p={...post(),media_type:8,carousel_media_count:2,carousel_media:[{id:'17800000000000003',media_type:1,image_versions2:{candidates:[{url:cdn,width:600,height:600}]}},{id:'17800000000000004',media_type:2,video_versions:[{url:'https://video.cdninstagram.com/film.mp4',width:720,height:1280}],image_versions2:{candidates:[{url:cdn,width:720,height:1280}]}}]};
 const rows=extractPublicInstagramPosts({data:{node:p}});expect(rows[0].assets.map(a=>a.id)).toEqual(['17800000000000003','17800000000000004']);expect(rows[0].assets[1].poster).toBe(cdn);
 expect(extractPublicInstagramPosts({...post(),caption:null,taken_at:undefined})[0].caption).toBe('');
});
it('keeps a real public reel as video when progressive variants omit dimensions',()=>{
 const reel={...post(),media_type:2,has_audio:true,video_duration:35.618,video_versions:[{url:'https://video.cdninstagram.com/full.mp4',type:101}],image_versions2:{candidates:[{url:cdn,width:1080,height:1920}]}};
 const asset=extractPublicInstagramPosts(reel)[0].assets[0];expect(asset.kind).toBe('video');expect(asset.url).toBe('https://video.cdninstagram.com/full.mp4');
 expect(extractPublicInstagramPosts({...reel,video_versions:[] })).toEqual([]);
});
it('rejects incomplete or unproven carousels instead of permanently marking their parent complete',()=>{
 const child={...post('17800000000000003')};
 const partial={...post(),media_type:8,carousel_media_count:3,carousel_media:[child]};
 expect(extractPublicInstagramPosts(partial)).toEqual([]);
 expect(extractPublicInstagramPosts({...partial,carousel_media_count:1,carousel_media:[]})).toEqual([]);
 expect(extractPublicInstagramPosts({...post(),media_type:8,carousel_media:[child]})).toEqual([]);
 expect(extractPublicInstagramPosts({...post(),media_type:8,edge_sidecar_to_children:{count:1,page_info:{has_next_page:true},edges:[{node:child}]}})).toEqual([]);
});
it('never treats login errors, suggestion profiles or unsafe transport URLs as downloadable posts',()=>{
 expect(extractPublicInstagramPosts({errors:[{message:'login_required'}]})).toEqual([]);
 expect(extractPublicInstagramPosts({...post(),image_versions2:{candidates:[{url:'http://127.0.0.1/x',width:200,height:200}]}})).toEqual([]);
 for(const url of ['http://scontent.cdninstagram.com/a','https://cdninstagram.com.evil.test/a','https://127.0.0.1/a','https://cdninstagram.com:8443/a','https://user:pass@scontent.cdninstagram.com/a'])expect(validInstagramCdnUrl(url)).toBe(false);
 expect(validInstagramCdnUrl('https://scontent-lhr8-1.cdninstagram.com/a?public=signature')).toBe(true);
});
it('rejects a manifest for another account or an arbitrary GitHub download host',()=>{
 expect(validateInstagramArchive({version:1,account:'other',posts:[]})).toBe(false);
 expect(validateInstagramArchive({version:1,account:'urban_newsgang',posts:[]})).toBe(true);
 expect(validateInstagramArchive({version:1,account:'urban_newsgang',posts:[{id:'17800000000000001',caption:'x',published:true,assets:[{id:'x',url:'https://evil.test/video.mp4'}]}]})).toBe(false);
});
