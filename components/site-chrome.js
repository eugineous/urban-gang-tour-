'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/events', label: 'Events' },
  { href: '/stops', label: 'Stops' },
  { href: '/performers', label: 'Performers' },
  { href: '/shop', label: 'Shop' },
  { href: '/crew', label: 'Crew' },
  { href: '/partners', label: 'Partners' },
];

const DARK_PAGES = ['/about', '/contact', '/crew', '/partners'];

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
    <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.43-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 5.84a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 6.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2zm5.1-6.76a.94.94 0 1 1-1.88 0 .94.94 0 0 1 1.88 0z"/>
  </svg>
);
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
    <path d="M19.6 6.32a4.85 4.85 0 0 1-4.85-4.85h-3.13v13.4a2.94 2.94 0 1 1-2.94-2.94c.32 0 .64.05.94.15V8.85a6.07 6.07 0 0 0-.94-.07 6.07 6.07 0 1 0 6.07 6.07V8.5a8.05 8.05 0 0 0 4.85 1.62V6.32z"/>
  </svg>
);
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.9 3.78-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99C18.34 21.13 22 16.99 22 12z"/>
  </svg>
);
const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
    <path d="M23.5 6.2a3.02 3.02 0 0 0-2.13-2.13C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.37.52A3.02 3.02 0 0 0 .5 6.2C0 8.07 0 12 0 12s0 3.93.5 5.8a3.02 3.02 0 0 0 2.13 2.13c1.87.52 9.37.52 9.37.52s7.5 0 9.37-.52a3.02 3.02 0 0 0 2.13-2.13c.5-1.87.5-5.8.5-5.8s0-3.93-.5-5.8zM9.6 15.6V8.4l6.24 3.6L9.6 15.6z"/>
  </svg>
);
const WhatsAppIcon = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} aria-hidden="true">
    <path d="M17.6 14.32c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.09 3.2 5.07 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35zM12.04 21.5c-1.7 0-3.37-.46-4.83-1.32l-.35-.2-3.58.94.96-3.49-.23-.36a9.46 9.46 0 0 1-1.45-5.08c0-5.23 4.25-9.48 9.48-9.48 2.53 0 4.91.99 6.7 2.78a9.42 9.42 0 0 1 2.78 6.7c0 5.23-4.25 9.48-9.48 9.48zm8.06-17.53A11.3 11.3 0 0 0 12.04.66C5.77.66.66 5.77.66 12.04c0 2 .52 3.95 1.52 5.67L.56 23.34l5.77-1.51a11.3 11.3 0 0 0 5.71 1.45h.01c6.27 0 11.38-5.11 11.38-11.38 0-3.04-1.18-5.9-3.33-8.05z"/>
  </svg>
);

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isDark = DARK_PAGES.some(p => pathname === p || pathname.startsWith(p + '/'));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    // progress bar
    const bar = document.getElementById('progress-bar');
    if (!bar) return;
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = h > 0 ? (window.scrollY / h * 100) + '%' : '0%';
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    // scroll reveal
    const els = document.querySelectorAll('.reveal');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target); } });
    }, { threshold: 0.1 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [pathname]);

  return (
    <>
      <div id="progress-bar" />
      <nav className={`nav${isDark ? ' dark' : ''}${scrolled ? ' scrolled' : ''}`} id="main-nav">
        <Link href="/" className="nav-logo">
          <img src="/assets/logos/ugt-logo-full.png" alt="Urban Gang Tour" />
          <div className="live-dot" />
        </Link>
        <div className="nav-links">
          {NAV_LINKS.map(l => (
            <Link key={l.href} href={l.href} className={pathname === l.href ? 'active' : ''}>{l.label}</Link>
          ))}
          <Link href="/contact" className="nav-cta">Book a Stop</Link>
        </div>
        <button className="nav-hamburger" aria-label="Menu" onClick={() => setOpen(true)}>
          <span /><span /><span />
        </button>
      </nav>
      <div className={`nav-overlay${open ? ' open' : ''}`}>
        <button className="nav-overlay-close" onClick={() => setOpen(false)}>✕</button>
        {NAV_LINKS.map(l => (
          <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>
        ))}
        <Link href="/contact" onClick={() => setOpen(false)}>Book a Stop ↗</Link>
      </div>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <img src="/assets/logos/ugt-logo-full.png" alt="Urban Gang Tour" style={{height:'56px',width:'auto'}} />
            <p>Production-quality live events. High schools. Universities. Colleges. Polytechnics. Mega events. Hosted by Eugine Micah and Lucy Ogunde.</p>
            <div className="broadcast">Urban News on PPP TV Kenya</div>
            <div className="footer-social">
              <a href="https://instagram.com/urban_newsgang" target="_blank" rel="noopener" aria-label="Instagram"><InstagramIcon /></a>
              <a href="https://tiktok.com/@urbangangtour" target="_blank" rel="noopener" aria-label="TikTok"><TikTokIcon /></a>
              <a href="https://facebook.com/urbangangtour" target="_blank" rel="noopener" aria-label="Facebook"><FacebookIcon /></a>
              <a href="https://youtube.com/@urbannewsppp" target="_blank" rel="noopener" aria-label="YouTube"><YouTubeIcon /></a>
              <a href="https://wa.me/254799886247" target="_blank" rel="noopener" aria-label="WhatsApp"><WhatsAppIcon /></a>
            </div>
          </div>
          <div className="footer-col">
            <h5>Explore</h5>
            <ul>
              <li><Link href="/about">About the movement</Link></li>
              <li><Link href="/stops">The 2026 calendar</Link></li>
              <li><Link href="/events">All events</Link></li>
              <li><Link href="/performers">Performers</Link></li>
              <li><Link href="/shop">Merch shop</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5>Tour</h5>
            <ul>
              <li><Link href="/stops">School stops</Link></li>
              <li><Link href="/stops">Universities</Link></li>
              <li><Link href="/crew">Meet the crew</Link></li>
              <li><Link href="/partners">Partners</Link></li>
              <li><Link href="/contact">Propose a stop</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5>Who it serves</h5>
            <ul>
              <li><Link href="/contact">Schools &amp; students</Link></li>
              <li><Link href="/contact">Universities</Link></li>
              <li><Link href="/partners">Sponsors &amp; brands</Link></li>
              <li><Link href="/partners">Churches &amp; orgs</Link></li>
              <li><Link href="/contact">Media partners</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5>Connect</h5>
            <ul>
              <li><a href="mailto:euginemicah@gmail.com">euginemicah@gmail.com</a></li>
              <li><a href="https://instagram.com/urban_newsgang">@urban_newsgang</a></li>
              <li><a href="https://wa.me/254799886247">+254799886247</a></li>
              <li><Link href="/contact">Book a stop</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>Booking 2026 · Schools, universities, colleges, polytechnics · Countrywide</p>
          <p><span>Urban Gang Tour</span> · From Potential to Purpose · 2026</p>
        </div>
      </div>
      <a href="https://wa.me/254799886247" className="whatsapp-float" target="_blank" rel="noopener" aria-label="WhatsApp">
        <WhatsAppIcon size={28} />
      </a>
    </footer>
  );
}
