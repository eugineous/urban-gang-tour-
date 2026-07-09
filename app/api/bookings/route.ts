import { NextRequest, NextResponse } from "next/server";
import { createBooking } from "@/lib/bookings";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const { name, org, email, phone, intent, message } = body;
  if (!String(name || "").trim() || !String(message || "").trim() || !String(intent || "").trim()) {
    return NextResponse.json({ error: "Name, intent, and message are required" }, { status: 400 });
  }

  try {
    const booking = await createBooking({
      name: String(name).trim(),
      org: org ? String(org).trim() : undefined,
      email: email ? String(email).trim() : undefined,
      phone: phone ? String(phone).trim() : undefined,
      intent: String(intent).trim(),
      message: String(message).trim(),
    });
    return NextResponse.json({ ok: true, id: booking.id });
  } catch (err) {
    console.error("Failed to create booking:", err);
    return NextResponse.json({ error: "Couldn't send that, try again in a moment" }, { status: 500 });
  }
}
