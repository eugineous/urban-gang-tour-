export const dynamic = "force-dynamic";

import { verifyAdminPassword } from "@/lib/auth";
import redis from "@/lib/redis";

export async function GET() {
  try {
    // Scan for all ugt:seo:* keys
    let cursor = 0;
    const allKeys = [];
    do {
      const [nextCursor, keys] = await redis.scan(cursor, {
        match: "ugt:seo:*",
        count: 100,
      });
      cursor = Number(nextCursor);
      allKeys.push(...keys);
    } while (cursor !== 0);

    if (allKeys.length === 0) return Response.json({});

    const values = await redis.mget(...allKeys);
    const result = {};
    allKeys.forEach((key, i) => {
      const pageKey = key.replace("ugt:seo:", "");
      const val = values[i];
      result[pageKey] = val
        ? typeof val === "object"
          ? val
          : JSON.parse(val)
        : null;
    });
    return Response.json(result);
  } catch {
    return Response.json({ error: "Failed to load" }, { status: 503 });
  }
}

export async function PUT(req) {
  const body = await req.json();
  const { password, pageKey, ...seoData } = body;

  if (!verifyAdminPassword(password)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!pageKey) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const record = { ...seoData, pageKey, updatedAt: new Date().toISOString() };

  try {
    await redis.set(`ugt:seo:${pageKey}`, JSON.stringify(record));
    return Response.json(record);
  } catch {
    return Response.json({ error: "Failed to save" }, { status: 503 });
  }
}
