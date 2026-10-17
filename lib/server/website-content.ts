import { q, qSchema, hasDb } from "./db";
import { cached, invalidate } from "./microcache";
import {
  websiteContent,
  pagePath,
  type WebsiteContent,
} from "../website-content";
import { ensureOpsSchema } from "./ops";
export const WEBSITE_CONTENT_SCHEMA = `
 CREATE TABLE IF NOT EXISTS website_pages(path TEXT PRIMARY KEY,draft JSONB NOT NULL,published JSONB,version INT NOT NULL DEFAULT 1,updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS website_page_versions(path TEXT NOT NULL REFERENCES website_pages(path) ON DELETE RESTRICT,version INT NOT NULL,draft JSONB NOT NULL,published JSONB,actor TEXT NOT NULL,action TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(path,version));
`;
let ready: Promise<void> | null = null;
export function ensureWebsiteContentSchema() {
  if (!ready)
    ready = (async () => {
      await ensureOpsSchema();
      await qSchema(WEBSITE_CONTENT_SCHEMA);
    })().catch((error) => {
      ready = null;
      throw error;
    });
  return ready;
}
export async function readWebsiteContent(
  path: string,
): Promise<WebsiteContent | null> {
  if (!hasDb() || !pagePath(path)) return null;
  try {
    const snapshot = await cached("website-page:" + path, 5000, async () => {
      const rows = await q<{ published: unknown }>(
        "SELECT published FROM website_pages WHERE path=$1",
        [path],
      );
      return {
        content: rows[0]?.published ? websiteContent(rows[0].published) : null,
        expires: Date.now() + 15000,
      };
    });
    return snapshot.expires > Date.now() ? snapshot.content : null;
  } catch {
    return null;
  }
}
export function invalidateWebsiteContent(path: string) {
  invalidate("website-page:" + path);
  invalidate("seo:" + path);
}
