import type { MetadataRoute } from "next";

const siteUrl = "https://urbangangtour.co.ke";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/cockpit",
        "/login",
        "/api/",
        "/monitor",
        "/news",
        "/artists",
        "/hosts",
        "/shows",
        "/projects",
        "/contact$", // legacy PPP TV route only - not a prefix match against /contact-us
        "/tushinde-ad-guide",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
