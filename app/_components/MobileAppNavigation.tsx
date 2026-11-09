'use client';
import {House,CalendarBlank,Storefront,Ticket,ChatCircleText} from '@phosphor-icons/react';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {shellMessages} from '@/ui/i18n/catalogues/shell';
import styles from './MobileAppNavigation.module.css';
export function MobileAppNavigation({path}:{path:string}){const t=useMessages(shellMessages);
 if(/^\/(checkout|pay|admin|organizer|receipt|tickets|t|verify)(\/|$)/.test(path)||path==='/reels')return null;
 const entries=[{href:'/',label:t('nav.home'),Icon:House},{href:'/events',label:t('nav.events'),Icon:CalendarBlank},{href:'/shop',label:t('nav.shop'),Icon:Storefront},{href:'/account',label:t('nav.tickets'),Icon:Ticket},{href:'/contact-us',label:t('nav.contact'),Icon:ChatCircleText}];
 return <nav className={styles.dock} data-mobile-app-navigation aria-label={t('nav.main')}>{entries.map(({href,label,Icon})=>{const active=href==='/'?path==='/':path===href||path.startsWith(href+'/')||href==='/shop'&&path==='/cart';return <a key={href} href={href} aria-current={active?'page':undefined}><Icon size={24} weight={active?'fill':'regular'} aria-hidden="true"/><span>{label}</span></a>})}</nav>
}
