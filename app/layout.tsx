import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SITE } from '@/lib/site';
import { ICON_SPRITE } from './_components/iconSprite';
import { HEADER_HTML } from './_components/headerHtml';
import { FOOTER_HTML } from './_components/footerHtml';
import { JsonLd } from './_components/JsonLd';
import { CookieConsent } from './_components/CookieConsent';
import { AdSenseLoader } from './_components/Ads';
import { BottomTabBar } from './_components/BottomTabBar';
import { WhatsAppWidget } from './_components/WhatsAppWidget';
import { PromoBanner } from './_components/PromoBanner';
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
    // Real multi-size .ico first (the PNG served at this path before was
    // mislabeled, which is why the site's icon never appeared in Google
    // search results the way Instagram/YouTube's do). Google's own guidance
    // wants a square icon sized a multiple of 48px - 48/96/144 cover that.
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon-144.png', sizes: '144x144', type: 'image/png' },
    ],
    apple: '/icon-192.png',
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
        {/* Meta app binding — enables FB share insights + Graph API attribution */}
        <meta property="fb:app_id" content="1338478978482580" />
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
        {/* Sitewide promo bar — rendered OUTSIDE #ssr-shell (survives the v25
            runtime boot swap, same reason as BottomTabBar/WhatsAppWidget) and
            as a normal in-flow block, not position:fixed, so it sits above
            the sticky header and pushes everything else down by its own
            height with zero z-index fighting. Renders nothing when there is
            no active promo. */}
        <PromoBanner />
        {/* SSR shell: full server-rendered page for crawlers + first paint.
            v25's live runtime boots into #v25-host and then hides this. */}
        <div id="ssr-shell" style={{ minHeight: '100vh', background: '#E6218C', position: 'relative' }}>
          <div dangerouslySetInnerHTML={{ __html: HEADER_HTML }} />
          {children}
          <div dangerouslySetInnerHTML={{ __html: FOOTER_HTML }} />
        </div>
        {/* mount point for the live interactive v25 app (client-only) */}
        <div id="v25-host" />
        {/* Mobile bottom tab bar — outside #ssr-shell so it survives the
            runtime boot (the old menu vanished with the shell). */}
        <BottomTabBar />
        <WhatsAppWidget />
        {/* Boot veil: hides the pre-boot shell flash; removed the instant the
            live app renders (or by fallback timer). Hidden entirely for no-JS
            visitors and crawlers via noscript. */}
        {/* suppressHydrationWarning + hide-only (never .remove()): the veil
            scripts race React hydration, and deleting the node made React
            regenerate the whole tree (error 418) on slow loads. */}
        <div id="boot-veil" aria-hidden="true" suppressHydrationWarning>
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
            __html: `setTimeout(function(){var h=document.getElementById('v25-host');var v=document.getElementById('boot-veil');if(v&&(!h||!h.getAttribute('data-booted'))){v.classList.add('gone');}},1200);`,
          }}
        />
        {/* error beacon: surfaces real visitor errors (iOS Safari especially,
            where we can't attach a debugger) in the Vercel function logs */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var n=0;function send(m,s,l){if(n++>4)return;try{var b=JSON.stringify({msg:String(m).slice(0,500),src:String(s||'').slice(0,200),line:l||0,page:location.pathname,ua:navigator.userAgent});navigator.sendBeacon?navigator.sendBeacon('/api/client-error',b):fetch('/api/client-error',{method:'POST',body:b,keepalive:true});}catch(e){}}window.addEventListener('error',function(e){send(e.message,e.filename,e.lineno);});window.addEventListener('unhandledrejection',function(e){send('unhandledrejection: '+(e.reason&&e.reason.message||e.reason),'',0);});})();`,
          }}
        />
        <CookieConsent />
        {/* AdSense: dormant until NEXT_PUBLIC_ADSENSE_CLIENT is set, and even
            then loads only after a visitor accepts cookies. Drives Auto Ads
            site-wide (covers the v25 SPA pages too). */}
        <AdSenseLoader />
      </body>
    </html>
  );
}
