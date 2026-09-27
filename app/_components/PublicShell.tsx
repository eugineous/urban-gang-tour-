import Link from 'next/link';
import { PUBLIC_HEADER_NAV, PUBLIC_HEADER_CTA, FOOTER_LINKS, VOICE } from './ugt/nav';

export function PublicHeader() {
  return (
    <header className="public-header">
      <div className="public-header__inner">
        <Link href="/" className="public-header__brand" aria-label="Urban Gang Tour home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/uploads/URBAN%20GANG%20TOUR%20OFFICIAL%20LOGO.png" alt="Urban Gang Tour" />
        </Link>
        <nav className="public-header__nav" aria-label="Main navigation">
          {PUBLIC_HEADER_NAV.map((item) => (
            <Link key={item.href} href={item.href}>{item.label}</Link>
          ))}
        </nav>
        <Link href={PUBLIC_HEADER_CTA.href} className="public-header__cta ugt-money-btn">
          {PUBLIC_HEADER_CTA.label}
        </Link>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer__inner">
        <div>
          <p className="public-footer__eyebrow">Urban Gang Tour</p>
          <p className="public-footer__statement">{VOICE.emotional}</p>
          <p className="public-footer__subtitle">{VOICE.institutional}</p>
        </div>
        <div className="public-footer__links" aria-label="Footer navigation">
          {FOOTER_LINKS.map((l) => (
            <Link key={l.href + l.label} href={l.href}>{l.label}</Link>
          ))}
        </div>
      </div>
      <div className="public-footer__legal">
        © {new Date().getFullYear()} Urban Gang Tour. Broadcast network: PPP TV Kenya.
      </div>
    </footer>
  );
}