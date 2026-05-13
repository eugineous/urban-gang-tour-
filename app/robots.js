import { siteUrl } from "@/lib/site-url";

export default function robots() {
  const base = siteUrl;

  return {
    rules: {
      userAgent: "*",
      allow: "/"
    },
    sitemap: `${base}/sitemap.xml`
  };
}
