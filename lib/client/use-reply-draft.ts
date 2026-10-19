'use client';
import {useEffect,useRef,useState} from 'react';
import {ReplyDraftStore,type DraftText} from './reply-draft-store';
import {useUnsavedWarning} from './use-unsaved-warning';
export function useReplyDraft(channel:'booking'|'gmail',context:string,defaults:DraftText){
 const [,render]=useState(0),mounted=useRef(true),ref=useRef<ReplyDraftStore|null>(null);
 if(!ref.current)ref.current=new ReplyDraftStore(channel,()=>{if(mounted.current)render(value=>value+1)});
 const store=ref.current,entry=context?store.entry(context,defaults):null;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
 useEffect(()=>{if(context)void store.load(context,defaults)},[store,context]);
 useEffect(()=>{const timer=setTimeout(()=>{for(const [key,value]of store.entries)if(value.loaded&&value.status==='unsaved')void store.save(key)},700);return()=>clearTimeout(timer)});
 useUnsavedWarning(store.dirty);
 return {entry,store,edit:(change:Partial<DraftText>)=>{if(context)store.edit(context,defaults,change)}};
}
