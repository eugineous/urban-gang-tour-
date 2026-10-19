'use client';
import {useEffect,useRef,useState} from 'react';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
import {useUnsavedWarning} from '@/lib/client/use-unsaved-warning';
type Order={id:string;total:number;status:string};
export default function RefundRecorder({order,onSaved,onClose}:{order:Order;onSaved:()=>void;onClose:()=>void}){
 const [amount,setAmount]=useState(''),[reason,setReason]=useState(''),[reference,setReference]=useState(''),[codes,setCodes]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 const key=useRef<string>(''),snapshot=useRef<object|null>(null),pending=useRef(false);
 const panel=useRef<HTMLElement|null>(null);
 useEffect(()=>{panel.current?.focus({preventScroll:true});panel.current?.scrollIntoView({block:'start'})},[]);
 const [locked,setLocked]=useState(false);
 const [records,setRecords]=useState<{id:number;amount:number;external_reference:string;created_at:string}[]>([]),[historyError,setHistoryError]=useState(''),[historyVersion,setHistoryVersion]=useState(0);
 useEffect(()=>{const controller=new AbortController();void fetchWithTimeout('/api/admin/refunds?orderId='+encodeURIComponent(order.id),{signal:controller.signal,cache:'no-store'}).then(async response=>{const data=await response.json();if(!response.ok||!data.ok||!Array.isArray(data.records))throw Error();if(!controller.signal.aborted){setRecords(data.records);setHistoryError('')}}).catch(()=>{if(!controller.signal.aborted)setHistoryError('The refund history could not load. Do not assume no refund exists. Retry before recording.')});return()=>controller.abort()},[order.id,historyVersion]);
 useUnsavedWarning(!saved&&(!!amount||!!reason||!!reference||!!codes||busy));
 async function submit(event:React.FormEvent){
  event.preventDefault();if(pending.current||saved)return;
  const money=Number(amount);if(!Number.isSafeInteger(money)||money<1||money>Number(order.total)){setError('Enter a whole KES amount within the original order total.');return}
  if(!key.current)key.current=crypto.randomUUID();
  if(!snapshot.current)snapshot.current={id:order.id,status:'refunded',refundAmount:money,refundReason:reason,externalReference:reference,externalConfirmed:confirmed,ticketCodes:codes.split(/\s+/).filter(Boolean).map(value=>value.toUpperCase()),requestId:key.current};
  pending.current=true;setBusy(true);setLocked(true);setError('');
  try{
   const response=await fetchWithTimeout('/api/admin/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'orderStatus',data:snapshot.current})},20000);const data=await response.json();
   if(!response.ok||!data.ok){
    const messages:Record<string,string>={ticket_allocation_required:'Choose the exact ticket codes for a partial ticket refund.',ticket_refund_amount_mismatch:'The selected ticket values must exactly match the returned amount.',ticket_not_refundable:'A selected ticket is used, already refunded or belongs to another order.',ticket_allocation_unverifiable:'The original ticket allocation could not be verified. No refund record was saved.',legacy_refund_review_required:'Earlier refunds need review before another partial ticket refund.',refund_exceeds_total:'This would exceed the remaining refundable amount.',refund_request_conflict:'This reference already has a different recorded request. Review the ledger before proceeding.'};
    if(response.status===400&&!['refund_record_unconfirmed'].includes(data.error)){snapshot.current=null;setLocked(false)}
    setError(messages[data.error]||'The record was not confirmed. Entries and the retry reference are kept. Check the ledger before creating another record.');return;
   }
   setSaved(true);setHistoryVersion(value=>value+1);onSaved();
  }catch{setError('The acknowledgement was lost. Do not create another refund. Retry this same record; its reference is kept.')}
  finally{pending.current=false;setBusy(false)}
 }
 return <section ref={panel} tabIndex={-1} className="cr-refund-recorder" aria-label="Record an external refund"><h2>Record money already returned</h2><p>Order {order.id} · original total KES {Number(order.total).toLocaleString()}</p><p><strong>This does not send money.</strong> Return the money through the payment provider first. Record its reference here only after confirming that return. This website does not independently verify it or restock merchandise.</p>
 <details><summary>Recorded returns ({records.length})</summary><button type="button" disabled={busy} onClick={()=>setHistoryVersion(value=>value+1)}>Refresh history</button>{historyError?<p role="alert">{historyError}</p>:records.length?<ul>{records.map(record=><li key={record.id}>KES {Number(record.amount).toLocaleString()} · {record.external_reference||'Legacy reference not recorded'} · {record.created_at}</li>)}</ul>:<p>No recorded returns loaded.</p>}</details>
 {saved?<><p role="status">External money return recorded. The order status and ticket allocation were updated together.</p><button type="button" onClick={onClose}>Close</button></>:<form onSubmit={submit}>
 <fieldset disabled={busy||locked}><legend>Completed external return</legend><label>Amount returned (KES)<input required type="number" min="1" step="1" max={order.total} value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Provider or bank return reference<input required minLength={3} maxLength={120} value={reference} onChange={e=>setReference(e.target.value)}/></label><label>Reason<textarea required minLength={3} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label><label>Ticket codes being refunded (one per line)<textarea value={codes} maxLength={17000} onChange={e=>setCodes(e.target.value)}/></label><p>Partial ticket refunds require exact unused ticket codes and their original values. A full cumulative refund revokes every ticket on the order. Merchandise-only records need no ticket codes.</p><label><input required type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I checked that this money was already returned outside this website.</label></fieldset>
 {error&&<p role="alert">{error}</p>}<button type="submit" disabled={busy}>{busy?'Recording…':locked?'Retry the same record':'Record completed external return'}</button> <button type="button" disabled={busy} onClick={()=>{if(confirm(locked?'Have you reviewed the recorded returns? Closing does not undo a return. If uncertain, cancel and retry the same record.':'Close this unsaved refund form?'))onClose()}}>{locked?'Close after reviewing history':'Close'}</button>
 </form>}</section>;
}
