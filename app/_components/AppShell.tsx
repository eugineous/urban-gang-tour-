"use client";
import RouteLoading from './RouteLoading';
import {Suspense,useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {ContactFooter} from '@/ui/components/ContactInterface';
import CampaignDisplays from './CampaignDisplays';
import {PRIMARY_NAVIGATION as links,SITE_MENU_GROUPS as menuGroups} from '@/lib/site-navigation';
import {FOCUS_VIEW_KEY,setFocusView} from '@/lib/client/display-preferences';
import LanguageChooser from './LanguageChooser';

export function AppShell({children}:{children:React.ReactNode}){
 const path=usePathname();
 const [focus,setFocus]=useState(false),[open,setOpen]=useState(false),[scrolled,setScrolled]=useState(false);
 const trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const sync=()=>setFocus(document.documentElement.dataset.focusView==='true');
  const storage=(event:StorageEvent)=>{if(event.key===FOCUS_VIEW_KEY||event.key===null){let value=false;try{value=JSON.parse(localStorage.getItem(FOCUS_VIEW_KEY)||'false')===true}catch{}setFocusView(value)}};
  sync();addEventListener('ugt-focus-view',sync);addEventListener('storage',storage);
  return()=>{removeEventListener('ugt-focus-view',sync);removeEventListener('storage',storage)};
 },[]);
 useEffect(()=>{setOpen(false)},[path]);
 useEffect(()=>{const update=()=>setScrolled(scrollY>80);update();addEventListener('scroll',update,{passive:true});return()=>removeEventListener('scroll',update)},[]);
 useEffect(()=>{
  const dialog=menu.current;
  if(!open||!dialog)return;
  const previous=document.body.style.overflow;
  const returnFocus=trigger.current;
  document.body.style.overflow='hidden';
  dialog.showModal();
  window.dispatchEvent(new CustomEvent('ugt-overlay-change',{detail:true}));
  return()=>{
   if(dialog.open)dialog.close();
   document.body.style.overflow=previous;
   window.dispatchEvent(new CustomEvent('ugt-overlay-change',{detail:false}));
   returnFocus?.focus();
  };
 },[open]);
 function toggleFocus(){setFocusView(!focus)}
 const operational=path.startsWith('/admin')||path.startsWith('/organizer/dashboard');
 if(operational||/^\/(t|tickets|receipt|verify)(\/|$)/.test(path))return <main id="main-content" tabIndex={-1}><Suspense fallback={<RouteLoading/>}>{children}</Suspense></main>;
 const critical=/^\/(shop|checkout|pay|book|account|cart|receipt|tickets|t|verify)(\/|$)/.test(path);
 return <>
  <header className={`site-header ${path==='/'&&!open&&!scrolled?'on-hero':''} ${scrolled?'is-scrolled':''} ${open?'menu-open':''}`}>
   <a className="brand" href="/" aria-label="Urban Gang Tour home"><img src="/assets/ugt-logo.png" alt="Urban Gang Tour"/></a>
   <nav className="desktop-nav" aria-label="Main navigation">{links.map(([label,href])=><a key={href} href={href} aria-current={path===href?'page':undefined}>{label}</a>)}</nav>
   <div className="header-actions">
    <LanguageChooser path={path}/>
    <a className="mobile-about-link" href="/about" aria-current={path==='/about'?'page':undefined}>About</a>
    <a className="mobile-shop-link" href="/shop">Shop</a>
    <a className="cart-link" href="/cart" aria-label="View your cart">Cart</a>
    <a className="start-link" href="/book">Book <span aria-hidden="true">↗</span></a>
    <button ref={trigger} className="menu-toggle" aria-label={open?'Close menu':'Open menu'} aria-haspopup="dialog" aria-expanded={open} aria-controls="site-menu" onClick={()=>setOpen(value=>!value)}><span className={open?'burger is-open':'burger'} aria-hidden="true"><i/><i/><i/></span></button>
   </div>
  </header>
  <dialog ref={menu} id="site-menu" className={`menu-panel ${open?'is-open':''}`} aria-label="Site navigation" onCancel={event=>{event.preventDefault();setOpen(false)}} onClose={event=>{if(!event.currentTarget.open)setOpen(false)}} onClick={event=>{
   if(event.target!==event.currentTarget)return;
   const rect=event.currentTarget.getBoundingClientRect();
   if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)setOpen(false);
  }}>
   <div className="menu-dialog-heading"><strong>Explore Urban Gang Tour</strong><button type="button" autoFocus onClick={()=>setOpen(false)} aria-label="Close navigation">Close ×</button></div>
   <div className="menu-groups">{menuGroups.map(group=><section key={group.title}><h2>{group.title}</h2><nav aria-label={group.title}>{group.items.map(([label,href])=><a key={href} href={href} onClick={()=>setOpen(false)} aria-current={path===href?'page':undefined}><span className="menu-link-copy"><strong>{label}</strong></span><span aria-hidden="true">↗</span></a>)}</nav></section>)}</div>
   <div className="menu-bottom"><div className="menu-account-links"><a href="/cart">Your cart</a><a href="/account">Your account</a><a href="/organizer/login">Organizer portal</a></div><button className="focus-control" aria-pressed={focus} onClick={toggleFocus}>Focus view: {focus?'on':'off'}<small>Reduce animation and background video</small></button></div>
  </dialog>
  <main id="main-content" inert={open} className={`application-content ${/^\/(blog|events)\/.+/.test(path)?'detail-offset':''}`} tabIndex={-1}><Suspense fallback={<RouteLoading/>}>{children}</Suspense></main>
  <CampaignDisplays path={path} paused={open||focus}/>
  {path!=='/reels'&&!path.startsWith('/checkout')&&<ContactFooter onCookies={()=>dispatchEvent(new Event('ugt-open-cookie-settings'))} focusView={focus} onFocus={toggleFocus} form={!critical&&path!=='/contact-us'&&path!=='/offline'}/>}
 </>;
}
