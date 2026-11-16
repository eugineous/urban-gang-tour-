/** Canonical links only. This parser never fetches user-supplied URLs. */
export function youtubeVideoId(value:unknown):string|null{
 if(typeof value!=='string'||value.length>500)return null;
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
  let id:string|null=null;
  if(u.hostname==='youtu.be')id=/^\/([A-Za-z0-9_-]{11})\/?$/.exec(u.pathname)?.[1]||null;
  else if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname))id=u.pathname==='/watch'&&u.searchParams.getAll('v').length===1?u.searchParams.get('v'):/^\/(?:shorts|embed)\/([A-Za-z0-9_-]{11})\/?$/.exec(u.pathname)?.[1]||null;
  return id&&/^[A-Za-z0-9_-]{11}$/.test(id)?id:null;
 }catch{return null}
}
