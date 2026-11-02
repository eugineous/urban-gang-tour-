import {paymentPresentation} from './payment-presentation';

export type PaymentDelivery={
 tickets:'not_required'|'preparing'|'ready'|'review'|'unknown';
 email:'not_requested'|'preparing'|'queued'|'processing'|'accepted'|'review'|'unknown';
};

/** Redacted status is presentation only. Missing or future values never imply delivery. */
export function paymentFeedback(status:string,value:unknown){
 const view=paymentPresentation(status);
 const summary=value&&typeof value==='object'?value as Record<string,unknown>:{};
 const tickets=typeof summary.tickets==='string'&&['not_required','preparing','ready','review','unknown'].includes(summary.tickets)?summary.tickets as PaymentDelivery['tickets']:'unknown';
 const email=typeof summary.email==='string'&&['not_requested','preparing','queued','processing','accepted','review','unknown'].includes(summary.email)?summary.email as PaymentDelivery['email']:'unknown';
 const delivery:PaymentDelivery=view.paid?{tickets,email}:{tickets:'unknown',email:'unknown'};
 const keepChecking=!view.terminal||view.paid&&(['preparing','unknown'].includes(tickets)||['preparing','queued','processing','unknown'].includes(email));
 return {paid:view.paid,delivery,keepChecking};
}
