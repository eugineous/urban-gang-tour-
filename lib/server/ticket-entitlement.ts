/** Historical unallocated partial refunds stay blocked until reviewed. */
export function ticketIsActive(ticket:{voided_at?:unknown;order_status:string;ticket_refund_policy?:unknown}){
 return !ticket.voided_at&&(['paid','fulfilled'].includes(ticket.order_status)||(ticket.order_status==='partially_refunded'&&ticket.ticket_refund_policy==='allocated'));
}
