export const dynamic = "force-dynamic";

import { verifyAdminPassword } from "@/lib/auth";
import redis from "@/lib/redis";

export async function GET() {
  try {
    const keys = await redis.smembers("ugt:testimonials:index");
    if (!keys || keys.length === 0) return Response.json([]);
    const values = await redis.mget(...keys);
    const items = values
      .map((v) => (typeof v === "object" ? v : JSON.parse(v)))
      .filter(Boolean);
    return Response.json(items);
  } catch {
    return Response.json({ error: "Failed to load" }, { status: 503 });
  }
}

export async function POST(req) {
  const body = await req.json();
  const { password, id, author, quote } = body;

  if (!verifyAdminPassword(password)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!id || !author || !quote) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const key = `ugt:testimonials:${id}`;
  const record = { ...body, id, updatedAt: new Date().toISOString() };
  delete record.password;

  try {
    await redis.set(key, JSON.stringify(record));
    await redis.sadd("ugt:testimonials:index", key);
    return Response.json(record);
  } catch {
    return Response.json({ error: "Failed to save" }, { status: 503 });
  }
}

export async function PUT(req) {
  const body = await req.json();
  const { password, id } = body;

  if (!verifyAdminPassword(password)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!id) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const key = `ugt:testimonials:${id}`;
  const record = { ...body, updatedAt: new Date().toISOString() };
  delete record.password;

  try {
    await redis.set(key, JSON.stringify(record));
    return Response.json(record);
  } catch {
    return Response.json({ error: "Failed to save" }, { status: 503 });
  }
}

export async function DELETE(req) {
  const body = await req.json();
  const { password, id } = body;

  if (!verifyAdminPassword(password)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!id) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const key = `ugt:testimonials:${id}`;

  try {
    await redis.del(key);
    await redis.srem("ugt:testimonials:index", key);
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Failed to save" }, { status: 503 });
  }
}
