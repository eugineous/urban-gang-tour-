'use client';
import {useState} from 'react';
import {ArrowLeft,ArrowUpRight,ArrowCounterClockwise,CheckCircle,Clock,Copy,EnvelopeSimple,Receipt,Ticket,XCircle} from '@phosphor-icons/react';
import {useInterfaceLanguage,useMessages} from '@/ui/i18n/LanguageProvider';
import {accountMessages,factoryIssue} from '@/ui/i18n/catalogues/account';
import {paymentMessages,type PaymentMessageKey} from '@/ui/i18n/catalogues/payment';
import {paymentResultMessages,type PaymentResultMessageKey} from '@/ui/i18n/catalogues/payment-result';
import {paymentPresentation} from '@/lib/client/payment-presentation';
import type {PaymentDelivery} from '@/lib/client/payment-feedback';
import {formatKes} from '@/lib/i18n/format';
import styles from './PaymentResult.module.css';

type Props={orderId:string;status:string;delivery:PaymentDelivery;total?:number;method?:string;remainingTickets:boolean;offline:boolean;error:boolean;stopped:boolean;checking:boolean;onCheck:()=>void};
export default function PaymentResultScreen({orderId,status,delivery,total,method,remainingTickets,offline,error,stopped,checking,onCheck}:Props){
 const t=useMessages(accountMessages),p=useMessages(paymentMessages),r=useMessages(paymentResultMessages),{locale}=useInterfaceLanguage();
 const [copy,setCopy]=useState<'none'|'copied'|'failed'>('none');
 const view=paymentPresentation(status),refund=['refunded','partially_refunded'].includes(status);
 const state=view.paid?'success':refund?'refund':view.terminal?'failed':'pending';
 const Icon=view.paid?CheckCircle:refund?ArrowCounterClockwise:view.terminal?XCircle:Clock;
 const eyebrow:PaymentResultMessageKey=view.paid?'eyebrow.success':refund?'eyebrow.refund':view.terminal?'eyebrow.failed':'eyebrow.pending';
 const ticketKey=delivery.tickets==='not_required'?null:`tickets.${delivery.tickets}` as PaymentMessageKey;
 const emailKey=delivery.email==='not_requested'?'email.notRequested':`email.${delivery.email}` as PaymentMessageKey;
 const amount=typeof total==='number'&&Number.isFinite(total)&&total>=0?formatKes(total,locale):null;
 const methodKey=method==='paystack'?'method.paystack':method==='mpesa'?'method.mpesa':method==='card'?'method.card':method==='comp'?'method.comp':null;
 const track='/orders/track?ref='+encodeURIComponent(orderId),receipt='/receipt/'+encodeURIComponent(orderId),tickets='/tickets/'+encodeURIComponent(orderId);
 async function copyReference(){try{await navigator.clipboard.writeText(orderId);setCopy('copied');}catch{setCopy('failed');}}
 return <section className={styles.screen} data-payment-state={state} aria-labelledby="payment-result-title">
  <header className={styles.top}><a href="/shop"><ArrowLeft size={18} aria-hidden="true"/>{r('back')}</a><span>URBAN GANG TOUR</span></header>
  <div className={styles.hero} aria-live="polite">
   <div className={styles.badge} data-state={state}><Icon size={112} weight="duotone" aria-hidden="true"/></div>
   <p className={styles.eyebrow}>{r(eyebrow)}</p>
   <h1 id="payment-result-title">{t(factoryIssue(view.title).key)}</h1>
   {view.paid&&<p className={styles.thanks}>{r('thanks')}</p>}
   <p className={styles.explanation}>{view.paid?p('receipt.available'):t(factoryIssue(view.message).key)}</p>
  </div>
  <div className={styles.reference}>
   <div><span>{t('copy.order_reference')}</span><code tabIndex={0}>{orderId}</code></div>
   <button type="button" onClick={()=>void copyReference()} aria-label={r('reference.copy')} title={r('reference.copy')}><Copy size={21} aria-hidden="true"/></button>
  </div>
  {copy!=='none'&&<p className={styles.copyFeedback} role="status">{r(copy==='copied'?'reference.copied':'reference.copyFailed')}</p>}
  <div className={styles.primaryActions}>
   {view.paid?<>
    <a className={styles.primary} href={delivery.tickets==='ready'?tickets:track} referrerPolicy="no-referrer">{delivery.tickets==='ready'?p('tickets.open'):r('order.view')}<ArrowUpRight size={19} aria-hidden="true"/></a>
    <a className={styles.secondary} href={receipt}><Receipt size={18} aria-hidden="true"/>{p('receipt.open')}</a>
   </>:<button type="button" className={styles.primary} onClick={onCheck} disabled={checking||offline}>{checking?p('lookup.checking'):t('copy.check_payment_again')}</button>}
   {remainingTickets&&!view.paid&&<a className={styles.secondary} href={tickets}><Ticket size={18} aria-hidden="true"/>{t('copy.view_remaining_tickets')}</a>}
  </div>
  {(amount||methodKey)&&<dl className={styles.facts}>{amount&&<div><dt>{r('amount')}</dt><dd>{amount}</dd></div>}{methodKey&&<div><dt>{r('method')}</dt><dd>{r(methodKey)}</dd></div>}</dl>}
  {view.paid&&<div className={styles.delivery}>
   {ticketKey&&<div><Ticket size={22} aria-hidden="true"/><div><h2>{p('tickets.heading')}</h2><p>{p(ticketKey)}</p></div></div>}
   <div><EnvelopeSimple size={22} aria-hidden="true"/><div><h2>{p('email.heading')}</h2><p>{p(emailKey)}</p></div></div>
  </div>}
  <div className={styles.connection}>
   {offline?<p role="status">{p('lookup.offline')}</p>:error&&<p role="alert">{p('lookup.failed')}</p>}
   {stopped&&!offline&&<p>{p('lookup.paused')}</p>}
  </div>
  {view.paid&&<div className={styles.recheck}><button type="button" onClick={onCheck} disabled={checking||offline}>{checking?p('lookup.checking'):t('copy.check_payment_again')}</button></div>}
  <details className={styles.updates}>
   <summary>{r('details')}</summary>
   <ol aria-label={t('copy.payment_progress')}>
    <li>{t('copy.order_reference_recorded')}</li>
    <li>{view.paid?t('copy.payment_confirmed_by_the_payment_provider'):view.terminal?t('copy.payment_status_received'):t('copy.waiting_for_the_payment_provider')}</li>
    <li>{view.paid?p('receipt.available'):t('copy.receipt_available_after_confirmed_payment')}</li>
   </ol>
   {!view.paid&&<p><a href={track} referrerPolicy="no-referrer">{t('copy.track_order')}</a></p>}
   <p>{p('lookup.safe')}</p>
  </details>
  <footer className={styles.footer}><p>{r('help')}</p><nav aria-label={r('details')}><a href="/account">{t('copy.your_orders_and_receipts')}</a><a href="/contact-us">{p('order.help')}</a></nav></footer>
 </section>;
}
