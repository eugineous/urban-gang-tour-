export const dynamic = "force-dynamic";

import { verifyAdminPassword } from "@/lib/auth";
import redis from "@/lib/redis";

const ADSENSE_FIELDS = ["adsensePubId", "adSlots"];

export async function GET() {
  try {
    const value = await redis.get("ugt:settings");
    const settings = value
      ? typeof value === "object"
        ? value
        : JSON.parse(value)
      : {};
    const adsense = {};
    for (const field of ADSENSE_FIELDS) {
      if (field in settings) adsense[field] = settings[field];
    }
    return Response.json(adsense);
  } catch {
    return Response.json({ error: "Failed to load" }, { status: 503 });
  }
}

export async function PUT(req) {
  const body = await req.json();
  const { password, ...adsenseData } = body;

  if (!verifyAdminPassword(password)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existing = await redis.get("ugt:settings");
    const current = existing
      ? typeof existing === "object"
        ? existing
        : JSON.parse(existing)
      : {};

    // Only merge adsense-relevant fields
    const adsenseUpdates = {};
    for (const field of ADSENSE_FIELDS) {
      if (field in adsenseData) adsenseUpdates[field] = adsenseData[field];
    }

    const merged = {
      ...current,
      ...adsenseUpdates,
      updatedAt: new Date().toISOString(),
    };
    await redis.set("ugt:settings", JSON.stringify(merged));

    const adsenseResult = {};
    for (const field of ADSENSE_FIELDS) {
      if (field in merged) adsenseResult[field] = merged[field];
    }
    return Response.json(adsenseResult);
  } catch {
    return Response.json({ error: "Failed to save" }, { status: 503 });
  }
}
