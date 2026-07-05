import { Redis } from "@upstash/redis";
import { MERCH_CATALOG, TICKET_EVENTS, type CatalogItem, type TicketEvent } from "@/content/catalog";

const REDIS_URL = process.env.UrbanGang_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UrbanGang_KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;
function db(): Redis | null {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  if (!redis) redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
  return redis;
}

const MERCH_KEY = "catalog:merch";
const EVENTS_KEY = "catalog:events";

// Falls back to the static seed in content/catalog.ts when storage isn't
// connected or hasn't been edited yet, so checkout keeps working either way.
export async function getMerchCatalog(): Promise<CatalogItem[]> {
  const client = db();
  if (!client) return MERCH_CATALOG;
  const stored = await client.get<CatalogItem[]>(MERCH_KEY);
  return stored ?? MERCH_CATALOG;
}

export async function getTicketEvents(): Promise<TicketEvent[]> {
  const client = db();
  if (!client) return TICKET_EVENTS;
  const stored = await client.get<TicketEvent[]>(EVENTS_KEY);
  return stored ?? TICKET_EVENTS;
}

export async function saveMerchCatalog(items: CatalogItem[]): Promise<void> {
  const client = db();
  if (!client) throw new Error("Storage isn't connected yet - add an Upstash Redis database from the Vercel Storage tab.");
  await client.set(MERCH_KEY, items);
}

export async function saveTicketEvents(events: TicketEvent[]): Promise<void> {
  const client = db();
  if (!client) throw new Error("Storage isn't connected yet - add an Upstash Redis database from the Vercel Storage tab.");
  await client.set(EVENTS_KEY, events);
}

export async function findCatalogItemLive(
  kind: "ticket" | "merch",
  eventKey: string | null,
  itemKey: string
): Promise<CatalogItem | null> {
  if (kind === "merch") {
    const merch = await getMerchCatalog();
    return merch.find((i) => i.key === itemKey) ?? null;
  }
  const events = await getTicketEvents();
  const event = events.find((e) => e.key === eventKey);
  return event?.ticketTypes.find((t) => t.key === itemKey) ?? null;
}
