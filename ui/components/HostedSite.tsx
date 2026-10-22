"use client";
import {Suspense,useEffect,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import Site from './Site';
function QuerySync({onChange}:{onChange:(q:Record<string,string>)=>void}){const q=useSearchParams();const serialized=q.toString();useEffect(()=>onChange(Object.fromEntries(new URLSearchParams(serialized).entries())),[serialized,onChange]);return null}
export default function HostedSite(props:Omit<React.ComponentProps<typeof Site>,'query'>){
 const [query,setQuery]=useState<Record<string,string>>({});
 const [events,setEvents]=useState(props.events),[posts,setPosts]=useState(props.posts),[products,setProducts]=useState(props.products);
 const [current,setCurrent]=useState({events:true,products:true});
 useEffect(()=>{
  if(props.path!=='/'&&props.path!=='/blog')return;
  let stopped=false,controller:AbortController|undefined;
  const home=props.path==='/';
  async function refresh(){
   if(document.hidden)return;
   controller?.abort();const request=new AbortController();controller=request;
   const timer=setTimeout(()=>request.abort(),10000);
   await Promise.all((home?['events','products','posts']:['posts']).map(async kind=>{
    try{
     const response=await fetch('/api/site-data/'+kind,{signal:request.signal,cache:'no-store'});
     if(!response.ok)throw new Error('catalogue_unavailable');
     const data=await response.json();
     if(data.ok!==true||!Array.isArray(data[kind]))throw new Error('invalid_catalogue');
     if(stopped||request.signal.aborted)return;
     if(kind==='events'){setEvents(data.events);setCurrent(value=>({...value,events:true}))}
     if(kind==='products'){setProducts(data.products);setCurrent(value=>({...value,products:true}))}
     if(kind==='posts')setPosts(home?data.posts.slice(0,3):data.posts);
    }catch{
     if(!stopped&&controller===request&&(kind==='events'||kind==='products'))setCurrent(value=>({...value,[kind]:false}));
    }
   }));clearTimeout(timer);
  }
  void refresh();
  const timer=home?setInterval(()=>void refresh(),60000):undefined;
  const visible=()=>{if(!document.hidden)void refresh()};document.addEventListener('visibilitychange',visible);
  return()=>{stopped=true;controller?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible)};
 },[props.path]);
 return <><Suspense fallback={null}><QuerySync onChange={setQuery}/></Suspense><Site {...props} events={events} posts={posts} products={products} query={query} homeCurrent={current}/></>;
}
