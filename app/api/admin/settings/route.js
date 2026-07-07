export const dynamic = "force-dynamic";

import { verifyAdminPassword } from "@/lib/auth";
import redis from "@/lib/redis";

export async function GET() {
  try {
    const value = await redis.get("ugt:settings");
    if (!value) return Response.json({});
    const parsed = typeof value === "object" ? value : JSON.parse(value);
    return Response.json(parsed ?? {});
  } catch {
    return Response.json({});
  }
}

export async function PUT(req) {
  const body = await req.json();
  const { password, ...updates } = body;

  if (!verifyAdminPassword(password)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existing = await redis.get("ugt:settings");
    const current =
      existing
        ? typeof existing === "object"
          ? existing
          : JSON.parse(existing)
        : {};
    const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };
    await redis.set("ugt:settings", JSON.stringify(merged));
    return Response.json(merged);
  } catch {
    return Response.json({ error: "Failed to save" }, { status: 503 });
  }
}
