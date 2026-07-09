import { NAV } from '@/lib/site';

// Pure-HTML mobile menu using <details>/<summary> — works without any client JS
// and is fully crawlable (real <a href>). Shown only on narrow screens; hides
// v25's inert JS burger (see globals.css override).
export function MobileNav() {
  return (
    <details className="ugt-mnav">
      <summary aria-label="Menu">
        <span className="ugt-mnav-bars" aria-hidden="true">☰</span>
      </summary>
      <nav className="ugt-mnav-panel">
        {NAV.map((l) => (
          <a key={l.href} href={l.href}>{l.label}</a>
        ))}
        <a className="ugt-mnav-cta" href="/book">Book the Tour</a>
      </nav>
    </details>
  );
}
