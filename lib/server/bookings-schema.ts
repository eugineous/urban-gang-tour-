import { q } from './db';

let ensured = false;

export async function ensureBookingsSchema() {
  if (ensured) return;
  await q(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='type')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='intent') THEN
      ALTER TABLE bookings RENAME COLUMN intent TO type;
    END IF;
  END $$;`);
  await q(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS preferred_date DATE`);
  await q(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS expected_attendance INT`);
  await q(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS event_brief TEXT DEFAULT ''`);
  await q(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'site'`);
  await q(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS calendly_event_uri TEXT DEFAULT ''`);
  ensured = true;
}
