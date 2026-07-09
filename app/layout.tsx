import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SITE } from '@/lib/site';
import { ICON_SPRITE } from './_components/iconSprite';
import { HEADER_HTML } from './_components/headerHtml';
import { FOOTER_HTML } from './_components/footerHtml';
import { JsonLd } from './_components/JsonLd';
import { MobileNav } from './_components/MobileNav';
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
      </body>
    </html>
  );
}
