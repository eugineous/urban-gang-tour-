import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { hasDb, q } from "@/lib/server/db";
import {
  verifyAdminSession,
  hasPerm,
  isSuperAdmin,
  adminActor,
} from "@/lib/server/session";
import { requireOrigin } from "@/lib/server/origin";
import { readJsonObject } from "@/lib/server/json-body";
import { rateLimit, clientIp } from "@/lib/server/ratelimit";
import {
  ensureWebsiteContentSchema,
  invalidateWebsiteContent,
} from "@/lib/server/website-content";
import {
  websiteContent,
  pagePath,
  WEBSITE_DEFAULTS,
} from "@/lib/website-content";
export const dynamic = "force-dynamic";
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
async function guard(req: Request, write = false) {
  if (!(await verifyAdminSession(req)))
    return reply({ error: "unauthorized" }, 401);
  if (!hasPerm(req, "site_seo")) return reply({ error: "forbidden" }, 403);
  if (write && !requireOrigin(req)) return reply({ error: "bad_origin" }, 403);
  if (!rateLimit("website-editor:" + clientIp(req), 90, 60000))
    return reply({ error: "too_many_requests" }, 429);
  if (!hasDb()) return reply({ error: "website_unavailable" }, 503);
  return null;
}
export async function GET(req: Request) {
  const blocked = await guard(req);
  if (blocked) return blocked;
  const path = new URL(req.url).searchParams.get("path");
  if (!pagePath(path)) return reply({ error: "invalid_page" }, 400);
  try {
    await ensureWebsiteContentSchema();
    const rows = await q(
      "SELECT path,draft,published,version FROM website_pages WHERE path=$1",
      [path],
    );
    const versions = await q(
      "SELECT version,action,created_at FROM website_page_versions WHERE path=$1 ORDER BY version DESC LIMIT 30",
      [path],
    );
    return reply({
      ok: true,
      page: rows[0] || {
        path,
        draft: WEBSITE_DEFAULTS[path],
        published: null,
        version: 0,
      },
      versions,
      canPublish: isSuperAdmin(req),
    });
  } catch {
    return reply({ error: "website_unavailable" }, 503);
  }
}
export async function POST(req: Request) {
  const blocked = await guard(req, true);
  if (blocked) return blocked;
  const body = await readJsonObject(req, 150000);
  if (!body.ok) return reply({ error: body.error }, body.status);
  const d = body.value;
  if (
    !["save", "publish", "restore"].includes(String(d.action)) ||
    !pagePath(d.path) ||
    !Number.isSafeInteger(d.version) ||
    Number(d.version) < 0 ||
    Object.keys(d).some(
      (key) =>
        !["action", "path", "version", "content", "sourceVersion"].includes(
          key,
        ),
    )
  )
    return reply({ error: "invalid_request" }, 400);
  if (d.action === "publish" && !isSuperAdmin(req))
    return reply({ error: "owner_review_required" }, 403);
  try {
    await ensureWebsiteContentSchema();
    let content;
    if (d.action === "restore") {
      if (!Number.isSafeInteger(d.sourceVersion) || Number(d.sourceVersion) < 1)
        return reply({ error: "invalid_version" }, 400);
      const old = await q<{ draft: unknown }>(
        "SELECT draft FROM website_page_versions WHERE path=$1 AND version=$2",
        [d.path, d.sourceVersion],
      );
      if (!old.length) return reply({ error: "not_found" }, 404);
      content = websiteContent(old[0].draft);
    } else content = websiteContent(d.content);
    // Snapshot, revision history and audit commit atomically. Restoring never publishes.
    const rows = await q(
      `WITH saved AS (
   INSERT INTO website_pages(path,draft,published) SELECT $1,$2::jsonb,CASE WHEN $4::boolean THEN $2::jsonb ELSE NULL END WHERE $3::int=0 ON CONFLICT DO NOTHING RETURNING *
  ), updated AS (
   UPDATE website_pages SET draft=$2::jsonb,published=CASE WHEN $4::boolean THEN $2::jsonb ELSE published END,version=version+1,updated_at=now() WHERE path=$1 AND version=$3 RETURNING *
  ), result AS (SELECT * FROM saved UNION ALL SELECT * FROM updated), history AS (
   INSERT INTO website_page_versions(path,version,draft,published,actor,action) SELECT path,version,draft,published,$5,$6 FROM result RETURNING path,version
  ), audit AS (INSERT INTO audit_log(actor,action,detail) SELECT $5,'website.'||$6,jsonb_build_object('path',path,'version',version) FROM result)
  SELECT result.path,result.draft,result.published,result.version FROM result JOIN history USING(path,version)`,
      [
        d.path,
        JSON.stringify(content),
        d.version,
        d.action === "publish",
        adminActor(req),
        d.action,
      ],
    );
    if (!rows.length) return reply({ error: "website_conflict" }, 409);
    if (d.action === "publish") {
      invalidateWebsiteContent(d.path);
      try {
        revalidatePath(d.path);
        if (d.path === "/about") revalidatePath("/the-gang");
      } catch {}
    }
    return reply({ ok: true, page: rows[0] });
  } catch (error) {
    return reply(
      {
        error:
          error instanceof Error &&
          /^(invalid_|unexpected_|missing_|incomplete_)/.test(error.message)
            ? error.message
            : "website_unavailable",
      },
      error instanceof Error &&
        /^(invalid_|unexpected_|missing_|incomplete_)/.test(error.message)
        ? 400
        : 503,
    );
  }
}
