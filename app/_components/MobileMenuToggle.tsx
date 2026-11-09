'use client';
import {useEffect,useState,type MouseEventHandler,type Ref} from 'react';
import {List} from '@phosphor-icons/react';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {shellMessages} from '@/ui/i18n/catalogues/shell';
/** Page-local engagement: a fresh PathShell/page visit starts the invitation again. */
export function MobileMenuToggle({open,onClick,buttonRef}:{open:boolean;onClick:MouseEventHandler<HTMLButtonElement>;buttonRef?:Ref<HTMLButtonElement>}){
 const t=useMessages(shellMessages),[engaged,setEngaged]=useState(false);
 useEffect(()=>{const reset=(event:PageTransitionEvent)=>{if(event.persisted)setEngaged(false)};window.addEventListener('pageshow',reset);return()=>window.removeEventListener('pageshow',reset)},[]);
 return <button type="button" ref={buttonRef} className="menu-toggle" data-menu-engaged={engaged} aria-haspopup="dialog" aria-expanded={open} aria-controls="site-menu" onClick={event=>{setEngaged(true);onClick(event)}}><List className="mobile-menu-icon" size={23} aria-hidden="true"/><span className="mobile-menu-label">{t('nav.menu')}</span></button>;
}
