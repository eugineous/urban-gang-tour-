import {q,hasDb} from './db';
import {cached} from './microcache';
import {ensureOpsSchema} from './ops';
export type PublicGalleryPhoto={id:string|number;url:string;caption:string;category:string;altText:string;sortOrder:number;mediaType?:'video'|'youtube'};
/** Shared by the public API and server-rendered page. Never returns drafts. */
export async function publishedGallery():Promise<PublicGalleryPhoto[]>{
 if(!hasDb())return [];
 try{
  const snapshot=await cached('site-gallery',5000,async()=>{
   await ensureOpsSchema();
   const rows=await q<{id:number;url:string;caption:string;category:string;alt_text:string;sort_order:number;media_type?:string}>(`SELECT id,url,caption,category,alt_text,sort_order,to_jsonb(gallery_photos)->>'media_type' AS media_type FROM gallery_photos WHERE published=true AND to_jsonb(gallery_photos)->>'removed_at' IS NULL ORDER BY sort_order ASC,id ASC`);
   return {photos:rows.map<PublicGalleryPhoto>(row=>({id:row.id,url:row.url||'',caption:row.caption||'',category:row.category||'',altText:row.alt_text||'',sortOrder:Number(row.sort_order)||0,...(row.media_type==='video'||row.media_type==='youtube'?{mediaType:row.media_type}:{} )})),expires:Date.now()+15000};
  });
  return snapshot.expires>Date.now()?snapshot.photos:[];
 }catch{return []}
}
