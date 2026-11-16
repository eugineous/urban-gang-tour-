import { q, hasDb } from './db';
import { currentUser } from './session';

let accountSchema: Promise<void> | undefined;
let buyerSchema: Promise<void> | undefined;

// Run additive DDL once per isolate and share concurrent initialization. A failed
// migration is retried; customer reads themselves are never cached.
export async function ensureCustomerAccountSchema() {
  if (!accountSchema) accountSchema = migrateCustomerAccountSchema().catch(error => {
    accountSchema = undefined;
    throw error;
  });
  return accountSchema;
}

// Guest orders remain unclaimed. Matching an email is not proof of ownership.
async function migrateCustomerAccountSchema() {
  await ensureBuyerSessionSchema();
  await q('ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)');
  await q('CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC)');
  await q(`CREATE TABLE IF NOT EXISTS customer_privacy_requests (
    id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
    kind TEXT NOT NULL CHECK (kind IN ('deletion')), status TEXT NOT NULL DEFAULT 'received',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), resolution TEXT NOT NULL DEFAULT ''
  )`);
  await q("ALTER TABLE customer_privacy_requests ADD COLUMN IF NOT EXISTS resolution TEXT NOT NULL DEFAULT ''");
  await q("CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_privacy_pending ON customer_privacy_requests(user_id) WHERE status IN ('received','reviewing')");
  await q(`CREATE TABLE IF NOT EXISTS customer_reset_tokens (
    token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    expires_at TIMESTAMPTZ NOT NULL
  )`);
  // Existing development databases may contain more than one old reset link.
  // Retain only the latest; this table contains credentials, never sales data.
  await q(`DELETE FROM customer_reset_tokens WHERE token_hash IN (
    SELECT token_hash FROM (
      SELECT token_hash, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY expires_at DESC,token_hash) AS rank
      FROM customer_reset_tokens
    ) duplicates WHERE rank>1
  )`);
  await q('CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_reset_user ON customer_reset_tokens(user_id)');
}

export async function customerOrders(userId: number, cursor?: {createdAt:string;id:string}) {
  // One sentinel row establishes continuation without counting account history.
  // Text timestamps retain PostgreSQL microseconds for the next keyset boundary.
  return q<{id:string;items:unknown;total:number;status:string;created_at:string}>(`SELECT id, items, total, status, created_at::text AS created_at FROM orders
    WHERE user_id=$1 AND ($2::timestamptz IS NULL OR (created_at,id)<($2::timestamptz,$3::text))
    ORDER BY orders.created_at DESC,orders.id DESC LIMIT 31`, [userId,cursor?.createdAt??null,cursor?.id??null]);
}

export async function ensureBuyerSessionSchema() {
  if (!buyerSchema) buyerSchema = q('ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0')
    .then(() => undefined).catch(error => { buyerSchema=undefined; throw error; });
  return buyerSchema;
}

// Buyers are validated against current persisted account state. Tokens minted
// before versioning remain valid only until that account's first reset.
export async function validatedCurrentBuyer(req: Request) {
  const token = currentUser(req) as ({id:number;email:string;name?:string;sessionVersion?:number}) | null;
  if (!token || !Number.isInteger(token.id) || token.id<=0 || !hasDb()) return null;
  await ensureBuyerSessionSchema();
  const rows=await q<{id:number;email:string;phone:string|null;name:string;session_version:number}>('SELECT id,email,phone,name,session_version FROM users WHERE id=$1',[token.id]);
  const buyer=rows[0];
  if (!buyer || (token.sessionVersion ?? 0)!==buyer.session_version) return null;
  return {id:buyer.id,email:buyer.email,phone:buyer.phone,name:buyer.name};
}
