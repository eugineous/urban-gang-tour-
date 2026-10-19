/** Presentation only; the server/provider remains authoritative for payment truth. */
export function paymentPresentation(status:string){
 const paid=status==='paid'||status==='fulfilled';
 const unsuccessful=['failed','declined','timed_out','cancelled'].includes(status);
 const refunded=['refunded','partially_refunded'].includes(status);
 const terminal=paid||unsuccessful||refunded;
 const titles:Record<string,string>={paid:'Payment confirmed',fulfilled:'Payment confirmed',declined:'Payment declined',timed_out:'Payment prompt timed out',failed:'Payment was not completed',cancelled:'Payment cancelled',refunded:'Full return recorded',partially_refunded:'Partial return recorded',unknown:'Payment outcome not yet confirmed',reconciling:'We are checking your payment'};
 const message=paid?'Your payment is recorded. Open your receipt to download your documents.':refunded?'This order has a refund recorded. Check your account or contact us about the refund and any remaining entitlement.':unsuccessful?'This attempt is not confirmed as paid. If money left your account, contact us with this order reference before paying again.':'Please do not pay again while this order is being checked. An order reference or phone prompt is not payment confirmation.';
 return {paid,terminal,title:titles[status]||'Payment confirmation pending',message};
}
