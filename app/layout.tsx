import {MEDIA_LIFECYCLE_BOOTSTRAP} from '@/lib/client/media-lifecycle';
import {BookingInvitation} from '../ui/components/BookingInvitation';
import {VIEWPORT_BOOTSTRAP} from '@/lib/client/viewport-bootstrap';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import './design.css';
import './modern.css';
import './refinements.css';
import { AppShell } from './_components/AppShell';
import { SITE } from '@/lib/site';
import { JsonLd } from './_components/JsonLd';
import { CookieConsent } from './_components/CookieConsent';
import { AdSenseLoader } from './_components/Ads';
import { GoogleAnalytics } from './_components/GoogleAnalytics';
import { InstallableApp } from './_components/InstallableApp';
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
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-KE">
      <head><script dangerouslySetInnerHTML={{__html:MEDIA_LIFECYCLE_BOOTSTRAP}}/><script dangerouslySetInnerHTML={{__html:VIEWPORT_BOOTSTRAP}}/>
        {/* Meta app binding — enables FB share insights + Graph API attribution */}
        <meta property="fb:app_id" content="1338478978482580" />
        <link href="/fonts/inter.woff2" rel="preload" as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* Device id for rate limiting (lib/server/ratelimit.ts).
            Set here in the browser rather than in middleware on purpose: a
            middleware Set-Cookie lands on the page response, and a response
            carrying Set-Cookie is not edge-cacheable - it would have cost us
            HTML caching sitewide to gain a cookie.
            This is a bucket key, not a credential. A client can rotate it to
            get a fresh per-device budget, which is why the per-network
            backstop in ratelimit.ts still applies underneath it. What it buys
            is the thing IP alone cannot do: telling 1000 people on one venue
            wifi apart from one script hammering the order endpoint. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(!/(?:^|;\\s*)ugt_did=/.test(document.cookie)){var a=new Uint8Array(16);crypto.getRandomValues(a);var s='';for(var i=0;i<16;i++)s+=('0'+a[i].toString(16)).slice(-2);document.cookie='ugt_did='+s+';path=/;max-age=31536000;samesite=lax'+(location.protocol==='https:'?';secure':'');}}catch(e){}})();`,
          }}
        />
        {/* Edge-resizer fallback, installed before any image starts loading.
            Images are served through /cdn-cgi/image/ (see lib/img.ts), which
            makes Cloudflare's resizer a single point of failure for every
            picture on the site - and it does not exist at all on localhost.
            This capture-phase listener swaps a failed resized URL back to the
            original path recorded in data-ugt-src, so the worst case is the
            site looking the way it did before, not a page with no images.
            Inline and in <head><script dangerouslySetInnerHTML={{__html:MEDIA_LIFECYCLE_BOOTSTRAP}}/> deliberately: React mounts too late to catch
            errors from the server-rendered shell. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.addEventListener('error',function(e){var t=e.target;if(!t||t.tagName!=='IMG')return;var o=t.getAttribute('data-ugt-src');if(!o||t.getAttribute('data-ugt-fellback'))return;t.setAttribute('data-ugt-fellback','1');t.removeAttribute('srcset');t.removeAttribute('sizes');t.setAttribute('src',o);},true);`,
          }}
        />
      </head>
      <body>
        {/* Skip-to-content link — first focusable element on every page.
            Uses CSS :focus-within to stay visually hidden until focused,
            implemented via a className toggled by globals.css so no client
            JS is needed here (layout is a Server Component). */}
        <a
          href="#main-content"
          className="skip-to-content"
        >
          Skip to main content
        </a>
        {/* Site-wide structured data on every page */}
        <JsonLd data={[ORG, WEBSITE]} />
        <AppShell>{children}</AppShell>
        <InstallableApp />
        {/* error beacon: surfaces real visitor errors (iOS Safari especially,
            where we can't attach a debugger) in the server logs */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var n=0;function send(m,s,l){if(n++>4)return;try{var b=JSON.stringify({msg:String(m).slice(0,500),src:String(s||'').slice(0,200),line:l||0,page:location.pathname,ua:navigator.userAgent});navigator.sendBeacon?navigator.sendBeacon('/api/client-error',b):fetch('/api/client-error',{method:'POST',body:b,keepalive:true});}catch(e){}}window.addEventListener('error',function(e){send(e.message,e.filename,e.lineno);});window.addEventListener('unhandledrejection',function(e){send('unhandledrejection: '+(e.reason&&e.reason.message||e.reason),'',0);});})();`,
          }}
        />
        <CookieConsent />
        {/* AdSense: dormant until NEXT_PUBLIC_ADSENSE_CLIENT is set, and even
            then loads only after a visitor accepts cookies. Drives Auto Ads
            site-wide. */}
        <AdSenseLoader />
        {/* Google Analytics: same dormant-until-configured, consent-gated
            pattern as AdSense above. */}
        <GoogleAnalytics />
      <BookingInvitation/></body>
    </html>
  );
}