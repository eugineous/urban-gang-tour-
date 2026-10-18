import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { q, hasDb } from "@/lib/server/db";
import {
  verifyAdminSession,
  hasPerm,
  isSuperAdmin,
  adminActor,
} from "@/lib/server/session";
import { requireOrigin } from "@/lib/server/origin";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";
import { readJsonObject } from "@/lib/server/json-body";
import { ensureMediaLibrarySchema } from "@/lib/server/media-library";
import { invalidate } from "@/lib/server/microcache";
import { isDraftId } from "@/lib/story-draft";
export const dynamic = "force-dynamic";
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
const photoFields =
  "id,url,COALESCE(caption,'') AS caption,COALESCE(category,'') AS category,COALESCE(alt_text,'') AS alt_text,width,height,published,sort_order,folder_id,version,removed_at,created_at::text AS created_at";
async function guard(req: Request, write = false) {
  if (!(await verifyAdminSession(req)))
    return reply({ error: "unauthorized" }, 401);
  if (!hasPerm(req, "gallery")) return reply({ error: "forbidden" }, 403);
  if (write && !requireOrigin(req)) return reply({ error: "bad_origin" }, 403);
  if (!rateLimit("media-library:" + clientIp(req), write ? 120 : 180, 60000))
    return reply({ error: "too_many_requests" }, 429);
  if (!hasDb()) return reply({ error: "media_unavailable" }, 503);
  return null;
}
export async function GET(req: Request) {
  const blocked = await guard(req);
  if (blocked) return blocked;
  try {
    await ensureMediaLibrarySchema();
    const rows = await q(
      `SELECT ${photoFields} FROM gallery_photos ORDER BY sort_order,id`,
    );
    const folders = await q(
      "SELECT id,name,version FROM gallery_folders ORDER BY lower(name)",
    );
    return reply({ ok: true, rows, folders, canPublish: isSuperAdmin(req) });
  } catch {
    return reply({ error: "media_unavailable" }, 503);
  }
}
export async function POST(req: Request) {
  const blocked = await guard(req, true);
  if (blocked) return blocked;
  const body = await readJsonObject(req, 4096);
  if (!body.ok) return reply({ error: body.error }, body.status);
  const d = body.value,
    action = d.action,
    owner = isSuperAdmin(req);
  const keys =
    action === "folder.create"
      ? ["action", "name"]
      : action === "folder.rename"
        ? ["action", "id", "name", "version"]
        : action === "photo.save"
          ? ["action", "id", "version", "caption", "category", "altText"]
          : action === "photo.move"
            ? ["action", "id", "version", "folderId"]
            : ["action", "id", "version"];
  if (
    ![
      "folder.create",
      "folder.rename",
      "photo.save",
      "photo.move",
      "photo.publish",
      "photo.unpublish",
      "photo.trash",
      "photo.restore",
    ].includes(String(action)) ||
    Object.keys(d).some((key) => !keys.includes(key))
  )
    return reply({ error: "invalid_action" }, 400);
  if (
    [
      "photo.publish",
      "photo.unpublish",
      "photo.trash",
      "photo.restore",
    ].includes(String(action)) &&
    !owner
  )
    return reply({ error: "owner_review_required" }, 403);
  const text = (value: unknown, max: number) =>
    typeof value === "string" &&
    value.length <= max &&
    !/[\u0000-\u001f\u007f]/.test(value);
  if (
    action !== "folder.create" &&
    (!Number.isSafeInteger(d.version) || Number(d.version) < 1)
  )
    return reply({ error: "invalid_version" }, 400);
  if (String(action).startsWith("folder.")) {
    if (
      !text(d.name, 80) ||
      !(d.name as string).trim() ||
      (action === "folder.rename" && !isDraftId(d.id))
    )
      return reply({ error: "invalid_folder" }, 400);
  } else if (!Number.isSafeInteger(d.id) || Number(d.id) < 1)
    return reply({ error: "invalid_photo" }, 400);
  if (
    action === "photo.save" &&
    (!text(d.caption, 300) || !text(d.category, 120) || !text(d.altText, 300))
  )
    return reply({ error: "invalid_metadata" }, 400);
  if (action === "photo.move" && d.folderId !== null && !isDraftId(d.folderId))
    return reply({ error: "invalid_folder" }, 400);
  try {
    await ensureMediaLibrarySchema();
    let statement: string, args: unknown[];
    if (action === "folder.create") {
      statement =
        "INSERT INTO gallery_folders(id,name) VALUES($1::uuid,$2) ON CONFLICT DO NOTHING RETURNING id,name,version";
      args = [randomUUID(), (d.name as string).trim().replace(/\s+/g, " ")];
    } else if (action === "folder.rename") {
      statement =
        "UPDATE gallery_folders SET name=$2,version=version+1 WHERE id=$1::uuid AND version=$3 RETURNING id,name,version";
      args = [d.id, (d.name as string).trim().replace(/\s+/g, " "), d.version];
    } else {
      args = [d.id, d.version, owner];
      let change = "",
        condition = "removed_at IS NULL";
      if (action === "photo.save") {
        change = "caption=$4,category=$5,alt_text=$6";
        args.push(d.caption, d.category, d.altText);
        condition +=
          " AND ($3::boolean OR NOT published) AND (NOT published OR (btrim($4)<>'' AND btrim($5)<>'' AND btrim($6)<>''))";
      } else if (action === "photo.move") {
        change = "folder_id=$4::uuid";
        args.push(d.folderId);
        condition += " AND ($3::boolean OR NOT published)";
      } else if (action === "photo.trash")
        change = "published=false,removed_at=now()";
      else if (action === "photo.restore") {
        change = "published=false,removed_at=NULL";
        condition = "removed_at IS NOT NULL";
      } else {
        change = `published=${action === "photo.publish" ? "true" : "false"}`;
        if (action === "photo.publish")
          condition +=
            " AND btrim(caption)<>'' AND btrim(category)<>'' AND btrim(alt_text)<>''";
      }
      statement = `UPDATE gallery_photos SET ${change},version=version+1 WHERE id=$1 AND version=$2 AND ($3::boolean OR NOT published) AND ${condition} RETURNING ${photoFields}`;
    }
    // Unused parameters must still have explicit types in statements with owner-only predicates.
    const actorPosition = args.length + 1,
      actionPosition = args.length + 2;
    const rows = await q<Record<string, unknown>>(
      `WITH saved AS (${statement}), audit AS (INSERT INTO audit_log(actor,action,detail) SELECT $${actorPosition}::text,$${actionPosition}::text,jsonb_build_object('id',id) FROM saved) SELECT * FROM saved`,
      [...args, adminActor(req), "media." + action],
    );
    if (!rows.length)
      return reply(
        {
          error:
            action === "folder.create"
              ? "folder_exists"
              : action === "photo.publish"
                ? "metadata_or_version_changed"
                : "media_conflict",
        },
        409,
      );
    invalidate("site-gallery");
    if (typeof rows[0].url === "string")
      invalidate("media-gallery:" + rows[0].url);
    try {
      revalidatePath("/gallery");
    } catch {}
    return reply({ ok: true, row: rows[0] });
  } catch (error) {
    return reply(
      {
        error:
          (error as { code?: string })?.code === "23505"
            ? "folder_exists"
            : "media_unavailable",
      },
      (error as { code?: string })?.code === "23505" ? 409 : 503,
    );
  }
}
