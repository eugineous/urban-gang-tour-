import type { Metadata } from "next";
import Script from "next/script";
import { Space_Grotesk, Anton, Permanent_Marker } from "next/font/google";
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

const permanentMarker = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-marker",
});

const siteUrl = "https://urbangangtour.co.ke";
const description =
  "Urban Gang Tour is a Kenyan events company founded by Eugine Micah and Lucy Ogunde, running a youth talent search, mentorship, and awards concert tour countrywide.";

export const metadata: Metadata = {
  title: {
    default: "Urban Gang Tour — Kenyan Events Company",
    template: "%s — Urban Gang Tour",
  },
  description,
  openGraph: {
    title: "Urban Gang Tour — Kenyan Events Company",
    description,
    url: siteUrl,
    siteName: "Urban Gang Tour",
    images: [
      {
        url: `${siteUrl}/assets/brand/logo_transparent.png`,
        width: 1200,
        height: 630,
        alt: "Urban Gang Tour",
      },
    ],
    locale: "en_KE",
    type: "website",
  },
  metadataBase: new URL(siteUrl),
};

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Urban Gang Tour",
  url: siteUrl,
  logo: `${siteUrl}/assets/brand/logo_transparent.png`,
  description,
  founder: [
    { "@type": "Person", name: "Eugine Micah" },
    { "@type": "Person", name: "Lucy Ogunde" },
  ],
  sameAs: [
    "https://instagram.com/urban_newsgang",
    "https://facebook.com/urban_newsgang",
    "https://tiktok.com/@urban_newsgang",
    "https://youtube.com/@urban_newsgang",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${anton.variable} ${permanentMarker.variable} antialiased bg-[#0d0b0f] text-white`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
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
        {children}
      </body>
    </html>
  );
}
