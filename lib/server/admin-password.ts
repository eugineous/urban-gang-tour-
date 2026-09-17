import { hasDb, q, qSchema } from './db';

let ready: Promise<void> | null = null;

export function ensureAdminPasswordSchema(): Promise<void> {
  if (!hasDb()) return Promise.reject(new Error('db_not_configured'));
  if (!ready) {
    ready = qSchema(`
      CREATE TABLE IF NOT EXISTS admin_credentials (
        id TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `).then(() => undefined).catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

export async function adminPasswordHash(): Promise<string | null> {
  if (!hasDb()) return null;
  await ensureAdminPasswordSchema();
  const rows = await q<{ password_hash: string }>(`SELECT password_hash FROM admin_credentials WHERE id='primary'`);
  return rows[0]?.password_hash || null;
}

export async function setAdminPasswordHash(passwordHash: string): Promise<void> {
  await ensureAdminPasswordSchema();
  await q(
    `INSERT INTO admin_credentials (id, password_hash) VALUES ('primary',$1)
     ON CONFLICT (id) DO UPDATE SET password_hash=$1, updated_at=now()`,
    [passwordHash],
  );
}

