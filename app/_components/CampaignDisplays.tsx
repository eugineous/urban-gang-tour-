'use client';
import { useEffect, useRef, useState } from 'react';
import { campaignIsLive, campaignTargets, campaignsAllowedOn, safeCampaignImage, safeCampaignLink, type Campaign } from '@/lib/marketing-campaigns';
import { fetchWithTimeout } from '@/lib/client/fetch-with-timeout';
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
  const [campaigns,setCampaigns] = useState<PublicCampaign[]>([]), [tick,setTick] = useState(0), [closed,setClosed] = useState<string[]>([]), [privacyReady,setPrivacyReady] = useState(false);
  const lease = useRef(0), serverClock = useRef({ time: 0, at: 0 }), loadedAt = useRef(0), popupShown = useRef(false), dialog = useRef<HTMLDialogElement>(null);
  const allowed = campaignsAllowedOn(path);
  useEffect(() => {
    setCampaigns([]); loadedAt.current = performance.now();
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
        try { if (sessionStorage.getItem('ugt-campaign-popup-session')==='shown') popupShown.current=true; } catch {}
        setCampaigns(rows);
      } catch { if (!disposed && !controller.signal.aborted) { lease.current=0; setCampaigns([]); } }
      finally { loading=false; }
    }
    void load();
    const refresh = setInterval(() => void load(), 10000);
    const visibility = () => { if (document.visibilityState==='visible') { if(performance.now()>=lease.current)setCampaigns([]);void load(); } };
    document.addEventListener('visibilitychange',visibility);
    return () => { disposed=true; controller.abort(); clearInterval(refresh); document.removeEventListener('visibilitychange',visibility); };
  }, [path,allowed]);
  const haveCampaigns = campaigns.length>0;
  useEffect(() => {
    if (!allowed || !haveCampaigns) return;
    const watch = setInterval(() => {
      if (lease.current && performance.now()>=lease.current) { lease.current=0; setCampaigns([]); }
      let choice: string | null = null;
      try { choice=localStorage.getItem('ugt-consent'); } catch {}
      setPrivacyReady((choice==='yes'||choice==='no') && !document.querySelector('aside[aria-label="Privacy preferences"]'));
      setTick(value=>value+1);
    }, 500);
    return () => clearInterval(watch);
  }, [allowed,haveCampaigns]);
  const now = serverClock.current.time + performance.now()-serverClock.current.at;
  const candidates = allowed && !paused && privacyReady && lease.current>performance.now() ? campaigns.filter(c=>campaignTargets(c,path)&&campaignIsLive(c,now)&&!closed.includes(c.id)&&!recentlySeen(c)).sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id)) : [];
  const popup = candidates.find(c=>c.format==='popup' && performance.now()-loadedAt.current>=c.delaySeconds*1000 && (!popupShown.current || dialog.current?.open));
  const banner = candidates.find(c=>c.format==='banner');
  function dismiss(campaign: PublicCampaign) {
    try { localStorage.setItem(storageKey(campaign.id),String(Date.now())); } catch {}
    setClosed(previous=>[...previous,campaign.id]);
  }
  useEffect(() => {
    const element = dialog.current;
    if (!popup || !element || element.open) return;
    let seen = false;
    try { seen = sessionStorage.getItem('ugt-campaign-popup-session')==='shown'; } catch {}
    if (seen) return;
    popupShown.current=true;
    try { sessionStorage.setItem('ugt-campaign-popup-session','shown'); } catch {}
    element.showModal();
    return () => { if (element.open) element.close(); };
  }, [popup?.id]);
  // Tick keeps delays/expiry reactive; campaign text is always rendered as text.
  void tick;
  if (popup) return <dialog ref={dialog} className={styles.dialog} aria-labelledby="campaign-title" onCancel={event=>{event.preventDefault();dismiss(popup);}}><button className={styles.close} type="button" aria-label="Close offer" onClick={()=>dismiss(popup)}>×</button><div className={styles.creative}><CampaignCreative campaign={popup} headingId="campaign-title"/></div></dialog>;
  if (!banner) return null;
  return <aside className={styles.banner} aria-label="Current campaign"><button className={styles.close} type="button" aria-label="Close announcement" onClick={()=>dismiss(banner)}>×</button><CampaignCreative campaign={banner}/></aside>;
}
