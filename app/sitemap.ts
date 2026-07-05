import type { MetadataRoute } from "next";

const siteUrl = "https://urbangangtour.co.ke";

// Only the real Urban Gang Tour marketing pages - the rest of this Next.js
// app (contact/news/artists/hosts/shows/projects/monitor/cockpit) is legacy
// from before this domain was repointed at Urban Gang Tour and is excluded
// here and in robots.ts rather than indexed under the wrong brand.
const MARKETING_PAGES = [
  "About.dc.html",
  "Partners.dc.html",
  "Contact.dc.html",
  "Events.dc.html",
  "Experience.dc.html",
  "Gallery.dc.html",
  "Book.dc.html",
  "Blog.dc.html",
  "Shop.dc.html",
  "The Gang.dc.html",
  "Urban News.dc.html",
  "Promo Reel.dc.html",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: siteUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...MARKETING_PAGES.map((page) => ({
      url: `${siteUrl}/${encodeURIComponent(page)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
