/** Manual paperwork only. These types never read or modify a financial/fulfillment ledger. */
export const OPERATIONAL_DOCS={
 deliverynote:{title:'Delivery note',partyLabel:'Recipient / organisation',purposeLabel:'Items / handover purpose',referenceLabel:'Order / source reference',note:'Preparation copy only. This draft does not confirm dispatch, receipt or delivery.'},
 purchaseorder:{title:'Purchase order',partyLabel:'Supplier / organisation',purposeLabel:'Purchase purpose / scope',referenceLabel:'Request / project reference',note:'Purchase request draft only. Confirm approval and supplier terms separately; no purchase or payment is recorded.'},
 creditnote:{title:'Credit note',partyLabel:'Customer / organisation',purposeLabel:'Reason for proposed credit',referenceLabel:'Original invoice reference',note:'Proposed adjustment only. This draft does not change an invoice, record a refund or confirm that money was returned.'},
 customerstatement:{title:'Customer statement',partyLabel:'Customer / organisation',purposeLabel:'Statement period / scope',referenceLabel:'Account / source reference',note:'Manually entered summary only. Check each entry against source records; this is not a live or reconciled account ledger.'},
} as const;
export type OperationalDocType=keyof typeof OPERATIONAL_DOCS;
export const isOperationalDoc=(type:unknown):type is OperationalDocType=>typeof type==='string'&&Object.hasOwn(OPERATIONAL_DOCS,type);
export type OperationalLine={description:string;qty:number;rate:number;date:string;reference:string;debit:number;credit:number;balance:number};
export type OperationalPayload={draft:true;date:string;party:string;partyAddress:string;reference:string;purpose:string;preparedBy:string;notes:string;requestedDate:string;openingBalance:number;lines:OperationalLine[];total:number;totalDebit:number;totalCredit:number;closingBalance:number};
export type OperationalFormLine={description:string;qty:string;rate:string;date:string;reference:string;debit:string;credit:string};
export type OperationalFormState={date:string;party:string;partyAddress:string;reference:string;purpose:string;preparedBy:string;notes:string;requestedDate:string;openingBalance:string;lines:OperationalFormLine[]};
export const emptyOperationalLine=():OperationalFormLine=>({description:'',qty:'',rate:'',date:'',reference:'',debit:'',credit:''});
export const emptyOperationalForm=():OperationalFormState=>({date:new Date().toISOString().slice(0,10),party:'',partyAddress:'',reference:'',purpose:'',preparedBy:'',notes:'',requestedDate:'',openingBalance:'',lines:[emptyOperationalLine()]});

function text(value:unknown,limit:number):string {
 if(value===undefined||value===null)return '';
 if(typeof value!=='string'||value.length>limit)throw Error('Keep document text within the displayed field limits.');
 return value.trim();
}
function date(value:unknown):string {
 const out=text(value,10);
 if(out&&(!/^\d{4}-\d{2}-\d{2}$/.test(out)||Number.isNaN(Date.parse(out))||new Date(out).toISOString().slice(0,10)!==out))throw Error('Enter a valid document date.');
 return out;
}
function amount(value:unknown,signed=false):number {
 if(value===''||value===undefined||value===null)return 0;
 if(typeof value!=='string'&&typeof value!=='number')throw Error('Enter a whole-number amount.');
 const out=Number(value);
 if(!Number.isSafeInteger(out)||(!signed&&out<0)||Math.abs(out)>1_000_000_000_000)throw Error('Enter a valid whole-number amount within the document limits.');
 return out;
}

export function prepareOperationalRecord(type:OperationalDocType,raw:unknown):OperationalPayload {
 const p=(raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{}) as Record<string,unknown>;
 const allowed=new Set(['date','party','partyAddress','reference','purpose','preparedBy','notes','requestedDate','openingBalance','lines','total','totalDebit','totalCredit','closingBalance']);
 if(Object.keys(p).some(key=>!allowed.has(key)))throw Error('Unsupported document field. Payment, approval, signature and delivery claims cannot be supplied.');
 if(p.lines!==undefined&&!Array.isArray(p.lines))throw Error('Document lines must be a list.');
 const rows=(p.lines||[]) as unknown[];
 if(rows.length>7)throw Error('Use at most 7 entries per document.');
 const openingBalance=type==='customerstatement'?amount(p.openingBalance,true):0;
 let balance=openingBalance,total=0,totalDebit=0,totalCredit=0;
 const lines=rows.map(rawLine=>{
  if(!rawLine||typeof rawLine!=='object'||Array.isArray(rawLine))throw Error('Invalid document line.');
  const l=rawLine as Record<string,unknown>;
  if(Object.keys(l).some(key=>!['description','qty','rate','date','reference','debit','credit'].includes(key)))throw Error('Unsupported document line field.');
  const statement=type==='customerstatement',delivery=type==='deliverynote';
  const debit=statement?amount(l.debit):0,credit=statement?amount(l.credit):0;
  if(debit>0&&credit>0)throw Error('Each statement entry must be a debit or a credit, not both.');
  const qty=statement?0:amount(l.qty),rate=statement||delivery?0:amount(l.rate);
  if(qty>1_000_000)throw Error('Use a quantity of 1,000,000 or less.');
  total+=qty*rate;totalDebit+=debit;totalCredit+=credit;balance+=debit-credit;
  if(![total,totalDebit,totalCredit,balance].every(n=>Number.isSafeInteger(n)&&Math.abs(n)<=1_000_000_000_000))throw Error('Document total exceeds the supported limit.');
  return {description:text(l.description,100),qty,rate,date:statement?date(l.date):'',reference:statement?text(l.reference,45):'',debit,credit,balance};
 }).filter(l=>l.description||l.qty||l.rate||l.debit||l.credit||l.reference||l.date);
 return {draft:true,date:date(p.date),party:text(p.party,160),partyAddress:text(p.partyAddress,180),reference:text(p.reference,60),purpose:text(p.purpose,200),preparedBy:text(p.preparedBy,100),notes:text(p.notes,450),requestedDate:type==='purchaseorder'?date(p.requestedDate):'',openingBalance,lines,total,totalDebit,totalCredit,closingBalance:balance};
}

export function validateOperationalRecord(type:OperationalDocType,p:OperationalPayload):void {
 if(!p.date||!p.party||!p.purpose)throw Error('Document date, recipient and purpose are required.');
 if(!p.reference)throw Error('A source reference is required.');
 if(!p.preparedBy)throw Error('A preparer name is required.');
 if(!p.lines.length)throw Error('Add at least one completed document entry.');
 for(const line of p.lines){
  if(!line.description)throw Error('Every document entry needs a description.');
  if(type==='customerstatement'){
   if(!line.date||!line.reference||!(line.debit>0||line.credit>0))throw Error('Each statement entry needs a date, source reference and debit or credit amount.');
  }else if(!(line.qty>0)||type!=='deliverynote'&&!(line.rate>0))throw Error('Complete each item quantity and, where applicable, its rate.');
 }
}
