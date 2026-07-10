import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SITE } from '@/lib/site';
import { ICON_SPRITE } from './_components/iconSprite';
import { HEADER_HTML } from './_components/headerHtml';
import { FOOTER_HTML } from './_components/footerHtml';
import { JsonLd } from './_components/JsonLd';
import { CookieConsent } from './_components/CookieConsent';
import { MobileNav } from './_components/MobileNav';
import { WhatsAppWidget } from './_components/WhatsAppWidget';
import { ORG, WEBSITE } from './_lib/jsonld';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.domain),
  title: {
    default: 'Urban Gang Tour — Where the Culture Gets Made',
    template: '%s',
  },
  description:
    "Kenya's youth talent search, mentorship, and awards concert tour on Urban News, PPP TV Kenya. From Potential to Purpose.",
  applicationName: SITE.name,
  manifest: '/manifest.json',
  icons: {
    icon: '/assets/favicon.png',
    apple: '/assets/pwa-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Urban Gang',
  },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    images: [{ url: SITE.defaultOg }],
    locale: 'en_KE',
  },
  twitter: { card: 'summary_large_image', images: [SITE.defaultOg] },
};

export const viewport: Viewport = {
  themeColor: '#E6218C',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-KE">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Bungee&family=Permanent+Marker&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Google Identity Services — powers the /admin Google Sign-In (v25 parity) */}
        <script src="https://accounts.google.com/gsi/client" async defer />
        {/* Load the v25 runtime + template with priority so boot never gets
            starved behind the static shell's images/video on media-heavy pages. */}
        <link rel="preload" as="fetch" href="/v25-template.html" crossOrigin="anonymous" />
        <link rel="preload" as="script" href="/support.js" />
        <link rel="preload" as="script" href="/vendor/react.production.min.js" />
        <link rel="preload" as="script" href="/vendor/react-dom.production.min.js" />
      </head>
      <body>
        {/* Site-wide structured data on every page */}
        <JsonLd data={[ORG, WEBSITE]} />
        {/* v25 SVG icon sprite — rendered once, referenced by <use href="#i-*"> everywhere */}
        <div
          aria-hidden="true"
          style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
          dangerouslySetInnerHTML={{ __html: ICON_SPRITE }}
        />
        {/* SSR shell: full server-rendered page for crawlers + first paint.
            v25's live runtime boots into #v25-host and then hides this. */}
        <div id="ssr-shell" style={{ minHeight: '100vh', background: '#E6218C', position: 'relative' }}>
          <MobileNav />
          <div dangerouslySetInnerHTML={{ __html: HEADER_HTML }} />
          {children}
          <div dangerouslySetInnerHTML={{ __html: FOOTER_HTML }} />
        </div>
        {/* mount point for the live interactive v25 app (client-only) */}
        <div id="v25-host" />
        <WhatsAppWidget />
        {/* Boot veil: hides the pre-boot shell flash; removed the instant the
            live app renders (or by fallback timer). Hidden entirely for no-JS
            visitors and crawlers via noscript. */}
        <div id="boot-veil" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/ugt-logo-v2.png" alt="" style={{ height: 84, width: 'auto' }} />
          <div className="boot-veil-bar"><span /></div>
        </div>
        <noscript>
          <style>{`#boot-veil{display:none !important}`}</style>
        </noscript>
        {/* pages without the v25 booter (admin, account, blog, legal) never set
            data-booted on the host — drop the veil for them immediately */}
        <script
          dangerouslySetInnerHTML={{
            __html: `setTimeout(function(){var h=document.getElementById('v25-host');var v=document.getElementById('boot-veil');if(v&&(!h||!h.getAttribute('data-booted'))){v.classList.add('gone');setTimeout(function(){v.remove()},400);}},1200);`,
          }}
        />
        <CookieConsent />
      </body>
    </html>
  );
}
