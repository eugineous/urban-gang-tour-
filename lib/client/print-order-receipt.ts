import {fetchWithTimeout} from './fetch-with-timeout';

export type ReceiptDownloadResult = {ok:boolean; message:string; receiptUrl?:string};

/** Download the authoritative PDF; browser order rows never produce payment evidence. */
export async function downloadOrderReceipt(order:{id:unknown;status?:unknown}):Promise<ReceiptDownloadResult> {
 const id=String(order.id||'');
 if(!/^ORD-[A-Z0-9-]{4,40}$/.test(id))return {ok:false,message:'This order reference is invalid. Refresh the order list.'};
 const receiptUrl='/receipt/'+encodeURIComponent(id);
 const unconfirmed={ok:false,message:'A receipt requires confirmed payment. Refresh this order to check its current payment status.',receiptUrl};
 if(!['paid','fulfilled'].includes(String(order.status)))return unconfirmed;
 let url='';
 try{
  const response=await fetchWithTimeout('/api/receipts/'+encodeURIComponent(id)+'/pdf',{cache:'no-store',credentials:'same-origin'},20000);
  if(response.status===409)return unconfirmed;
  if(!response.ok)return {ok:false,message:response.status===429?'Receipt requests are temporarily limited. Wait a minute and retry, or open the receipt page.':'The receipt PDF could not be prepared. Retry, or open the receipt page.',receiptUrl};
  if(!response.headers.get('content-type')?.toLowerCase().startsWith('application/pdf'))throw Error('invalid_pdf');
  const data=await response.arrayBuffer();
  if(new TextDecoder().decode(data.slice(0,5))!=='%PDF-')throw Error('invalid_pdf');
  url=URL.createObjectURL(new Blob([data],{type:'application/pdf'}));
 }catch{
  return {ok:false,message:'Receipt download failed. Check your connection and try again, or open the receipt page.',receiptUrl};
 }
 try{
  const link=document.createElement('a');
  link.href=url;link.download='UGT-Receipt-'+id+'.pdf';link.rel='noopener';
  document.body.append(link);
  try{link.click()}finally{link.remove()}
  // Safari may still be consuming the object URL after click returns.
  setTimeout(()=>URL.revokeObjectURL(url),60000);
  return {ok:true,message:'Receipt PDF ready; download requested. If your browser does not save it, open the receipt page.',receiptUrl};
 }catch{
  URL.revokeObjectURL(url);
  return {ok:false,message:'Your browser could not start the receipt download. Open the receipt page to view or save the PDF.',receiptUrl};
 }
}
