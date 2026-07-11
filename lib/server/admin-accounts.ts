// Admin account directory: who can sign in to the Control Room via Google,
// and what they're allowed to touch. Companion table to the pre-existing
// admin_google_emails allowlist (created ad hoc in app/api/admin/google's
// route) - this module is now the single place that creates/reads/writes it.
//
// Backward compatibility rule (do not violate): every row that already
// existed before the role/perms columns were added must keep full access.
// ADD COLUMN ... DEFAULT 'super_admin' backfills the default onto existing
// rows in Postgres (metadata-only in PG11+, but the default value is what
// SELECT returns for old rows), so no separate migration/backfill step is
// needed - this ALTER alone preserves every current admin's access.
import { db, q } from './db';

export type AdminRole = 'super_admin' | 'crew_admin';

// The full set of assignable module keys, derived from the real tabs in
// app/admin/AdminApp.tsx (TABS + OPS_TABS) plus the standalone gate
// scanner. Keep in sync with AdminApp.tsx if tabs are ever renamed/added -
// nothing else invents or reads perm strings outside this list.
export const MODULE_KEYS = [
  'bookings',
  'orders',
  'content',
  'newsroom',
  'comms',
  'site_seo',
  'people',
  'traffic',
  'events',
  'products',
  'gallery',
  'marketplace',
  'ops_budgeter',
  'ops_invoices',
  'ops_payments',
  'ops_contacts',
  'ops_payouts',
  'ops_expenses',
  'ops_pipeline',
  'ops_promos',
  'ops_checklists',
  'reviews',
  'gate_scanner',
] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

export function isModuleKey(v: unknown): v is ModuleKey {
  return typeof v === 'string' && (MODULE_KEYS as readonly string[]).includes(v);
}

export interface AdminAccount {
  email: string;
  role: AdminRole;
  perms: ModuleKey[];
  added_at: string;
}

let ensured: Promise<void> | null = null;

export function ensureAdminAccountsSchema(): Promise<void> {
  if (!db()) return Promise.reject(new Error('db_not_configured'));
  if (!ensured) {
    ensured = q(`
      CREATE TABLE IF NOT EXISTS admin_google_emails (
        email TEXT PRIMARY KEY,
        added_at TIMESTAMPTZ DEFAULT now()
      );
      ALTER TABLE admin_google_emails ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'super_admin';
      ALTER TABLE admin_google_emails ADD COLUMN IF NOT EXISTS perms JSONB NOT NULL DEFAULT '[]'::jsonb;
    `).then(() => undefined).catch((e) => {
      ensured = null;
      throw e;
    });
  }
  return ensured;
}

function normRole(v: unknown): AdminRole {
  return v === 'crew_admin' ? 'crew_admin' : 'super_admin';
}

function normPerms(v: unknown): ModuleKey[] {
  if (!Array.isArray(v)) return [];
  const out: ModuleKey[] = [];
  for (const x of v) if (isModuleKey(x) && !out.includes(x)) out.push(x);
  return out;
}

export async function listAdminAccounts(): Promise<AdminAccount[]> {
  await ensureAdminAccountsSchema();
  const rows = await q<{ email: string; role: string; perms: unknown; added_at: string }>(
    `SELECT email, role, perms, added_at FROM admin_google_emails ORDER BY added_at ASC`
  );
  return rows.map((r) => ({
    email: r.email,
    role: normRole(r.role),
    perms: normPerms(typeof r.perms === 'string' ? JSON.parse(r.perms) : r.perms),
    added_at: r.added_at,
  }));
}

export async function getAdminAccount(email: string): Promise<AdminAccount | null> {
  await ensureAdminAccountsSchema();
  const rows = await q<{ email: string; role: string; perms: unknown; added_at: string }>(
    `SELECT email, role, perms, added_at FROM admin_google_emails WHERE lower(email) = $1`,
    [email.toLowerCase()]
  );
  if (!rows.length) return null;
  const r = rows[0];
  return {
    email: r.email,
    role: normRole(r.role),
    perms: normPerms(typeof r.perms === 'string' ? JSON.parse(r.perms) : r.perms),
    added_at: r.added_at,
  };
}

export async function upsertAdminAccount(email: string, role: AdminRole, perms: ModuleKey[]): Promise<AdminAccount> {
  await ensureAdminAccountsSchema();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPerms = role === 'crew_admin' ? normPerms(perms) : [];
  const rows = await q<{ email: string; role: string; perms: unknown; added_at: string }>(
    `INSERT INTO admin_google_emails (email, role, perms) VALUES ($1,$2,$3)
     ON CONFLICT (email) DO UPDATE SET role=$2, perms=$3
     RETURNING email, role, perms, added_at`,
    [cleanEmail, role, JSON.stringify(cleanPerms)]
  );
  const r = rows[0];
  return { email: r.email, role: normRole(r.role), perms: normPerms(r.perms), added_at: r.added_at };
}

export async function removeAdminAccount(email: string): Promise<boolean> {
  await ensureAdminAccountsSchema();
  const rows = await q(`DELETE FROM admin_google_emails WHERE lower(email) = $1 RETURNING email`, [email.toLowerCase()]);
  return rows.length > 0;
}
