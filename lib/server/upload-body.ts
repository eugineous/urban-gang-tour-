import {readWebhookBody} from './webhook-body';
export function expectedMediaSignature(bytes:Buffer,type:string){
 if(type==='image/jpeg')return bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(type==='image/png')return bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 if(type==='image/webp')return bytes.length>=12&&bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
 if(type==='image/gif')return bytes.length>=6&&['GIF87a','GIF89a'].includes(bytes.subarray(0,6).toString());
 if(type==='video/mp4')return bytes.length>=20&&bytes.subarray(4,8).toString()==='ftyp'&&['isom','iso2','iso4','iso5','iso6','mp41','mp42','avc1','M4V ','dash'].includes(bytes.subarray(8,12).toString());
 return false;
}
export async function readUploadBody(req:Request,max:number,type:string){
 const result=await readWebhookBody(req,max,30000);if(!result.ok)return result;
 if(!result.body.length||!expectedMediaSignature(result.body,type))return {ok:false as const,status:400 as const,error:'invalid_media_bytes'};
 return result;
}
