
'use client';

import {useEffect, useState, useSyncExternalStore} from 'react';
import {usePathname} from 'next/navigation';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {appMessages} from '@/ui/i18n/catalogues/app';
import {dismissUpdate, updateWasDismissed} from '@/lib/client/pwa-update-dismissal';
import styles from '@/app/app/App.module.css';

type InstallPrompt = Event & {prompt:() => Promise<void>; userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
type AppState = {ready:boolean; online:boolean; installed:boolean; ios:boolean; prompt:InstallPrompt|null; installing:boolean; installResult:'none'|'dismissed'|'accepted'|'failed'; update:'none'|'ready'|'activated'; release:string|null; updating:boolean; updateFailed:boolean; dirty:boolean};
const initial:AppState = {ready:false, online:true, installed:false, ios:false, prompt:null, installing:false, installResult:'none', update:'none', release:null, updating:false, updateFailed:false, dirty:false};
let state = initial;
const dirtyScopes = new Set<Element>();
const listeners = new Set<() => void>();
function publish(change:Partial<AppState>) {state = {...state, ...change}; listeners.forEach(listener => listener());}
const subscribe = (listener:() => void) => {listeners.add(listener); return () => {listeners.delete(listener);};};
export const useInstallableApp = () => useSyncExternalStore(subscribe, () => state, () => initial);

export async function installApp() {
  const prompt = state.prompt;
  if (!prompt || state.installing) return;
  publish({installing:true, prompt:null, installResult:'none'});
  try {
    await prompt.prompt();
    const {outcome} = await prompt.userChoice;
    publish({installResult:outcome});
  } catch {publish({installResult:'failed'});}
  finally {publish({installing:false});}
}

const protectedPath = (path:string) => /^\/(checkout|pay|cart|admin|organizer|account|tickets|receipt|t|verify)(\/|$)/.test(path);
export function refreshBlocked(path:string) {return state.dirty || protectedPath(path) || !state.online;}

/** Call only after this form's save has succeeded, never merely on submit. */
export function acknowledgeSavedForm(form:HTMLFormElement) {
  dirtyScopes.delete(form);
  publish({dirty:dirtyScopes.size > 0});
}

function eventRelease(event?:Event):string|null {
  if (!event) return state.release;
  const release = (event as CustomEvent<{release?:unknown}>).detail?.release;
  return typeof release === 'string' && /^[a-z0-9][a-z0-9._:-]{0,159}$/i.test(release) ? release : null;
}

/** Only a deliberate click in this tab can refresh it. Other tabs keep their work. */
export async function updateApp() {
  if (refreshBlocked(location.pathname) || state.updating) return;
  publish({updating:true, updateFailed:false});
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (refreshBlocked(location.pathname)) {publish({updating:false}); return;}
    if (!registration?.waiting) {
      if (state.update === 'activated') {location.reload(); return;}
      publish({updating:false, updateFailed:true}); return;
    }
    const applied = () => {
      clearTimeout(timeout);
      if (refreshBlocked(location.pathname)) {publish({updating:false}); return;}
      location.reload();
    };
    const timeout = setTimeout(() => {navigator.serviceWorker.removeEventListener('controllerchange', applied); publish({updating:false, updateFailed:true});}, 15000);
    navigator.serviceWorker.addEventListener('controllerchange', applied, {once:true});
    registration.waiting.postMessage({type:'SKIP_WAITING'});
  } catch {publish({updating:false, updateFailed:true});}
}

export function AppUpdate({path}:{path:string}) {
  const app = useInstallableApp(), t = useMessages(appMessages);
  if (app.update === 'none') return null;
  return <div className={styles.update} data-app-update>
    <p><strong>{t(app.update === 'activated' ? 'update.activated' : 'update.ready')}</strong></p>
    <p>{t(refreshBlocked(path) ? app.online ? 'update.finish' : 'update.offline' : 'update.description')}</p>
    <button type="button" disabled={refreshBlocked(path) || app.updating} onClick={() => void updateApp()}>{t(app.updating ? 'update.applying' : app.update === 'activated' ? 'update.refresh' : 'update.action')}</button>
    {app.updateFailed && <p role="alert">{t('update.failed')}</p>}
  </div>;
}

export function InstallableApp() {
  const app = useInstallableApp(), t = useMessages(appMessages), path = usePathname();
  const [dismissed, setDismissed] = useState('');
  useEffect(() => {
    const display = matchMedia('(display-mode: standalone)');
    const sync = () => publish({ready:true, online:navigator.onLine, installed:state.installed || display.matches || Boolean((navigator as Navigator & {standalone?:boolean}).standalone), ios:/iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1});
    const prompt = (event:Event) => {event.preventDefault(); publish({prompt:event as InstallPrompt, installResult:'none'});};
    const installed = () => publish({installed:true, prompt:null, installResult:'none'});
    const ready = (event?:Event) => publish({update:'ready', release:eventRelease(event), updateFailed:false});
    const activated = (event:Event) => publish({update:'activated', release:eventRelease(event), updating:false});
    const dirty = (event:Event) => {
      const scope = event.target instanceof Element ? event.target.closest('form, [contenteditable="true"]') : null;
      if (scope) {dirtyScopes.add(scope); publish({dirty:true});}
    };
    const reset = (event:Event) => {
      const form = event.target;
      // A later reset listener can cancel the native reset. Check after dispatch.
      queueMicrotask(() => {if (!event.defaultPrevented && form instanceof HTMLFormElement) acknowledgeSavedForm(form);});
    };
    sync();
    addEventListener('beforeinstallprompt', prompt); addEventListener('appinstalled', installed);
    addEventListener('online', sync); addEventListener('offline', sync);
    addEventListener('ugt-release-ready', ready); addEventListener('ugt-release-activated', activated);
    document.addEventListener('input', dirty, true); document.addEventListener('change', dirty, true); document.addEventListener('reset', reset, true);
    display.addEventListener('change', sync);
    if (!document.querySelector('script[data-ugt-release]')) {
      const script = document.createElement('script'); script.src = '/release-client.js'; script.dataset.ugtRelease = 'true'; document.head.appendChild(script);
    }
    // The release client identifies the waiting worker before announcing it.
    // An eager anonymous notice here would flash again after a saved dismissal.
    return () => {
      removeEventListener('beforeinstallprompt', prompt); removeEventListener('appinstalled', installed);
      removeEventListener('online', sync); removeEventListener('offline', sync);
      removeEventListener('ugt-release-ready', ready); removeEventListener('ugt-release-activated', activated);
      document.removeEventListener('input', dirty, true); document.removeEventListener('change', dirty, true); document.removeEventListener('reset', reset, true);
      display.removeEventListener('change', sync);
    };
  }, []);
  useEffect(() => {dirtyScopes.clear(); publish({dirty:false});}, [path]);
  const notice = !app.online ? 'offline' : app.update;
  const noticeKey = app.online && app.release ? `release:${app.release}` : notice;
  if (!app.ready || path === '/app' || notice === 'none' || dismissed === noticeKey || app.online && updateWasDismissed(app.release)) return null;
  return <aside className={styles.notices} aria-label={t('notice.label')}>
    <div className={styles.notice}>
      <div role="status" aria-live="polite">{!app.online ? <><strong>{t('offline.title')}</strong><p>{t('offline.description')}</p></> : <AppUpdate path={path}/>}</div>
      <button className={styles.close} type="button" aria-label={t('notice.dismiss')} onClick={() => {if (app.online) dismissUpdate(app.release); setDismissed(noticeKey);}}>×</button>
    </div>
  </aside>;
}
