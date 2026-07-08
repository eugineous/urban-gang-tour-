import { NextRequest, NextResponse } from "next/server";
import {
  getMerchCatalog,
  getTicketEvents,
  saveMerchCatalog,
  saveTicketEvents,
} from "@/lib/catalog-store";
import { recordAudit } from "@/lib/audit-log";
import type { CatalogItem, TicketEvent } from "@/content/catalog";

// Protected by middleware.ts (UGT_ADMIN_PROTECTED_PREFIXES includes /api/ugt-admin).
export async function GET() {
  const [merch, events] = await Promise.all([getMerchCatalog(), getTicketEvents()]);
  return NextResponse.json({ merch, events });
}

function sanitizeItem(raw: unknown): CatalogItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const key = String(r.key || "").trim();
  const name = String(r.name || "").trim();
  const priceKes = Number(r.priceKes);
  if (!key || !name || !Number.isFinite(priceKes) || priceKes <= 0) return null;
  const variants = Array.isArray(r.variants) ? r.variants.map(String).filter(Boolean) : undefined;
  return { key, name, priceKes: Math.round(priceKes), variants };
}

function actorFrom(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function diffMerch(before: CatalogItem[], after: CatalogItem[]): string[] {
  const byKey = new Map(before.map((i) => [i.key, i]));
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const item of after) {
    seen.add(item.key);
    const prev = byKey.get(item.key);
    if (!prev) {
      lines.push(`Added "${item.name}" at KES ${item.priceKes.toLocaleString("en-KE")}`);
    } else if (prev.priceKes !== item.priceKes) {
      lines.push(`"${item.name}" price: KES ${prev.priceKes.toLocaleString("en-KE")} to KES ${item.priceKes.toLocaleString("en-KE")}`);
    } else if (prev.name !== item.name) {
      lines.push(`Renamed "${prev.name}" to "${item.name}"`);
    }
  }
  for (const item of before) {
    if (!seen.has(item.key)) lines.push(`Removed "${item.name}"`);
  }
  return lines;
}

function diffEvents(before: TicketEvent[], after: TicketEvent[]): string[] {
  const byKey = new Map(before.map((e) => [e.key, e]));
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const ev of after) {
    seen.add(ev.key);
    if (!byKey.has(ev.key)) lines.push(`Added event "${ev.name}"`);
  }
  for (const ev of before) {
    if (!seen.has(ev.key)) lines.push(`Removed event "${ev.name}"`);
  }
  return lines;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || (body.type !== "merch" && body.type !== "events")) {
    return NextResponse.json({ error: "type must be 'merch' or 'events'" }, { status: 400 });
  }

  if (body.type === "merch") {
    if (!Array.isArray(body.items)) return NextResponse.json({ error: "items must be an array" }, { status: 400 });
    const items = body.items.map(sanitizeItem);
    if (items.some((i: CatalogItem | null) => i === null)) {
      return NextResponse.json({ error: "Every item needs a key, name, and a price greater than 0" }, { status: 400 });
    }
    const before = await getMerchCatalog();
    await saveMerchCatalog(items as CatalogItem[]);
    const changes = diffMerch(before, items as CatalogItem[]);
    if (changes.length > 0) {
      await recordAudit({ action: "merch.save", summary: changes.join("; "), actor: actorFrom(req) });
    }
    return NextResponse.json({ ok: true });
  }

  if (!Array.isArray(body.events)) return NextResponse.json({ error: "events must be an array" }, { status: 400 });
  const events: TicketEvent[] = [];
  for (const raw of body.events) {
    if (!raw || typeof raw !== "object") return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    const r = raw as Record<string, unknown>;
    const key = String(r.key || "").trim();
    const name = String(r.name || "").trim();
    const dateLabel = String(r.dateLabel || "").trim();
    const ticketTypes = Array.isArray(r.ticketTypes) ? r.ticketTypes.map(sanitizeItem) : [];
    if (!key || !name || ticketTypes.some((t) => t === null) || ticketTypes.length === 0) {
      return NextResponse.json({ error: "Every event needs a key, name, and at least one valid ticket type" }, { status: 400 });
    }
    events.push({ key, name, dateLabel, ticketTypes: ticketTypes as CatalogItem[] });
  }
  const beforeEvents = await getTicketEvents();
  await saveTicketEvents(events);
  const changes = diffEvents(beforeEvents, events);
  if (changes.length > 0) {
    await recordAudit({ action: "events.save", summary: changes.join("; "), actor: actorFrom(req) });
  }
  return NextResponse.json({ ok: true });
}
