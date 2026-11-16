'use client';
import {useEffect,useState} from 'react';
import {ArrowUp} from '@phosphor-icons/react';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {managedMediaMessages} from '@/ui/i18n/catalogues/managed-media';
import styles from './BackToTop.module.css';
export default function BackToTop(){
 const t=useMessages(managedMediaMessages),[visible,setVisible]=useState(false);
 useEffect(()=>{let frame=0;const update=()=>{frame=0;setVisible(window.scrollY>600)},scroll=()=>{if(!frame)frame=requestAnimationFrame(update)};update();addEventListener('scroll',scroll,{passive:true});return()=>{removeEventListener('scroll',scroll);cancelAnimationFrame(frame)}},[]);
 if(!visible)return null;
 return <button type="button" className={styles.button} aria-label={t('backTop')} title={t('backTop')} onClick={()=>{window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});document.getElementById('main-content')?.focus({preventScroll:true})}}><ArrowUp size={22} aria-hidden="true"/></button>;
}
