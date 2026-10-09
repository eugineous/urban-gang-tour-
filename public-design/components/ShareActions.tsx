"use client";
import {useEffect, useState} from 'react';

export function ShareActions({title,path,label='Share this page'}:{title:string;path?:string;label?:string}) {
  const [url,setUrl]=useState('');
  const [native,setNative]=useState(false);
  const [status,setStatus]=useState('');
  const [fallback,setFallback]=useState(false);
  useEffect(()=>{setUrl(new URL(path||location.pathname+location.search,location.origin).href);setNative(typeof navigator.share==='function')},[path]);
  async function copy(){try{await navigator.clipboard.writeText(url);setStatus('Link copied.')}catch{setFallback(true);setStatus('Select and copy the link below.')}}
  async function share(){try{await navigator.share({title,url})}catch(e){if((e as Error).name!=='AbortError')await copy()}}
  return <div className="share-actions" role="group" aria-label={label}>
    {native&&<button type="button" onClick={share} disabled={!url}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 16V3m-4 4 4-4 4 4M5 12v7h14v-7"/></svg>Share</button>}
    <a href={'https://wa.me/?text='+encodeURIComponent(title+' '+url)} target="_blank" rel="noopener noreferrer"><img src="/design-assets/social/whatsapp.svg" width="18" height="18" alt=""/>WhatsApp</a>
    <button type="button" onClick={copy} disabled={!url}>Copy link</button>
    <span className="share-status" role="status">{status}</span>
    {fallback&&<label className="share-fallback">Page link<input readOnly value={url} onFocus={e=>e.currentTarget.select()}/></label>}
  </div>;
}
