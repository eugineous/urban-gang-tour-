import {ticketDesigns} from './document-designs';
export function parseTicketDesign(body:unknown){
 if(!body||typeof body!=='object'||Array.isArray(body))return null;
 const b=body as Record<string,unknown>;
 if(Object.keys(b).some(k=>!['design','name','logo','photo','accent'].includes(k)))return null;
 if(typeof b.design!=='string'||!ticketDesigns.some(d=>d.id===b.design))return null;
 if(typeof b.name!=='string'||!b.name.trim()||b.name.length>65)return null;
 if(typeof b.accent!=='string'||!/^#[0-9a-f]{6}$/i.test(b.accent))return null;
 for(const key of ['logo','photo'])if(b[key]!==undefined&&(typeof b[key]!=='string'||(b[key] as string).length>350000||!/^data:image\/(png|jpeg);base64,[a-zA-Z0-9+/]+=*$/.test(b[key] as string)))return null;
 return {design:b.design,name:b.name.trim(),accent:b.accent,logo:b.logo as string|undefined,photo:b.photo as string|undefined};
}
