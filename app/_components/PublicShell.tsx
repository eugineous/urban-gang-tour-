import Link from 'next/link';

const nav = [
  { href: '/events', label: 'Events' },
  { href: '/experience', label: 'The Tour' },
  { href: '/blog', label: 'Urban News' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/shop', label: 'Shop' },
];

export function PublicHeader() {
  return (
    <header className="public-header">
      <div className="public-header__inner">
        <Link href="/" className="public-header__brand" aria-label="Urban Gang Tour home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/uploads/URBAN%20GANG%20TOUR%20OFFICIAL%20LOGO.png" alt="Urban Gang Tour" />
        </Link>
        <nav className="public-header__nav" aria-label="Main navigation">
          {nav.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>
        <Link href="/book" className="public-header__cta">Book the tour</Link>
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
          <p className="public-footer__statement">Where the culture gets made.</p>
        </div>
        <div className="public-footer__links" aria-label="Footer navigation">
          <Link href="/book">Bring UGT to your school</Link>
          <Link href="/work-with-us">Work with UGT</Link>
          <Link href="/contact-us">Contact</Link>
          <Link href="/privacy">Privacy</Link>
        </div>
      </div>
      <div className="public-footer__legal">© {new Date().getFullYear()} Urban Gang Tour. Broadcast network: PPP TV Kenya.</div>
    </footer>
  );
}
