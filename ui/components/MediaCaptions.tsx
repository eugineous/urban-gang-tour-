'use client';
import {MessageText} from '@/ui/i18n/MessageText';
import {mediaMessages} from '@/ui/i18n/catalogues/media';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {useEffect,useState} from 'react';
export type MediaCaption={asset:string;language:string;transcript:string;track:string};
const known=new Map<string,MediaCaption|null>();
export function useMediaCaptions(asset:string|undefined,enabled=true){
  const [value,setValue]=useState<MediaCaption|null>(null);
  useEffect(()=>{
    setValue(null);if(!asset||!enabled)return;
    if(known.has(asset)){setValue(known.get(asset)??null);return;}
    const controller=new AbortController();
    fetch('/api/captions?format=json&asset='+encodeURIComponent(asset),{signal:controller.signal}).then(async r=>{
      if(!r.ok)return null;
      const data=await r.json();
      return data.available&&data.asset===asset&&typeof data.language==='string'&&typeof data.transcript==='string'&&typeof data.track==='string'&&data.track.startsWith('/api/captions?')?data as MediaCaption:null;
    }).then(data=>{if(!controller.signal.aborted){known.set(asset,data);setValue(data)}}).catch(()=>{});
    return()=>controller.abort();
  },[asset,enabled]);
  return value?.asset===asset?value:null;
}
export function VideoCaptionTrack({captions}:{captions:MediaCaption|null}){const t=useMessages(mediaMessages);return captions?<track kind="captions" src={captions.track} srcLang={captions.language} label={captions.language==='en'?t('english'):captions.language} default/>:null}
export function VideoTranscript({captions}:{captions:MediaCaption|null}){return captions?<details className="media-transcript"><summary><MessageText catalogue={mediaMessages} message="transcript"/></summary><p lang={captions.language} style={{whiteSpace:'pre-wrap',maxHeight:'min(30dvh,240px)',overflowY:'auto'}}>{captions.transcript}</p></details>:null}
