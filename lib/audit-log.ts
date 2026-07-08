import { Redis } from "@upstash/redis";

const REDIS_URL = process.env.UrbanGang_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UrbanGang_KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;
function db(): Redis | null {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  if (!redis) redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
  return redis;
}

const LOG_KEY = "admin:audit-log";
const MAX_ENTRIES = 200;

export interface AuditEntry {
  action: string;
  summary: string;
  actor: string;
  at: number;
}

// The admin panel has one shared password, not per-user accounts, so "actor"
// is the request IP rather than a name - an honest label given the real
// constraint instead of a fabricated user identity.
export async function recordAudit(entry: Omit<AuditEntry, "at">): Promise<void> {
  const client = db();
  if (!client) return;
  await client.lpush(LOG_KEY, JSON.stringify({ ...entry, at: Date.now() }));
  await client.ltrim(LOG_KEY, 0, MAX_ENTRIES - 1);
}

export async function getAuditLog(limit = 50): Promise<AuditEntry[]> {
  const client = db();
  if (!client) return [];
  const raw = await client.lrange<string>(LOG_KEY, 0, limit - 1);
  return raw
    .map((r) => {
      try {
        return typeof r === "string" ? (JSON.parse(r) as AuditEntry) : (r as unknown as AuditEntry);
      } catch {
        return null;
      }
    })
    .filter((e): e is AuditEntry => e !== null);
}
