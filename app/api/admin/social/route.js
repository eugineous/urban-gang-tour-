export const dynamic = "force-dynamic";

import { verifyAdminPassword } from "@/lib/auth";
import redis from "@/lib/redis";
import { validateSocialUrl } from "@/lib/cms";

export async function GET() {
  try {
    const value = await redis.get("ugt:social");
    if (!value) return Response.json({});
    const parsed = typeof value === "object" ? value : JSON.parse(value);
    return Response.json(parsed ?? {});
  } catch {
    return Response.json({});
  }
}

export async function PUT(req) {
  const body = await req.json();
  const { password, ...links } = body;

  if (!verifyAdminPassword(password)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validate all URL values start with https://
  for (const [key, value] of Object.entries(links)) {
    if (value && !validateSocialUrl(value)) {
      return Response.json(
        { error: `Invalid URL for ${key}: must start with https://` },
        { status: 400 }
      );
    }
  }

  const record = { ...links, updatedAt: new Date().toISOString() };

  try {
    await redis.set("ugt:social", JSON.stringify(record));
    return Response.json(record);
  } catch {
    return Response.json({ error: "Failed to save" }, { status: 503 });
  }
}
