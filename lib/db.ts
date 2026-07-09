import { neon } from "@neondatabase/serverless";

let sql: ReturnType<typeof neon> | null = null;

// Returns a tagged-template SQL function backed by Neon's HTTP driver, which
// suits one-shot serverless queries far better than a pooled TCP client -
// no connection to manage or exhaust across invocations.
export function db() {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set - the Postgres database isn't connected yet.");
    sql = neon(url);
  }
  return sql;
}
