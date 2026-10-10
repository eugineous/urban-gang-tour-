import { q } from './db';
// No cross-request promise cache: Workers forbid sharing database I/O objects.
export async function ensureEngagementSchema() {
  await q(`CREATE TABLE IF NOT EXISTS affiliate_codes (id TEXT PRIMARY KEY, user_id BIGINT UNIQUE NOT NULL REFERENCES users(id), status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), name TEXT NOT NULL, audience TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), reviewed_at TIMESTAMPTZ)`);
  await q(`CREATE TABLE IF NOT EXISTS notification_preferences (user_id BIGINT PRIMARY KEY REFERENCES users(id), marketing_email BOOLEAN NOT NULL DEFAULT false, event_interests JSONB NOT NULL DEFAULT '[]', updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
}
export const EVENT_INTERESTS=['concerts','festivals','school-events','campus-events','merchandise'] as const;
