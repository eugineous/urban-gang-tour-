'use client';

import { useEffect, useMemo, useState } from 'react';

// Sitewide promo bar. Fetches the public /api/promos list (no internal
// fields — see the route for what is deliberately withheld) and shows a
// slim brand-styled bar when at least one promo is currently active.
// Rendered as a normal in-flow block ABOVE #ssr-shell in layout.tsx (not
// position:fixed), so it naturally sits above the sticky header and pushes
// page content down by its own height — no z-index fight with the cart
// drawer, modals, or the cookie consent banner (z-index 10000).
// Display only: this never affects what a buyer is charged — that is always
// computed server-side (lib/server/promos.ts + lib/server/catalog.ts).

interface PublicPromo {
  name: string;
  discountType: 'percent' | 'fixed';
  discount: number;
  bannerText: string;
  productIds: string[];
  endsOn: string | null;
  hasCode: boolean;
}

const DISMISS_KEY = 'ugt-promo-dismissed';

// Fingerprint of the active promo set — dismissal is remembered against this,
// so a NEW promo (different name/discount/end date) re-shows the banner even
// if the visitor dismissed an earlier one this session.
function fingerprint(promos: PublicPromo[]): string {
  return promos
    .map((p) => `${p.name}|${p.discountType}|${p.discount}|${p.endsOn || ''}`)
    .sort()
    .join('~');
}

function fmtCountdown(ms: number): string {
  if (ms <= 0) return 'Ends soon';
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / (60 * 24));
  const hours = Math.floor((mins % (60 * 24)) / 60);
  const rem = mins % 60;
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${rem}m left`;
  return `${Math.max(rem, 1)}m left`;
}

export function PromoBanner() {
  const [promos, setPromos] = useState<PublicPromo[] | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    fetch('/api/promos')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const rows: PublicPromo[] = Array.isArray(d?.promos) ? d.promos : [];
        setPromos(rows);
        if (!rows.length) { setDismissed(true); return; }
        const fp = fingerprint(rows);
        let stored: string | null = null;
        try { stored = sessionStorage.getItem(DISMISS_KEY); } catch { /* private mode etc */ }
        setDismissed(stored === fp);
      })
      .catch(() => { if (!cancelled) setPromos([]); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (dismissed || !promos || !promos.length) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [dismissed, promos]);

  const soonestEndMs = useMemo(() => {
    if (!promos) return null;
    const times = promos
      .map((p) => (p.endsOn ? new Date(p.endsOn + 'T23:59:59+03:00').getTime() : NaN))
      .filter((t) => Number.isFinite(t));
    return times.length ? Math.min(...times) : null;
  }, [promos]);

  if (!promos || !promos.length || dismissed) return null;

  const headline = promos[0].bannerText || promos[0].name;
  const countdown = soonestEndMs ? fmtCountdown(soonestEndMs - now) : '';

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, fingerprint(promos)); } catch { /* private mode etc */ }
    setDismissed(true);
  };

  return (
    <div
      role="region"
      aria-label="Current promotions"
      style={{
        position: 'relative',
        zIndex: 90,
        background: '#E6218C',
        color: '#fff',
        borderBottom: '3px solid #111',
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        flexWrap: 'wrap',
        padding: '9px 42px 9px 14px',
        fontSize: 13,
        fontWeight: 700,
        textAlign: 'center',
        lineHeight: 1.3,
      }}
    >
      <span
        style={{
          fontFamily: "'Anton'",
          fontSize: 13,
          letterSpacing: '.03em',
          textTransform: 'uppercase',
          background: '#FFD400',
          color: '#111',
          padding: '3px 9px',
          borderRadius: 6,
          border: '2px solid #111',
          flex: 'none',
        }}
      >
        Deal
      </span>
      <span>{headline}</span>
      {countdown && (
        <span
          style={{
            background: '#111',
            color: '#FFD400',
            padding: '3px 9px',
            borderRadius: 6,
            fontFamily: "'Anton'",
            fontSize: 12,
            flex: 'none',
          }}
        >
          {countdown}
        </span>
      )}
      <button
        onClick={dismiss}
        aria-label="Dismiss promotion banner"
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 26,
          height: 26,
          borderRadius: 8,
          border: '2px solid #fff',
          background: 'transparent',
          color: '#fff',
          fontSize: 15,
          lineHeight: 1,
          cursor: 'pointer',
        }}
      >
        ×
      </button>
    </div>
  );
}
