'use client';

import {ArrowUpRight, DeviceMobile, CheckCircle, WifiHigh, WifiSlash} from '@phosphor-icons/react';
import {AppUpdate, installApp, useInstallableApp} from '@/app/_components/InstallableApp';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {appMessages} from '@/ui/i18n/catalogues/app';
import styles from './App.module.css';

export default function AppClient() {
  const app = useInstallableApp(), t = useMessages(appMessages);
  return <section className={styles.page} data-app-content data-app-ready={app.ready}>
    <div className={styles.intro}>
      <p className={styles.eyebrow}>{t('page.label')}</p>
      <h1>{t('page.title')}</h1>
      <p>{t('page.description')}</p>
    </div>
    <div className={styles.install}>
      <div className={styles.icon}><DeviceMobile size={36} aria-hidden="true"/></div>
      <div>
        <h2>{t('install.title')}</h2>
        <div role="status" aria-live="polite">
          {app.installed ? <p className={styles.installed}><CheckCircle size={20} aria-hidden="true"/>{t('install.installed')}</p> : <>
            {!app.online && <p>{t('install.offline')}</p>}
            {app.prompt && <button type="button" disabled={!app.online || app.installing} onClick={() => void installApp()}>{t(app.installing ? 'install.pending' : 'install.action')}</button>}
            {app.installing && <p>{t('install.pending')}</p>}
            {app.installResult !== 'none' && <p>{t(`install.${app.installResult}`)}</p>}
            {app.ios ? <p>{t('install.ios')}</p> : !app.prompt && <p>{t('install.browser')}</p>}
          </>}
        </div>
        {!app.installed && app.prompt && <details><summary>{t('install.more')}</summary><p>{t(app.ios ? 'install.ios' : 'install.browser')}</p></details>}
      </div>
    </div>
    <div className={styles.connection} role="status" aria-live="polite">
      {app.online ? <WifiHigh size={22} aria-hidden="true"/> : <WifiSlash size={22} aria-hidden="true"/>}
      <div><strong>{t(app.online ? 'connection.online' : 'offline.title')}</strong>{!app.online && <p>{t('offline.description')}</p>}</div>
    </div>
    <nav className={styles.destinations} aria-label={t('links.title')} data-app-links>
      {([
        ['/shop', 'links.shop', 'links.shopDescription'],
        ['/orders/track', 'links.track', 'links.trackDescription'],
        ['/account', 'links.tickets', 'links.ticketsDescription'],
      ] as const).map(([href, label, description]) => <a href={href} key={href}><div><strong>{t(label)}</strong><span>{t(description)}</span></div><ArrowUpRight size={22} aria-hidden="true"/></a>)}
    </nav>
    <section className={styles.updates} aria-label={t('updates.title')}><h2>{t('updates.title')}</h2>{app.update === 'none' ? <p>{t('updates.current')}</p> : <AppUpdate path="/app"/>}</section>
  </section>;
}
