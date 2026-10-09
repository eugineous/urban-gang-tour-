/** Accept only identities for which Google is authoritative, before linking by email. */
export function authoritativeGoogleIdentity(info: any, clientId: string, now=Date.now()) {
 const email=typeof info?.email==='string'?info.email.trim().toLowerCase():'';
 return info?.aud===clientId && ['accounts.google.com','https://accounts.google.com'].includes(info?.iss)
  && Number(info.exp)*1000>now && (info.email_verified===true||info.email_verified==='true')
  && typeof info.sub==='string' && info.sub.length>0
  && (/^[^@\s]+@gmail\.com$/.test(email) || (typeof info.hd==='string' && info.hd.toLowerCase()===email.split('@')[1])) ? email : null;
}
export async function verifyGoogleIdentity(credential:string,clientId:string){
 const r=await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,{cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(!r.ok)return null;
 return authoritativeGoogleIdentity(await r.json(),clientId);
}
