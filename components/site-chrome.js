'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  SiInstagram,
  SiTiktok,
  SiFacebook,
  SiYoutube,
  SiWhatsapp,
} from 'react-icons/si';
import { SOCIAL_LINKS } from '@/lib/social-links';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/events', label: 'Events' },
  { href: '/tickets', label: 'Tickets' },
  { href: '/stops', label: 'Stops' },
  { href: '/performers', label: 'Performers' },
  { href: '/shop', label: 'Shop' },
  { href: '/crew', label: 'Crew' },
  { href: '/partners', label: 'Partners' },
  { href: '/press', label: 'Press' },
];

const DARK_PAGES = ['/about', '/contact', '/crew', '/partners'];

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
        <button className="nav-overlay-close" aria-label="Close menu" onClick={() => setOpen(false)}>
          <X aria-hidden="true" />
        </button>
        {NAV_LINKS.map(l => (
          <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>
        ))}
        <Link href="/contact" onClick={() => setOpen(false)}>Book a Stop ↗</Link>
        <div className="nav-overlay-social">
          <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener" aria-label="Follow us on Instagram">
            <SiInstagram aria-hidden="true" />
          </a>
          <a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noopener" aria-label="Follow us on TikTok">
            <SiTiktok aria-hidden="true" />
          </a>
          <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener" aria-label="Follow us on Facebook">
            <SiFacebook aria-hidden="true" />
          </a>
          <a href={SOCIAL_LINKS.youtube} target="_blank" rel="noopener" aria-label="Watch us on YouTube">
            <SiYoutube aria-hidden="true" />
          </a>
          <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener" aria-label="Message us on WhatsApp">
            <SiWhatsapp aria-hidden="true" />
          </a>
        </div>
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
              <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener" aria-label="Follow us on Instagram">
                <SiInstagram aria-hidden="true" size={18} />
              </a>
              <a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noopener" aria-label="Follow us on TikTok">
                <SiTiktok aria-hidden="true" size={18} />
              </a>
              <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener" aria-label="Follow us on Facebook">
                <SiFacebook aria-hidden="true" size={18} />
              </a>
              <a href={SOCIAL_LINKS.youtube} target="_blank" rel="noopener" aria-label="Watch us on YouTube">
                <SiYoutube aria-hidden="true" size={18} />
              </a>
              <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener" aria-label="Message us on WhatsApp">
                <SiWhatsapp aria-hidden="true" size={18} />
              </a>
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
              <li><a href={SOCIAL_LINKS.instagram}>@urban_newsgang</a></li>
              <li><a href={SOCIAL_LINKS.whatsapp}>+254799886247</a></li>
              <li><Link href="/contact">Book a stop</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>Booking 2026 · Schools, universities, colleges, polytechnics · Countrywide</p>
          <p><span>Urban Gang Tour</span> · From Potential to Purpose · 2026</p>
        </div>
      </div>
      <a href={SOCIAL_LINKS.whatsapp} className="whatsapp-float" target="_blank" rel="noopener" aria-label="Message us on WhatsApp">
        <SiWhatsapp aria-hidden="true" size={28} />
      </a>
    </footer>
  );
}
