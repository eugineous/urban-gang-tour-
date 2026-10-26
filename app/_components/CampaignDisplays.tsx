'use client';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {shellMessages} from '@/ui/i18n/catalogues/shell';
import { useEffect, useRef, useState } from 'react';
import { campaignIsLive, campaignTargets, campaignsAllowedOn, safeCampaignImage, safeCampaignLink, type Campaign } from '@/lib/marketing-campaigns';
import { fetchWithTimeout } from '@/lib/client/fetch-with-timeout';
import {hasConsentChoice} from '@/lib/client/consent';
import {campaignCanInterrupt} from '@/lib/client/campaign-interruption';
import {openCampaignDialog} from '@/lib/client/campaign-dialog';
import {automaticPopupWasShown,markAutomaticPopupShown} from '@/lib/client/automatic-popup';
import {campaignSelectionAfterFeed} from '@/lib/client/campaign-selection';
import styles from './CampaignDisplays.module.css';
export type PublicCampaign = Omit<Campaign, 'name' | 'promoId'>;
const storageKey = (id: string) => 'ugt-campaign-dismiss-' + id;
function recentlySeen(campaign: PublicCampaign) {
  try { const at = Number(localStorage.getItem(storageKey(campaign.id))); return Number.isFinite(at) && at>0 && Date.now()-at<campaign.cooldownHours*3600000; } catch { return false; }
}
export function CampaignCreative({ campaign, preview = false, headingId }: { campaign: Pick<Campaign,'headline'|'description'|'image'|'href'|'ctaLabel'>; preview?: boolean; headingId?: string }) {
  return <>{campaign.image && safeCampaignImage(campaign.image) && <img className={styles.image} src={campaign.image} alt="" loading="lazy"/>}<div className={styles.copy}><h2 id={headingId}>{campaign.headline}</h2>{campaign.description && <p>{campaign.description}</p>}{preview ? <span className={styles.cta}>{campaign.ctaLabel}</span> : <a className={styles.cta} href={campaign.href}>{campaign.ctaLabel}</a>}</div></>;
}
export default function CampaignDisplays({ path, paused }: { path: string; paused: boolean }) {
  const t=useMessages(shellMessages);
  const [campaigns,setCampaigns] = useState<PublicCampaign[]>([]), [closed,setClosed] = useState<string[]>([]);
  const [selection,setSelection]=useState<{popup?:PublicCampaign;banner?:PublicCampaign}>({});
  const lease = useRef(0), serverClock = useRef({ time: 0, at: 0 }), loadedAt = useRef(0), popupShown = useRef(false), dialog = useRef<HTMLDialogElement>(null);
  const allowed = campaignsAllowedOn(path);
  useEffect(() => {
    setCampaigns([]); setSelection({}); loadedAt.current = performance.now();
    if (!allowed) return;
    let disposed = false;
    let loading = false;
    const controller = new AbortController();
    async function load() {
      if (document.visibilityState === 'hidden' || loading) return;
      loading = true;
      const started = performance.now();
      try {
        const response = await fetchWithTimeout('/api/campaigns', { signal: controller.signal, cache: 'no-store' });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.campaigns) || !Number.isFinite(data.validForMs) || data.validForMs<0 || data.validForMs>15000 || !Number.isFinite(data.serverTime)) throw new Error('campaign_unavailable');
        if (disposed) return;
        const rows = data.campaigns.filter((c: PublicCampaign) => c && typeof c.id==='string' && typeof c.headline==='string' && typeof c.description==='string' && ['banner','popup'].includes(c.format) && ['live','scheduled'].includes(c.status) && Array.isArray(c.targets) && c.targets.every(p=>typeof p==='string') && safeCampaignImage(c.image) && safeCampaignLink(c.href) && typeof c.ctaLabel==='string' && Number.isInteger(c.delaySeconds) && Number.isInteger(c.cooldownHours));
        const elapsed = performance.now()-started;
        lease.current = performance.now()+Math.max(0,data.validForMs-elapsed);
        serverClock.current = { time: data.serverTime+elapsed, at: performance.now() };
        if(automaticPopupWasShown())popupShown.current=true;
        const activeRows:PublicCampaign[]=data.validForMs>elapsed?rows:[];
        setCampaigns(activeRows);
        setSelection(current=>campaignSelectionAfterFeed(current,activeRows.filter(c=>campaignTargets(c,path)&&campaignIsLive(c,data.serverTime+elapsed))));
      } catch { if (!disposed && !controller.signal.aborted) { lease.current=0; setCampaigns([]); setSelection({}); } }
      finally { loading=false; }
    }
    void load();
    const refresh = setInterval(() => void load(), 10000);
    const visibility = () => { if (document.visibilityState==='visible') { if(performance.now()>=lease.current){setCampaigns([]);setSelection({});}void load(); } };
    document.addEventListener('visibilitychange',visibility);
    return () => { disposed=true; controller.abort(); clearInterval(refresh); document.removeEventListener('visibilitychange',visibility); };
  }, [path,allowed]);
  const haveCampaigns = campaigns.length>0;
  useEffect(() => {
    if (!allowed || !haveCampaigns) return;
    const watch = setInterval(() => {
      if(document.hidden)return;
      const clock=performance.now();
      if(automaticPopupWasShown())popupShown.current=true;
      if (lease.current && clock>=lease.current) { lease.current=0; setCampaigns([]); setSelection({}); return; }
      const consentReady=hasConsentChoice()&&!document.querySelector('[data-privacy-preferences]');
      const otherOverlay=Array.from(document.querySelectorAll('dialog[open],.lightbox,.film-viewer,.modal-backdrop')).some(element=>element!==dialog.current);
      const uninterrupted=campaignCanInterrupt({hidden:document.hidden,editing:!!document.activeElement?.matches('input,textarea,select,[contenteditable=true]'),otherOverlay,privacyReady:consentReady,paused});
      const now=serverClock.current.time+clock-serverClock.current.at;
      const candidates=!paused&&consentReady&&lease.current>clock?campaigns.filter(c=>campaignTargets(c,path)&&campaignIsLive(c,now)&&!closed.includes(c.id)&&!recentlySeen(c)).sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id)):[];
      setSelection(current=>({
        popup:uninterrupted?candidates.find(c=>c.format==='popup'&&clock-loadedAt.current>=c.delaySeconds*1000&&(!popupShown.current||(dialog.current?.open&&current.popup?.id===c.id))):undefined,
        banner:candidates.find(c=>c.format==='banner'),
      }));
    }, 500);
    return () => clearInterval(watch);
  }, [allowed,haveCampaigns,campaigns,closed,path,paused]);
  const popup=allowed&&!paused&&selection.popup&&!closed.includes(selection.popup.id)?selection.popup:undefined;
  const banner=allowed&&!paused&&selection.banner&&!closed.includes(selection.banner.id)?selection.banner:undefined;
  function dismiss(campaign: PublicCampaign) {
    try { localStorage.setItem(storageKey(campaign.id),String(Date.now())); } catch {}
    setClosed(previous=>[...previous,campaign.id]);
  }
  const popupId=popup?.id;
  useEffect(() => {
    const element = dialog.current;
    if (!popupId || !element || element.open) return;
    const seen=automaticPopupWasShown();
    // Effect replay must not strand the same eligible offer in a closed dialog.
    // A persisted session dismissal still prevents a fresh component from opening it.
    if (seen && !popupShown.current) return;
    const close = openCampaignDialog(element);
    if (!close) return;
    popupShown.current=true;
    markAutomaticPopupShown();
    return close;
  }, [popupId]);
  // Eligibility is snapshotted by the timer; render stays pure and text-only.
  if (popup) return <dialog ref={dialog} className={styles.dialog} aria-labelledby="campaign-title" onCancel={event=>{event.preventDefault();dismiss(popup);}}><button className={styles.close} type="button" aria-label={t('campaign.closeOffer')} onClick={()=>dismiss(popup)}>×</button><div className={styles.creative}><CampaignCreative campaign={popup} headingId="campaign-title"/></div></dialog>;
  if (!banner) return null;
  return <aside className={styles.banner} aria-label={t('campaign.current')}><button className={styles.close} type="button" aria-label={t('campaign.closeAnnouncement')} onClick={()=>dismiss(banner)}>×</button><CampaignCreative campaign={banner}/></aside>;
}
