import './globals.css';
import { SiteNav, SiteFooter } from '@/components/site-chrome';
import JsonLd from '@/components/JsonLd';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import Script from 'next/script';

export const metadata = {
  metadataBase: new URL('https://urbangangtour.co.ke'),
  title: 'Urban Gang Tour | From Potential to Purpose',
  description:
    "Kenya's biggest school talent search, mentorship, and awards concert programme. Watch young talent rise on the Urban Gang Tour.",
  keywords:
    'Urban Gang Tour, Kenyan school events, youth talent Kenya, school concert Kenya, PPP TV Kenya, UGT, school talent search, Eugine Micah, Urban News',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    siteName: 'Urban Gang Tour',
    title: 'Urban Gang Tour | From Potential to Purpose',
    description:
      "Kenya's biggest school talent search, mentorship, and awards concert programme. Watch young talent rise on the Urban Gang Tour.",
    url: 'https://urbangangtour.co.ke',
    type: 'website',
    images: [
      {
        url: 'https://urbangangtour.co.ke/assets/logos/ugt-logo-full.png',
        width: 800,
        height: 600,
        alt: 'Urban Gang Tour Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@urbangangtour',
    title: 'Urban Gang Tour | From Potential to Purpose',
    description:
      "Kenya's biggest school talent search, mentorship, and awards concert programme. Watch young talent rise on the Urban Gang Tour.",
    images: ['https://urbangangtour.co.ke/assets/logos/ugt-logo-full.png'],
  },
  alternates: {
    canonical: 'https://urbangangtour.co.ke',
    languages: {
      en: 'https://urbangangtour.co.ke',
      sw: 'https://urbangangtour.co.ke',
      'x-default': 'https://urbangangtour.co.ke',
    },
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Urban Gang Tour',
  url: 'https://urbangangtour.co.ke',
  logo: 'https://urbangangtour.co.ke/assets/logos/ugt-logo-full.png',
  description:
    "Kenya's biggest school talent search, mentorship, and awards concert programme.",
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    email: 'euginemicah@gmail.com',
  },
  sameAs: [
    'https://instagram.com/urban_newsgang',
    'https://tiktok.com/@urbangangtour',
    'https://facebook.com/urbangangtour',
    'https://youtube.com/@urbannewsppp',
  ],
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Urban Gang Tour',
  url: 'https://urbangangtour.co.ke',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate:
        'https://urbangangtour.co.ke/search?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded"
        >
          Skip to content
        </a>
        <JsonLd schema={organizationSchema} />
        <JsonLd schema={websiteSchema} />
        <AnnouncementBanner />
        <SiteNav />
        <main id="main-content" style={{ paddingTop: '72px' }}>
          {children}
        </main>
        <SiteFooter />
        {process.env.NEXT_PUBLIC_ADSENSE_PUB_ID && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_PUB_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
