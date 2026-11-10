'use client';
import {House,CalendarBlank,Ticket,ChatCircleText,Storefront} from '@phosphor-icons/react';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {shellMessages} from '@/ui/i18n/catalogues/shell';
import styles from './MobileAppNavigation.module.css';
export function MobileAppNavigation({path}:{path:string}){const t=useMessages(shellMessages);
 if(/^\/(checkout|pay|admin|organizer|receipt|tickets|t|verify)(\/|$)/.test(path)||path==='/reels')return null;
 const entries=[{href:'/events',label:t('nav.events'),Icon:CalendarBlank},{href:'/my-tickets',label:t('nav.tickets'),Icon:Ticket},{href:'/',label:t('nav.home'),Icon:House},{href:'/shop',label:t('nav.shop'),Icon:Storefront},{href:'/apply',label:t('nav.contact'),Icon:ChatCircleText}];
 return <nav className={styles.dock} data-mobile-app-navigation aria-label={t('nav.main')}>{entries.map(({href,label,Icon})=>{const active=href==='/'?path==='/':path===href||path.startsWith(href+'/')||(href==='/my-tickets'&&/^\/account(?:\/|$)/.test(path))||(href==='/apply'&&['/book','/contact-us'].some(route=>path===route||path.startsWith(route+'/')))||(href==='/shop'&&path==='/cart');return <a key={href} href={href} data-home={href==='/'||undefined} aria-current={active?'page':undefined}><Icon size={24} weight={active?'fill':'regular'} aria-hidden="true"/><span>{label}</span></a>})}</nav>
}
