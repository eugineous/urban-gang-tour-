/** Routing only: shape checks are NOT payment, ownership or signature proof.
 * Existing /t and /tickets pages remain the sole entitlement boundary. */
export function guestTicketDestination(value:string):string|null{
 const input=value.trim();if(!input||input.length>512)return null;
 const ticket=/^TKT-(?:[A-HJ-NP-Z2-9]{22}-[A-HJ-NP-Z2-9]{12}|[A-HJ-NP-Z2-9]{10}-[A-HJ-NP-Z2-9]{4})$/;
 const order=/^ORD-[A-Z0-9]+[A-F0-9]{24}$/;
 const destination=(id:string)=>ticket.test(id)?'/t/'+id:order.test(id)&&id.length<=44?'/tickets/'+id:null;
 const direct=destination(input);if(direct)return direct;
 try{
  const url=new URL(input);
  if(url.protocol!=='https:'||!['urbangangtour.co.ke','www.urbangangtour.co.ke'].includes(url.hostname)||url.port||url.username||url.password)return null;
  if(url.pathname==='/pay/success'&&url.searchParams.getAll('ref').length===1){const id=url.searchParams.get('ref')!;return order.test(id)?destination(id):null}
  const match=url.pathname.match(/^\/(t|tickets|receipt)\/([^/]+)\/?$/);if(!match)return null;
  if(match[1]==='t')return ticket.test(match[2])?destination(match[2]):null;
  return order.test(match[2])?destination(match[2]):null;
 }catch{return null}
}
