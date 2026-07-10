'use client';

import { useEffect, useState } from 'react';

// App-style bottom tab bar — the primary mobile navigation. Always visible on
// small screens (≤900px), so nobody has to discover a burger icon. Rendered
// OUTSIDE #ssr-shell so it survives the v25 runtime boot (the old mobile menu
// lived inside the shell and vanished the moment the app booted).
// z-index sits below v25's own overlays (menu 130 / cart 150 / modals 160+)
// so the cart drawer and checkout are never blocked.

const TABS: { href: string; label: string; icon: string; cta?: boolean }[] = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/events', label: 'Tickets', icon: 'ticket' },
  { href: '/book', label: 'Book', icon: 'book', cta: true },
  { href: '/shop', label: 'Shop', icon: 'bag' },
];

const MENU_LINKS: { href: string; label: string; big?: boolean }[] = [
  { href: '/book', label: 'Book the Tour', big: true },
  { href: '/about', label: 'About Us' },
  { href: '/the-gang', label: 'The Gang' },
  { href: '/experience', label: 'The Tour' },
  { href: '/events', label: 'Events & Tickets' },
  { href: '/shop', label: 'Shop Merch' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/urban-news', label: 'Urban News' },
  { href: '/blog', label: 'Stories & Blog' },
  { href: '/partners', label: 'Partners' },
  { href: '/work-with-us', label: 'Work With Us' },
  { href: '/contact-us', label: 'Contact Us' },
  { href: '/account', label: 'My Account' },
];

function Icon({ name }: { name: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'home':
      return <svg viewBox="0 0 24 24" {...common}><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V21h13V9.5" /><path d="M9.5 21v-6h5v6" /></svg>;
    case 'ticket':
      return <svg viewBox="0 0 24 24" {...common}><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" /><path d="M13 6v2.5M13 11v2M13 15.5V18" /></svg>;
    case 'book':
      return <svg viewBox="0 0 24 24" {...common}><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M8 3v4M16 3v4M3.5 10.5h17" /><path d="M12 13v5M9.5 15.5h5" /></svg>;
    case 'bag':
      return <svg viewBox="0 0 24 24" {...common}><path d="M5 8h14l-1.2 12.2a1.8 1.8 0 0 1-1.8 1.6H8a1.8 1.8 0 0 1-1.8-1.6L5 8Z" /><path d="M8.5 10.5V6.8a3.5 3.5 0 0 1 7 0v3.7" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" {...common}><path d="M4 6.5h16M4 12h16M4 17.5h16" /></svg>;
  }
}

export function BottomTabBar() {
  const [path, setPath] = useState('/');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      setPath(window.location.pathname);
      setOpen(false); // navigating closes the menu sheet
    };
    sync();
    // v25's in-app nav uses history.pushState (patched go()/goWork()) — wrap it
    // once so the active tab tracks those URL changes too.
    const w = window as any;
    if (!w.__ugtPushWrapped) {
      w.__ugtPushWrapped = true;
      const orig = history.pushState.bind(history);
      history.pushState = function (...args: any[]) {
        const r = orig(...(args as [any, string, string?]));
        window.dispatchEvent(new Event('ugt:nav'));
        return r;
      };
    }
    window.addEventListener('popstate', sync);
    window.addEventListener('ugt:nav', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('ugt:nav', sync);
    };
  }, []);

  // lock page scroll while the menu sheet is open
  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : '';
    return () => { document.documentElement.style.overflow = ''; };
  }, [open]);

  const active = (href: string) =>
    href === '/' ? path === '/' : path === href || path.startsWith(href + '/');

  return (
    <>
      {open && (
        <div className="ugt-sheet" role="dialog" aria-label="Site menu">
          <div className="ugt-sheet-head">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/ugt-logo-v2.png" alt="Urban Gang Tour" />
            <button className="ugt-sheet-close" aria-label="Close menu" onClick={() => setOpen(false)}>✕</button>
          </div>
          <nav className="ugt-sheet-links">
            {MENU_LINKS.map((l) => (
              <a key={l.href} href={l.href} className={(l.big ? 'big ' : '') + (active(l.href) ? 'on' : '')}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className="ugt-sheet-foot">
            <a href="mailto:admin@urbangangtour.co.ke">admin@urbangangtour.co.ke</a>
            <span>From Potential to Purpose · Kenya</span>
          </div>
        </div>
      )}
      <nav className="ugt-tabbar" aria-label="Primary">
        {TABS.map((t) => (
          <a key={t.href} href={t.href} className={(t.cta ? 'ugt-tab-cta ' : 'ugt-tab ') + (active(t.href) ? 'on' : '')} aria-current={active(t.href) ? 'page' : undefined}>
            <span className="ugt-tab-ic"><Icon name={t.icon} /></span>
            <span className="ugt-tab-lb">{t.label}</span>
          </a>
        ))}
        <button className={'ugt-tab ' + (open ? 'on' : '')} aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="ugt-tab-ic"><Icon name="menu" /></span>
          <span className="ugt-tab-lb">Menu</span>
        </button>
      </nav>
    </>
  );
}
