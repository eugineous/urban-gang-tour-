import { db } from "./db";

export interface Booking {
  id: number;
  name: string;
  org: string | null;
  email: string | null;
  phone: string | null;
  intent: string;
  message: string;
  status: "new" | "review" | "confirmed";
  created_at: string;
}

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  const sql = db();
  await sql`
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      org TEXT,
      email TEXT,
      phone TEXT,
      intent TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  ensured = true;
}

export async function createBooking(input: {
  name: string;
  org?: string;
  email?: string;
  phone?: string;
  intent: string;
  message: string;
}): Promise<Booking> {
  await ensureTable();
  const sql = db();
  const rows = (await sql`
    INSERT INTO bookings (name, org, email, phone, intent, message)
    VALUES (${input.name}, ${input.org || null}, ${input.email || null}, ${input.phone || null}, ${input.intent}, ${input.message})
    RETURNING *
  `) as Booking[];
  return rows[0];
}

export async function listBookings(limit = 200): Promise<Booking[]> {
  await ensureTable();
  const sql = db();
  return (await sql`SELECT * FROM bookings ORDER BY created_at DESC LIMIT ${limit}`) as Booking[];
}

export async function updateBookingStatus(id: number, status: Booking["status"]): Promise<Booking | null> {
  await ensureTable();
  const sql = db();
  const rows = (await sql`UPDATE bookings SET status = ${status} WHERE id = ${id} RETURNING *`) as Booking[];
  return rows[0] ?? null;
}
