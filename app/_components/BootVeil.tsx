'use client';

import { usePathname } from 'next/navigation';

// Native pages never mount the v25 runtime, so showing its loading veil would
// hide valid server-rendered content for over a second. Legacy pages retain the
// old boot contract until their route is individually reconstructed.
export function BootVeil() {
  const pathname = usePathname();
  if (pathname === '/' || pathname === '/events' || pathname?.startsWith('/events/')) return null;

  return (
    <>
      <div id="boot-veil" aria-hidden="true" suppressHydrationWarning>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/uploads/URBAN%20GANG%20TOUR%20OFFICIAL%20LOGO.png" alt="Urban Gang Tour" style={{ height: 84, width: 'auto' }} />
        <div className="boot-veil-bar"><span /></div>
      </div>
      <noscript><style>{`#boot-veil{display:none !important}`}</style></noscript>
      <script dangerouslySetInnerHTML={{ __html: `setTimeout(function(){var h=document.getElementById('v25-host');var v=document.getElementById('boot-veil');if(v&&(!h||!h.getAttribute('data-booted'))){v.classList.add('gone');}},1200);` }} />
    </>
  );
}
