"use client";
import {shellMessages,navigationMessageKey,navigationGroupKey} from '@/ui/i18n/catalogues/shell';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import RouteLoading from './RouteLoading';
import {Suspense,useEffect,useRef,useState,type CSSProperties} from 'react';
import {List,ArrowUpRight,ShoppingCart,Ticket} from '@phosphor-icons/react';
import {usePathname} from 'next/navigation';
import {ContactFooter,FloatingTalk} from '@/ui/components/ContactInterface';
import CampaignDisplays from './CampaignDisplays';
import {PRIMARY_NAVIGATION as links,SITE_MENU_GROUPS as menuGroups,SITE_UTILITY_NAVIGATION as utilityLinks,isNavigationCurrent} from '@/lib/site-navigation';
import {FOCUS_VIEW_KEY,setFocusView} from '@/lib/client/display-preferences';
import {installPageEntryScroll} from '@/lib/client/page-entry-scroll';
import {EventPlacements} from '@/ui/components/EventPlacements';
import type {OwnedEvent} from '@/ui/lib/owned-event-presentation';

export function AppShell({children,events=[],initialNow=0}:{children:React.ReactNode;events?:OwnedEvent[];initialNow?:number}){
 const path=usePathname();
 const previousPath=useRef(path);
 useEffect(()=>{
  const reset=installPageEntryScroll(window);
  // Hydration restores streamed anchors without overriding native text fragments.
  reset(previousPath.current!==path);previousPath.current=path;
 },[path]);
 return <PathShell key={path} path={path} events={events} initialNow={initialNow}>{children}</PathShell>;
}
/** A route change closes transient navigation without a cascading state effect. */
function PathShell({children,path,events,initialNow}:{children:React.ReactNode;path:string;events:OwnedEvent[];initialNow:number}){
 const t=useMessages(shellMessages);
 const navLabel=(label:string,href:string)=>{const key=navigationMessageKey(href);return key?t(key):label};
 const groupLabel=(group:string)=>{const key=navigationGroupKey(group);return key?t(key):group};
 const [focus,setFocus]=useState(false),[open,setOpen]=useState(false),[elevated,setElevated]=useState(false);
 const [navWidth,setNavWidth]=useState<number>(),[dark,setDark]=useState(path==='/');
 const trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDialogElement>(null);
 const header=useRef<HTMLElement>(null),navigation=useRef<HTMLElement>(null);
 useEffect(()=>{
  let frame=0,active=true;
  const update=()=>{
   frame=0;if(!active)return;
   setElevated(window.scrollY>100);
   const middle=(header.current?.getBoundingClientRect().height||72)/2;
   setDark(Array.from(document.querySelectorAll('[data-header-tone="dark"],.hero,.magenta')).some(section=>{const box=section.getBoundingClientRect();return box.top<=middle&&box.bottom>middle}));
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update)};
  const measure=()=>{
   const nav=navigation.current;if(!nav)return;
   const style=getComputedStyle(nav),items=Array.from(nav.children);
   const width=items.reduce((sum,item)=>sum+item.getBoundingClientRect().width,0)+(parseFloat(style.columnGap)||0)*Math.max(0,items.length-1)+(parseFloat(style.paddingLeft)||0)+(parseFloat(style.paddingRight)||0);
   if(width>0&&active)setNavWidth(Math.ceil(width));
   schedule();
  };
  const observer=new ResizeObserver(measure);
  if(navigation.current){observer.observe(navigation.current);Array.from(navigation.current.children).forEach(item=>observer.observe(item))}
  if(header.current)observer.observe(header.current);
  void document.fonts?.ready.then(()=>{if(active)measure()});
  measure();update();addEventListener('scroll',schedule,{passive:true});addEventListener('resize',measure);
  return()=>{active=false;cancelAnimationFrame(frame);observer.disconnect();removeEventListener('scroll',schedule);removeEventListener('resize',measure)};
 },[]);
 useEffect(()=>{
  const sync=()=>setFocus(document.documentElement.dataset.focusView==='true');
  const storage=(event:StorageEvent)=>{if(event.key===FOCUS_VIEW_KEY||event.key===null){let value=false;try{value=JSON.parse(localStorage.getItem(FOCUS_VIEW_KEY)||'false')===true}catch{}setFocusView(value)}};
  sync();addEventListener('ugt-focus-view',sync);addEventListener('storage',storage);
  return()=>{removeEventListener('ugt-focus-view',sync);removeEventListener('storage',storage)};
 },[]);
 useEffect(()=>{
  const dialog=menu.current;
  if(!open||!dialog)return;
  const previous=document.body.style.overflow;
  const returnFocus=trigger.current;
  document.body.style.overflow='hidden';
  dialog.showModal();
  const closeOnDesktop=()=>{if(trigger.current&&getComputedStyle(trigger.current).display==='none')setOpen(false)};
  window.addEventListener('resize',closeOnDesktop);
  window.dispatchEvent(new CustomEvent('ugt-overlay-change',{detail:true}));
  return()=>{
   if(dialog.open)dialog.close();
   document.body.style.overflow=previous;
   window.removeEventListener('resize',closeOnDesktop);
   window.dispatchEvent(new CustomEvent('ugt-overlay-change',{detail:false}));
   if(returnFocus&&getComputedStyle(returnFocus).display!=='none')returnFocus.focus();
   else header.current?.querySelector<HTMLAnchorElement>('.brand')?.focus();
  };
 },[open]);
 function toggleFocus(){setFocusView(!focus)}
 const operational=path.startsWith('/admin')||path.startsWith('/organizer/dashboard');
 if(operational||/^\/(t|tickets|receipt|verify)(\/|$)/.test(path))return <main id="main-content" tabIndex={-1}><Suspense fallback={<RouteLoading/>}>{children}</Suspense></main>;
 const critical=/^\/(shop|checkout|pay|book|account|organizer|cart|receipt|tickets|t|verify)(\/|$)/.test(path);
 return <>
  <header ref={header} className="site-header" data-public-surface="navigation" data-elevated={elevated} data-dark={dark} style={{'--nav-compact-width':navWidth?navWidth+'px':undefined} as CSSProperties}>
   <div className="header-content">
   <a className="brand" href="/" aria-label={t('brand.home')}><img src="/assets/ugt-logo.png" alt="Urban Gang Tour"/></a>
   <nav ref={navigation} className="desktop-nav" aria-label={t('nav.main')}>{links.map(([label,href])=><a key={href} href={href} aria-current={isNavigationCurrent(path,href)?'page':undefined}>{navLabel(label,href)}</a>)}</nav>
   <div className="header-actions">
    <a className="tickets-link" href="/account"><Ticket size={18} aria-hidden="true"/><span>{t('nav.tickets')}</span></a>
    <a className="cart-link" href="/shop" aria-label={t('nav.shop')} aria-current={isNavigationCurrent(path,'/shop')?'page':undefined}><ShoppingCart size={21} aria-hidden="true"/><span>{t('nav.shop')}</span></a>
    <a className="start-link" href="/contact-us"><span className="header-rolling-label"><span>{t('contact.talk')}</span><span aria-hidden="true">{t('contact.talk')}</span></span><ArrowUpRight size={18} aria-hidden="true"/></a>
    <button type="button" ref={trigger} className="menu-toggle" aria-haspopup="dialog" aria-expanded={open} aria-controls="site-menu" onClick={()=>setOpen(value=>!value)}><List className="mobile-menu-icon" size={23} aria-hidden="true"/><span className="mobile-menu-label">{t('nav.menu')}</span></button>
   </div>
   </div>
  </header>
  <dialog ref={menu} id="site-menu" data-public-surface="navigation" className={`menu-panel ${open?'is-open':''}`} aria-label={t('nav.site')} onCancel={event=>{event.preventDefault();setOpen(false)}} onClose={event=>{if(!event.currentTarget.open)setOpen(false)}} onClick={event=>{
   if(event.target!==event.currentTarget)return;
   const rect=event.currentTarget.getBoundingClientRect();
   if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)setOpen(false);
  }}>
   <div className="menu-dialog-heading"><strong>{t('nav.menu')}</strong><button type="button" autoFocus onClick={()=>setOpen(false)} aria-label={t('nav.close')}>{t('nav.closeVisible')}</button></div>
   <div className="menu-groups">{menuGroups.map(group=><nav key={group.title} aria-label={groupLabel(group.title)}>{group.items.map(([label,href])=><a key={href} href={href} onClick={()=>setOpen(false)} aria-current={isNavigationCurrent(path,href)?'page':undefined}><span className="menu-link-copy"><strong>{navLabel(label,href)}</strong></span><span aria-hidden="true">→</span></a>)}</nav>)}</div>
   <div className="menu-bottom"><nav className="menu-account-links" aria-label={t('nav.accountHelp')}>{utilityLinks.map(([label,href])=><a key={href} href={href} onClick={()=>setOpen(false)} aria-current={isNavigationCurrent(path,href)?'page':undefined}>{navLabel(label,href)}</a>)}</nav></div>
  </dialog>
  <main id="main-content" data-public-surface={path.startsWith('/organizer')?undefined:critical?'transaction':'editorial'} inert={open} className={`application-content ${/^\/(blog|events)\/.+/.test(path)?'detail-offset':''}`} tabIndex={-1}><Suspense fallback={<RouteLoading/>}>{children}</Suspense></main>
  {!critical&&path!=='/'&&path!=='/reels'&&path!=='/offline'&&<EventPlacements events={events} initialNow={initialNow} path={path}/>}
  <CampaignDisplays path={path} paused={open||focus}/>
  {!critical&&path!=='/reels'&&path!=='/contact-us'&&!path.startsWith('/events')&&!open&&!focus&&<FloatingTalk/>}
  {path!=='/reels'&&!path.startsWith('/checkout')&&<ContactFooter path={path} onCookies={()=>dispatchEvent(new Event('ugt-open-cookie-settings'))} focusView={focus} onFocus={toggleFocus} form={!critical&&path!=='/contact-us'&&path!=='/offline'}/>}
 </>;
}
