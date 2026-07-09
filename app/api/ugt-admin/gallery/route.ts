import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import sharp from "sharp";
import {
  listGalleryPhotos,
  insertGalleryPhoto,
  deleteGalleryPhoto,
  countInCategory,
  GALLERY_UPLOAD_CAP_PER_CATEGORY,
} from "@/lib/gallery-photos";
import { recordAudit } from "@/lib/audit-log";

function actorFrom(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") || undefined;
  try {
    const photos = await listGalleryPhotos(category);
    return NextResponse.json({ photos });
  } catch (err) {
    console.error("Failed to list gallery photos:", err);
    return NextResponse.json({ error: "Couldn't load gallery photos" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid upload" }, { status: 400 });

  const category = String(form.get("category") || "").trim();
  if (!category) return NextResponse.json({ error: "A category/school is required" }, { status: 400 });

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return NextResponse.json({ error: "No files provided" }, { status: 400 });

  const existing = await countInCategory(category);
  if (existing >= GALLERY_UPLOAD_CAP_PER_CATEGORY) {
    return NextResponse.json({ error: `"${category}" is already at the ${GALLERY_UPLOAD_CAP_PER_CATEGORY}-photo cap` }, { status: 400 });
  }
  const room = GALLERY_UPLOAD_CAP_PER_CATEGORY - existing;
  const toProcess = files.slice(0, room);

  const uploaded = [];
  for (const file of toProcess) {
    if (!file.type.startsWith("image/")) continue;

    const buffer = Buffer.from(await file.arrayBuffer());
    const compressed = await sharp(buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();
    const meta = await sharp(compressed).metadata();

    const blob = await put(`gallery/${category}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`, compressed, {
      access: "public",
      contentType: "image/jpeg",
    });

    const photo = await insertGalleryPhoto({
      category,
      url: blob.url,
      caption: category,
      width: meta.width || 1200,
      height: meta.height || 1600,
    });
    uploaded.push(photo);
  }

  if (uploaded.length > 0) {
    await recordAudit({
      action: "gallery.upload",
      summary: `Uploaded ${uploaded.length} photo(s) to "${category}"${toProcess.length < files.length ? ` (${files.length - toProcess.length} skipped, cap reached)` : ""}`,
      actor: actorFrom(req),
    });
  }

  return NextResponse.json({ uploaded: uploaded.length, skipped: files.length - toProcess.length, photos: uploaded });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    const photo = await deleteGalleryPhoto(id);
    if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    await del(photo.url).catch(() => {});
    await recordAudit({ action: "gallery.delete", summary: `Deleted photo #${id} from "${photo.category}"`, actor: actorFrom(req) });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete gallery photo:", err);
    return NextResponse.json({ error: "Couldn't delete that photo" }, { status: 503 });
  }
}
