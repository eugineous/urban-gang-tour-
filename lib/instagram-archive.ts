import {publishedInstagramAssets} from './instagram-public.mjs';
export function instagramCatalog(archive:unknown){
 const ready=publishedInstagramAssets(archive);
 const media=ready.map(asset=>({id:asset.id,kind:asset.kind,src:'/instagram-media/'+asset.id,poster:asset.kind==='video'?(asset.poster?'/instagram-media/'+asset.poster.id:'/assets/ugt-logo.png'):null,width:asset.width,height:asset.height,duration:asset.duration??null,collection:'instagram-'+asset.postId,title:asset.caption.split('\n')[0].slice(0,120)||'Instagram post',adult:false,bytes:asset.bytes,originalCaption:asset.caption,sourceUrl:asset.permalink}));
 const collections=[...new Set(ready.map(asset=>asset.postId))].map(id=>{const rows=ready.filter(asset=>asset.postId===id),first=rows[0];return{slug:'instagram-'+id,title:first.caption.split('\n')[0].slice(0,100)||'Urban Gang Tour on Instagram',category:'Instagram',description:first.caption,coverId:(rows.find(asset=>asset.kind==='photograph')||first).id}});
 return{media,collections};
}
export function publishedInstagramFile(archive:unknown,id:string){for(const item of publishedInstagramAssets(archive)){if(item.id===id)return item;if(item.poster?.id===id)return item.poster}return null}
