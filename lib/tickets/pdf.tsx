// Shared compact print engine: actual PDF text and vector QR modules, no page screenshots.
import {compactDocumentPdf,type PrintBrand,type PrintRecord} from './compact-document-pdf';
import {getEventMeta,getEventName,signedTicketBlob} from '@/lib/server/tickets';
import {orderLines} from '@/lib/server/catalog';
import {q} from '@/lib/server/db';
const SITE='https://urbangangtour.co.ke';
async function eventBrand(id?:string|null):Promise<PrintBrand & {design?:string}>{
 if(!id)return {};
 try{const rows=await q<{ticket_design:any}>('SELECT ticket_design FROM marketplace_events WHERE id=$1',[id]);const raw=rows[0]?.ticket_design;return typeof raw==='string'?JSON.parse(raw):raw||{}}catch{return {}}
}
export async function renderTicketPdf(input:{code:string;eventId:string;tierName:string;holder:string;position:number;ofCount:number;createdAt:string|Date;orderId:string;payMethod:string;logo:string|null;marketplaceEventId?:string|null}):Promise<Buffer>{
 const [meta,event,brand]=await Promise.all([getEventMeta(input.eventId,input.marketplaceEventId),getEventName(input.eventId,input.marketplaceEventId),eventBrand(input.marketplaceEventId)]);
 const proof=signedTicketBlob({code:input.code,order_id:input.orderId,event_id:input.eventId,tier_name:input.tierName,created_at:input.createdAt});
 const record:PrintRecord={type:'ticket',event,name:input.holder,date:meta?.date||'Date to be confirmed',time:meta?.time||'',venue:meta?.venue||'',amount:-1,order:input.orderId,id:input.code,tier:input.tierName,qty:1,status:input.payMethod==='comp'?'Complimentary':'Issued',verifyUrl:`${SITE}/verify/ticket/${encodeURIComponent(input.code)}`,reference:input.payMethod,items:[]};
 const pdf=await compactDocumentPdf(record,brand.design||'festival',{...brand,logo:brand.logo||input.logo||undefined,accent:brand.accent||meta?.accent,proof});
 return Buffer.from(pdf.output('arraybuffer'));
}
export async function renderReceiptPdf(order:any,logo:string|null,maskedPhone:string,tickets:{code:string;position:number;ofCount:number;tierName:string}[]=[]):Promise<Buffer>{
 const lines=orderLines(typeof order.items==='string'?JSON.parse(order.items):order.items||[]);
 const record:PrintRecord={type:'receipt',event:'Urban Gang Tour purchase',name:String(order.name||'Customer'),date:new Date(order.created_at||Date.now()).toLocaleDateString('en-GB',{timeZone:'Africa/Nairobi'}),time:'',venue:'',amount:Number(order.total||0),order:String(order.id),id:String(order.id),tier:'Purchase',qty:lines.reduce((n,l)=>n+l.qty,0),status:String(order.status||'pending'),verifyUrl:`${SITE}/verify/order/${encodeURIComponent(order.id)}`,reference:String(order.mpesa_receipt||order.paystack_ref||order.stripe_payment_intent||'No payment reference'),items:lines.map(l=>({name:l.name,qty:l.qty,price:order.pay_method==='comp'?0:l.total/l.qty}))};
 const pdf=await compactDocumentPdf(record,'retail',{logo:logo||undefined});return Buffer.from(pdf.output('arraybuffer'));
}
