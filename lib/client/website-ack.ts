import { websiteContent, type WebsiteContent } from "@/lib/website-content";

/** JSONB preserves values, not object-key order. Normalize before comparing. */
export function confirmedWebsitePage(
  value: unknown,
  expected: {
    path: string;
    version: number;
    action: "save" | "publish" | "restore";
    content: WebsiteContent;
  },
) {
  const next = value as {
    path?: unknown;
    version?: unknown;
    draft?: unknown;
    published?: unknown;
  } | null;
  if (
    !next ||
    next.path !== expected.path ||
    next.version !== expected.version + 1
  )
    throw Error("not_confirmed");
  const draft = websiteContent(next.draft);
  const published =
    next.published === null ? null : websiteContent(next.published);
  const matches = (content: WebsiteContent | null) =>
    JSON.stringify(content) ===
    JSON.stringify(websiteContent(expected.content));
  if (
    (expected.action !== "restore" && !matches(draft)) ||
    (expected.action === "publish" && !matches(published))
  )
    throw Error("not_confirmed");
  return {
    path: expected.path,
    version: expected.version + 1,
    draft,
    published,
  };
}
