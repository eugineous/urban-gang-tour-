'use client';
import {useState} from 'react';
import {NEWS_MARKETS} from '@/lib/shared/news-preferences';

type Counts={market:string;leads:number;prepared:number;published:number};
export default function UrbanNewsCoverage({target}:{target:number}){
 const [rows,setRows]=useState<Counts[]|null>(null),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
 async function refresh(){
  setBusy(true);setFailed(false);
  try{
   const response=await fetch('/api/admin/urban-news?view=coverage',{cache:'no-store',signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error();
   const data=await response.json();if(!Array.isArray(data.rows))throw Error();
   setRows(data.rows);
  }catch{setFailed(true)}finally{setBusy(false)}
 }
 return <details onToggle={event=>{if(event.currentTarget.open&&!rows&&!busy&&!failed)void refresh()}}>
  <summary>Today’s coverage by market</summary>
  <p>Counts since midnight in Nairobi. Daily target per market: {target}.</p>
  {rows&&<table><thead><tr><th>Market</th><th>Leads</th><th>Prepared</th><th>Published</th></tr></thead>
   <tbody>{rows.map(row=><tr key={row.market}><th scope="row">{NEWS_MARKETS.find(m=>m.code===row.market)?.name??row.market}</th><td>{row.leads}</td><td>{row.prepared}</td><td>{row.published}</td></tr>)}</tbody></table>}
  {failed&&<p role="alert">Coverage counts could not be refreshed.</p>}
  <button type="button" disabled={busy} onClick={()=>void refresh()}>{busy?'Loading counts…':'Refresh counts'}</button>
 </details>;
}
