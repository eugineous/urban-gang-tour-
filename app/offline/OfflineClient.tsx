"use client";
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {shellMessages} from '@/ui/i18n/catalogues/shell';
export default function OfflineClient(){const t=useMessages(shellMessages);return <section className="current-state wrap"><p className="eyebrow">{t('offline.label')}</p><h1>{t('offline.title')}</h1><p>{t('offline.description')}</p><button className="button" onClick={()=>location.pathname==='/offline'?location.assign('/'):location.reload()}>{t('offline.retry')}</button></section>}
