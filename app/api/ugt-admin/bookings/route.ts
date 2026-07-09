import { NextRequest, NextResponse } from "next/server";
import { listBookings, updateBookingStatus } from "@/lib/bookings";
import { recordAudit } from "@/lib/audit-log";

function actorFrom(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function GET() {
  try {
    const bookings = await listBookings();
    return NextResponse.json({ bookings });
  } catch (err) {
    console.error("Failed to list bookings:", err);
    return NextResponse.json({ error: "Couldn't load bookings" }, { status: 503 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  const status = body?.status;
  if (!id || !["new", "review", "confirmed"].includes(status)) {
    return NextResponse.json({ error: "id and a valid status are required" }, { status: 400 });
  }

  try {
    const updated = await updateBookingStatus(id, status);
    if (!updated) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    await recordAudit({
      action: "booking.status",
      summary: `Set booking #${id} (${updated.name}) to "${status}"`,
      actor: actorFrom(req),
    });
    return NextResponse.json({ booking: updated });
  } catch (err) {
    console.error("Failed to update booking:", err);
    return NextResponse.json({ error: "Couldn't update that booking" }, { status: 503 });
  }
}
