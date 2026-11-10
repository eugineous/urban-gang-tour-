'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {ArrowUpRight} from '@phosphor-icons/react';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {ticketAccessMessages} from '@/ui/i18n/catalogues/ticket-access';
import {guestTicketDestination} from '@/lib/client/guest-ticket-destination';
import styles from './TicketAccess.module.css';
export default function GuestTicketAccess(){
 const t=useMessages(ticketAccessMessages),[value,setValue]=useState(''),[invalid,setInvalid]=useState(false),[ready,setReady]=useState(false),input=useRef<HTMLInputElement>(null);
 useEffect(()=>{setReady(true)},[]);
 function open(event:FormEvent){event.preventDefault();const destination=guestTicketDestination(value);if(!destination){setInvalid(true);input.current?.focus();return}window.location.assign(destination)}
 return <section className={styles.page} data-guest-ticket-access>
  <header className={styles.intro}><h1>{t('title')}</h1><p>{t('intro')}</p></header>
  <div className={styles.grid}>
   <section className={styles.panel} aria-labelledby="guest-ticket-heading"><h2 id="guest-ticket-heading">{t('guest')}</h2>
    <form className={styles.form} onSubmit={open} aria-busy={!ready}><label htmlFor="guest-ticket-reference">{t('label')}</label><input ref={input} id="guest-ticket-reference" value={value} onChange={event=>{setValue(event.target.value);setInvalid(false)}} required maxLength={512} autoComplete="off" autoCapitalize="off" spellCheck={false} disabled={!ready} aria-invalid={invalid||undefined} aria-describedby={'guest-ticket-hint'+(invalid?' guest-ticket-error':'')}/><p className={styles.hint} id="guest-ticket-hint">{t('hint')}</p><button className="button" type="submit" disabled={!ready}>{t('open')}<ArrowUpRight size={18} aria-hidden="true"/></button>{invalid&&<p className={styles.error} id="guest-ticket-error" role="alert">{t('invalid')}</p>}</form><noscript><p>{t('helpNote')}</p></noscript>
   </section>
   <aside className={styles.panel}><h2>{t('account')}</h2><p>{t('accountNote')}</p><div className={styles.links}><a className="button secondary" href="/account">{t('signIn')}</a><a className="button secondary" href="/account?mode=signup">{t('create')}</a></div></aside>
  </div>
  <p className={styles.privacy}>{t('privacy')}</p><details className={styles.help}><summary>{t('help')}</summary><p>{t('helpNote')}</p><a href="/contact-us">{t('contact')}</a></details>
 </section>;
}
