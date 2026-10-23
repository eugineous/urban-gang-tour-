import {createHash} from 'node:crypto';

export type ContactEnquiry={name:string;email:string;subject:string;message:string};
export function validContactEmail(value:string){return value.length<=254&&/^[^\s@<>,;\x00-\x1f\x7f]+@[^\s@<>,;\x00-\x1f\x7f]+\.[a-z]{2,63}$/i.test(value);}
export function parseContactEnquiry(body:Record<string,unknown>):{enquiry:ContactEnquiry;requestId:string}{
 const allowed=new Set(['name','email','subject','message','requestId','privacyAccepted','website']);
 if(Object.keys(body).some(key=>!allowed.has(key)))throw Error('unexpected_fields');
 for(const [field,max] of [['name',100],['email',254],['subject',150],['message',3000]] as const){if(typeof body[field]!=='string'||body[field].length>max)throw Error('invalid_'+field);}
 const enquiry={name:(body.name as string).trim(),email:(body.email as string).trim().toLowerCase(),subject:(body.subject as string).trim(),message:(body.message as string).trim()};
 if(enquiry.name.length<2||/[\x00-\x1f\x7f]/.test(enquiry.name))throw Error('invalid_name');
 if(!validContactEmail(enquiry.email))throw Error('invalid_email');
 if(enquiry.subject.length<2||/[\x00-\x1f\x7f]/.test(enquiry.subject))throw Error('invalid_subject');
 if(enquiry.message.length<10||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(enquiry.message))throw Error('invalid_message');
 if(body.privacyAccepted!==true)throw Error('privacy_confirmation_required');
 if(body.website!==undefined&&body.website!=='')throw Error('invalid_submission');
 if(typeof body.requestId!=='string'||!/^[A-Za-z0-9_-]{20,100}$/.test(body.requestId))throw Error('invalid_request_id');
 return {enquiry,requestId:body.requestId};
}
export function contactReference(requestId:string){return 'C-'+createHash('sha256').update(requestId).digest('hex').slice(0,40);}
export function contactPayloadHash(enquiry:ContactEnquiry){return createHash('sha256').update(JSON.stringify(enquiry)).digest('hex');}
