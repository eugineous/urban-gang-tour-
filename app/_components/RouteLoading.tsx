'use client';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {shellMessages} from '@/ui/i18n/catalogues/shell';
/** Only shown while a route is actually suspended; no fabricated percentages. */
export default function RouteLoading(){
 const t=useMessages(shellMessages);
 return <div className="route-loading" data-route-placeholder role="status" aria-live="polite"><p>{t('loading.page')}</p><div className="route-placeholder" aria-hidden="true"><span/><span/><div><i/><i/></div></div></div>;
}
