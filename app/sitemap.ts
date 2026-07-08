import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/content/blog";

const siteUrl = "https://urbangangtour.co.ke";

// Only the real Urban Gang Tour marketing pages - the rest of this Next.js
// app (contact/news/artists/hosts/shows/projects/monitor/cockpit) is legacy
// from before this domain was repointed at Urban Gang Tour and is excluded
// here and in robots.ts rather than indexed under the wrong brand.
const MARKETING_SLUGS = [
  "about",
  "partners",
  "contact-us",
  "events",
  "experience",
  "gallery",
  "book",
  "blog",
  "shop",
  "the-gang",
  "urban-news",
  "promo-reel",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: siteUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...MARKETING_SLUGS.map((slug) => ({
      url: `${siteUrl}/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...BLOG_POSTS.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
