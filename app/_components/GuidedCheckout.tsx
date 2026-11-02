'use client';
import type {ReactNode,RefObject} from 'react';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {checkoutJourneyMessages} from '@/ui/i18n/catalogues/checkoutJourney';
import {Check} from '@phosphor-icons/react';
import styles from './GuidedCheckout.module.css';

export default function GuidedCheckout({step,ticket,busy,headingRef,summary,children,detailsNote}:{step:number;ticket:boolean;busy:boolean;headingRef:RefObject<HTMLHeadingElement|null>;summary:ReactNode;children:ReactNode;detailsNote?:string}){
 const t=useMessages(checkoutJourneyMessages);
 const labels=[t('details'),t(ticket?'tickets':'delivery'),t('payment')];
 return <div className={styles.journey} data-checkout-journey>
  <div className={styles.main}>
   <div className={styles.brand}><img className={styles.brandLogo} src="/assets/ugt-logo.png" alt="Urban Gang Tour"/><span>Urban Gang Tour</span><span className={styles.stepCount}>{t('step',{current:step+1,total:3})}</span></div>
   <ol className={styles.progress} aria-label={t('progress')}>{labels.map((label,index)=><li key={index} aria-current={step===index?'step':undefined} data-complete={index<step}><span aria-hidden="true">{index<step?<Check size={13} weight="bold"/>:index+1}</span><span>{label}</span></li>)}</ol>
   <header className={styles.heading}><h2 id="checkout-step-title" tabIndex={-1} ref={headingRef}>{busy?t('waiting'):labels[step]}</h2><p>{busy?t('waiting.note'):step===0&&detailsNote?detailsNote:t(step===0?'details.note':step===1?ticket?'tickets.note':'delivery.note':'payment.note')}</p></header>
   {busy&&<div className={styles.connecting} role="status"><span aria-hidden="true"/>{t('waiting.note')}</div>}
   {children}
  </div>
  {summary}
 </div>;
}
