export const dynamic = "force-dynamic";

import { verifyAdminPassword } from "@/lib/auth";
import redis from "@/lib/redis";

export async function GET() {
  try {
    const value = await redis.get("ugt:announcements:active");
    if (!value) return Response.json(null);
    const parsed = typeof value === "object" ? value : JSON.parse(value);
    return Response.json(parsed);
  } catch {
    return Response.json(null);
  }
}

export async function PUT(req) {
  const body = await req.json();
  const { password, ...announcement } = body;

  if (!verifyAdminPassword(password)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const record = { ...announcement, updatedAt: new Date().toISOString() };

  try {
    await redis.set("ugt:announcements:active", JSON.stringify(record));
    return Response.json(record);
  } catch {
    return Response.json({ error: "Failed to save" }, { status: 503 });
  }
}
