export const dynamic = "force-dynamic";

import { verifyAdminPassword } from "@/lib/auth";
import redis from "@/lib/redis";

export async function GET() {
  try {
    const keys = await redis.zrange("ugt:blog:index", 0, -1, { rev: true });
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
  const { password, slug, title, body: postBody } = body;

  if (!verifyAdminPassword(password)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!slug || !title || !postBody) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const key = `ugt:blog:${slug}`;
  const score = Date.parse(body.datePublished) || Date.now();
  const record = { ...body, slug, updatedAt: new Date().toISOString() };
  delete record.password;

  try {
    await redis.set(key, JSON.stringify(record));
    await redis.zadd("ugt:blog:index", { score, member: key });
    return Response.json(record);
  } catch {
    return Response.json({ error: "Failed to save" }, { status: 503 });
  }
}

export async function PUT(req) {
  const body = await req.json();
  const { password, slug } = body;

  if (!verifyAdminPassword(password)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!slug) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const key = `ugt:blog:${slug}`;
  const score = Date.parse(body.datePublished) || Date.now();
  const record = { ...body, updatedAt: new Date().toISOString() };
  delete record.password;

  try {
    await redis.set(key, JSON.stringify(record));
    await redis.zadd("ugt:blog:index", { score, member: key });
    return Response.json(record);
  } catch {
    return Response.json({ error: "Failed to save" }, { status: 503 });
  }
}

export async function DELETE(req) {
  const body = await req.json();
  const { password, slug } = body;

  if (!verifyAdminPassword(password)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!slug) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const key = `ugt:blog:${slug}`;

  try {
    await redis.del(key);
    await redis.zrem("ugt:blog:index", key);
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Failed to save" }, { status: 503 });
  }
}
