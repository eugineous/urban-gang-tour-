'use client';
import {useId} from 'react';
import {INTERFACE_LOCALES,NATIVE_NAMES,nativeLocale} from '@/lib/i18n/locale';
import {shellMessages} from '@/ui/i18n/catalogues/shell';
import {useInterfaceLanguage,useMessages} from '@/ui/i18n/LanguageProvider';

// Keep path compatibility for existing footer/form callers. Selection stays local.
export default function LanguageChooser({path:_path}:{path:string}){
 void _path;
 const id=useId(),{locale,setLocale,persistence}=useInterfaceLanguage();
 const t=useMessages(shellMessages);
 return <div className="language-control" data-language-control>
  <label className="language-label" htmlFor={id}>{t('language.label')}</label>
  <select id={id} className="language-select" aria-label={t('language.label')} aria-describedby={id+'-help'} value={locale} onChange={event=>setLocale(nativeLocale(event.target.value)??'en')}>
   {INTERFACE_LOCALES.map(code=><option key={code} value={code}>{NATIVE_NAMES[code]}</option>)}
  </select>
  <span className="language-help" id={id+'-help'}>{t('language.help')}</span>
  {persistence==='unavailable'&&<span className="language-storage" role="status">{t('language.storageWarning')}</span>}
 </div>;
}
