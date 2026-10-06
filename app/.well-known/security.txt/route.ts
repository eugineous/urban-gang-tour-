import { SITE } from "@/lib/site";

export const revalidate = 86400;

export function GET() {
  const expires = new Date(
    Date.now() + 180 * 24 * 60 * 60 * 1000,
  ).toISOString();
  return new Response(
    `Contact: mailto:${SITE.email}\nCanonical: ${SITE.domain}/.well-known/security.txt\nPolicy: ${SITE.domain}/privacy-policy\nExpires: ${expires}\nPreferred-Languages: en\n`,
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    },
  );
}
