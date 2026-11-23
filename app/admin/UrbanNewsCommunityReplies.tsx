'use client';
import {useState} from 'react';
import {suggestUrbanNewsReplies,type CommunityReply} from '@/lib/shared/urban-news-community';
export default function UrbanNewsCommunityReplies(){
 const [comment,setComment]=useState(''),[drafts,setDrafts]=useState<CommunityReply|null>(null),[notice,setNotice]=useState('');
 return <details>
  <summary>Community reply assistant (zero API tokens)</summary>
  <p>Paste one public comment. Suggestions stay private until a journalist checks and sends them. Sensitive issues and correction requests require human review.</p>
  <label>Comment to respond to<textarea value={comment} maxLength={1200} rows={3} onChange={e=>{setComment(e.target.value);setDrafts(null);setNotice('')}} /></label>
  <button type="button" disabled={comment.trim().length<2} onClick={()=>{try{setDrafts(suggestUrbanNewsReplies(comment));setNotice('')}catch{setNotice('Enter a comment of up to 1,200 characters.')}}}>Prepare replies</button>
  {notice&&<p role="status">{notice}</p>}
  {drafts&&<section aria-label="Reply suggestions">
   <p><strong>{drafts.classification==='sensitive'?'Sensitive comment':drafts.classification==='correction'?'Correction request':drafts.classification==='source'?'Source request':'Routine comment'}</strong>. {drafts.humanReviewRequired?'Editorial review required. No automatic reply.':'Review wording before replying.'}</p>
   {drafts.suggestions.length===0?<p>Do not use an automatic response. Refer this comment to an editor or trained moderator.</p>:drafts.suggestions.map((reply,index)=><div key={index}><p>{reply}</p><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(reply);setNotice('Reply suggestion copied.')}catch{setNotice('Copy unavailable. Select the suggested text manually.')}}}>Copy suggestion {index+1}</button></div>)}
  </section>}
 </details>;
}
