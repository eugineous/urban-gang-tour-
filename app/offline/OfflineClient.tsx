"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Offline retry must navigate without client JavaScript. */
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {shellMessages} from '@/ui/i18n/catalogues/shell';
export default function OfflineClient(){const t=useMessages(shellMessages);return <section className="current-state wrap"><p className="eyebrow">{t('offline.label')}</p><h1>{t('offline.title')}</h1><p>{t('offline.description')}</p><a className="button" href="/">{t('offline.retry')}</a></section>}
