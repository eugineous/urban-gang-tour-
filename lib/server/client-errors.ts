// Storage for the client-side error beacon (app/api/client-error/route.ts).
// Kept deliberately separate from lib/server/ops.ts's big OPS_SCHEMA: the
// beacon route is public and unauthenticated (any visitor's browser can post
// to it), so it should not need to run the entire ops suite's schema setup
// (or import ops.ts's heavier dependency surface) just to log a JS error.
// Same self-healing "ensure table" idiom as lib/server/admin-accounts.ts's
// ensureAdminAccountsSchema() - CREATE TABLE IF NOT EXISTS, memoized promise,
// retried on next call if it ever fails.
import { db, q } from './db';

export interface ClientErrorRow {
  id: number;
  msg: string;
  src: string;
  line: number;
  page: string;
  ua: string;
  created_at: string;
}

let ensured: Promise<void> | null = null;

export function ensureClientErrorsSchema(): Promise<void> {
  if (!db()) return Promise.reject(new Error('db_not_configured'));
  if (!ensured) {
    ensured = q(`
      CREATE TABLE IF NOT EXISTS client_errors (
        id SERIAL PRIMARY KEY,
        msg TEXT,
        src TEXT,
        line INT,
        page TEXT,
        ua TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_client_errors_created_at ON client_errors (created_at DESC);
    `).then(() => undefined).catch((e) => {
      ensured = null; // allow retry on next request
      throw e;
    });
  }
  return ensured;
}

// Insert one beacon row. Auto-prunes rows older than 30 days on roughly 1 in
// 20 inserts, so the table stays bounded without needing a cron job. Callers
// (the public beacon route) must catch/ignore failures here themselves -
// losing a diagnostic row is never worth failing the request over.
export async function insertClientError(row: { msg: string; src: string; line: number; page: string; ua: string }): Promise<void> {
  await ensureClientErrorsSchema();
  await q(
    `INSERT INTO client_errors (msg, src, line, page, ua) VALUES ($1,$2,$3,$4,$5)`,
    [row.msg, row.src, row.line, row.page, row.ua]
  );
  if (Math.random() < 1 / 20) {
    q(`DELETE FROM client_errors WHERE created_at < now() - interval '30 days'`).catch(() => {});
  }
}

export async function listClientErrors(limit = 30): Promise<ClientErrorRow[]> {
  await ensureClientErrorsSchema();
  return q<ClientErrorRow>(
    `SELECT id, msg, src, line, page, ua, created_at FROM client_errors ORDER BY created_at DESC LIMIT $1`,
    [Math.max(1, Math.min(200, limit))]
  );
}
