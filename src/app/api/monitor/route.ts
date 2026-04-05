import { NextResponse } from "next/server";
import { fetchArticles } from "@/lib/scraper";

export const revalidate = 0;

export async function GET() {
  const diagnostics: Record<string, any> = {};

  // Env checks
  diagnostics.env = {
    instagram: !!process.env.INSTAGRAM_ACCESS_TOKEN && !!process.env.INSTAGRAM_ACCOUNT_ID,
    facebook: !!process.env.FACEBOOK_ACCESS_TOKEN && !!process.env.FACEBOOK_PAGE_ID,
    gemini: !!process.env.GEMINI_API_KEY,
    nvidia: !!process.env.NVIDIA_API_KEY,
    automateSecret: !!process.env.AUTOMATE_SECRET,
    workerSecret: !!process.env.WORKER_SECRET,
  };

  // Feed check (lightweight: limit 5)
  try {
    const articles = await fetchArticles(5);
    diagnostics.feed = { ok: true, count: articles.length, latestTitle: articles[0]?.title };
  } catch (err: any) {
    diagnostics.feed = { ok: false, error: err.message };
  }

  return NextResponse.json(diagnostics);
}
