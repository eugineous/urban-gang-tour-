'use client';

import type {Dispatch,SetStateAction} from 'react';
import {OPERATIONAL_DOCS,emptyOperationalLine,type OperationalDocType,type OperationalFormState} from '@/lib/documents/operational-record';
import {btnSmall,inp,label,fmtKES} from '../ops/ui';

export default function OperationalDocumentForm({type,value,onChange,computed}:{type:OperationalDocType;value:OperationalFormState;onChange:Dispatch<SetStateAction<OperationalFormState>>;computed:{total?:number;closingBalance?:number}}){
 const spec=OPERATIONAL_DOCS[type],statement=type==='customerstatement',delivery=type==='deliverynote';
 const field=(key:Exclude<keyof OperationalFormState,'lines'>,title:string,maxLength=160,inputType='text')=><label style={label}>{title}<input style={inp} type={inputType} maxLength={maxLength} value={value[key]} onChange={e=>onChange(p=>({...p,[key]:e.target.value}))}/></label>;
 return <div style={{display:'grid',gap:14,minWidth:0}}>
  <p style={{margin:0,fontSize:13,lineHeight:1.6,color:'#655a62'}}>{spec.note} The saved PDF stays labelled <strong>Staff-entered draft</strong>.</p>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,220px),1fr))',gap:12}}>
   {field('date',statement?'Statement as of':'Document date',10,'date')}
   {field('party',spec.partyLabel)}
   {field('reference',spec.referenceLabel,60)}
   {field('preparedBy','Prepared by (name, not a signature)',100)}
   {field('partyAddress',delivery?'Proposed handover address / location':'Party address (optional)',180)}
   {type==='purchaseorder'&&field('requestedDate','Requested date (optional; not a delivery promise)',10,'date')}
  </div>
  <label style={label}>{spec.purposeLabel}<textarea style={inp} maxLength={200} rows={2} value={value.purpose} onChange={e=>onChange(p=>({...p,purpose:e.target.value}))}/></label>
  {statement&&<label style={label}>Manual opening balance (KES; negative for credit)<input style={inp} type="number" step="1" value={value.openingBalance} onChange={e=>onChange(p=>({...p,openingBalance:e.target.value}))}/></label>}
  <div style={{display:'grid',gap:12}}>
   {value.lines.map((line,index)=><fieldset key={index} style={{border:'1px solid #e1dade',borderRadius:12,padding:12,minWidth:0,display:'grid',gap:10}}>
    <legend style={{fontSize:12,fontWeight:700}}>Entry {index+1}</legend>
    <label style={label}>Description<input style={inp} maxLength={100} value={line.description} onChange={e=>onChange(p=>({...p,lines:p.lines.map((row,i)=>i===index?{...row,description:e.target.value}:row)}))}/></label>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,150px),1fr))',gap:10}}>
     {(statement?(['date','reference','debit','credit'] as const):delivery?(['qty'] as const):(['qty','rate'] as const)).map(key=><label key={key} style={label}>{({date:'Source date',reference:'Source reference',debit:'Debit (KES)',credit:'Credit (KES)',qty:'Quantity',rate:'Unit rate (KES)'})[key]}<input style={inp} type={key==='date'?'date':key==='reference'?'text':'number'} min={key==='reference'||key==='date'?undefined:0} step="1" maxLength={key==='reference'?45:undefined} value={line[key]} onChange={e=>onChange(p=>({...p,lines:p.lines.map((row,i)=>i===index?{...row,[key]:e.target.value}:row)}))}/></label>)}
    </div>
    {value.lines.length>1&&<button type="button" style={{...btnSmall,justifySelf:'start'}} onClick={()=>onChange(p=>({...p,lines:p.lines.filter((_,i)=>i!==index)}))}>Remove entry {index+1}</button>}
   </fieldset>)}
   <button type="button" style={{...btnSmall,justifySelf:'start'}} disabled={value.lines.length>=7} onClick={()=>onChange(p=>({...p,lines:[...p.lines,emptyOperationalLine()]}))}>Add entry · {value.lines.length}/7</button>
  </div>
  {!delivery&&<p style={{margin:0,fontWeight:700,color:'#80114c'}}>{statement?'Manual closing balance':'Draft total'}: {fmtKES(statement?computed.closingBalance:computed.total)}</p>}
  <label style={label}>Notes / source context (optional)<textarea style={inp} maxLength={450} rows={3} value={value.notes} onChange={e=>onChange(p=>({...p,notes:e.target.value}))}/></label>
  <p style={{margin:0,fontSize:12,color:'#655a62'}}>Saving this paperwork does not change orders, stock, invoices, refunds or payments. No verification link or signature is created.</p>
 </div>;
}
