import { createHash } from "crypto";
import Parser from "rss-parser";
import { Article } from "./types";

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

const PPP_SITE_URL = process.env.PPP_SITE_URL || "https://ppp-tv-site.vercel.app";
const PPP_PRIMARY_FEED = `${PPP_SITE_URL}/api/rss`;
const PPPTV_FEED_URL = (process.env.PPPTV_WORKER_URL || "https://ppp-tv-worker.euginemicah.workers.dev") + "/feed";

function isWithin24h(pubDate: string | Date | undefined): boolean {
  if (!pubDate) return true;
  try {
    const d = typeof pubDate === "string" ? new Date(pubDate) : pubDate;
    return Date.now() - d.getTime() <= TWENTY_FOUR_HOURS;
  } catch { return true; }
}

function hashUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

function titleFingerprint(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
}

async function fetchPrimaryRSS(limit: number): Promise<Article[]> {
  const parser = new Parser();
  const feed = await parser.parseURL(PPP_PRIMARY_FEED);
  const seenTitles = new Set<string>();
  const articles: Article[] = [];
  for (const item of feed.items || []) {
    if (!item.title || !item.link) continue;
    const fp = titleFingerprint(item.title);
    if (seenTitles.has(fp)) continue;
    seenTitles.add(fp);
    const pub = item.pubDate ? new Date(item.pubDate) : new Date();
    articles.push({
      id: hashUrl(item.link),
      title: item.title,
      url: item.link,
      imageUrl: (item.enclosure as any)?.url || (item as any)?.image || "",
      summary: item.contentSnippet || item.content || "",
      fullBody: item.content || item.contentSnippet || "",
      sourceName: "PPP TV Kenya",
      category: ((item.categories && item.categories[0]) || "GENERAL").toUpperCase(),
      publishedAt: pub,
    });
  }
  const fresh = articles.filter(a => isWithin24h(a.publishedAt));
  fresh.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return fresh.slice(0, limit);
}

interface WorkerFeedItem {
  slug: string;
  title: string;
  excerpt: string;
  content?: string;
  category: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  articleUrl: string;
  imageUrl: string;
  imageUrlDirect: string;
}

interface WorkerFeedResponse {
  articles: WorkerFeedItem[];
  total: number;
  generatedAt: string;
}

function parseWorkerFeed(data: WorkerFeedResponse): Article[] {
  const articles: Article[] = [];
  const seenTitles = new Set<string>();
  const seenIds = new Set<string>();

  for (const item of data.articles || []) {
    if (!item.title || !item.sourceUrl) continue;

    const id = hashUrl(item.sourceUrl);
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const fp = titleFingerprint(item.title);
    if (seenTitles.has(fp)) continue;
    seenTitles.add(fp);

    const fullBody = item.content || item.excerpt || "";

    articles.push({
      id,
      title: item.title,
      url: item.articleUrl || item.sourceUrl,
      imageUrl: item.imageUrl || item.imageUrlDirect || "",
      summary: item.excerpt || "",
      fullBody,
      sourceName: item.sourceName || "PPP TV Kenya",
      category: (item.category || "GENERAL").toUpperCase(),
      publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
    });
  }

  return articles;
}

async function fetchWorkerFeed(limit = 50): Promise<Article[]> {
  const url = `${PPPTV_FEED_URL}?limit=${limit}`;
  const res = await fetch(url, { headers: { "User-Agent": "PPPTVAutoPoster/5.0" }, cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error("PPP TV Worker feed fetch failed: " + res.status);
  const data = await res.json() as WorkerFeedResponse;
  const articles = parseWorkerFeed(data).filter(a => isWithin24h(a.publishedAt));
  articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return articles.slice(0, limit);
}

export async function fetchArticles(limit = 50): Promise<Article[]> {
  try {
    const primary = await fetchPrimaryRSS(limit);
    if (primary.length > 0) return primary.slice(0, limit);
  } catch (err: any) {
    console.warn("[scraper] primary feed failed:", err.message);
  }

  const fallback = await fetchWorkerFeed(limit);
  return fallback;
}

export async function fetchLatestArticle(): Promise<Article | null> {
  const articles = await fetchArticles(1);
  return articles[0] ?? null;
}
