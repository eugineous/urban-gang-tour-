import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

const siteUrl = "https://urban-gang-tour.vercel.app";

export const metadata: Metadata = {
  title: "Urban Gang Tour",
  description: "Kenya's youth talent search, mentorship, and awards concert tour.",
  openGraph: {
    title: "Urban Gang Tour",
    description: "Kenya's youth talent search, mentorship, and awards concert tour.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} antialiased bg-[#0d0b0f] text-white`}>
        {children}
      </body>
    </html>
  );
}
