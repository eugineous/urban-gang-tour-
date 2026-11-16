import {q,hasDb} from './db';
import {cached} from './microcache';
import {PUBLIC_EVENT_STATUSES} from './event-lifecycle';
import {publicPartnerDetails} from '@/lib/partner-events';
import {publicCampaigns} from './marketing-campaigns';
/** A content hash identifies bytes; it does not authorize publication. */
export async function uploadedMediaIsPublic(scope:string,url:string){
 if(!hasDb())return false;
 try{return await cached('upload-publication:'+scope+':'+url,1000,async()=>{
  if(scope==='admin-events'){
   const rows=await q<{kind:string;image:string;logo:string;partner_details:unknown}>(`SELECT image,to_jsonb(e)->>'logo' AS logo,kind,partner_details FROM tour_events e WHERE status=ANY($2) AND
    (image=$1 OR to_jsonb(e)->>'logo'=$1 OR (kind='partner' AND to_jsonb(e)->'partner_details'->'posters' @> $3::jsonb))`,[url,[...PUBLIC_EVENT_STATUSES],JSON.stringify([{url}])]);
   return rows.some(row=>{
    if(row.kind!=='partner')return row.image===url||row.logo===url;
    const details=publicPartnerDetails(row.partner_details);
    return !!details&&(row.image===url||row.logo===url||details.posters.some(poster=>poster.url===url));
   });
  }
  if(scope==='admin-products'){
   const rows=await q(`SELECT 1 FROM products p WHERE active=true AND (image=$1 OR EXISTS(
    SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(to_jsonb(p)->'photos')='array' THEN to_jsonb(p)->'photos' ELSE '[]'::jsonb END) photo
    WHERE photo#>>'{}'=$1 OR photo->>'url'=$1)) LIMIT 1`,[url]);return rows.length>0;
  }
  if(scope==='admin-campaigns')return (await publicCampaigns()).campaigns.some(campaign=>campaign.image===url);
  return false;
 },false)}catch{return false}
}
