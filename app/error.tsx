"use client";
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {shellMessages} from '@/ui/i18n/catalogues/shell';
import {useEffect} from 'react';
export default function Error({error,reset}:{error:Error&{digest?:string};reset:()=>void}){const t=useMessages(shellMessages);useEffect(()=>{console.error('[page-error]',error)},[error]);return <section className="current-state wrap" role="alert"><p className="eyebrow">{t('error.label')}</p><h1>{t('error.title')}</h1><p>{t('error.description')}</p><div className="current-actions"><button className="button" onClick={reset}>{t('error.reload')}</button><a href="/">{t('action.home')}</a></div></section>}
