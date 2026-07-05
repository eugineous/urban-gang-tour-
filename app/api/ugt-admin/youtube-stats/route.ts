import { NextResponse } from "next/server";

// Protected by middleware.ts (UGT_ADMIN_PROTECTED_PREFIXES includes /api/ugt-admin).
export const dynamic = "force-dynamic";

const VIDEO_IDS = ["P7a9iFNE33g", "JSMflLGKaAw"];

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY isn't configured yet" }, { status: 501 });
  }

  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${VIDEO_IDS.join(",")}&key=${apiKey}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("YouTube Data API error:", res.status, body);
    return NextResponse.json({ error: "Couldn't reach YouTube's API" }, { status: 502 });
  }

  const data = await res.json();
  const videos = (data.items || []).map((v: any) => ({
    id: v.id,
    title: v.snippet?.title,
    thumbnail: v.snippet?.thumbnails?.medium?.url,
    publishedAt: v.snippet?.publishedAt,
    viewCount: Number(v.statistics?.viewCount || 0),
    likeCount: Number(v.statistics?.likeCount || 0),
    commentCount: Number(v.statistics?.commentCount || 0),
  }));

  return NextResponse.json({ videos });
}
