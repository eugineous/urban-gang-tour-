import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // /t/ + /tickets/ are bearer-token ticket pages (also meta-noindexed)
      {
        userAgent: "*",
        allow: "/",
        // Pages use a crawlable noindex directive where they must stay out of
        // search. Blocking those URLs here would prevent Google from reading
        // that directive. robots.txt is not an access-control mechanism.
        disallow: ["/api/", "/v25-template.html"],
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "OAI-SearchBot",
          "ClaudeBot",
          "PerplexityBot",
        ],
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/account/",
          "/organizer/",
          "/tickets/",
          "/receipt/",
          "/verify/",
        ],
      },
    ],
    sitemap: [
      `${SITE.domain}/sitemap.xml`,
      `${SITE.domain}/news-sitemap.xml`,
      `${SITE.domain}/image-sitemap.xml`,
    ],
    host: SITE.domain,
  };
}
