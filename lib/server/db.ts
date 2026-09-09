// Postgres access (DATABASE_URL). All callers must tolerate db()==null / q()
// throwing 'db_not_configured' (503s).
//
// Cloudflare Workers cannot open raw TCP sockets, so the old `pg` driver
// (which connects to Neon over TCP) cannot run here. `@neondatabase/serverless`
// is Neon's own driver and offers two modes:
//  - `neon()`: stateless, one-shot queries over plain HTTP. No connection
//    object of any kind - each call is an independent fetch(). This is what
//    `q()` uses below for every non-transactional query (the vast majority
//    of call sites).
//  - `Pool` (WebSocket-based): needed only for real multi-statement
//    transactions (pool.connect() + BEGIN/COMMIT/ROLLBACK - see
//    createNumberedDocument in ops.ts, tickets.ts, docgen.ts).
//
// IMPORTANT: earlier versions of this file cached a single module-level
// `Pool` and reused it across requests. That crashed in production with
// "Cannot perform I/O on behalf of a different request" - Cloudflare
// Workers forbids reusing an I/O object (like an open WebSocket) that was
// created during one request's execution context from a *later* request,
// even within the same warm isolate. `db()` below returns a brand-new Pool
// on every call instead - callers that open one MUST pool.end() it in a
// finally block once done (see the four call sites above), so no
// connection ever outlives the request that created it.
import { neon, Pool, neonConfig } from '@neondatabase/serverless';

// The Pool needs a WebSocket implementation for pool.connect()-based
// transactions. Cloudflare Workers ships a native WebSocket global that the
// driver picks up automatically with no config. Node.js (local dev,
// `next build`, one-off scripts) needs the `ws` package wired in explicitly
// per Neon's own guidance. Detect "running under Node" rather than
// "WebSocket is undefined" - some Node versions have a native WebSocket
// global that the driver doesn't treat as a drop-in.
if (typeof process !== 'undefined' && process.versions?.node) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  neonConfig.webSocketConstructor = require('ws');
}

// Transactions only. Fresh Pool every call - never cache this at module
// scope (see the comment above for why).
export function db(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
  });
}

export async function q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (!process.env.DATABASE_URL) throw new Error('db_not_configured');
  const client = neon(process.env.DATABASE_URL);
  const rows = await client.query(sql, params);
  return rows as T[];
}

// For multi-statement DDL blocks only (e.g. `CREATE TABLE ...; CREATE INDEX
// ...;`). Unlike the old `pg` Pool, Neon's HTTP query() executes exactly one
// statement per call - passing a semicolon-separated block through q()
// throws (silently, wherever the caller has a catch-and-degrade pattern,
// which is how every ensure*Schema()/ensure*Seeded() function here is
// written - this is what caused every DB-backed public route to quietly
// return empty results after the Cloudflare migration). Strips `--` line
// comments first, then splits the remaining SQL on `;` and runs each
// statement in sequence. The comment-strip step matters: this codebase's
// schema blocks have prose comments that themselves contain semicolons
// (grammatical punctuation, e.g. "...agree); the ALTER TABLE statements...")
// - a naive split-on-`;` alone cuts mid-comment and sends a bare word like
// "the" to Postgres as its own statement ("syntax error at or near \"the\"").
// Only ever called with static, developer-authored schema strings (never
// user input), so this simple line-comment strip is safe here - none of
// this codebase's DDL uses dollar-quoted function bodies, block comments, or
// string literals containing `--`.
export async function qSchema(sql: string): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error('db_not_configured');
  const client = neon(process.env.DATABASE_URL);
  const withoutComments = sql
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('--');
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join('\n');
  const statements = withoutComments.split(';').map((s) => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    await client.query(stmt);
  }
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
CREATE TABLE IF NOT EXISTS tickets (
  code TEXT PRIMARY KEY, order_id TEXT NOT NULL, event_id TEXT NOT NULL,
  tier_name TEXT NOT NULL, holder TEXT DEFAULT '', position INT NOT NULL,
  of_count INT NOT NULL, used_at TIMESTAMPTZ, used_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS social_posted_at TIMESTAMPTZ;
-- Indexes for the real query patterns (blog listing, admin ledgers, M-Pesa
-- callback reconciliation, review lookups, audit trail). Applied with the
-- schema via POST /api/admin/setup.
CREATE INDEX IF NOT EXISTS idx_posts_published_date ON posts (published, date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_mpesa_ref ON orders (mpesa_ref);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_approved ON product_reviews (product_id, approved);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscribers_created_at ON subscribers (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_order_id ON tickets (order_id);
`;
