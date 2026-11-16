'use client';
import {formatKes} from '@/lib/i18n/format';
import {accountMessages,statusIssue} from '@/ui/i18n/catalogues/account';
import {useInterfaceLanguage,useMessages} from '@/ui/i18n/LanguageProvider';
import {accountPurchasesMessages} from './account-purchases-messages';
import styles from './AccountPurchases.module.css';

type HistoryNavigation={currentCursor?:string|null;next?:string|null;first?:string};
type Wallet={
 orders:{id:string;status:string;total:number|string;created_at:string}[];
 tickets:{code:string;order_id:string;tier_name:string;used_at:string|null}[];
 requests:{id:string;status:string}[];
 pagination?:{download?:string;exportScope?:string;orders?:HistoryNavigation;tickets?:HistoryNavigation;requests?:HistoryNavigation};
};
type Props={wallet:Wallet|null;errorText?:string;onRetry:()=>void};

export default function AccountPurchases({wallet,errorText,onRetry}:Props) {
 const t=useMessages(accountMessages),copy=useMessages(accountPurchasesMessages),{locale}=useInterfaceLanguage();
 const date=(value:string)=>{
  // Only presentation uses millisecond precision; pagination uses the SQL text.
  const parsed=new Date(value.replace(' ','T').replace(/(\.\d{3})\d+/,'$1').replace(/([+-]\d{2})$/,'$1:00'));
  return Number.isNaN(parsed.getTime())?'':new Intl.DateTimeFormat(locale==='en'?'en-KE':locale,{dateStyle:'medium',timeZone:'Africa/Nairobi'}).format(parsed);
 };
 const navigation=(stream:'orders'|'tickets'|'requests',older:'olderOrders'|'olderTickets'|'olderRequests')=>{
  const page=wallet?.pagination?.[stream];
  return page&&(page.currentCursor||page.next)?<nav className={styles.actions} aria-label={`${copy('navigation')}: ${stream==='tickets'?t('copy.tickets'):copy(stream)}`}>
   {page.currentCursor&&<a href={page.first}>{copy('first')}</a>}
   {page.next&&<a href={page.next}>{copy(older)}</a>}
  </nav>:null;
 };
 return <section className={styles.panel} aria-labelledby="account-purchases-heading">
  <h2 id="account-purchases-heading">{t('copy.my_orders_tickets')}</h2>
  <p>{copy('linked')}</p>
  {errorText&&<div role="alert"><p>{errorText}</p><button type="button" onClick={onRetry}>{t('copy.retry')}</button></div>}
  {!wallet&&!errorText&&<p role="status">{t('copy.loading_your_purchases')}</p>}
  {wallet&&<>
   <h3>{copy('orders')}</h3>
   {wallet.orders.length===0&&<p>{copy('noOrders')} <a href="/events">{t('copy.find_an_event')}</a> <a href="/shop">{t('copy.visit_the_shop')}</a></p>}
   {wallet.orders.map(order=><article key={order.id} className={styles.entry}>
    <h4>{order.id}</h4><p>{t(statusIssue(order.status).key)} · {formatKes(Number(order.total),locale)??''}</p><p>{date(order.created_at)}</p>
    {['paid','fulfilled'].includes(order.status)&&<div className={styles.actions}><a href={`/receipt/${encodeURIComponent(order.id)}`}>{t('copy.view_receipt')}</a><a href={`/orders/track?ref=${encodeURIComponent(order.id)}`}>{t('copy.track_order')}</a></div>}
   </article>)}
   {navigation('orders','olderOrders')}
   <h3>{t('copy.tickets')}</h3>
   {wallet.tickets.length===0&&<p>{copy('noTickets')}</p>}
   {wallet.tickets.map(ticket=><article key={ticket.code} className={styles.entry}>
    <h4>{ticket.tier_name}</h4><p>{t('copy.order_reference_2')}: {ticket.order_id}</p>
    <a href={`/api/tickets/${encodeURIComponent(ticket.code)}/pdf`}>{t('copy.download')} {ticket.tier_name} {t('copy.ticket')}</a>
    <p>{ticket.used_at?t('copy.scanned_at_gate'):t('copy.not_yet_scanned')}</p>
   </article>)}
   {navigation('tickets','olderTickets')}
   <h3>{copy('requests')}</h3>
   {wallet.requests.length===0&&<p>{copy('noRequests')}</p>}
   {wallet.requests.map(request=><p key={request.id} className={styles.entry}>{t('copy.request')} {request.id}: {t(statusIssue(request.status,'privacy').key)}</p>)}
   {navigation('requests','olderRequests')}
   {wallet.pagination?.download&&<div className={styles.export}><a href={wallet.pagination.download}>{copy('exportPage')}</a><p>{copy('exportHelp')}</p></div>}
  </>}
 </section>;
}
