export const dynamic = "force-dynamic";

import { verifyAdminPassword } from "@/lib/auth";
import redis from "@/lib/redis";

export async function GET() {
  try {
    const keys = await redis.smembers("ugt:orders:index");
    if (!keys || keys.length === 0) return Response.json([]);
    const values = await redis.mget(...keys);
    const orders = values
      .map((v) => (typeof v === "object" ? v : JSON.parse(v)))
      .filter(Boolean)
      .filter((o) => o.type === "ticket");
    // Sort newest first by timestamp
    orders.sort(
      (a, b) => new Date(b.timestamp ?? 0) - new Date(a.timestamp ?? 0)
    );
    return Response.json(orders);
  } catch {
    return Response.json({ error: "Failed to load" }, { status: 503 });
  }
}

export async function PUT(req) {
  const body = await req.json();
  const { password, eventSlug, ticketTiers } = body;

  if (!verifyAdminPassword(password)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!eventSlug || !ticketTiers) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const key = `ugt:events:${eventSlug}`;

  try {
    const existing = await redis.get(key);
    const current = existing
      ? typeof existing === "object"
        ? existing
        : JSON.parse(existing)
      : {};
    const updated = {
      ...current,
      ticketTiers,
      updatedAt: new Date().toISOString(),
    };
    await redis.set(key, JSON.stringify(updated));
    return Response.json(updated);
  } catch {
    return Response.json({ error: "Failed to save" }, { status: 503 });
  }
}
