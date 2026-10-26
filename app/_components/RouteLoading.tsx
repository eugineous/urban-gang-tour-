'use client';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {shellMessages} from '@/ui/i18n/catalogues/shell';
/** Only shown while a route is actually suspended; no fabricated percentages. */
export default function RouteLoading(){
 const t=useMessages(shellMessages);
 return <div className="route-loading" role="status" aria-live="polite"><img src="/assets/ugt-logo.png" alt="" width="72" height="72"/><p>{t('loading.ready')}</p><span className="sr-only">{t('loading.page')}</span></div>;
}
