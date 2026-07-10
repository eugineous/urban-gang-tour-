// Postgres pool (DATABASE_URL). All callers must tolerate db()==null (503s).
import { Pool } from 'pg';

let pool: Pool | null = null;

export function db(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      ssl: process.env.DATABASE_URL.includes('localhost') ? undefined : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const p = db();
  if (!p) throw new Error('db_not_configured');
  const r = await p.query(sql, params);
  return r.rows as T[];
}

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, org TEXT DEFAULT '', email TEXT NOT NULL,
  phone TEXT DEFAULT '', type TEXT NOT NULL, message TEXT DEFAULT '',
  status TEXT DEFAULT 'new', created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY, items JSONB NOT NULL, total INT NOT NULL,
  name TEXT, email TEXT, phone TEXT, status TEXT DEFAULT 'pending',
  mpesa_ref TEXT, mpesa_receipt TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS posts (
  slug TEXT PRIMARY KEY, headline TEXT NOT NULL, section TEXT DEFAULT 'News',
  image TEXT DEFAULT '', dek TEXT DEFAULT '', body JSONB DEFAULT '[]',
  published BOOLEAN DEFAULT true, date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY, email TEXT UNIQUE, phone TEXT, name TEXT DEFAULT '',
  pass_hash TEXT NOT NULL, role TEXT DEFAULT 'member', created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY, kind TEXT DEFAULT 'blog', name TEXT, school TEXT,
  title TEXT, pitch TEXT, email TEXT, status TEXT DEFAULT 'new', created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS subscribers (
  email TEXT PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS traffic (
  day DATE NOT NULL, path TEXT NOT NULL, hits INT DEFAULT 0, PRIMARY KEY(day, path)
);
CREATE TABLE IF NOT EXISTS product_reviews (
  id SERIAL PRIMARY KEY, product_id TEXT NOT NULL, author TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5), body TEXT NOT NULL,
  approved BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY, actor TEXT, action TEXT, detail JSONB, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS social_posted_at TIMESTAMPTZ;
`;
