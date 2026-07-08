import type { Metadata } from "next";
import Script from "next/script";
import { Space_Grotesk, Anton, Bungee, Permanent_Marker } from "next/font/google";
import CheckoutProvider from "./_components/CheckoutProvider";
import "./globals.css";

const GA_MEASUREMENT_ID = "G-X1WKKF846J";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const bungee = Bungee({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-badge",
});

const permanentMarker = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-marker",
});

const siteUrl = "https://urbangangtour.co.ke";
const description =
  "Urban Gang Tour is Kenya's youth talent search, mentorship, and awards concert tour. Showcasing and awarding youth talent while curating unforgettable experiences and festivals for young people, live and on the national screen.";

export const metadata: Metadata = {
  title: {
    default: "Urban Gang Tour - Where the Culture Gets Made",
    template: "%s - Urban Gang Tour",
  },
  description,
  keywords: [
    "Urban Gang Tour",
    "Urban News",
    "PPP TV Kenya",
    "talent tour Kenya",
    "school events Kenya",
    "campus events",
    "youth mentorship",
    "Eugine Micah",
    "Lucy Ogunde",
    "event sponsorship Kenya",
    "modelling runway",
  ],
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Urban Gang Tour - Where the Culture Gets Made",
    description: "Kenya's youth talent search, mentorship, and awards concert tour. Live, and on the national screen.",
    url: siteUrl,
    siteName: "Urban Gang Tour",
    images: [
      {
        url: `${siteUrl}/v25-assets/poster.png`,
        width: 1200,
        height: 630,
        alt: "Urban Gang Tour",
      },
    ],
    locale: "en_KE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Urban Gang Tour - Where the Culture Gets Made",
    description,
    images: [`${siteUrl}/v25-assets/poster.png`],
  },
  alternates: {
    canonical: siteUrl,
  },
  metadataBase: new URL(siteUrl),
};

const organizationLd = {
  "@context": "https://schema.org",
  "@type": ["Organization", "EntertainmentBusiness"],
  "@id": `${siteUrl}/#org`,
  name: "Urban Gang Tour",
  alternateName: "Urban Gang",
  url: siteUrl,
  logo: `${siteUrl}/v25-assets/logo.png`,
  image: `${siteUrl}/v25-assets/poster.png`,
  slogan: "From Potential to Purpose",
  description,
  founder: [
    { "@type": "Person", name: "Eugine Micah" },
    { "@type": "Person", name: "Lucy Ogunde" },
  ],
  email: "admin@urbangangtour.co.ke",
  areaServed: "KE",
  address: { "@type": "PostalAddress", addressLocality: "Nairobi", addressCountry: "KE" },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "bookings",
    email: "admin@urbangangtour.co.ke",
    areaServed: "KE",
    availableLanguage: ["en", "sw"],
  },
  sameAs: [
    "https://www.instagram.com/urban_newsgang",
    "https://www.tiktok.com/@urban_newsgang",
    "https://www.youtube.com/@urban_newsgang",
    "https://www.facebook.com/urban_newsgang",
    "https://x.com/urban_newsgang",
  ],
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteUrl}/#website`,
  name: "Urban Gang Tour",
  url: siteUrl,
  inLanguage: "en-KE",
  publisher: { "@id": `${siteUrl}/#org` },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${anton.variable} ${bungee.variable} ${permanentMarker.variable} antialiased`}
      >
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
        />
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <CheckoutProvider>{children}</CheckoutProvider>
      </body>
    </html>
  );
}
